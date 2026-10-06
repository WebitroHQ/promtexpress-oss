/**
 * Paddle webhook receiver.
 *
 * Endpoint: POST /api/webhook/paddle
 *
 * 1) Verify HMAC-SHA256 signature (Paddle-Signature header) using PADDLE_WEBHOOK_SECRET.
 * 2) Idempotency: insert WebhookEvent row keyed on Paddle event id; ignore duplicates.
 * 3) Dispatch to event-specific handler (subscription.*, transaction.completed, etc.).
 * 4) Mark processed; return 200 immediately on success.
 *
 * IMPORTANT: must read the raw body via req.text() (not req.json()) before signature
 * verification — JSON.parse changes whitespace and breaks the HMAC.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPaddle, getWebhookSecret } from "@/lib/paddle/client";
import { db } from "@/db/client";
import { dispatchPaddleEvent } from "@/lib/paddle/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature") ?? "";

  // Verify signature
  let event;
  try {
    const paddle = getPaddle();
    event = await paddle.webhooks.unmarshal(rawBody, getWebhookSecret(), signature);
  } catch (err) {
    console.error("[paddle-webhook] signature verification failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (!event || !event.eventId) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  // Idempotency: insert-or-skip
  const existing = await db.webhookEvent.findUnique({
    where: { paddleEventId: event.eventId },
    select: { id: true, processedAt: true },
  });

  if (existing?.processedAt) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const eventRow = existing
    ? existing
    : await db.webhookEvent.create({
        data: {
          paddleEventId: event.eventId,
          eventType: event.eventType,
          payload: JSON.parse(rawBody),
          signature,
        },
      });

  // Dispatch
  try {
    await dispatchPaddleEvent(event);
    await db.webhookEvent.update({
      where: { id: eventRow.id },
      data: { processedAt: new Date(), error: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[paddle-webhook] handler error for ${event.eventType}`, err);
    await db.webhookEvent.update({
      where: { id: eventRow.id },
      data: { error: message },
    });
    // Return 500 so Paddle retries — but only for non-permanent errors. For now, retry all.
    return NextResponse.json({ error: "handler_failed", message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
