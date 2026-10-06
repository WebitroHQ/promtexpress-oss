"use server";

import { CreditReason } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { dispatchPaddleEvent } from "@/lib/paddle/handlers";
import type { EventEntity } from "@paddle/paddle-node-sdk";

/**
 * Manually grant or debit credits to a user. Writes a CreditLedger row
 * with reason=ADMIN_ADJUSTMENT and an audit log entry.
 *
 * `delta` may be positive (grant) or negative (debit). `expiresAt` only
 * applies to positive deltas; if null, the grant never expires.
 */
export async function adjustUserCredits(input: {
  userId: string;
  delta: number;
  note: string;
  expiresAt?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();

  if (!Number.isFinite(input.delta) || input.delta === 0) {
    return { ok: false, error: "delta must be a non-zero finite integer" };
  }
  if (Math.abs(input.delta) > 100000) {
    return { ok: false, error: "delta out of range (|delta| ≤ 100000)" };
  }
  if (!input.note?.trim()) {
    return { ok: false, error: "note is required" };
  }

  const user = await db.user.findUnique({ where: { id: input.userId }, select: { id: true } });
  if (!user) return { ok: false, error: "user not found" };

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return { ok: false, error: "invalid expiresAt date" };
  }

  await db.creditLedger.create({
    data: {
      userId: input.userId,
      delta: Math.floor(input.delta),
      reason: CreditReason.ADMIN_ADJUSTMENT,
      expiresAt: input.delta > 0 ? expiresAt : null,
      meta: {
        note: input.note,
        adjustedBy: admin.email ?? null,
        adjustedAt: new Date().toISOString(),
      },
    },
  });

  await writeAudit({
    actorId: admin.id,
    action: "credits.admin_adjust",
    targetType: "user",
    targetId: input.userId,
    meta: { delta: input.delta, note: input.note },
  });

  revalidatePath(`/pr/yonet/users`);
  revalidatePath(`/pr/yonet/users/${input.userId}/credits`);
  return { ok: true };
}

/**
 * Re-dispatch a recorded webhook event. Used to recover from failed handler
 * runs once the underlying issue (e.g. missing Plan price-id mapping) is
 * resolved. Idempotency in handler logic prevents double-grants.
 */
export async function reprocessWebhookEvent(
  eventRowId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();

  const row = await db.webhookEvent.findUnique({ where: { id: eventRowId } });
  if (!row) return { ok: false, error: "webhook event not found" };

  try {
    // Reconstruct an EventEntity-shaped object from the stored payload.
    // The dispatcher only inspects `eventType`, `eventId`, and `data`, so a
    // plain-object cast is safe and avoids re-running HMAC verification
    // (the original receipt was already signature-verified on first arrival).
    const payload = row.payload as { event_id?: string; event_type?: string; data?: unknown };
    const event = {
      eventId: payload.event_id ?? row.paddleEventId,
      eventType: payload.event_type ?? row.eventType,
      data: payload.data,
    } as unknown as EventEntity;
    await dispatchPaddleEvent(event);
    await db.webhookEvent.update({
      where: { id: row.id },
      data: { processedAt: new Date(), error: null },
    });
    await writeAudit({
      actorId: admin.id,
      action: "webhook.reprocess",
      targetType: "webhookEvent",
      targetId: row.id,
      meta: { eventType: row.eventType, paddleEventId: row.paddleEventId },
    });
    revalidatePath("/pr/yonet/billing/webhook-events");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.webhookEvent.update({
      where: { id: row.id },
      data: { error: message },
    });
    return { ok: false, error: message };
  }
}
