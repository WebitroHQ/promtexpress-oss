-- Plan: .claude/plans/2026-05-08-uye-kabul-tam-onarim-plani.md
-- Steps covered: 3 (KVKK + Terms consent), 4 (Brevo bounce/complaint webhook),
-- 10 (Contact form backend).
--
-- Compatibility (Plan rule 4 — zero downtime):
--   * All new User columns are nullable OR have a safe default — existing
--     rows are unaffected.
--   * `emailDeliveryStatus` defaults to 'ok' so transactional sends continue
--     unchanged for the existing user base.
--   * Two new tables (`EmailDeliveryEvent`, `ContactMessage`) — additive,
--     no impact on running queries.
--
-- Rollback (see ROLLBACK.sql in this directory).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) User: KVKK + Terms consent timestamps + email delivery status
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN "termsConsentAt"      TIMESTAMP(3),
  ADD COLUMN "kvkkConsentAt"       TIMESTAMP(3),
  ADD COLUMN "emailDeliveryStatus" TEXT NOT NULL DEFAULT 'ok';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) EmailDeliveryEvent: Brevo bounce/complaint/unsubscribe webhook log
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE "EmailDeliveryEvent" (
  "id"         TEXT          NOT NULL,
  "email"      TEXT          NOT NULL,
  "event"      TEXT          NOT NULL,
  "reason"     TEXT,
  "brevoId"    INTEGER,
  "messageId"  TEXT,
  "receivedAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rawPayload" JSONB         NOT NULL,

  CONSTRAINT "EmailDeliveryEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailDeliveryEvent_email_receivedAt_idx"
  ON "EmailDeliveryEvent" ("email", "receivedAt" DESC);

CREATE INDEX "EmailDeliveryEvent_event_receivedAt_idx"
  ON "EmailDeliveryEvent" ("event", "receivedAt" DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) ContactMessage: contact form submissions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE "ContactMessage" (
  "id"        TEXT          NOT NULL,
  "name"      TEXT          NOT NULL,
  "email"     TEXT          NOT NULL,
  "topic"     TEXT          NOT NULL,
  "message"   TEXT          NOT NULL,
  "ip"        TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactMessage_createdAt_idx"
  ON "ContactMessage" ("createdAt" DESC);

CREATE INDEX "ContactMessage_email_createdAt_idx"
  ON "ContactMessage" ("email", "createdAt" DESC);
