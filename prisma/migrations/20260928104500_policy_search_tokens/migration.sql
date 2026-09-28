-- Split punctuation so words inside filenames such as policy-sample.pdf are searchable.
CREATE OR REPLACE FUNCTION policy_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."searchVector" := to_tsvector(
    'simple',
    regexp_replace(
      coalesce(NEW.title, '') || ' ' ||
      coalesce(NEW."documentNumber", '') || ' ' ||
      coalesce(NEW.category, '') || ' ' ||
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW."contentText", ''),
      '[[:punct:]]+',
      ' ',
      'g'
    )
  );
  RETURN NEW;
END;
$$;

UPDATE "Policy" SET title = title;
