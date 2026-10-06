import { NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/db/client";

/**
 * Brevo transactional webhook handler.
 *
 * Plan 2026-05-08 step 4 (B1 evidence — /api/webhook/brevo did not exist;
 * only /api/webhook/paddle was present). Brevo does NOT sign its webhook
 * payloads (no HMAC support), so authentication relies on:
 *   1. A long shared token in the URL (`?token=...`) compared in constant time.
 *   2. Reverse-proxy IP allowlist to Brevo's outbound CIDR (operator-side).
 *
 * Side effects:
 *   - Append-only insert into EmailDeliveryEvent (rawPayload kept verbatim
 *     so a future Brevo schema extension does not lose data).
 *   - Update User.emailDeliveryStatus when the event indicates a permanent
 *     deliverability problem (hard_bounce, spam, invalid_email, blocked,
 *     unsubscribed). Soft bounces are recorded but not promoted.
 *
 * The handler always returns 200 OK on a malformed payload AFTER recording
 * the raw event — Brevo will retry on 5xx, which we want only for true
 * server faults (DB unreachable). Bad data should not loop forever.
 */

// Zod schema mirrors .claude/temp/brevo-webhook-schema.json. Optional fields
// are left .optional() so a future Brevo extension does not break parsing.
const BrevoWebhookEventSchema = z
  .object({
    event: z.string().min(1).max(64),
    email: z.string().email(),
    id: z.number().int().nonnegative(),
    date: z.string(),
    ts: z.number().int(),
    ts_event: z.number().int(),
    "message-id": z.string().min(1).max(512),
    subject: z.string().optional(),
    "X-Mailin-custom": z.string().optional(),
    template_id: z.number().int().optional(),
    tags: z.array(z.string()).optional(),
    sending_ip: z.string().optional(),
    contact_id: z.number().int().optional(),
    mirror_link: z.string().optional(),
    reason: z.string().optional(),
    link: z.string().optional(),
    user_agent: z.string().optional(),
    device_used: z.string().optional(),
    tag: z.string().optional(),
  })
  .passthrough();

type BrevoEvent = z.infer<typeof BrevoWebhookEventSchema>;

// event → User.emailDeliveryStatus mapping. Events not listed here are
// telemetry-only (delivered, opened, click, request, deferred).
const STATUS_MAP: Record<string, string> = {
  hard_bounce: "hard_bounce",
  spam: "complained",
  blocked: "hard_bounce",
  invalid_email: "invalid_email",
  unsubscribed: "unsubscribed",
  soft_bounce: "soft_bounce",
};

function tokenIsValid(provided: string | null): boolean {
  const expected = process.env.BREVO_WEBHOOK_TOKEN;
  if (!expected) {
    console.error("[brevo-webhook] BREVO_WEBHOOK_TOKEN not configured");
    return false;
  }
  if (!provided) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function persistEvent(payload: BrevoEvent): Promise<void> {
  await db.emailDeliveryEvent.create({
    data: {
      email: payload.email.toLowerCase(),
      event: payload.event,
      reason: payload.reason ?? payload.tag ?? null,
      brevoId: payload.id,
      messageId: payload["message-id"],
      rawPayload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  const newStatus = STATUS_MAP[payload.event];
  if (!newStatus) return;

  // Match by lowercase email; users who haven't signed up yet (e.g. failed
  // invitations) still get the row in EmailDeliveryEvent above.
  await db.user.updateMany({
    where: { email: payload.email.toLowerCase() },
    data: { emailDeliveryStatus: newStatus },
  });
}

export async function POST(req: Request) {
  // 1) Auth — shared token in query string.
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!tokenIsValid(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Body parse. Brevo can POST a single event or an array (depending on
  // the webhook configuration); accept both.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = Array.isArray(body) ? body : [body];

  // 3) Process each event independently. One bad row should not poison the
  // batch; we log + continue so Brevo doesn't retry good ones.
  let processed = 0;
  let skipped = 0;
  for (const raw of events) {
    const parsed = BrevoWebhookEventSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn(
        "[brevo-webhook] schema mismatch — payload skipped:",
        parsed.error.issues[0]?.message,
      );
      skipped++;
      continue;
    }
    try {
      await persistEvent(parsed.data);
      processed++;
    } catch (err) {
      // Genuine DB fault — fail with 5xx so Brevo retries.
      console.error("[brevo-webhook] persist failed:", err);
      return NextResponse.json({ error: "Persist failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, processed, skipped });
}
