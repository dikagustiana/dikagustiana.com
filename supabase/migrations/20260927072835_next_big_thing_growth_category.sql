-- =============================================================================
-- The Next Big Thing: the sixth editorial category, Growth.
-- Applied to asypkbkiebjvvpimewfp via apply_migration on 2026-09-27; this file
-- is the repo mirror of exactly what ran.
--
-- Curation entries: posts built around someone else's writing, with the
-- owner's commentary as the substance. The slug follows the 2026-08-02
-- convention ("<section-slug>-<theme id>"), which derivePhase()
-- (src/domains/writing/schema/placement.ts) strips back to the theme id the
-- reading side keys on (essays.phase = 'growth').
--
-- sort_order 6: last, after Governance. That is the position the theme holds
-- in NEXT_BIG_THING_THEMES (src/config/nextBigThingThemes.ts), whose array
-- order is the display order everywhere.
--
-- RLS: public.categories already carries its full policy set, and policies
-- are per-table, so the new row is covered; no policy change belongs here.
--
-- Foreign key resolved by subquery, never by literal UUID.
-- =============================================================================

INSERT INTO public.categories (section_id, slug, name, sort_order)
SELECT s.id, 'next-big-thing-growth', 'Growth', 6
FROM public.sections s
WHERE s.slug = 'next-big-thing'
ON CONFLICT (section_id, slug) DO NOTHING;

-- Assert: the section resolved and all six rows exist. A silent zero-row
-- insert (e.g. a mistyped section slug) must fail the migration, not pass it.
DO $assert$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.categories c
    JOIN public.sections s ON s.id = c.section_id
   WHERE s.slug = 'next-big-thing';
  IF n <> 6 THEN
    RAISE EXCEPTION 'expected 6 next-big-thing categories, found %', n;
  END IF;
END
$assert$;
