-- =============================================================================
-- Placement coherence, extended for the first opened editorial section.
-- Applied to asypkbkiebjvvpimewfp via apply_migration on 2026-08-02; this file
-- is the repo mirror of exactly what ran.
--
-- The original rule (20260731 essay_placement_coherence) guards one direction:
-- a CURRICULUM essay (module_id IS NOT NULL) must sit in the finance editorial
-- tree. Until today the other direction could not occur — every category
-- belonged to 'finance'. With next-big-thing categories live, an essay can now
-- point at an editorial category, and nothing stopped e.g. a finance or
-- accounting essay carrying category 'next-big-thing-technology' — which would
-- surface it in that category's sibling navigation (joined by category_id).
--
-- New rule, added below the original: an essay whose category belongs to a
-- NON-finance section must itself live in that section (NEW.section equals the
-- category's section slug).
--
-- Explicitly still tolerated (per the original migration's design note): a
-- non-finance essay holding the catch-all finance-general category. Sections
-- without categories of their own (accounting, books, ielts, tools) have no
-- other legal value while essays.category_id is NOT NULL DEFAULT
-- finance-general. That hole closes per-section as each gets its own
-- categories — recorded in docs/DECISIONS.md.
--
-- No existing row can violate the new rule (all 162 essays carry finance
-- categories); the assert at the end proves it against live data anyway.
--
-- Verified live immediately after applying, both directions, ERRCODE 23514:
--   UPDATE fa-07-01 (module-placed) to category next-big-thing-technology
--     → "carries a curriculum module_id but an editorial category"
--   UPDATE site-rebuild-note (module-less, section finance) to that category
--     → "carries a category from section next-big-thing but section cache
--        says finance"
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_essay_placement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  cat_section text;
BEGIN
  -- essays.category_id is NOT NULL; if it somehow fails to resolve,
  -- cat_section stays NULL and the curriculum branch below fails closed,
  -- exactly as the original version did.
  SELECT s.slug INTO cat_section
    FROM public.categories c
    JOIN public.sections s ON s.id = c.section_id
   WHERE c.id = NEW.category_id;

  IF NEW.module_id IS NOT NULL THEN
    IF cat_section IS DISTINCT FROM 'finance' THEN
      RAISE EXCEPTION
        'incoherent placement: essay % carries a curriculum module_id but an editorial category (section %)',
        NEW.slug, cat_section
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.section IS DISTINCT FROM 'finance' THEN
      RAISE EXCEPTION
        'incoherent placement: essay % carries a curriculum module_id but section cache says %',
        NEW.slug, NEW.section
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Editorial direction (new): a category from a non-finance section pins the
  -- essay to that section. finance-general stays legal everywhere (the
  -- tolerated catch-all for sections that have no categories yet).
  IF cat_section IS NOT NULL
     AND cat_section <> 'finance'
     AND NEW.section IS DISTINCT FROM cat_section THEN
    RAISE EXCEPTION
      'incoherent placement: essay % carries a category from section % but section cache says %',
      NEW.slug, cat_section, NEW.section
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- The trigger binding (validate_essay_placement_trigger, BEFORE INSERT OR
-- UPDATE) is untouched: CREATE OR REPLACE swaps the body with no window in
-- which the guard is absent.

DO $assert$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.essays e
    JOIN public.categories c ON c.id = e.category_id
    JOIN public.sections s ON s.id = c.section_id
   WHERE s.slug <> 'finance' AND e.section IS DISTINCT FROM s.slug;
  IF n > 0 THEN
    RAISE EXCEPTION '% existing essays violate editorial placement coherence', n;
  END IF;
END
$assert$;
