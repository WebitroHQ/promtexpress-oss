-- Paddle Billing integration migration (2026-05-05)
-- Adds: PaddleCustomer, PaddleTransaction, WebhookEvent, ExtraCreditPack, ExtraCreditPackPurchase
-- Extends: Plan (paddle ids), Subscription (paddle linkage + billingCycle + seatCount + pause)
-- Extends enums: SubscriptionStatus.PAUSED, BillingCycle (new), CreditReason (extra pack values)

-- NOTE: ALTER TYPE ... ADD VALUE statements cannot run inside a transaction in Postgres
-- when the new value is referenced in the same transaction. They are placed first, outside
-- the wrapping transaction.

-- ── Enum: BillingCycle (NEW) ──
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- ── Enum: SubscriptionStatus +PAUSED ──
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- ── Enum: CreditReason +EXTRA_PACK_* ──
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'EXTRA_PACK_PURCHASE';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'EXTRA_PACK_DEBIT';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'EXTRA_PACK_EXPIRY';

-- ── Plan: add Paddle catalog mapping ──
ALTER TABLE "Plan"
  ADD COLUMN "paddleProductId" TEXT,
  ADD COLUMN "paddlePriceIdMonthly" TEXT,
  ADD COLUMN "paddlePriceIdYearly" TEXT;

-- ── Subscription: add Paddle linkage + billing cycle + seats + pause ──
ALTER TABLE "Subscription"
  ADD COLUMN "paddleSubscriptionId" TEXT,
  ADD COLUMN "paddleCustomerId" TEXT,
  ADD COLUMN "paddlePriceId" TEXT,
  ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "seatCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "pausedAt" TIMESTAMP(3),
  ADD COLUMN "resumesAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Subscription_paddleSubscriptionId_key"
  ON "Subscription"("paddleSubscriptionId");
CREATE INDEX "Subscription_paddleCustomerId_idx"
  ON "Subscription"("paddleCustomerId");

-- ── PaddleCustomer ──
CREATE TABLE "PaddleCustomer" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "paddleCustomerId" TEXT NOT NULL,
  "email"            TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaddleCustomer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaddleCustomer_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaddleCustomer_userId_key"           ON "PaddleCustomer"("userId");
CREATE UNIQUE INDEX "PaddleCustomer_paddleCustomerId_key" ON "PaddleCustomer"("paddleCustomerId");

-- ── PaddleTransaction ──
CREATE TABLE "PaddleTransaction" (
  "id"                   TEXT NOT NULL,
  "paddleTransactionId"  TEXT NOT NULL,
  "userId"               TEXT,
  "paddleCustomerId"     TEXT,
  "paddleSubscriptionId" TEXT,
  "paddlePriceId"        TEXT,
  "type"                 TEXT NOT NULL,
  "status"               TEXT NOT NULL,
  "amount"               DECIMAL(10, 2) NOT NULL,
  "currency"             VARCHAR(3) NOT NULL,
  "items"                JSONB,
  "meta"                 JSONB,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt"          TIMESTAMP(3),

  CONSTRAINT "PaddleTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaddleTransaction_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaddleTransaction_paddleTransactionId_key"
  ON "PaddleTransaction"("paddleTransactionId");
CREATE INDEX "PaddleTransaction_userId_idx"
  ON "PaddleTransaction"("userId");
CREATE INDEX "PaddleTransaction_paddleCustomerId_idx"
  ON "PaddleTransaction"("paddleCustomerId");
CREATE INDEX "PaddleTransaction_paddleSubscriptionId_idx"
  ON "PaddleTransaction"("paddleSubscriptionId");

-- ── WebhookEvent (idempotency log) ──
CREATE TABLE "WebhookEvent" (
  "id"            TEXT NOT NULL,
  "paddleEventId" TEXT NOT NULL,
  "eventType"     TEXT NOT NULL,
  "payload"       JSONB NOT NULL,
  "signature"     TEXT,
  "receivedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt"   TIMESTAMP(3),
  "error"         TEXT,

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookEvent_paddleEventId_key" ON "WebhookEvent"("paddleEventId");
CREATE INDEX "WebhookEvent_eventType_idx"            ON "WebhookEvent"("eventType");
CREATE INDEX "WebhookEvent_receivedAt_idx"           ON "WebhookEvent"("receivedAt");
CREATE INDEX "WebhookEvent_processedAt_idx"          ON "WebhookEvent"("processedAt");

-- ── ExtraCreditPack (catalog) ──
CREATE TABLE "ExtraCreditPack" (
  "id"              TEXT NOT NULL,
  "slug"            TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "credits"         INTEGER NOT NULL,
  "priceUsd"        DECIMAL(10, 2) NOT NULL,
  "paddleProductId" TEXT,
  "paddlePriceId"   TEXT,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"       INTEGER NOT NULL DEFAULT 0,
  "validityDays"    INTEGER NOT NULL DEFAULT 365,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExtraCreditPack_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExtraCreditPack_slug_key" ON "ExtraCreditPack"("slug");

-- ── ExtraCreditPackPurchase (per-purchase ledger with expiry tracking) ──
CREATE TABLE "ExtraCreditPackPurchase" (
  "id"                  TEXT NOT NULL,
  "userId"              TEXT NOT NULL,
  "packId"              TEXT NOT NULL,
  "paddleTransactionId" TEXT,
  "creditsGranted"      INTEGER NOT NULL,
  "creditsUsed"         INTEGER NOT NULL DEFAULT 0,
  "purchasedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"           TIMESTAMP(3) NOT NULL,
  "expiredAt"           TIMESTAMP(3),

  CONSTRAINT "ExtraCreditPackPurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExtraCreditPackPurchase_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExtraCreditPackPurchase_packId_fkey" FOREIGN KEY ("packId")
    REFERENCES "ExtraCreditPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ExtraCreditPackPurchase_paddleTransactionId_key"
  ON "ExtraCreditPackPurchase"("paddleTransactionId");
CREATE INDEX "ExtraCreditPackPurchase_userId_idx"
  ON "ExtraCreditPackPurchase"("userId");
CREATE INDEX "ExtraCreditPackPurchase_userId_expiresAt_idx"
  ON "ExtraCreditPackPurchase"("userId", "expiresAt");
CREATE INDEX "ExtraCreditPackPurchase_userId_expiredAt_idx"
  ON "ExtraCreditPackPurchase"("userId", "expiredAt");
