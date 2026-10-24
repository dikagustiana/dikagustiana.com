-- ============================================================================
-- transition_data_layer.sql: the rules of the transition data layer, tested
-- in one transaction that is rolled back (docs/prd/transition-data-layer,
-- Fase 1 and Fase 2 gates).
--
-- Run it after supabase/migrations/20261024120000_transition_data_layer.sql,
-- its seed and 20261024120200_transition_macro_assumptions.sql, as the database owner (postgres), on a local database or on
-- production:
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/transition_data_layer.sql
--
-- One line per case, PASS or FAIL, then a count. Nothing survives the
-- ROLLBACK: not the test admin, not a staged or published row, not a check.
-- ============================================================================

BEGIN;

CREATE TEMP TABLE ds_test_result (
  n         serial PRIMARY KEY,
  case_name text NOT NULL,
  passed    boolean NOT NULL,
  detail    text
) ON COMMIT DROP;
GRANT ALL ON ds_test_result TO PUBLIC;
GRANT USAGE ON SEQUENCE ds_test_result_n_seq TO PUBLIC;

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
    RAISE EXCEPTION USING ERRCODE = 'DT001', MESSAGE = 'accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
  END;
  RESET ROLE;
  INSERT INTO ds_test_result (case_name, passed, detail)
  VALUES (p_case, v_state = p_state, format('%s: %s', v_state, left(v_msg, 160)));
END
$fn$;

-- expect_value: the text p_sql returns, as p_role, must equal p_expected.
-- The statement's effects are kept (a publish under test stays published).
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
    v_got := format('error %s: %s', v_state, left(v_msg, 160));
  END;
  RESET ROLE;
  INSERT INTO ds_test_result (case_name, passed, detail)
  VALUES (p_case, v_got IS NOT DISTINCT FROM p_expected, format('got %s, expected %s', coalesce(v_got, '<null>'), p_expected));
END
$fn$;

-- A test admin and a signed-in reader who is not one.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'ds-test-admin@example.invalid'),
  ('00000000-0000-4000-8000-0000000000b2', 'ds-test-reader@example.invalid');
INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-4000-8000-0000000000a1', 'admin');

CREATE FUNCTION pg_temp.as_user(p_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true)
$$;

-- stage: rows for one series under one token, as the owner.
CREATE FUNCTION pg_temp.stage(p_series text, p_token uuid, p_rows jsonb) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.ds_observation_stage
    (stage_token, series_id, member, period_start, value, unit, vintage, is_projection, source_url, source_code, source_locator, ingest)
  SELECT p_token, p_series, coalesce(r ->> 'member', ''), (r ->> 'period')::date, (r ->> 'value')::numeric,
         r ->> 'unit', r ->> 'vintage', coalesce((r ->> 'proj')::boolean, false),
         r ->> 'url', r ->> 'code', r ->> 'loc', coalesce(r ->> 'ingest', 'api')
    FROM jsonb_array_elements(p_rows) r
$$;

-- --- Access ------------------------------------------------------------------

SELECT pg_temp.expect_error('anon cannot read ds_series', 'SELECT * FROM public.ds_series', '42501', 'anon');
SELECT pg_temp.expect_error('anon cannot read ds_observation', 'SELECT * FROM public.ds_observation', '42501', 'anon');
SELECT pg_temp.expect_error('anon cannot write the stage', $$INSERT INTO public.ds_observation_stage (stage_token, series_id, period_start, value, vintage, ingest) VALUES (gen_random_uuid(), 'ember.idn.co2_intensity', '2020-01-01', 1, '2026-10-24', 'api')$$, '42501', 'anon');
SELECT pg_temp.expect_value('anon reads the chain view', 'SELECT count(*)::text FROM public.v_chain', '6', 'anon');
SELECT pg_temp.expect_value('anon sees no unpublished chart', 'SELECT count(*)::text FROM public.v_chart_catalog', '0', 'anon');
SELECT pg_temp.expect_error('anon cannot publish', $$SELECT * FROM public.ds_publish_series('ember.idn.co2_intensity', gen_random_uuid())$$, '42501', 'anon');

SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000b2');
SELECT pg_temp.expect_value('a signed-in reader sees no registry row', 'SELECT count(*)::text FROM public.ds_series', '0', 'authenticated');
SELECT pg_temp.expect_error('a signed-in reader cannot publish', $$SELECT * FROM public.ds_publish_series('ember.idn.co2_intensity', gen_random_uuid())$$, '42501', 'authenticated');
SELECT pg_temp.expect_error('a signed-in reader cannot call the fetcher''s gate', $$SELECT * FROM public.ds_run_publish_gate('ember.idn.co2_intensity', gen_random_uuid())$$, '42501', 'authenticated');

SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
SELECT pg_temp.expect_value('the admin reads the registry', 'SELECT count(*)::text FROM public.ds_series', '13', 'authenticated');
SELECT pg_temp.expect_error('the admin cannot write ds_observation directly', $$INSERT INTO public.ds_observation (series_id, period_start, vintage, value, unit, retrieved_at, source_url, source_code, ingest) VALUES ('ember.idn.co2_intensity', '2020-01-01', '2026-10-24', 1, 'gCO2e/kWh', now(), 'https://x.example', 'c', 'api')$$, '42501', 'authenticated');
SELECT pg_temp.expect_error('the admin cannot call the gate itself', $$SELECT * FROM public.ds__gate('ember.idn.co2_intensity', gen_random_uuid(), true)$$, '42501', 'authenticated');

SELECT pg_temp.expect_error('the service role cannot write ds_observation', $$INSERT INTO public.ds_observation (series_id, period_start, vintage, value, unit, retrieved_at, source_url, source_code, ingest) VALUES ('ember.idn.co2_intensity', '2020-01-01', '2026-10-24', 1, 'gCO2e/kWh', now(), 'https://x.example', 'c', 'api')$$, '42501', 'service_role');
SELECT pg_temp.expect_error('the service role cannot change the registry', $$UPDATE public.ds_series SET unit = 'x'$$, '42501', 'service_role');
SELECT pg_temp.expect_error('the service role cannot write a check', $$INSERT INTO public.ds_check (series_id, stage_token, run_at, rule_id, severity, passed, detail) VALUES ('ember.idn.co2_intensity', gen_random_uuid(), now(), 'R1', 'fail', true, 'x')$$, '42501', 'service_role');
SELECT pg_temp.expect_error('the service role cannot confirm warnings through the admin action', $$SELECT * FROM public.ds_publish_series('ember.idn.co2_intensity', gen_random_uuid(), true)$$, '42501', 'service_role');
SELECT pg_temp.expect_value('the service role logs a run', $$WITH r AS (INSERT INTO public.ds_fetch_run (source_id) VALUES ('ember') RETURNING 1) SELECT count(*)::text FROM r$$, '1', 'service_role');
SELECT pg_temp.expect_value('the service role stages a row', $$WITH r AS (INSERT INTO public.ds_observation_stage (stage_token, series_id, period_start, value, unit, vintage, source_url, source_code, ingest) VALUES ('11111111-1111-4111-8111-111111111111', 'ember.idn.co2_intensity', '2019-01-01', 700, 'gCO2e/kWh', '2026-10-17', 'https://ember-energy.org/data/yearly-electricity-data/', 'carbon-intensity/yearly', 'api') RETURNING 1) SELECT count(*)::text FROM r$$, '1', 'service_role');

-- --- The gate: a clean run ---------------------------------------------------

SELECT pg_temp.stage('ember.idn.co2_intensity', '11111111-1111-4111-8111-111111111111', $$[
  {"period":"2020-01-01","value":650,"unit":"gCO2e/kWh","vintage":"2026-10-17","url":"https://ember-energy.org/data/yearly-electricity-data/","code":"carbon-intensity/yearly"},
  {"period":"2021-01-01","value":660,"unit":"gCO2e/kWh","vintage":"2026-10-17","url":"https://ember-energy.org/data/yearly-electricity-data/","code":"carbon-intensity/yearly"}
]$$);
SELECT pg_temp.expect_value('a clean stage publishes through the fetcher''s gate',
  $$SELECT concat_ws('/', published::text, rules, failed, warnings, rows_published) FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '11111111-1111-4111-8111-111111111111')$$,
  'true/9/0/0/3', 'service_role');
SELECT pg_temp.expect_value('the first publish marks the series published', $$SELECT status FROM public.ds_series WHERE id = 'ember.idn.co2_intensity'$$, 'published');
SELECT pg_temp.expect_value('the published stage is cleared', $$SELECT count(*)::text FROM public.ds_observation_stage WHERE stage_token = '11111111-1111-4111-8111-111111111111'$$, '0');
SELECT pg_temp.expect_value('anon reads the published values', $$SELECT string_agg(value::text, ',' ORDER BY period_start) FROM public.v_series_latest WHERE series_id = 'ember.idn.co2_intensity'$$, '700,650,660', 'anon');
SELECT pg_temp.expect_value('the run is recorded with its GATE row', $$SELECT string_agg(rule_id, ',' ORDER BY rule_id) FROM public.ds_check WHERE stage_token = '11111111-1111-4111-8111-111111111111'$$, 'GATE,R0,R1,R2,R3,R4,R5,R6,R7,R8');
SELECT pg_temp.expect_value('the status view reads the last good run', $$SELECT concat_ws('/', n_values, last_check_rules, last_check_failed, latest_vintage) FROM public.v_series_status WHERE series_id = 'ember.idn.co2_intensity'$$, '3/9/0/2026-10-17', 'anon');

-- A pull a week later that changed nothing adds nothing.
SELECT pg_temp.stage('ember.idn.co2_intensity', '22222222-2222-4222-8222-222222222222', $$[
  {"period":"2020-01-01","value":650,"unit":"gCO2e/kWh","vintage":"2026-10-24","url":"https://ember-energy.org/data/yearly-electricity-data/","code":"carbon-intensity/yearly"},
  {"period":"2021-01-01","value":660,"unit":"gCO2e/kWh","vintage":"2026-10-24","url":"https://ember-energy.org/data/yearly-electricity-data/","code":"carbon-intensity/yearly"}
]$$);
SELECT pg_temp.expect_value('an unchanged pull publishes no row',
  $$SELECT concat_ws('/', published::text, rows_published, rows_unchanged) FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '22222222-2222-4222-8222-222222222222')$$,
  'true/0/2', 'service_role');

-- --- Each rule refuses its case, and public data does not move ---------------

CREATE TEMP TABLE ds_before ON COMMIT DROP AS
  SELECT string_agg(concat_ws(':', series_id, member, period_start, value, vintage), ',' ORDER BY series_id, member, period_start) AS snap
    FROM public.v_series_latest;

SELECT pg_temp.stage('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333301', $$[{"period":"2022-01-01","value":640,"unit":"gCO2e/kWh","vintage":"2026-10-24","code":"carbon-intensity/yearly"}]$$);
SELECT pg_temp.expect_value('R1 refuses a row without source_url',
  $$SELECT published::text FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333301')$$, 'false', 'service_role');
SELECT pg_temp.expect_value('… and R1 is the rule that failed',
  $$SELECT string_agg(rule_id, ',' ORDER BY rule_id) FROM public.ds_check WHERE stage_token = '33333333-3333-4333-8333-333333333301' AND NOT passed$$, 'GATE,R1');

SELECT pg_temp.stage('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333302', $$[{"period":"2022-01-01","value":640,"unit":"gCO2e/kWh","vintage":"2026-10-24","url":"https://ember-energy.org/"}]$$);
SELECT pg_temp.expect_value('R1 refuses an API row without source_code',
  $$SELECT published::text FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333302')$$, 'false', 'service_role');

SELECT pg_temp.stage('bei.idxcarbon.volume', '33333333-3333-4333-8333-333333333303', $$[{"period":"2025-01-01","value":690675,"unit":"tCO2e","vintage":"2025-04-17","url":"https://idxcarbon.co.id/","ingest":"manual"}]$$);
SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
SELECT pg_temp.expect_value('R2 refuses a manual row without source_locator (Fase 2 negative test)',
  $$SELECT published::text FROM public.ds_publish_series('bei.idxcarbon.volume', '33333333-3333-4333-8333-333333333303', true)$$, 'false', 'authenticated');
SELECT pg_temp.expect_value('… and R2 is the rule that failed',
  $$SELECT string_agg(rule_id, ',' ORDER BY rule_id) FROM public.ds_check WHERE stage_token = '33333333-3333-4333-8333-333333333303' AND NOT passed$$, 'GATE,R2');

SELECT pg_temp.stage('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333304', $$[{"period":"2022-03-01","value":640,"unit":"gCO2e/kWh","vintage":"2026-10-24","url":"https://ember-energy.org/","code":"carbon-intensity/yearly"}]$$);
SELECT pg_temp.expect_value('R3 refuses an annual period off 1 January',
  $$SELECT published::text FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333304')$$, 'false', 'service_role');
SELECT pg_temp.expect_value('… and names the period',
  $$SELECT detail FROM public.ds_check WHERE stage_token = '33333333-3333-4333-8333-333333333304' AND rule_id = 'R3'$$,
  'every period starts on the A grid: 2022-03-01 2026-10-24');

SELECT pg_temp.stage('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333305', $$[
  {"period":"2022-01-01","value":640,"unit":"gCO2e/kWh","vintage":"2026-10-24","url":"https://ember-energy.org/","code":"c"},
  {"period":"2022-01-01","value":641,"unit":"gCO2e/kWh","vintage":"2026-10-24","url":"https://ember-energy.org/","code":"c"}]$$);
SELECT pg_temp.expect_value('R4 refuses a duplicate in staging',
  $$SELECT published::text FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333305')$$, 'false', 'service_role');

SELECT pg_temp.stage('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333306', $$[{"period":"2020-01-01","value":651,"unit":"gCO2e/kWh","vintage":"2026-10-17","url":"https://ember-energy.org/","code":"c"}]$$);
SELECT pg_temp.expect_value('R4 refuses rewriting a published vintage',
  $$SELECT published::text FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333306')$$, 'false', 'service_role');
SELECT pg_temp.expect_value('… and R4 is the rule that failed',
  $$SELECT string_agg(rule_id, ',' ORDER BY rule_id) FROM public.ds_check WHERE stage_token = '33333333-3333-4333-8333-333333333306' AND NOT passed$$, 'GATE,R4');

SELECT pg_temp.stage('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333307', $$[{"period":"2022-01-01","value":640,"unit":"tCO2/MWh","vintage":"2026-10-24","url":"https://ember-energy.org/","code":"c"}]$$);
SELECT pg_temp.expect_value('R5 refuses a unit that is not the registry''s',
  $$SELECT published::text FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333307')$$, 'false', 'service_role');

SELECT pg_temp.stage('imf.weo.idn.gdp_growth', '33333333-3333-4333-8333-333333333308', $$[{"period":"2027-01-01","value":5.1,"unit":"% change","vintage":"2026-10-24","proj":true,"url":"https://data.imf.org/en/datasets/IMF.RES:WEO","code":"IMF.RES/WEO/9.0.0/IDN.NGDP_RPCH.A"}]$$);
SELECT pg_temp.expect_value('R6 refuses a projection series without an edition vintage',
  $$SELECT published::text FROM public.ds_run_publish_gate('imf.weo.idn.gdp_growth', '33333333-3333-4333-8333-333333333308')$$, 'false', 'service_role');

SELECT pg_temp.stage('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333309', $$[{"period":"2022-01-01","value":640,"unit":"gCO2e/kWh","vintage":"2026-10-24","proj":true,"url":"https://ember-energy.org/","code":"c"}]$$);
SELECT pg_temp.expect_value('R6 refuses a projection row in a non-projection series',
  $$SELECT published::text FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '33333333-3333-4333-8333-333333333309')$$, 'false', 'service_role');

SELECT pg_temp.expect_value('R0 refuses an empty stage',
  $$SELECT concat_ws('/', published::text, rules) FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '33333333-3333-4333-8333-3333333333ff')$$, 'false/1', 'service_role');

SELECT pg_temp.expect_value('refused runs leave the public data unchanged (Fase 1 negative test)',
  $$SELECT (SELECT snap FROM ds_before) = (SELECT string_agg(concat_ws(':', series_id, member, period_start, value, vintage), ',' ORDER BY series_id, member, period_start) FROM public.v_series_latest)$$::text,
  'true');
SELECT pg_temp.expect_value('a refused stage stays staged for the admin',
  $$SELECT count(*)::text FROM public.ds_observation_stage WHERE stage_token = '33333333-3333-4333-8333-333333333307'$$, '1');

-- --- R7: a large revision waits for an admin ---------------------------------

SELECT pg_temp.stage('ember.idn.co2_intensity', '44444444-4444-4444-8444-444444444444', $$[
  {"period":"2020-01-01","value":900,"unit":"gCO2e/kWh","vintage":"2026-10-31","url":"https://ember-energy.org/","code":"carbon-intensity/yearly"},
  {"period":"2021-01-01","value":661,"unit":"gCO2e/kWh","vintage":"2026-10-31","url":"https://ember-energy.org/","code":"carbon-intensity/yearly"}]$$);
SELECT pg_temp.expect_value('R7 holds a revision above 25% from the fetcher',
  $$SELECT concat_ws('/', published::text, failed, warnings) FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '44444444-4444-4444-8444-444444444444')$$,
  'false/0/1', 'service_role');
SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
SELECT pg_temp.expect_value('the admin''s unconfirmed publish holds it too',
  $$SELECT published::text FROM public.ds_publish_series('ember.idn.co2_intensity', '44444444-4444-4444-8444-444444444444')$$, 'false', 'authenticated');
SELECT pg_temp.expect_value('the admin''s preview names the move',
  $$SELECT detail FROM public.ds_preview_stage('ember.idn.co2_intensity', '44444444-4444-4444-8444-444444444444') WHERE rule_id = 'R7'$$,
  'change against the previous vintage of the same period above 25.0%: 2020-01-01 650 → 900 (2026-10-17)', 'authenticated');
SELECT pg_temp.expect_value('the admin''s confirmed publish lands it',
  $$SELECT concat_ws('/', published::text, rows_published) FROM public.ds_publish_series('ember.idn.co2_intensity', '44444444-4444-4444-8444-444444444444', true)$$, 'true/2', 'authenticated');
SELECT pg_temp.expect_value('the latest vintage wins',
  $$SELECT concat_ws('/', value, vintage) FROM public.v_series_latest WHERE series_id = 'ember.idn.co2_intensity' AND period_start = '2020-01-01'$$, '900/2026-10-31', 'anon');
SELECT pg_temp.expect_value('the old vintage stays for audit',
  $$SELECT string_agg(value::text, ',' ORDER BY vintage_date) FROM public.v_series_history WHERE series_id = 'ember.idn.co2_intensity' AND period_start = '2020-01-01'$$, '650,900', 'anon');

-- --- R8: a gap is a warning that does not hold the publish -------------------

SELECT pg_temp.stage('ember.idn.co2_intensity', '55555555-5555-4555-8555-555555555555', $$[{"period":"2024-01-01","value":610,"unit":"gCO2e/kWh","vintage":"2026-10-31","url":"https://ember-energy.org/","code":"carbon-intensity/yearly"}]$$);
SELECT pg_temp.expect_value('R8 warns on a gap and publishes',
  $$SELECT concat_ws('/', published::text, warnings) FROM public.ds_run_publish_gate('ember.idn.co2_intensity', '55555555-5555-4555-8555-555555555555')$$,
  'true/1', 'service_role');
SELECT pg_temp.expect_value('… naming the missing years',
  $$SELECT detail FROM public.ds_check WHERE stage_token = '55555555-5555-4555-8555-555555555555' AND rule_id = 'R8'$$,
  'no missing period between a member''s first and last: 2022-01-01; 2023-01-01');

-- --- Projections: an edition vintage, members, the macro reader --------------

SELECT pg_temp.stage('imf.weo.idn.gdp_growth', '66666666-6666-4666-8666-666666666666', $$[
  {"period":"2025-01-01","value":5.03,"unit":"% change","vintage":"WEO-2026-10","url":"https://data.imf.org/en/datasets/IMF.RES:WEO","code":"IMF.RES/WEO/9.0.0/IDN.NGDP_RPCH.A"},
  {"period":"2026-01-01","value":4.9,"unit":"% change","vintage":"WEO-2026-10","proj":true,"url":"https://data.imf.org/en/datasets/IMF.RES:WEO","code":"IMF.RES/WEO/9.0.0/IDN.NGDP_RPCH.A"}]$$);
SELECT pg_temp.expect_value('a WEO edition publishes',
  $$SELECT published::text FROM public.ds_run_publish_gate('imf.weo.idn.gdp_growth', '66666666-6666-4666-8666-666666666666')$$, 'true', 'service_role');
SELECT pg_temp.expect_value('its vintage date is the edition month',
  $$SELECT min(vintage_date)::text FROM public.v_series_history WHERE series_id = 'imf.weo.idn.gdp_growth'$$, '2026-10-01', 'anon');

SELECT pg_temp.expect_value('FSRE reads that edition''s assumptions, named explicitly (Fase 4)',
  $$SELECT string_agg(concat_ws(':', indicator, year, value, is_projection::text), ',' ORDER BY indicator, year) FROM public.ds_macro_assumptions('WEO-2026-10')$$,
  'gdp_growth:2025:5.03:false,gdp_growth:2026:4.9:true', 'anon');
SELECT pg_temp.expect_error('an edition that is not published raises', $$SELECT * FROM public.ds_macro_assumptions('WEO-2026-04')$$, 'P0002', 'anon');
SELECT pg_temp.expect_error('an edition that is not one raises', $$SELECT * FROM public.ds_macro_assumptions('latest')$$, '22023', 'anon');

-- --- Structure ---------------------------------------------------------------

SELECT pg_temp.expect_error('ds_observation refuses UPDATE, even for the owner',
  $$UPDATE public.ds_observation SET value = 1 WHERE series_id = 'ember.idn.co2_intensity'$$, '55000');
SELECT pg_temp.expect_error('a series cannot change source',
  $$UPDATE public.ds_series SET source_id = 'imf' WHERE id = 'ember.idn.co2_intensity'$$, '55000');
SELECT pg_temp.expect_error('a published series cannot change unit',
  $$UPDATE public.ds_series SET unit = 'kgCO2/kWh' WHERE id = 'ember.idn.co2_intensity'$$, '55000');
SELECT pg_temp.expect_value('a draft series can still change unit',
  $$WITH u AS (UPDATE public.ds_series SET unit = 'units (charge points)' WHERE id = 'pln.idn.spklu_units' RETURNING 1) SELECT count(*)::text FROM u$$, '1');
SELECT pg_temp.expect_error('a chart with a bracketed title cannot be published',
  $$UPDATE public.ds_chart SET published = true WHERE slug = 'grid-carbon-intensity'$$, '23514');
SELECT pg_temp.expect_error('a retired series refuses the gate',
  $$UPDATE public.ds_series SET status = 'retired' WHERE id = 'imf.pcps.coal_au'; SELECT * FROM public.ds__gate('imf.pcps.coal_au', gen_random_uuid(), false)$$, '22023');

-- --- Charts through the views ------------------------------------------------

UPDATE public.ds_chart SET title = 'Grid carbon intensity has not fallen since 2020.', published = true
 WHERE slug = 'grid-carbon-intensity';
SELECT pg_temp.expect_value('a published chart reaches the catalog',
  $$SELECT concat_ws('/', chart_slug, series_id, unit) FROM public.v_chart_catalog WHERE chart_slug = 'grid-carbon-intensity'$$,
  'grid-carbon-intensity/ember.idn.co2_intensity/gCO2e/kWh', 'anon');
SELECT pg_temp.expect_value('its data carries the trail of every value',
  $$SELECT count(*) FILTER (WHERE source_url LIKE 'https://%' AND vintage IS NOT NULL AND retrieved_at IS NOT NULL)::text FROM public.v_chart_data WHERE chart_slug = 'grid-carbon-intensity'$$,
  '4', 'anon');
SELECT pg_temp.expect_value('a chart over unpublished series lists no series',
  $$WITH u AS (UPDATE public.ds_chart SET title = 'Coal x.', published = true WHERE slug = 'coal-price' RETURNING 1) SELECT count(series_id)::text FROM public.v_chart_catalog WHERE chart_slug = 'coal-price'$$,
  '0');

-- Two essays, inside the transaction like everything else; an error here is a
-- failed case, not an aborted run.
SELECT pg_temp.expect_value('two test essays are written',
  $$WITH e AS (
      INSERT INTO public.essays (section, slug, title, published, status, content_json) VALUES
        ('green-transition', 'ds-test-pilot', 'Pilot', true, 'published',
         '{"type":"doc","content":[{"type":"paragraph"},{"type":"chartEmbed","attrs":{"slug":"grid-carbon-intensity"}},{"type":"chartEmbed","attrs":{"slug":"generation-mix"}}]}'),
        ('green-transition', 'ds-test-draft', 'Draft', false, 'draft',
         '{"type":"doc","content":[{"type":"chartEmbed","attrs":{"slug":"grid-carbon-intensity"}}]}')
      RETURNING 1)
    SELECT count(*)::text FROM e$$, '2');
SELECT pg_temp.expect_value('usage lists published essays embedding published charts only',
  $$SELECT string_agg(concat_ws(':', chart_slug, essay_slug), ',') FROM public.v_chart_usage$$,
  'grid-carbon-intensity:ds-test-pilot', 'anon');

-- --- Report ------------------------------------------------------------------

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, case_name, detail
  FROM ds_test_result ORDER BY n;
SELECT format('%s passed, %s failed', count(*) FILTER (WHERE passed), count(*) FILTER (WHERE NOT passed)) AS total
  FROM ds_test_result;

ROLLBACK;
