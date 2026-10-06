-- Credit System Rebuild — Single Source of Truth Migration
-- Plan: .claude/plans/2026-05-06-credit-system-rebuild.md §3.2
--
-- Adds expiresAt/consumed/consumedAt/packPurchaseId to CreditLedger so that
-- balance can be computed as SUM(delta) WHERE !consumed AND (expiresAt IS NULL OR expiresAt > now()).
--
-- Adds two new CreditReason enum values: SUBSCRIPTION_GRANT, SUBSCRIPTION_EXPIRY.
-- The legacy SUBSCRIPTION_RENEWAL value is preserved for backward compatibility with
-- existing rows; new code writes SUBSCRIPTION_GRANT.

-- 1) Enum extensions (must run outside the implicit transaction, hence separate statements).
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_GRANT';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_EXPIRY';

-- 2) New columns on CreditLedger.
ALTER TABLE "CreditLedger"
  ADD COLUMN "expiresAt"      TIMESTAMP(3),
  ADD COLUMN "consumed"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consumedAt"     TIMESTAMP(3),
  ADD COLUMN "consumedAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "packPurchaseId" TEXT;

-- 3) Balance-query optimization index.
CREATE INDEX "CreditLedger_userId_consumed_expiresAt_idx"
  ON "CreditLedger" ("userId", "consumed", "expiresAt");

-- 4) Foreign key from CreditLedger.packPurchaseId to ExtraCreditPackPurchase.id.
ALTER TABLE "CreditLedger"
  ADD CONSTRAINT "CreditLedger_packPurchaseId_fkey"
  FOREIGN KEY ("packPurchaseId") REFERENCES "ExtraCreditPackPurchase"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
