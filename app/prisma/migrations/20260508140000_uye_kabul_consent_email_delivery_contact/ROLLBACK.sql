-- Rollback for 20260508140000_uye_kabul_consent_email_delivery_contact
--
-- Apply manually only if the deploy fails AFTER migration but BEFORE rest
-- of the release. Prisma does not run this automatically.
--
-- Order: drop new tables first, then User columns. Indexes drop with tables.

DROP INDEX IF EXISTS "ContactMessage_email_createdAt_idx";
DROP INDEX IF EXISTS "ContactMessage_createdAt_idx";
DROP TABLE IF EXISTS "ContactMessage";

DROP INDEX IF EXISTS "EmailDeliveryEvent_event_receivedAt_idx";
DROP INDEX IF EXISTS "EmailDeliveryEvent_email_receivedAt_idx";
DROP TABLE IF EXISTS "EmailDeliveryEvent";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "emailDeliveryStatus",
  DROP COLUMN IF EXISTS "kvkkConsentAt",
  DROP COLUMN IF EXISTS "termsConsentAt";
