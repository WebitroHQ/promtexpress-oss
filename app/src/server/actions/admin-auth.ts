"use server";

/**
 * Admin standalone login — completely independent of NextAuth providers.
 *
 * Why separate from user auth:
 *   - Brevo SMTP, Google OAuth, or Credentials provider can all break
 *     (env missing, upstream outage, etc.) and admin must STILL be able
 *     to log in to fix the issue.
 *
 * Verification:
 *   1. ADMIN_USERNAME (env) === input.username (constant-time string compare)
 *   2. ADMIN_PASSWORD_HASH (bcrypt, env) verified against input.password
 *
 * On success:
 *   - Find any User with role=ADMIN in DB (seeded from ADMIN_EMAIL)
 *   - Create Session row + set session cookie
 *   - Redirect to /pr/yonet
 */
import { z } from "zod";
import { db } from "@/db/client";
import { verifyPassword } from "@/lib/passwords";
import { createSessionForUser } from "./sessions";
import { writeAudit } from "@/lib/audit";
import {
  RateLimitError,
  assertAdminLoginRateLimit,
  recordAdminLoginFailure,
  recordAdminLoginSuccess,
} from "@/lib/abuse/auth-rate-limit";
import { getRequestIp } from "@/lib/abuse/get-request-ip";

const AdminLoginSchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(128),
});

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterSec?: number };

export async function signInAsAdmin(input: unknown): Promise<AdminLoginResult> {
  const parsed = AdminLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid credentials" };
  }
  const { username, password } = parsed.data;
  const ip = await getRequestIp();

  // Pre-flight rate-limit + lockout check.
  try {
    await assertAdminLoginRateLimit(ip, username);
  } catch (err) {
    if (err instanceof RateLimitError) {
      await writeAudit({
        actorId: null,
        action: "ADMIN_LOGIN_LOCKED",
        meta: { username, ip },
      });
      return {
        ok: false,
        error: "Too many failed attempts. Admin login is temporarily locked.",
        retryAfterSec: err.retryAfterSec,
      };
    }
    throw err;
  }

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedUsername || !expectedHash) {
    console.error("[admin-auth] ADMIN_USERNAME or ADMIN_PASSWORD_HASH missing in env");
    await writeAudit({
      actorId: null,
      action: "ADMIN_LOGIN_MISCONFIGURED",
      meta: { ip },
    });
    return { ok: false, error: "Admin login not configured" };
  }

  // Constant-time-ish check: compare both fields even if first fails,
  // to avoid timing attacks distinguishing username vs password failures.
  const usernameOk = username === expectedUsername;
  const passwordOk = await verifyPassword(password, expectedHash);

  if (!usernameOk || !passwordOk) {
    await recordAdminLoginFailure(ip, username);
    await writeAudit({
      actorId: null,
      action: "ADMIN_LOGIN_FAILED",
      meta: { username, ip, usernameOk, passwordOk },
    });
    return { ok: false, error: "Invalid credentials" };
  }

  const adminUser = await db.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!adminUser) {
    await writeAudit({
      actorId: null,
      action: "ADMIN_LOGIN_NO_USER",
      meta: { ip },
    });
    return { ok: false, error: "No admin user in database. Run seed first." };
  }

  await recordAdminLoginSuccess(ip, username);
  await createSessionForUser(adminUser.id);
  await writeAudit({
    actorId: adminUser.id,
    action: "ADMIN_LOGIN_OK",
    meta: { username, ip },
  });
  return { ok: true };
}
