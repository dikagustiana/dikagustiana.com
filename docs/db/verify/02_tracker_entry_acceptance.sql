-- =============================================================================
-- tracker_entry acceptance (Plan 2.2). Run after the baseline and the two
-- tracker migrations, on the throwaway cluster described in README.md here:
--
--   psql -d dry -f supabase/migrations/20261011100000_tracker_entry.sql
--   psql -d dry -f supabase/migrations/20261011100100_tracker_entry_seed.sql
--   psql -d dry -f docs/db/verify/02_tracker_entry_acceptance.sql
--
-- Every check raises on failure, so a clean run prints only PASS lines and
-- the script exits 0. Fixture users match 01_rls_acceptance.sql.
-- =============================================================================
\set ON_ERROR_STOP 1
\pset pager off

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@dika.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'user@dika.test')
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role)
  VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin') ON CONFLICT DO NOTHING;

-- One published row to prove anon CAN read what is published. Rolled back at
-- the end of the script with everything else it touches.
BEGIN;
UPDATE public.tracker_entry SET published = true WHERE id = 'jetp-2025q2';

-- ---------------------------------------------------------------- seed
DO $$
BEGIN
  IF (SELECT count(*) FROM public.tracker_entry) <> 14 THEN
    RAISE EXCEPTION 'seed: expected 14 rows';
  END IF;
  IF (SELECT count(DISTINCT sector) FROM public.tracker_entry) <> 7 THEN
    RAISE EXCEPTION 'seed: expected 7 sectors';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tracker_entry WHERE verification <> 'verified') THEN
    RAISE EXCEPTION 'seed: every row must be verified';
  END IF;
  RAISE NOTICE 'PASS seed: 14 rows, 7 sectors, all verified';
END $$;

-- ---------------------------------------------------------------- anon
SET ROLE anon;
SELECT set_config('request.jwt.claims', NULL, true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.tracker_entry) <> 1 THEN
    RAISE EXCEPTION 'anon: expected to see exactly the one published row';
  END IF;
  RAISE NOTICE 'PASS anon reads published rows only (1 of 14)';
  BEGIN
    INSERT INTO public.tracker_entry (id, quarter, sector, status, finding, detail, sources, verification)
    VALUES ('other-2025q3', '2025Q3', 'other', 'unchanged', 'x', 'x',
            '[{"title":"t","url":"https://x.test","date":"2025-07-01"}]', 'verified');
    RAISE EXCEPTION 'anon: INSERT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS anon INSERT denied';
  END;
  BEGIN
    UPDATE public.tracker_entry SET finding = 'defaced';
    RAISE EXCEPTION 'anon: UPDATE succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS anon UPDATE denied';
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- signed-in non-admin
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2"}', true);
DO $$
DECLARE n int;
BEGIN
  IF (SELECT count(*) FROM public.tracker_entry) <> 1 THEN
    RAISE EXCEPTION 'non-admin: expected to see exactly the one published row';
  END IF;
  RAISE NOTICE 'PASS non-admin reads published rows only';
  UPDATE public.tracker_entry SET finding = 'defaced' WHERE id = 'jetp-2025q2';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'non-admin: UPDATE changed % rows', n; END IF;
  RAISE NOTICE 'PASS non-admin UPDATE changes nothing';
  BEGIN
    INSERT INTO public.tracker_entry (id, quarter, sector, status, finding, detail, sources, verification)
    VALUES ('other-2025q3', '2025Q3', 'other', 'unchanged', 'x', 'x',
            '[{"title":"t","url":"https://x.test","date":"2025-07-01"}]', 'verified');
    RAISE EXCEPTION 'non-admin: INSERT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS non-admin INSERT denied by RLS';
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- admin
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1"}', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.tracker_entry) <> 14 THEN
    RAISE EXCEPTION 'admin: expected to see all 14 rows';
  END IF;
  RAISE NOTICE 'PASS admin reads all rows, published or not';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- constraints
DO $$
BEGIN
  BEGIN
    INSERT INTO public.tracker_entry (id, quarter, sector, status, finding, detail, sources, verification)
    VALUES ('other-2025q3', '2025Q3', 'other', 'unchanged', 'x', 'x', '[]', 'verified');
    RAISE EXCEPTION 'empty sources accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS empty sources rejected';
  END;
  BEGIN
    INSERT INTO public.tracker_entry (id, quarter, sector, status, finding, detail, sources, verification)
    VALUES ('other-2025q3', '2025Q3', 'other', 'unchanged', 'x', 'x',
            '[{"title":"t","url":"https://x.test"}]', 'verified');
    RAISE EXCEPTION 'source without doc_no or date accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS source with neither doc_no nor date rejected';
  END;
  BEGIN
    INSERT INTO public.tracker_entry (id, quarter, sector, status, finding, detail, sources, verification)
    VALUES ('other-2025q3', '2025Q3', 'other', 'unchanged', 'x', 'x',
            '[{"title":"t","url":"http://x.test","doc_no":"n"}]', 'verified');
    RAISE EXCEPTION 'non-https url accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS non-https source url rejected';
  END;
  BEGIN
    INSERT INTO public.tracker_entry (id, quarter, sector, status, finding, detail, sources, verification, published)
    VALUES ('other-2025q3', '2025Q3', 'other', 'unchanged', 'x', 'x',
            '[{"title":"t","url":"https://x.test","doc_no":"n"}]', 'unverifiable', true);
    RAISE EXCEPTION 'published unverifiable row accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS unverifiable row cannot be published';
  END;
  BEGIN
    INSERT INTO public.tracker_entry (id, quarter, sector, status, finding, detail, sources, verification)
    VALUES ('other-2025q1-dup', '2025Q1', 'other', 'unchanged', 'x', 'x',
            '[{"title":"t","url":"https://x.test","doc_no":"n"}]', 'verified');
    RAISE EXCEPTION 'second row for one sector and quarter accepted';
  EXCEPTION WHEN check_violation OR unique_violation THEN
    RAISE NOTICE 'PASS one entry per sector per quarter';
  END;
END $$;

ROLLBACK;
\echo tracker_entry acceptance: all checks passed
