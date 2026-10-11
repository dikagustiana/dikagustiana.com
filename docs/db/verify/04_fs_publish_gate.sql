-- =============================================================================
-- The publish gate (Plan 1.7, 20261011190000_fs_publish_gate.sql) against the
-- PHE FY2024 load (20261011180000), on the throwaway cluster described in
-- README.md here, with the period still a draft:
--
--   psql -d dry -f supabase/migrations/20261011180000_fs_phe_fy2024_load.sql
--   psql -d dry -f supabase/migrations/20261011190000_fs_publish_gate.sql
--   psql -d dry -f docs/db/verify/04_fs_publish_gate.sql
--
-- Every check raises on failure, so a clean run prints only PASS lines and the
-- script exits 0. Everything it writes is rolled back. Fixture users match
-- 01_rls_acceptance.sql.
--
-- The first check also runs read-only against production, published or not:
-- fs_tieout() on the stored rows equals, rule for rule and character for
-- character, the checker run the loader stored (itself hash-verified against
-- checks.json when it was loaded).
-- =============================================================================
\set ON_ERROR_STOP 1
\pset pager off

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@dika.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'user@dika.test')
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role)
  VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin') ON CONFLICT DO NOTHING;

BEGIN;

-- --------------------------------------------------------------- parity
-- The SQL rules and the checker agree on every rule both run. The checker's
-- LABEL, PAGE, SIGN, GOLDEN and STRUCT:header have no SQL counterpart.
DO $$
DECLARE
  pid  uuid := md5('https://dikagustiana.com/fs/phe/fy2024')::uuid;
  n    int;
  bad  text;
BEGIN
  WITH t AS (SELECT * FROM public.fs_tieout(pid)),
  c AS (
    SELECT k.rule_id, k.statement, k.description, k.expected, k.actual, k.diff, k.passed
      FROM public.fs_check k
     WHERE k.period_id = pid
       AND k.run_at = (SELECT min(run_at) FROM public.fs_check WHERE period_id = pid)
       AND k.rule_id !~ '^(LABEL|PAGE|SIGN|GOLDEN):' AND k.rule_id <> 'STRUCT:header'
  )
  SELECT count(*), string_agg(coalesce(t.rule_id, c.rule_id), ', ')
    INTO n, bad
    FROM t FULL JOIN c ON c.rule_id = t.rule_id
   WHERE (t.rule_id, t.statement, t.description, t.expected, t.actual, t.diff, t.passed)
         IS DISTINCT FROM (c.rule_id, c.statement, c.description, c.expected, c.actual, c.diff, c.passed);
  IF n > 0 THEN
    RAISE EXCEPTION 'fs_tieout and the checker differ on % rule(s): %', n, bad;
  END IF;
  SELECT count(*) INTO n FROM public.fs_tieout(pid);
  IF n <> 125 THEN
    RAISE EXCEPTION 'fs_tieout ran % rules on PHE FY2024, expected 125', n;
  END IF;
  RAISE NOTICE 'PASS fs_tieout equals the checker on all 125 shared rules';
END $$;

-- --------------------------------------------------------------- mutations
-- One change at a time, each undone: the rules that fail are exactly the ones
-- the change breaks.
CREATE FUNCTION pg_temp.fails_after(mutation text) RETURNS text[]
LANGUAGE plpgsql AS $$
DECLARE
  got text[];
BEGIN
  BEGIN
    EXECUTE mutation;
    SELECT coalesce(array_agg(t.rule_id ORDER BY t.rule_id), '{}')
      INTO got
      FROM public.fs_tieout(md5('https://dikagustiana.com/fs/phe/fy2024')::uuid) t
     WHERE NOT t.passed;
    RAISE EXCEPTION 'undo';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'undo' THEN RAISE; END IF;
  END;
  RETURN got;
END $$;

CREATE FUNCTION pg_temp.expect_fails(what text, mutation text, want text[]) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  got text[] := pg_temp.fails_after(mutation);
  sorted text[] := (SELECT array_agg(x ORDER BY x) FROM unnest(want) x);
BEGIN
  IF got IS DISTINCT FROM sorted THEN
    RAISE EXCEPTION '%: failed %, expected %', what, got, sorted;
  END IF;
  RAISE NOTICE 'PASS % fails exactly %', what, array_to_string(sorted, ', ');
END $$;

SELECT pg_temp.expect_fails('cash +1 (2024)',
  $m$UPDATE public.fs_line SET value_cy = value_cy + 1
      WHERE period_id = md5('https://dikagustiana.com/fs/phe/fy2024')::uuid AND statement = 'sofp' AND sort_order = 30$m$,
  ARRAY['FOOT:sofp:total_current_assets:cy', 'XS-CF-CASH:cy']);

SELECT pg_temp.expect_fails('finance income -1 (2023)',
  $m$UPDATE public.fs_line SET value_py = value_py - 1
      WHERE period_id = md5('https://dikagustiana.com/fs/phe/fy2024')::uuid AND statement = 'pl_oci' AND sort_order = 110$m$,
  ARRAY['FOOT:pl_oci:profit_before_tax:py', 'PL-PBT:py']);

SELECT pg_temp.expect_fails('an OCI item +1 (2024)',
  $m$UPDATE public.fs_line SET value_cy = value_cy + 1
      WHERE period_id = md5('https://dikagustiana.com/fs/phe/fy2024')::uuid AND statement = 'pl_oci' AND sort_order = 200$m$,
  ARRAY['FOOT:pl_oci:total_comprehensive_income:cy', 'PL-TCI:cy']);

SELECT pg_temp.expect_fails('a declared difference of +2 where the FS prints +1',
  $m$UPDATE public.fs_line SET printed_diff_cy = 2
      WHERE period_id = md5('https://dikagustiana.com/fs/phe/fy2024')::uuid AND statement = 'cf' AND sort_order = 100$m$,
  ARRAY['FOOT:cf:net_cash_operating:cy']);

SELECT pg_temp.expect_fails('the declared difference removed',
  $m$UPDATE public.fs_line SET printed_diff_cy = NULL, printed_diff_note = NULL
      WHERE period_id = md5('https://dikagustiana.com/fs/phe/fy2024')::uuid AND statement = 'cf' AND sort_order = 100$m$,
  ARRAY['FOOT:cf:net_cash_operating:cy']);

SELECT pg_temp.expect_fails('the SoCE NCI share of 2024 TCI +1',
  $m$UPDATE public.fs_soce_cell SET value = value + 1
      WHERE period_id = md5('https://dikagustiana.com/fs/phe/fy2024')::uuid AND row_key = 'tci_2024' AND col_key = 'nci'$m$,
  ARRAY['SOCE-ROW:tci_2024:total', 'SOCE-COL:nci:balance_2024', 'XS-SOCE-PROFIT:nci:cy']);

SELECT pg_temp.expect_fails('cash summing into a header',
  $m$UPDATE public.fs_line SET parent_id = md5('https://dikagustiana.com/fs/phe/fy2024/sofp/10')::uuid
      WHERE period_id = md5('https://dikagustiana.com/fs/phe/fy2024')::uuid AND statement = 'sofp' AND sort_order = 30$m$,
  ARRAY['STRUCT:sofp:30', 'FOOT:sofp:total_current_assets:cy', 'FOOT:sofp:total_current_assets:py']);

SELECT pg_temp.expect_fails('an item summing into nothing',
  $m$UPDATE public.fs_line SET parent_id = NULL
      WHERE period_id = md5('https://dikagustiana.com/fs/phe/fy2024')::uuid AND statement = 'sofp' AND sort_order = 200$m$,
  ARRAY['COVER:sofp:200', 'FOOT:sofp:total_non_current_assets:cy', 'FOOT:sofp:total_non_current_assets:py']);

SELECT pg_temp.expect_fails('the NCI row without its key',
  $m$UPDATE public.fs_line SET line_key = NULL
      WHERE period_id = md5('https://dikagustiana.com/fs/phe/fy2024')::uuid AND statement = 'sofp' AND line_key = 'nci'$m$,
  ARRAY['SOFP-EQ:cy', 'SOFP-EQ:py', 'XS-SOCE-BAL:nci:cy', 'XS-SOCE-BAL:nci:py']);

-- --------------------------------------------------------------- privileges
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.fs_tieout(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.fs_tieout(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.fs_run_publish_gate(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.fs_run_publish_gate(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.fs_publish_period(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'a client role can execute a function it should not';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.fs_publish_period(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute fs_publish_period';
  END IF;
  RAISE NOTICE 'PASS only fs_publish_period is executable by a client role, and only by authenticated';
END $$;

-- --------------------------------------------------------------- a failing gate
-- With a one-unit error in place the gate records its run and publishes nothing.
DO $$
DECLARE
  pid uuid := md5('https://dikagustiana.com/fs/phe/fy2024')::uuid;
  r   record;
BEGIN
  IF (SELECT status FROM public.fs_period WHERE id = pid) <> 'draft' THEN
    RAISE EXCEPTION 'run this file while PHE FY2024 is a draft';
  END IF;
  UPDATE public.fs_line SET value_cy = value_cy + 1 WHERE period_id = pid AND statement = 'sofp' AND sort_order = 30;
  SELECT * INTO r FROM public.fs_run_publish_gate(pid);
  IF r.published OR r.failed <> 2 OR r.rules <> 125 THEN
    RAISE EXCEPTION 'failing gate returned %', r;
  END IF;
  IF (SELECT status FROM public.fs_period WHERE id = pid) <> 'draft' THEN
    RAISE EXCEPTION 'a failing gate published the period';
  END IF;
  IF (SELECT count(*) FROM public.fs_check WHERE period_id = pid AND run_at = r.run_at AND NOT passed) <> 2 THEN
    RAISE EXCEPTION 'the failing run was not recorded';
  END IF;
  UPDATE public.fs_line SET value_cy = value_cy - 1 WHERE period_id = pid AND statement = 'sofp' AND sort_order = 30;
  RAISE NOTICE 'PASS a failing gate records 2 failures of 125 and leaves the period a draft';
END $$;

-- --------------------------------------------------------------- callers
SET ROLE anon;
SELECT set_config('request.jwt.claims', NULL, true);
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.fs_publish_period(md5('https://dikagustiana.com/fs/phe/fy2024')::uuid);
    RAISE EXCEPTION 'anon called fs_publish_period';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS anon cannot call fs_publish_period';
  END;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2"}', true);
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.fs_publish_period(md5('https://dikagustiana.com/fs/phe/fy2024')::uuid);
    RAISE EXCEPTION 'a non-admin published a period';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS a signed-in non-admin cannot publish';
  END;
  BEGIN
    PERFORM * FROM public.fs_run_publish_gate(md5('https://dikagustiana.com/fs/phe/fy2024')::uuid);
    RAISE EXCEPTION 'a non-admin ran the ungated publish';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS a signed-in user cannot call fs_run_publish_gate';
  END;
END $$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT status FROM public.fs_period WHERE id = md5('https://dikagustiana.com/fs/phe/fy2024')::uuid) <> 'draft' THEN
    RAISE EXCEPTION 'a refused caller changed the period';
  END IF;
  RAISE NOTICE 'PASS refused callers left the period a draft';
END $$;

-- --------------------------------------------------------------- publishing
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1"}', true);
DO $$
DECLARE
  pid uuid := md5('https://dikagustiana.com/fs/phe/fy2024')::uuid;
  r   record;
  n   int;
BEGIN
  SELECT * INTO r FROM public.fs_publish_period(pid);
  IF NOT r.published OR r.failed <> 0 OR r.rules <> 125 THEN
    RAISE EXCEPTION 'admin publish returned %', r;
  END IF;
  IF (SELECT status FROM public.fs_period WHERE id = pid) <> 'published' THEN
    RAISE EXCEPTION 'the period is not published';
  END IF;
  RAISE NOTICE 'PASS an admin publishes: 125 rules, 0 failed';

  BEGIN
    PERFORM * FROM public.fs_publish_period(pid);
    RAISE EXCEPTION 'published twice';
  EXCEPTION WHEN invalid_parameter_value THEN
    RAISE NOTICE 'PASS a published period cannot be published again';
  END;

  UPDATE public.fs_line SET value_cy = value_cy + 1 WHERE period_id = pid AND statement = 'sofp' AND sort_order = 30;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN
    RAISE EXCEPTION 'an admin changed a line of a published period';
  END IF;
  RAISE NOTICE 'PASS a published period''s lines no longer take writes';
END $$;
RESET ROLE;

SET ROLE anon;
SELECT set_config('request.jwt.claims', NULL, true);
DO $$
DECLARE
  latest timestamptz;
BEGIN
  IF (SELECT count(*) FROM public.fs_line) <> 142 OR (SELECT count(*) FROM public.fs_soce_cell) <> 130 THEN
    RAISE EXCEPTION 'anon does not see the published statements';
  END IF;
  SELECT max(run_at) INTO latest FROM public.fs_check;
  IF (SELECT count(*) FROM public.fs_check WHERE run_at = latest) <> 125
     OR EXISTS (SELECT 1 FROM public.fs_check WHERE run_at = latest AND NOT passed) THEN
    RAISE EXCEPTION 'the latest run anon reads is not the passing gate run';
  END IF;
  RAISE NOTICE 'PASS anon reads 142 lines, 130 cells and a latest run of 125 passes';
END $$;
RESET ROLE;

ROLLBACK;
\echo fs publish gate: all checks passed
