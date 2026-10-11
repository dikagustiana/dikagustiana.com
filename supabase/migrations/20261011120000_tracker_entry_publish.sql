-- =============================================================================
-- Publish the Green Transition Tracker register (PRD §B6, Plan 2.2 follow-up).
--
-- The fourteen entries were signed off by Dika on 11 October 2026
-- (docs/spec/tracker_sources.md) and seeded unpublished by
-- 20261011100100_tracker_entry_seed.sql. He reviewed the page on the preview
-- deployment the same day and approved publishing.
--
-- Only verified rows are touched; the table's own CHECK would refuse to
-- publish an unverifiable one in any case. The id list is checked against
-- supabase/content/tracker_entries.json by tests/unit/tracker_copy.test.tsx.
--
-- DOWN: the same UPDATE with published = false.
-- =============================================================================

UPDATE public.tracker_entry
SET published = true
WHERE verification = 'verified'
  AND id IN (
    'geothermal-2025q1', 'geothermal-2025q2',
    'solar-2025q1', 'solar-2025q2',
    'pln_procurement-2025q1', 'pln_procurement-2025q2',
    'jetp-2025q1', 'jetp-2025q2',
    'ojk_taxonomy-2025q1', 'ojk_taxonomy-2025q2',
    'danantara-2025q1', 'danantara-2025q2',
    'other-2025q1', 'other-2025q2'
  );
