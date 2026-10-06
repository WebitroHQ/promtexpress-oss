-- Library search without an embedding provider: Postgres full-text search over the exemplars.
ALTER TABLE "PromptExemplar" ADD COLUMN IF NOT EXISTS "searchTsv" tsvector;

CREATE OR REPLACE FUNCTION prompt_exemplar_search_tsv() RETURNS trigger AS $$
BEGIN
  NEW."searchTsv" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW."intentTags", ARRAY[]::text[]), ' ')), 'A') ||
    setweight(to_tsvector('english', replace(coalesce(NEW."subCategory", ''), '-', ' ')), 'B') ||
    setweight(to_tsvector('english', left(coalesce(NEW."prompt", ''), 20000)), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prompt_exemplar_search_tsv_trg ON "PromptExemplar";
CREATE TRIGGER prompt_exemplar_search_tsv_trg
  BEFORE INSERT OR UPDATE OF "title", "intentTags", "subCategory", "prompt" ON "PromptExemplar"
  FOR EACH ROW EXECUTE FUNCTION prompt_exemplar_search_tsv();

-- Backfill existing rows through the trigger.
UPDATE "PromptExemplar" SET "title" = "title";

CREATE INDEX IF NOT EXISTS "PromptExemplar_searchTsv_idx" ON "PromptExemplar" USING GIN ("searchTsv");
