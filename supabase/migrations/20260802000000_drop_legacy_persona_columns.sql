-- =============================================================================
-- APPLIED 2026-08-01 after the rehearsal below passed. Moved out of _pending.
--
-- Drops the four legacy persona payload columns, superseded by
-- `essays.presentation` in 20260801060000_drop_council_add_presentation.sql.
--
-- WHY THIS IS A SEPARATE MIGRATION
-- A destructive drop and an unverified read path must never ship together. The
-- previous migration copied the payload and left the originals in place so the
-- app could be switched over and observed first. This one removes the safety
-- net, and is therefore irreversible on the free tier (no PITR).
--
-- REHEARSAL THAT PRECEDED THE APPLY (all four preconditions met):
--   * Built a scratch Postgres replica (raw pg, never `supabase db reset`),
--     applied the harness + all migrations, seeded fa-07-01's real payload from
--     the content dump, then ran THIS migration: all four columns dropped and
--     `presentation` survived with 5 references / 3 key takeaways / 140-char deck.
--   * Removed every `economist_fields` select from the app FIRST. This ordering
--     is not optional: selecting a dropped column is a hard PostgREST error, not
--     a silent null, so a stale select would have taken the pages down.
--   * With the app already running post-drop-shaped (no legacy column selected),
--     verified the public page (deck + all 5 references + takeaways, 0 bad HTTP)
--     and the admin editor (deck + references + takeaways, 0 bad HTTP).
--   * Re-verified both after the live apply. Identical results.
--
-- ORIGINAL PRECONDITIONS — checked before applying:
--   1. fa-07-01's public page has been rendering deck + 5 references + 3 key
--      takeaways from `presentation` in production for long enough to trust.
--      (Verified once at authoring time on 2026-08-01 against the live DB via
--      a local dev server; that is NOT the same as production having served
--      it, because the Vercel env vars were still unset at that point.)
--   2. `npm run test:unit` passes, including tests/unit/presentation.test.ts,
--      which pins that `presentation` wins over the legacy columns.
--   3. The verification query at the bottom of this file returns zero rows.
--   4. A content dump has been taken: `npm run dump:content` (scripts/dump-content.mjs).
--
-- AFTER APPLYING, in the app:
--   - delete the `@deprecated` fields and the fallback chain in
--     src/lib/presentation.ts (resolvePresentation becomes `row.presentation ?? {}`)
--   - drop `economist_fields` from the select in src/hooks/queries/useFinance.ts
--   - drop the legacy field from the row types in the four essay pages
--   - regenerate src/integrations/supabase/types.ts
-- =============================================================================

-- Guard: refuse to drop while any row still holds a payload that did not make
-- it into `presentation`.
DO $$
DECLARE orphaned integer;
BEGIN
  SELECT count(*) INTO orphaned
  FROM public.essays
  WHERE COALESCE(economist_fields, manager_fields, educator_fields, coach_fields) IS NOT NULL
    AND presentation IS NULL;

  IF orphaned > 0 THEN
    RAISE EXCEPTION
      'Refusing to drop: % row(s) still have a persona payload with no presentation', orphaned;
  END IF;
END $$;

ALTER TABLE public.essays
  DROP COLUMN IF EXISTS manager_fields,
  DROP COLUMN IF EXISTS economist_fields,
  DROP COLUMN IF EXISTS educator_fields,
  DROP COLUMN IF EXISTS coach_fields;

-- Verification query — must return zero rows once applied:
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='essays'
--     and column_name in ('manager_fields','economist_fields','educator_fields','coach_fields');
