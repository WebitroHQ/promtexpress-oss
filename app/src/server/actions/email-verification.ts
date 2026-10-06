"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { createEmailVerifyToken } from "@/server/email/email-verify-token";
import { sendTemplateEmail } from "@/server/email/template-send";

const ResendSchema = z.object({ email: z.string().email() });

export type ResendResult =
  | { ok: true; cooldownMs?: number }
  | { ok: false; reason: "invalid_input" | "rate_limited" | "send_failed"; retryAfterMs?: number };

export async function resendEmailVerification(input: unknown): Promise<ResendResult> {
  const parsed = ResendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };
  const email = parsed.data.email.toLowerCase();

  const user = await db.user.findUnique({
    where: { email },
    select: { firstName: true, name: true, locale: true, emailVerified: true },
  });

  // Enumeration koruması: kullanıcı yoksa ya da zaten doğrulanmışsa sessizce ok dön.
  if (!user || user.emailVerified) {
    return { ok: true };
  }

  const tok = await createEmailVerifyToken(email);
  if (!tok.ok) {
    return { ok: false, reason: "rate_limited", retryAfterMs: tok.retryAfterMs };
  }

  const displayName =
    user.firstName ??
    user.name?.split(" ")[0] ??
    email.split("@")[0] ??
    "there";

  const sent = await sendTemplateEmail({
    slug: "verification",
    locale: user.locale ?? "en",
    to: email,
    vars: { name: displayName, verifyUrl: tok.url },
  });

  if (!sent.ok) return { ok: false, reason: "send_failed" };
  return { ok: true, cooldownMs: 60_000 };
}
