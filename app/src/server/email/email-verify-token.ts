import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";

const IDENTIFIER_PREFIX = "email-verify:";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function identifierFor(email: string): string {
  return `${IDENTIFIER_PREFIX}${email.toLowerCase()}`;
}

function baseUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export type CreateTokenResult =
  | { ok: true; token: string; url: string }
  | { ok: false; reason: "rate_limited"; retryAfterMs: number };

export async function createEmailVerifyToken(
  email: string,
): Promise<CreateTokenResult> {
  const identifier = identifierFor(email);
  const now = Date.now();

  const latest = await db.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  if (latest) {
    const issuedAtMs = latest.expires.getTime() - TOKEN_TTL_MS;
    const sinceLast = now - issuedAtMs;
    if (sinceLast >= 0 && sinceLast < RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        reason: "rate_limited",
        retryAfterMs: RESEND_COOLDOWN_MS - sinceLast,
      };
    }
  }

  await db.verificationToken.deleteMany({ where: { identifier } });

  const token = randomBytes(32).toString("hex");
  const expires = new Date(now + TOKEN_TTL_MS);
  await db.verificationToken.create({
    data: { identifier, token, expires },
  });

  const url = `${baseUrl()}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  return { ok: true, token, url };
}

export type ConsumeTokenResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_found" | "expired" | "user_missing" };

export async function consumeEmailVerifyToken(
  email: string,
  token: string,
): Promise<ConsumeTokenResult> {
  const identifier = identifierFor(email);
  const row = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier, token } },
  });
  if (!row) return { ok: false, reason: "not_found" };

  await db.verificationToken.delete({
    where: { identifier_token: { identifier, token } },
  });

  if (row.expires.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: false, reason: "user_missing" };

  if (!user.emailVerified) {
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }
  // RSC/Next-data cache'ini invalidate et — generator banner ANINDA kaybolsun.
  revalidatePath("/generator");
  revalidatePath("/auth/verify");
  revalidatePath("/", "layout");
  return { ok: true, userId: user.id };
}
