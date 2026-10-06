-- Seed TaxonomyCategory from existing PromptTemplate.category values
-- Idempotent: ON CONFLICT no-op
-- Run AFTER faz2_models migration.

-- 1) Insert distinct (modality, category) pairs as TaxonomyCategory rows
INSERT INTO "TaxonomyCategory" (id, modality, slug, name, "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  modality,
  lower(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g')) AS slug,
  category AS name,
  ROW_NUMBER() OVER (PARTITION BY modality ORDER BY category) - 1 AS sortOrder,
  TRUE,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT modality, category
  FROM "PromptTemplate"
  WHERE category IS NOT NULL AND category <> ''
) t
ON CONFLICT (modality, slug) DO NOTHING;

-- 2) Backfill PromptTemplate.categoryId from match
UPDATE "PromptTemplate" pt
SET "categoryId" = tc.id
FROM "TaxonomyCategory" tc
WHERE pt."categoryId" IS NULL
  AND pt.modality = tc.modality
  AND lower(regexp_replace(pt.category, '[^a-zA-Z0-9]+', '-', 'g')) = tc.slug;
