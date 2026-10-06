/**
 * Backfill expiresAt + packPurchaseId on existing CreditLedger rows after the
 * 2026-05-06 credit_ledger_truth_source migration.
 *
 * Run: pnpm tsx scripts/backfill-credit-expiry.ts [--apply]
 *
 * Without --apply the script runs in dry-run mode and only prints what would
 * change. With --apply it executes the UPDATE statements.
 *
 * Idempotent — safe to re-run.
 *
 * Backfill rules:
 *   1. EXTRA_PACK_PURCHASE rows: copy expiresAt from ExtraCreditPackPurchase
 *      (matched by paddleTransactionId in meta), and set packPurchaseId.
 *   2. SUBSCRIPTION_RENEWAL rows (legacy enum): set expiresAt = meta.periodEnd
 *      if present, else createdAt + 30 days (monthly fallback).
 *   3. WELCOME_GRANT rows: leave expiresAt = NULL (welcome credits are
 *      permanent per Politika 5.2-A).
 *   4. ADMIN_ADJUSTMENT / BONUS / REFUND positive rows: leave NULL (admin
 *      decided expiry semantics at write time; legacy rows have none).
 */
import { db } from "@/db/client";
import { CreditReason } from "@prisma/client";

const APPLY = process.argv.includes("--apply");

function log(msg: string) {
  console.log(`[backfill] ${msg}`);
}

async function backfillExtraPackPurchase() {
  const rows = await db.creditLedger.findMany({
    where: {
      reason: CreditReason.EXTRA_PACK_PURCHASE,
      OR: [{ expiresAt: null }, { packPurchaseId: null }],
    },
    select: { id: true, meta: true, expiresAt: true, packPurchaseId: true, createdAt: true },
  });
  log(`EXTRA_PACK_PURCHASE candidates: ${rows.length}`);

  let updated = 0;
  for (const r of rows) {
    const meta = (r.meta ?? {}) as { paddleTransactionId?: string };
    if (!meta.paddleTransactionId) continue;
    const purchase = await db.extraCreditPackPurchase.findUnique({
      where: { paddleTransactionId: meta.paddleTransactionId },
      select: { id: true, expiresAt: true },
    });
    if (!purchase) continue;
    const wantExpiresAt = r.expiresAt ?? purchase.expiresAt;
    const wantPackPurchaseId = r.packPurchaseId ?? purchase.id;
    if (
      r.expiresAt?.getTime() === wantExpiresAt.getTime() &&
      r.packPurchaseId === wantPackPurchaseId
    ) {
      continue;
    }
    log(
      `  update ${r.id}: expiresAt=${wantExpiresAt.toISOString()} packPurchaseId=${wantPackPurchaseId}`,
    );
    if (APPLY) {
      await db.creditLedger.update({
        where: { id: r.id },
        data: { expiresAt: wantExpiresAt, packPurchaseId: wantPackPurchaseId },
      });
    }
    updated++;
  }
  log(`EXTRA_PACK_PURCHASE updated: ${updated}${APPLY ? "" : " (dry-run)"}`);
}

async function backfillSubscriptionRenewal() {
  const rows = await db.creditLedger.findMany({
    where: {
      reason: CreditReason.SUBSCRIPTION_RENEWAL,
      expiresAt: null,
    },
    select: { id: true, meta: true, createdAt: true },
  });
  log(`SUBSCRIPTION_RENEWAL candidates: ${rows.length}`);

  let updated = 0;
  for (const r of rows) {
    const meta = (r.meta ?? {}) as { periodEnd?: string };
    let expiresAt: Date;
    if (meta.periodEnd) {
      const d = new Date(meta.periodEnd);
      expiresAt = Number.isNaN(d.getTime())
        ? new Date(r.createdAt.getTime() + 30 * 24 * 3600 * 1000)
        : d;
    } else {
      expiresAt = new Date(r.createdAt.getTime() + 30 * 24 * 3600 * 1000);
    }
    log(`  update ${r.id}: expiresAt=${expiresAt.toISOString()}`);
    if (APPLY) {
      await db.creditLedger.update({
        where: { id: r.id },
        data: { expiresAt },
      });
    }
    updated++;
  }
  log(`SUBSCRIPTION_RENEWAL updated: ${updated}${APPLY ? "" : " (dry-run)"}`);
}

async function main() {
  log(APPLY ? "APPLY MODE — writing changes" : "DRY-RUN MODE — no writes");
  await backfillExtraPackPurchase();
  await backfillSubscriptionRenewal();
  log("done");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
