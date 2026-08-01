-- =============================================================================
-- Remove the AI council; collapse the four persona payload columns into one.
--
-- Applied to asypkbkiebjvvpimewfp via apply_migration; this file is the repo
-- mirror.
--
-- Two independent things that share the word "persona" and must not be
-- confused (see docs/DECISIONS.md):
--
--   1. The AI writing council — deleted outright. council_sessions held zero
--      rows. Design archived at docs/archive/COUNCIL_DESIGN.md.
--
--   2. essays.{manager,economist,educator,coach}_fields — NOT the council.
--      Despite the persona names these hold the essay's presentation payload
--      (deck, references[], key_takeaways[], hero_caption, author_bio). On
--      fa-07-01 this is where the References section and the three key
--      takeaways actually live. Dropping them would destroy published content.
--
-- The four-column design had voice_role selecting which column was live, so
-- three were always NULL. In practice the read path never switched on
-- voice_role at all — every essay page reads economist_fields directly — so
-- the selector was already vestigial. This migration collapses the four into a
-- single `presentation` column.
--
-- DELIBERATELY NOT DROPPING the four legacy columns here. The new read path is
-- untested against production until it ships; a destructive drop and an
-- unverified read must not land in the same migration. The drop is staged as a
-- separate follow-up once the public page is confirmed rendering from
-- `presentation`.
-- =============================================================================

-- 1. The council table. Zero rows; verified before dropping.
DROP TABLE IF EXISTS public.council_sessions;

-- 2. The single presentation payload column.
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS presentation jsonb;

COMMENT ON COLUMN public.essays.presentation IS
  'Essay presentation payload: {deck, references[], key_takeaways[], hero_caption, author_bio}. Replaces the four {manager,economist,educator,coach}_fields columns, which are retained but no longer written and will be dropped in a follow-up migration.';

-- 3. Backfill. COALESCE across all four so nothing is missed regardless of
--    which persona column a row happened to use. Only rows with an actual
--    payload are touched; `presentation IS NULL` keeps this re-runnable.
UPDATE public.essays
SET presentation = COALESCE(economist_fields, manager_fields, educator_fields, coach_fields)
WHERE presentation IS NULL
  AND COALESCE(economist_fields, manager_fields, educator_fields, coach_fields) IS NOT NULL;

-- 4. Fail the migration loudly if the copy lost anything. A silent partial
--    backfill is exactly the failure mode that would quietly blank the
--    References block on the published page.
DO $$
DECLARE
  bad_count  integer;
  ref_count  integer;
  tak_count  integer;
BEGIN
  SELECT count(*) INTO bad_count
  FROM public.essays
  WHERE COALESCE(economist_fields, manager_fields, educator_fields, coach_fields) IS NOT NULL
    AND presentation IS DISTINCT FROM
        COALESCE(economist_fields, manager_fields, educator_fields, coach_fields);

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'presentation backfill mismatch on % row(s)', bad_count;
  END IF;

  -- fa-07-01 is the only essay with a real payload; assert its shape exactly.
  SELECT jsonb_array_length(presentation->'references'),
         jsonb_array_length(presentation->'key_takeaways')
    INTO ref_count, tak_count
  FROM public.essays WHERE slug = 'fa-07-01';

  IF ref_count IS DISTINCT FROM 5 THEN
    RAISE EXCEPTION 'fa-07-01 expected 5 references, found %', ref_count;
  END IF;
  IF tak_count IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'fa-07-01 expected 3 key_takeaways, found %', tak_count;
  END IF;
  IF (SELECT length(presentation->>'deck') FROM public.essays WHERE slug='fa-07-01') IS NULL THEN
    RAISE EXCEPTION 'fa-07-01 deck did not survive the copy';
  END IF;
END $$;

-- 5. Mark the legacy columns as frozen so the next reader knows the state.
COMMENT ON COLUMN public.essays.economist_fields IS
  'LEGACY, no longer written (superseded by presentation). Retained until the follow-up drop migration. Was the live payload for voice_role = economist.';
COMMENT ON COLUMN public.essays.manager_fields IS
  'LEGACY, no longer written and never populated (superseded by presentation). Retained until the follow-up drop migration.';
COMMENT ON COLUMN public.essays.educator_fields IS
  'LEGACY, no longer written and never populated (superseded by presentation). Retained until the follow-up drop migration.';
COMMENT ON COLUMN public.essays.coach_fields IS
  'LEGACY, no longer written and never populated (superseded by presentation). Retained until the follow-up drop migration.';

-- voice_role is intentionally left in place. Nothing reader-facing renders its
-- value (the one public use is a boolean "does this essay have a register"
-- check), and sections.voice_role — a different column — is the real source of
-- the per-section editorial register. It is now a plain label with no
-- column-selection semantics, because there is only one column to select.
COMMENT ON COLUMN public.essays.voice_role IS
  'Editorial register label only. No longer selects a payload column (presentation is the single payload). sections.voice_role carries the per-section register.';
