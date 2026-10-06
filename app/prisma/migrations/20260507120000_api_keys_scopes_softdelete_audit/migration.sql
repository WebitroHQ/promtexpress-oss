-- API Keys: scopes persistence, soft-delete + audit trail
-- Plan: .claude/plans/2026-05-07-api-keys-feature-completion.md ADIM 1
--
-- 1) Adds `scopes TEXT[]` so granular authorization can be enforced at the
--    bearer-auth layer (previously validated but discarded — see
--    src/server/actions/api-keys.ts:45-48 comment).
-- 2) Adds `revokedAt`, `revokedBy` for soft-delete (replaces hard delete in
--    revokeApiKey — preserves audit history of when/by whom revoked).
-- 3) Adds `createdBy` to track admin-issued keys (NULL = self-issued).
-- 4) Adds two indexes: (userId, keyPrefix) for admin log filter performance,
--    (userId, revokedAt) for the active-list query in /api-keys page.
-- 5) Backfill: existing rows get scopes=['read','generate'] so previously
--    issued keys keep working under the new scope-enforced endpoints.
--    UI default for new keys is also ['read','generate'] (admin opt-in).

-- 1) New columns
ALTER TABLE "ApiKey"
  ADD COLUMN "scopes"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "createdBy" TEXT,
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "revokedBy" TEXT;

-- 2) Backfill scopes for pre-existing keys so they don't break under
--    the new scope-enforced /api/v1/* endpoints.
UPDATE "ApiKey"
SET "scopes" = ARRAY['read','generate']::TEXT[]
WHERE "scopes" = ARRAY[]::TEXT[];

-- 3) New indexes
CREATE INDEX "ApiKey_userId_keyPrefix_idx" ON "ApiKey"("userId", "keyPrefix");
CREATE INDEX "ApiKey_userId_revokedAt_idx" ON "ApiKey"("userId", "revokedAt");
