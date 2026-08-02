-- =============================================================================
-- The Next Big Thing: the five editorial categories, matching the navigation.
-- Applied to asypkbkiebjvvpimewfp via apply_migration on 2026-08-02; this file
-- is the repo mirror of exactly what ran.
--
-- First categories ever created outside 'finance'. Slug convention follows the
-- one existing row (finance-general = "<section-slug>-<name>"), which is also
-- the convention derivePhase() (src/domains/writing/schema/placement.ts) and
-- its tests already assume: stripping the section prefix yields the theme id
-- the reading side keys on (essays.phase = 'technology', ...).
--
-- Sort order is the navigation order: Technology, Economy, Society,
-- Environment, Governance.
--
-- RLS: the categories table already carries the full policy set
-- (categories_select_anon / _select_authenticated / _insert_admin /
-- _update_admin / _delete_admin) — policies are per-table, so these new rows
-- are covered; no policy change belongs here.
--
-- Foreign key resolved by subquery, never by literal UUID (house rule since
-- the greenfield reseed).
-- =============================================================================

INSERT INTO public.categories (section_id, slug, name, sort_order)
SELECT s.id, v.slug, v.name, v.sort_order
FROM public.sections s
CROSS JOIN (VALUES
  ('next-big-thing-technology',  'Technology',  1),
  ('next-big-thing-economy',     'Economy',     2),
  ('next-big-thing-society',     'Society',     3),
  ('next-big-thing-environment', 'Environment', 4),
  ('next-big-thing-governance',  'Governance',  5)
) AS v(slug, name, sort_order)
WHERE s.slug = 'next-big-thing'
ON CONFLICT (section_id, slug) DO NOTHING;

-- Assert: the section resolved and all five rows exist. A silent zero-row
-- insert (e.g. a mistyped section slug) must fail the migration, not pass it.
DO $assert$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.categories c
    JOIN public.sections s ON s.id = c.section_id
   WHERE s.slug = 'next-big-thing';
  IF n <> 5 THEN
    RAISE EXCEPTION 'expected 5 next-big-thing categories, found %', n;
  END IF;
END
$assert$;
