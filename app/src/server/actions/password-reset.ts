"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { generateResetToken, hashResetToken, hashPassword } from "@/lib/passwords";
import { sendTemplateEmail } from "@/server/email/template-send";
import {
  RateLimitError,
  assertForgotRateLimit,
  recordForgotSent,
} from "@/lib/abuse/auth-rate-limit";
import { getRequestIp } from "@/lib/abuse/get-request-ip";

const RESET_TTL_MINUTES = 60;

const RequestSchema = z.object({
  email: z.string().email(),
});

const ResetSchema = z.object({
  token: z.string().min(32).max(128),
  newPassword: z.string().min(8).max(128),
});

export type ResetActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Step 1: User submits their email at /auth/forgot.
 * Always returns ok=true to avoid email enumeration — even when rate-limited
 * (silent suppression: counter stops the mail from going out, but the response
 * is identical to the success path so an attacker cannot tell the difference).
 */
export async function requestPasswordReset(input: unknown): Promise<ResetActionResult> {
  const parsed = RequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: true };
  }
  const { email } = parsed.data;
  const ip = await getRequestIp();

  // Rate-limit silently — surface ok=true regardless. This blocks both reset
  // bombing (spam to a single inbox) and per-IP enumeration sweeps.
  try {
    await assertForgotRateLimit(email, ip);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { ok: true };
    }
    throw err;
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return { ok: true };
  }

  const { plain, hash } = generateResetToken();
  const expires = new Date(Date.now() + RESET_TTL_MINUTES * 60_000);

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hash,
      passwordResetExpiresAt: expires,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://promtexpress.com";
  const resetUrl = `${baseUrl}/auth/reset?token=${plain}`;

  await sendTemplateEmail({
    slug: "password-reset",
    locale: user.locale ?? "en",
    to: user.email,
    vars: {
      name: user.name ?? user.email.split("@")[0]!,
      resetUrl,
    },
  });

  await recordForgotSent(email, ip);
  return { ok: true };
}

/**
 * Step 2: User clicks the link, sets a new password.
 */
export async function resetPassword(input: unknown): Promise<ResetActionResult> {
  const parsed = ResetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, newPassword } = parsed.data;

  const tokenHash = hashResetToken(token);
  const user = await db.user.findFirst({
    where: {
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    return { ok: false, error: "Invalid or expired reset token" };
  }

  const passwordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return { ok: true };
}
