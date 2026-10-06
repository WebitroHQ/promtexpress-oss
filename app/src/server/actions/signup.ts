"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/db/client";
import { hashPassword } from "@/lib/passwords";
import { grantWelcomeCredit } from "@/lib/onboarding/grant-welcome-credit";
import { createSessionForUser } from "./sessions";
import { createEmailVerifyToken } from "@/server/email/email-verify-token";
import { sendTemplateEmail } from "@/server/email/template-send";
import {
  RateLimitError,
  assertSignupRateLimit,
  recordSignupSuccess,
} from "@/lib/abuse/auth-rate-limit";
import { getRequestIp } from "@/lib/abuse/get-request-ip";
import { verifyTurnstileToken } from "@/lib/abuse/turnstile";

// Plan 2026-05-08 step 3 — server-side enforcement of:
//   * Cloudflare Turnstile token (bot mitigation)
//   * Terms-of-Service acceptance (literal(true))
//   * KVKK Art. 5 explicit consent (literal(true), recorded as kvkkConsentAt)
//
// Frontend cannot be trusted; the disabled-button check in signup-form.tsx
// can be bypassed via direct POST. The schema below is the only enforcement
// surface.
const SignupSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  agreedToTerms: z.literal(true),
  kvkkConsent: z.literal(true),
  turnstileToken: z.string().min(1).max(2048),
});

export type SignupResult =
  | { ok: true; verificationEmailSent: boolean }
  | { ok: false; error: string; retryAfterSec?: number };

export async function signUpWithPassword(input: unknown): Promise<SignupResult> {
  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const ip = await getRequestIp();

  // Per-IP signup throttle. RateLimitError → user-friendly message.
  try {
    await assertSignupRateLimit(ip);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return {
        ok: false,
        error: "Too many sign-ups from this network. Please try again later.",
        retryAfterSec: err.retryAfterSec,
      };
    }
    throw err;
  }

  // Bot mitigation. Cloudflare Turnstile siteverify; fail-closed in production
  // when the token is invalid or the verification endpoint is unreachable.
  const turnstileOk = await verifyTurnstileToken(data.turnstileToken, ip);
  if (!turnstileOk) {
    return { ok: false, error: "Captcha verification failed. Please retry." };
  }

  const passwordHash = await hashPassword(data.password);
  const consentAt = new Date();

  try {
    const user = await db.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName} ${data.lastName}`,
        passwordHash,
        role: "USER",
        locale: "en",
        termsConsentAt: consentAt,
        kvkkConsentAt: consentAt,
      },
    });
    await createSessionForUser(user.id);
    await recordSignupSuccess(ip);

    try {
      await grantWelcomeCredit(user.id);
    } catch {
      // Welcome credit grant is best-effort; admin can adjust later via /pr/yonet.
    }

    let verificationEmailSent = false;
    try {
      const tok = await createEmailVerifyToken(data.email);
      if (tok.ok) {
        const sent = await sendTemplateEmail({
          slug: "verification",
          locale: user.locale ?? "en",
          to: data.email,
          vars: { name: data.firstName, verifyUrl: tok.url },
        });
        verificationEmailSent = sent.ok;
      }
    } catch {
      // Mail trigger failure does not block signup; verification banner offers
      // a manual resend.
    }

    return { ok: true, verificationEmailSent };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "An account with this email already exists" };
    }
    throw e;
  }
}
