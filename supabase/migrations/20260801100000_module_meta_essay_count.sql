-- =============================================================================
-- Truthful curriculum counts without exposing drafts.
--
-- The module index rendered "0/0 lessons". The data was right and the
-- interface was lying: `total` was computed by counting rows in `essays` for
-- each module, and RLS correctly hides the 160 unpublished stubs from an
-- anonymous visitor, so both numbers came back 0.
--
-- The planned count must therefore be reachable WITHOUT read access to drafts.
-- It goes in `finance_modules.module_meta`, which is already anon-readable,
-- as `essay_count`.
--
-- Source of the number: the current stub count per module. Those 161 stubs
-- were seeded directly from the framework document, which states the count per
-- module, so counting them here reproduces the framework's own figure rather
-- than inventing one. (The framework's overview table says 55 Fundamentals
-- essays while its own module lists sum to 56; the module detail is
-- authoritative and the seed is correct at 161.)
--
-- Explicitly NOT solved by making drafts anon-readable.
-- =============================================================================

UPDATE public.finance_modules m
SET module_meta = COALESCE(m.module_meta, '{}'::jsonb)
                  || jsonb_build_object('essay_count', c.n)
FROM (
  SELECT module_id, count(*)::int AS n
  FROM public.essays
  WHERE module_id IS NOT NULL
  GROUP BY module_id
) c
WHERE c.module_id = m.id;

-- A module with no stubs yet is planned-zero, not unknown.
UPDATE public.finance_modules m
SET module_meta = COALESCE(m.module_meta, '{}'::jsonb) || jsonb_build_object('essay_count', 0)
WHERE NOT (COALESCE(m.module_meta, '{}'::jsonb) ? 'essay_count');

COMMENT ON COLUMN public.finance_modules.module_meta IS
  'Per-module display metadata. `display_label` carries the framework label (08A, QM1). `essay_count` is the PLANNED lesson count from the framework, stored here because it must be readable by anonymous visitors who cannot see draft essays — the module index shows "n of N published" from it.';

-- Assert the totals line up with the seed before this migration is accepted.
DO $$
DECLARE total_planned integer; total_stubs integer;
BEGIN
  SELECT sum((module_meta->>'essay_count')::int) INTO total_planned FROM public.finance_modules;
  SELECT count(*) INTO total_stubs FROM public.essays WHERE module_id IS NOT NULL;

  IF total_planned IS DISTINCT FROM total_stubs THEN
    RAISE EXCEPTION 'essay_count totals % but there are % placed essays', total_planned, total_stubs;
  END IF;
END $$;
