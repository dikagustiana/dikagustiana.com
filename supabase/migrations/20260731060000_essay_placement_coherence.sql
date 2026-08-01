-- =============================================================================
-- Placement coherence for the two parallel taxonomy trees on essays.
-- Applied to asypkbkiebjvvpimewfp via apply_migration on 2026-07-31; this file
-- is the repo mirror of exactly what ran.
--
-- The editorial tree (sections -> categories -> essays.category_id + section)
-- and the curriculum tree (finance_sections -> finance_modules ->
-- essays.module_id) coexist on one table with nothing keeping them coherent:
-- nothing stopped an essay holding a green-transition category_id and a
-- finance module_id at once.
--
-- Rule enforced: a CURRICULUM essay (module_id IS NOT NULL) must live in the
-- finance editorial tree — its category must belong to the section with slug
-- 'finance' AND its denormalised section cache must say 'finance'. Editorial
-- essays (module_id IS NULL) are unconstrained here; the catch-all default
-- category (finance-general) on non-finance sections is today's tolerated
-- design for uncategorised editorial drafts and is NOT made illegal by this
-- migration.
--
-- Mechanism: a trigger, not a CHECK — a CHECK constraint cannot reference
-- another table (the category's section lives two joins away). Verified live:
-- an UPDATE giving fa-07-01 both a curriculum module_id and a green-transition
-- category_id was refused with ERRCODE check_violation, and refusal is
-- fail-closed when the category row does not resolve at all.
--
-- Known, deliberately unaddressed here: changing an essay's category does NOT
-- update the denormalised essays.section cache (EditorialFeed / useEssays /
-- useAdminEssays / useUnifiedContent all filter on it). That sync question is
-- owned by the writing-experience workstream; this trigger only refuses
-- cross-tree incoherence.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_essay_placement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  cat_section text;
BEGIN
  IF NEW.module_id IS NOT NULL THEN
    SELECT s.slug INTO cat_section
      FROM public.categories c
      JOIN public.sections s ON s.id = c.section_id
     WHERE c.id = NEW.category_id;

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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_essay_placement_trigger ON public.essays;
CREATE TRIGGER validate_essay_placement_trigger
  BEFORE INSERT OR UPDATE ON public.essays
  FOR EACH ROW EXECUTE FUNCTION public.validate_essay_placement();

DO $assert$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.essays e
    JOIN public.categories c ON c.id = e.category_id
    JOIN public.sections s ON s.id = c.section_id
   WHERE e.module_id IS NOT NULL AND (s.slug <> 'finance' OR e.section <> 'finance');
  IF n > 0 THEN
    RAISE EXCEPTION '% existing essays violate placement coherence', n;
  END IF;
END
$assert$;
