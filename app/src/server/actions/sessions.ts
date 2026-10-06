"use server";

/**
 * Manual session management — used by signup, signin, admin-login server actions.
 *
 * Bypasses NextAuth's signIn() to avoid the JWT vs database strategy conflict
 * Credentials provider would introduce. Session rows are read by NextAuth's
 * auth() in middleware/layouts — fully compatible.
 *
 * Cookie name follows @auth/core convention (verified in
 * @auth/core/lib/utils/cookie.js): "__Secure-authjs.session-token" when the
 * URL is HTTPS, "authjs.session-token" otherwise. Hardcoding the prefixed
 * name in dev causes the browser to silently drop the cookie because the
 * Secure flag requires HTTPS — which breaks the manual signup/signin flow.
 */
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";

const IS_PROD = process.env.NODE_ENV === "production";
const SESSION_COOKIE = IS_PROD
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";
const SESSION_TTL_DAYS = 30;

export async function createSessionForUser(userId: string): Promise<void> {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);

  await db.session.create({
    data: { sessionToken, userId, expires },
  });

  (await cookies()).set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { sessionToken: token } });
  }
  c.delete(SESSION_COOKIE);
}

/**
 * Revoke a specific session the caller owns (from the Settings > Security tab).
 * Cannot revoke the caller's own active session — use destroyCurrentSession() for that.
 */
export async function revokeSession(sessionId: string): Promise<{ ok: true }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const target = await db.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, sessionToken: true },
  });

  if (!target) throw new Error("Session not found");
  if (target.userId !== session.user.id) throw new Error("Forbidden");

  const c = await cookies();
  const currentToken = c.get(SESSION_COOKIE)?.value;
  if (currentToken && currentToken === target.sessionToken) {
    throw new Error("Cannot revoke your current session — use Sign out instead");
  }

  await db.session.delete({ where: { id: sessionId } });
  revalidatePath("/settings");
  return { ok: true };
}
