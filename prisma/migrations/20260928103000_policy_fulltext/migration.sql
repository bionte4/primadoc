-- Full-text search across policy metadata and extracted file text.
ALTER TABLE "Policy" ADD COLUMN "contentText" TEXT;
ALTER TABLE "Policy" ADD COLUMN "searchVector" tsvector;

CREATE OR REPLACE FUNCTION policy_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."searchVector" := to_tsvector(
    'simple',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW."documentNumber", '') || ' ' ||
    coalesce(NEW.category, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW."contentText", '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER policy_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, "documentNumber", category, description, "contentText"
ON "Policy"
FOR EACH ROW
EXECUTE FUNCTION policy_search_vector();

UPDATE "Policy" SET title = title;

CREATE INDEX "Policy_searchVector_idx" ON "Policy" USING GIN ("searchVector");
