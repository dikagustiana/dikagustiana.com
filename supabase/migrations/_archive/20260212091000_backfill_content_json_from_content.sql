-- Backfill canonical JSON content from legacy string content where possible.
-- Only copy rows where content parses as JSON and has type='doc'.

CREATE OR REPLACE FUNCTION public.try_parse_jsonb(input_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parsed JSONB;
BEGIN
  BEGIN
    parsed := input_text::jsonb;
    RETURN parsed;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

WITH parsed AS (
  SELECT
    id,
    public.try_parse_jsonb(content) AS parsed_json
  FROM public.essays
  WHERE content IS NOT NULL
    AND btrim(content) <> ''
    AND content_json IS NULL
)
UPDATE public.essays e
SET content_json = p.parsed_json
FROM parsed p
WHERE e.id = p.id
  AND p.parsed_json IS NOT NULL
  AND (p.parsed_json ->> 'type') = 'doc';
