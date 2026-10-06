import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import {
  RateLimitError,
  assertContactRateLimit,
  recordContactSent,
} from "@/lib/abuse/auth-rate-limit";
import { verifyTurnstileToken } from "@/lib/abuse/turnstile";
import { sendTemplateEmail } from "@/server/email/template-send";

/**
 * Contact form submission endpoint.
 *
 * Plan 2026-05-08 step 10 (D3 + D4 evidence — contact-form.tsx posted to a
 * setTimeout mock; /api/contact did not exist).
 *
 * Pipeline:
 *   1. Per-IP rate-limit (3/h, Redis token bucket).
 *   2. Cloudflare Turnstile siteverify (fail-closed in production).
 *   3. Zod-parse the body.
 *   4. Insert ContactMessage row.
 *   5. Best-effort notification mail to support@promtexpress.com via the
 *      existing template-send pipeline (template slug: "contact-inbound" —
 *      provisioned by the admin in /pr/yonet/email-templates).
 *
 * Failure semantics — if (5) fails, the row is still saved; admin can see
 * the message in /pr/yonet/messages and reach out manually. Plan rule 4 —
 * never throw away a user submission because of a downstream issue.
 */

const ContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  topic: z.enum(["sales", "technical", "partnership", "press", "other"]),
  message: z.string().min(10).max(5000),
  turnstileToken: z.string().min(1).max(2048),
});

const SUPPORT_INBOX = "hello@promtexpress.com";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const userAgent = req.headers.get("user-agent");

  // 1) Rate-limit pre-check.
  try {
    await assertContactRateLimit(ip);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many messages from this network. Please try again later.",
          retryAfterSec: err.retryAfterSec,
        },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } },
      );
    }
    throw err;
  }

  // 2) Body parse.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // 3) Captcha — fail closed in production.
  const turnstileOk = await verifyTurnstileToken(data.turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json(
      { ok: false, error: "Captcha verification failed. Please retry." },
      { status: 400 },
    );
  }

  // 4) Persist.
  let savedId: string;
  try {
    const row = await db.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        topic: data.topic,
        message: data.message,
        ip,
        userAgent,
      },
      select: { id: true },
    });
    savedId = row.id;
  } catch (err) {
    console.error("[contact] persist failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not save message. Please try again." },
      { status: 500 },
    );
  }

  await recordContactSent(ip);

  // 5) Notification mail (best-effort).
  void sendTemplateEmail({
    slug: "contact-inbound",
    locale: "en",
    to: SUPPORT_INBOX,
    vars: {
      name: data.name,
      email: data.email,
      topic: data.topic,
      message: data.message,
      messageId: savedId,
    },
    override: { replyTo: data.email },
  }).catch((e) => console.error("[contact] notify failed:", e));

  return NextResponse.json({ ok: true, id: savedId });
}
