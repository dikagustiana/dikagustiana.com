-- =============================================================================
-- Retire the figures on fsli_pages (PRD D2; owner's answer of 11 October
-- 2026, docs/spec/00_discovery.md §19 item 1).
--
-- NOT APPLIED TO PRODUCTION until the FSLI viewer (PR 1,
-- dikagustiana/dikagustiana.com#73) is live: until then the production
-- FsliList and FsliDetail read these three columns. Apply with
-- apply_migration once that deploy is out; after PR 1 nothing in the app
-- reads them.
--
-- fsli_pages stays. It is the index of the 24 line-item pages at
-- /accounting/fsli/:slug and of the essays filed under them through
-- essays.fsli_slug, 13 of them published. What retires is the figures it
-- carried: dec_2024, dec_2023 and notes_ref held values the audited statements
-- do not support (PRD §A1). The statements now live in fs_line, every figure
-- with its PDF page and checked before loading; a line-item page reads its
-- figures from the fs_line row that names it (fs_line.fsli_slug).
--
-- Renamed, not dropped, so the change reverses (Plan §Rollback).
--
-- DOWN:
--   ALTER TABLE public.fsli_pages RENAME COLUMN legacy_dec_2024  TO dec_2024;
--   ALTER TABLE public.fsli_pages RENAME COLUMN legacy_dec_2023  TO dec_2023;
--   ALTER TABLE public.fsli_pages RENAME COLUMN legacy_notes_ref TO notes_ref;
-- =============================================================================

ALTER TABLE public.fsli_pages RENAME COLUMN dec_2024  TO legacy_dec_2024;
ALTER TABLE public.fsli_pages RENAME COLUMN dec_2023  TO legacy_dec_2023;
ALTER TABLE public.fsli_pages RENAME COLUMN notes_ref TO legacy_notes_ref;

COMMENT ON COLUMN public.fsli_pages.legacy_dec_2024 IS
  'Retired 2026-10-11 (PRD D2): the 31 Dec 2024 figure shown before the audited re-extraction. Wrong for several rows (PRD §A1). Not read by the app; figures come from fs_line.';
COMMENT ON COLUMN public.fsli_pages.legacy_dec_2023 IS
  'Retired 2026-10-11 (PRD D2): the 31 Dec 2023 figure shown before the audited re-extraction. Not read by the app; figures come from fs_line.';
COMMENT ON COLUMN public.fsli_pages.legacy_notes_ref IS
  'Retired 2026-10-11 (PRD D2): note references shown before the audited re-extraction, several wrong (PRD §A1). Not read by the app; note references come from fs_line.';
