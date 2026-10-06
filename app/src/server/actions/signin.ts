"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { verifyPassword } from "@/lib/passwords";
import { createSessionForUser } from "./sessions";
import {
  RateLimitError,
  assertSigninRateLimit,
  recordSigninFailure,
  recordSigninSuccess,
} from "@/lib/abuse/auth-rate-limit";
import { getRequestIp } from "@/lib/abuse/get-request-ip";

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export type SigninResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterSec?: number };

export async function signInWithPassword(input: unknown): Promise<SigninResult> {
  const parsed = SigninSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid email or password" };
  }
  const { email, password } = parsed.data;
  const ip = await getRequestIp();

  // Pre-flight rate-limit check. RateLimitError is the only signal we propagate
  // distinctly — every other failure stays as the generic "Invalid email or
  // password" to preserve enumeration safety.
  try {
    await assertSigninRateLimit(email, ip);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return {
        ok: false,
        error: "Too many sign-in attempts. Please try again later.",
        retryAfterSec: err.retryAfterSec,
      };
    }
    throw err;
  }

  const user = await db.user.findUnique({ where: { email } });
  // Generic error to avoid email enumeration
  if (!user?.passwordHash) {
    await recordSigninFailure(email, ip);
    return { ok: false, error: "Invalid email or password" };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await recordSigninFailure(email, ip);
    return { ok: false, error: "Invalid email or password" };
  }

  await recordSigninSuccess(email, ip);
  await createSessionForUser(user.id);
  return { ok: true };
}
