-- ============================================================================
-- toolkits.sql: the rules of the Toolkits tables, tested in one transaction
-- that is rolled back (docs/prd/finance-restructure §4 Tests: "inserting a
-- published toolkit with a false check fails").
--
-- Run it after supabase/migrations/20261024170000_toolkits.sql, as the
-- database owner (postgres), on a local database or on production:
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/toolkits.sql
--
-- One line per case, PASS or FAIL, then a count. Nothing survives the
-- ROLLBACK: not the test admin, not a toolkit, not a version.
-- ============================================================================

BEGIN;

CREATE TEMP TABLE tk_test_result (
  n         serial PRIMARY KEY,
  case_name text NOT NULL,
  passed    boolean NOT NULL,
  detail    text
) ON COMMIT DROP;
GRANT ALL ON tk_test_result TO PUBLIC;
GRANT USAGE ON SEQUENCE tk_test_result_n_seq TO PUBLIC;

-- expect_error: p_sql, run as p_role, must be refused with p_state.
CREATE FUNCTION pg_temp.expect_error(p_case text, p_sql text, p_state text, p_role text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE
  v_state text;
  v_msg text;
BEGIN
  BEGIN
    IF p_role IS NOT NULL THEN EXECUTE format('SET LOCAL ROLE %I', p_role); END IF;
    EXECUTE p_sql;
    RAISE EXCEPTION USING ERRCODE = 'TK001', MESSAGE = 'accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
  END;
  RESET ROLE;
  INSERT INTO tk_test_result (case_name, passed, detail)
  VALUES (p_case, v_state = p_state, format('%s: %s', v_state, left(v_msg, 200)));
END
$fn$;

-- expect_value: the text p_sql returns, as p_role, must equal p_expected. Effects are kept.
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
  INSERT INTO tk_test_result (case_name, passed, detail)
  VALUES (p_case, v_got IS NOT DISTINCT FROM p_expected, format('got %s, expected %s', coalesce(v_got, '<null>'), p_expected));
END
$fn$;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'tk-test-admin@example.invalid'),
  ('00000000-0000-4000-8000-0000000000b2', 'tk-test-reader@example.invalid');
INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-4000-8000-0000000000a1', 'admin');

CREATE FUNCTION pg_temp.as_user(p_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true)
$$;

CREATE TEMP TABLE tk_module ON COMMIT DROP AS SELECT id FROM public.finance_modules ORDER BY track_slug, sort_order LIMIT 1;
GRANT SELECT ON tk_module TO PUBLIC;

-- --- The publish gate --------------------------------------------------------

SELECT pg_temp.expect_error('published with no_client_data false is refused',
  $$INSERT INTO public.toolkits (slug, title, purpose, module_id, status, checks)
    SELECT 'tk-a', 'A', 'One line.', id, 'published', '{"no_client_data": false, "verified_model": true}' FROM tk_module$$,
  '23514');
SELECT pg_temp.expect_error('published with verified_model false is refused',
  $$INSERT INTO public.toolkits (slug, title, purpose, module_id, status, checks)
    SELECT 'tk-a', 'A', 'One line.', id, 'published', '{"no_client_data": true, "verified_model": false}' FROM tk_module$$,
  '23514');
SELECT pg_temp.expect_error('published with a check missing is refused (a null cast would have passed)',
  $$INSERT INTO public.toolkits (slug, title, purpose, module_id, status, checks)
    SELECT 'tk-a', 'A', 'One line.', id, 'published', '{"no_client_data": true}' FROM tk_module$$,
  '23514');
SELECT pg_temp.expect_error('published with a check written as the string "true" is refused',
  $$INSERT INTO public.toolkits (slug, title, purpose, module_id, status, checks)
    SELECT 'tk-a', 'A', 'One line.', id, 'published', '{"no_client_data": "true", "verified_model": true}' FROM tk_module$$,
  '23514');
SELECT pg_temp.expect_value('a draft needs no check',
  $$WITH t AS (INSERT INTO public.toolkits (slug, title, purpose, module_id)
    SELECT 'tk-a', 'A', 'One line.', id FROM tk_module RETURNING status) SELECT status FROM t$$,
  'draft');
SELECT pg_temp.expect_error('a version under a draft is refused',
  $$INSERT INTO public.toolkit_versions (toolkit_id, version, file_key, size_bytes, sha256)
    SELECT id, '1.0', 'toolkits/tk-a/1.0/a-v1.0.xlsx', 10, repeat('a', 64) FROM public.toolkits WHERE slug = 'tk-a'$$,
  '23514');
SELECT pg_temp.expect_error('publishing the draft with a false check is refused',
  $$UPDATE public.toolkits SET status = 'published', checks = '{"no_client_data": true, "verified_model": false}' WHERE slug = 'tk-a'$$,
  '23514');
SELECT pg_temp.expect_value('publishing with both checks true is accepted',
  $$WITH t AS (UPDATE public.toolkits SET status = 'published', checks = '{"no_client_data": true, "verified_model": true}'
    WHERE slug = 'tk-a' RETURNING status) SELECT status FROM t$$,
  'published');
SELECT pg_temp.expect_error('a published toolkit cannot drop a check afterwards',
  $$UPDATE public.toolkits SET checks = '{"no_client_data": true}' WHERE slug = 'tk-a'$$,
  '23514');

-- --- Versions ----------------------------------------------------------------

SELECT pg_temp.expect_value('v1.0 is added',
  $$WITH v AS (INSERT INTO public.toolkit_versions (toolkit_id, version, file_key, size_bytes, sha256)
    SELECT id, '1.0', 'toolkits/tk-a/1.0/a-v1.0.xlsx', 10, repeat('a', 64) FROM public.toolkits WHERE slug = 'tk-a'
    RETURNING version) SELECT version FROM v$$,
  '1.0');
SELECT pg_temp.expect_error('a second 1.0 is refused',
  $$INSERT INTO public.toolkit_versions (toolkit_id, version, file_key, size_bytes, sha256)
    SELECT id, '1.0', 'toolkits/tk-a/1.0/other.xlsx', 10, repeat('b', 64) FROM public.toolkits WHERE slug = 'tk-a'$$,
  '23505');
SELECT pg_temp.expect_error('a key outside toolkits/<slug>/<version>/ is refused',
  $$INSERT INTO public.toolkit_versions (toolkit_id, version, file_key, size_bytes, sha256)
    SELECT id, '1.1', 'toolkits/tk-a/1.0/a-v1.1.xlsx', 10, repeat('b', 64) FROM public.toolkits WHERE slug = 'tk-a'$$,
  '23514');
SELECT pg_temp.expect_error('a version is never updated',
  $$UPDATE public.toolkit_versions SET file_key = 'toolkits/tk-a/1.0/b.xlsx' WHERE version = '1.0'$$,
  '23514');
SELECT pg_temp.expect_error('a version is never deleted',
  $$DELETE FROM public.toolkit_versions WHERE version = '1.0'$$,
  '23514');
SELECT pg_temp.expect_error('the slug stays once a version exists',
  $$UPDATE public.toolkits SET slug = 'tk-b' WHERE slug = 'tk-a'$$,
  '23514');
SELECT pg_temp.expect_value('v1.1 is added',
  $$WITH v AS (INSERT INTO public.toolkit_versions (toolkit_id, version, file_key, size_bytes, sha256)
    SELECT id, '1.1', 'toolkits/tk-a/1.1/a-v1.1.xlsx', 10, repeat('b', 64) FROM public.toolkits WHERE slug = 'tk-a'
    RETURNING version) SELECT version FROM v$$,
  '1.1');
SELECT pg_temp.expect_value('v1.0 is still there, at its own key, beside v1.1',
  $$SELECT string_agg(version || '=' || file_key, ',' ORDER BY version) FROM public.toolkit_versions WHERE file_key LIKE 'toolkits/tk-a/%'$$,
  '1.0=toolkits/tk-a/1.0/a-v1.0.xlsx,1.1=toolkits/tk-a/1.1/a-v1.1.xlsx');

-- --- Who sees and writes what ------------------------------------------------

INSERT INTO public.toolkits (slug, title, purpose, module_id) SELECT 'tk-draft', 'D', 'Draft.', id FROM tk_module;

SELECT pg_temp.expect_value('anon sees the published toolkit, not the draft',
  $$SELECT string_agg(slug, ',' ORDER BY slug) FROM public.toolkits WHERE slug LIKE 'tk-%'$$, 'tk-a', 'anon');
SELECT pg_temp.expect_value('anon sees both versions of the published toolkit',
  $$SELECT count(*)::text FROM public.toolkit_versions v JOIN public.toolkits t ON t.id = v.toolkit_id WHERE t.slug = 'tk-a'$$, '2', 'anon');
SELECT pg_temp.expect_error('anon cannot insert a toolkit',
  $$INSERT INTO public.toolkits (slug, title, purpose, module_id) SELECT 'tk-x', 'X', 'X.', id FROM tk_module$$, '42501', 'anon');

SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000b2');
SELECT pg_temp.expect_value('a signed-in reader sees what anon sees',
  $$SELECT string_agg(slug, ',' ORDER BY slug) FROM public.toolkits WHERE slug LIKE 'tk-%'$$, 'tk-a', 'authenticated');
SELECT pg_temp.expect_error('a signed-in reader cannot insert a toolkit',
  $$INSERT INTO public.toolkits (slug, title, purpose, module_id) SELECT 'tk-x', 'X', 'X.', id FROM tk_module$$, '42501', 'authenticated');

SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
SELECT pg_temp.expect_value('the admin sees the draft too',
  $$SELECT string_agg(slug, ',' ORDER BY slug) FROM public.toolkits WHERE slug LIKE 'tk-%'$$, 'tk-a,tk-draft', 'authenticated');
SELECT pg_temp.expect_error('the admin, too, cannot publish with a false check',
  $$UPDATE public.toolkits SET status = 'published', checks = '{"no_client_data": false, "verified_model": true}' WHERE slug = 'tk-draft'$$,
  '23514', 'authenticated');

-- --- Report ------------------------------------------------------------------

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, case_name, detail
  FROM tk_test_result ORDER BY n;
SELECT format('%s passed, %s failed', count(*) FILTER (WHERE passed), count(*) FILTER (WHERE NOT passed)) AS total
  FROM tk_test_result;

ROLLBACK;
