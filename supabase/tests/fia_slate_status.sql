-- ============================================================================
-- fia_slate_status.sql: fia.slate_status and fia.slate_progress, tested in
-- one transaction that is rolled back (docs/prd/finance-restructure §4).
--
-- Run it after supabase/migrations/20261024170200_fia_slate_status.sql, as the
-- database owner (postgres):
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/fia_slate_status.sql
--
-- One line per case, PASS or FAIL, then a count. Nothing survives the
-- ROLLBACK. It writes no fia.manual_release row: the manual channel's case
-- reads the rows already there, so it holds on any database.
-- ============================================================================

BEGIN;

CREATE TEMP TABLE ss_test_result (
  n         serial PRIMARY KEY,
  case_name text NOT NULL,
  passed    boolean NOT NULL,
  detail    text
) ON COMMIT DROP;
GRANT ALL ON ss_test_result TO PUBLIC;
GRANT USAGE ON SEQUENCE ss_test_result_n_seq TO PUBLIC;

CREATE FUNCTION pg_temp.expect_error(p_case text, p_sql text, p_state text, p_role text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE
  v_state text;
  v_msg text;
BEGIN
  BEGIN
    IF p_role IS NOT NULL THEN EXECUTE format('SET LOCAL ROLE %I', p_role); END IF;
    EXECUTE p_sql;
    RAISE EXCEPTION USING ERRCODE = 'SS001', MESSAGE = 'accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
  END;
  RESET ROLE;
  INSERT INTO ss_test_result (case_name, passed, detail)
  VALUES (p_case, v_state = p_state, format('%s: %s', v_state, left(v_msg, 200)));
END
$fn$;

CREATE FUNCTION pg_temp.expect_value(p_case text, p_sql text, p_expected text, p_role text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE
  v_got text;
  v_state text;
  v_msg text;
BEGIN
  BEGIN
    IF p_role IS NOT NULL THEN EXECUTE format('SET LOCAL ROLE %I', p_role); END IF;
    EXECUTE p_sql INTO v_got;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    v_got := format('error %s: %s', v_state, left(v_msg, 200));
  END;
  RESET ROLE;
  INSERT INTO ss_test_result (case_name, passed, detail)
  VALUES (p_case, v_got IS NOT DISTINCT FROM p_expected, format('got %s, expected %s', coalesce(v_got, '<null>'), p_expected));
END
$fn$;

SELECT pg_temp.expect_error('an unknown status is refused',
  $$INSERT INTO fia.slate_status (ticker, status) VALUES ('ZZTST', 'published')$$, '23514');
SELECT pg_temp.expect_error('a malformed ticker is refused',
  $$INSERT INTO fia.slate_status (ticker, status) VALUES ('zz tst', 'queued')$$, '23514');
SELECT pg_temp.expect_value('the FSRE pipeline upserts one row per ticker',
  $$WITH a AS (INSERT INTO fia.slate_status (ticker, status) VALUES ('ZZTST', 'queued')
              ON CONFLICT (ticker) DO UPDATE SET status = excluded.status, updated_at = now() RETURNING status)
    SELECT status FROM a$$, 'queued');
UPDATE fia.slate_status SET status = 'in_review', updated_at = now() WHERE ticker = 'ZZTST';
SELECT pg_temp.expect_value('anon reads the latest status through the view',
  $$SELECT status || '/' || channel FROM fia.slate_progress WHERE ticker = 'ZZTST'$$, 'in_review/fsre', 'anon');
SELECT pg_temp.expect_value('one row per ticker in the view',
  $$SELECT (count(*) = count(DISTINCT ticker))::text FROM fia.slate_progress$$, 'true', 'anon');
SELECT pg_temp.expect_value('a staged manual release reads as in review',
  $$SELECT (count(*) FILTER (WHERE p.status IS DISTINCT FROM 'in_review'))::text
      FROM (SELECT DISTINCT ticker FROM fia.manual_release WHERE status = 'staged') m
      LEFT JOIN fia.slate_progress p ON p.ticker = m.ticker
      WHERE NOT EXISTS (SELECT 1 FROM fia.slate_status s WHERE s.ticker = m.ticker)$$, '0');
SELECT pg_temp.expect_error('anon cannot read the table',
  $$SELECT * FROM fia.slate_status$$, '42501', 'anon');
SELECT pg_temp.expect_error('anon cannot write the table',
  $$INSERT INTO fia.slate_status (ticker, status) VALUES ('ZZANO', 'queued')$$, '42501', 'anon');

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, case_name, detail
  FROM ss_test_result ORDER BY n;
SELECT format('%s passed, %s failed', count(*) FILTER (WHERE passed), count(*) FILTER (WHERE NOT passed)) AS total
  FROM ss_test_result;

ROLLBACK;
