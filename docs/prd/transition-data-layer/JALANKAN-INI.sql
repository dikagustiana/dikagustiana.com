-- =============================================================================
-- JALANKAN INI di Supabase SQL Editor (satu kali, seluruh isi file, lalu Run).
--
-- Bagian 1 data layer (tabel, enum, helper, RLS terkunci) SUDAH diterapkan
-- lewat konektor pada 24 Oktober 2026 (migration transition_data_layer_1_tables).
-- File ini menerapkan sisanya dalam satu transaksi: kalau satu baris gagal,
-- tidak ada yang berubah.
--   2. aturan R0–R8 dan gerbang publish
--   3. view publik
--   4. policy RLS dan grant
--   5. seed registri, rantai, grafik (semua grafik belum publish)
--   6. asumsi makro FSRE
-- Hasil yang benar: "Success. No rows returned".
-- Setelah itu jalankan supabase/tests/transition_data_layer.sql: "65 passed, 0 failed".
-- =============================================================================

BEGIN;

-- --- The rules ---------------------------------------------------------------

-- R0–R8 against one stage token. Read-only. expected/actual are text: a rule
-- compares counts, units or values as its detail says.
CREATE FUNCTION public.ds_stage_checks(p_series_id text, p_stage_token uuid)
RETURNS TABLE (
  rule_id  text,
  severity text,
  passed   boolean,
  expected text,
  actual   text,
  detail   text
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $fn$
#variable_conflict use_column
DECLARE
  s public.ds_series%ROWTYPE;
  n_rows integer;
BEGIN
  SELECT * INTO s FROM public.ds_series x WHERE x.id = p_series_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no ds_series %', p_series_id USING ERRCODE = 'no_data_found';
  END IF;

  SELECT count(*) INTO n_rows FROM public.ds_observation_stage st
   WHERE st.series_id = p_series_id AND st.stage_token = p_stage_token;

  RETURN QUERY SELECT 'R0'::text, 'fail'::text, n_rows > 0, '> 0'::text, n_rows::text,
    format('rows staged under this token: %s', n_rows);
  IF n_rows = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH st AS (
    SELECT * FROM public.ds_observation_stage x
     WHERE x.series_id = p_series_id AND x.stage_token = p_stage_token
  ),
  bad AS (
    SELECT 'R1' AS rule, st.member, st.period_start, st.vintage FROM st
     WHERE coalesce(st.source_url, '') !~ '^https://'
        OR (s.ingest = 'api' AND coalesce(btrim(st.source_code), '') = '')
    UNION ALL
    SELECT 'R2', st.member, st.period_start, st.vintage FROM st
     WHERE st.ingest = 'manual' AND coalesce(btrim(st.source_locator), '') = ''
    UNION ALL
    SELECT 'R3', st.member, st.period_start, st.vintage FROM st
     WHERE NOT public.ds_on_grid(st.period_start, s.frequency)
    UNION ALL
    SELECT 'R4', d.member, d.period_start, d.vintage FROM (
      SELECT st.member, st.period_start, st.vintage FROM st
       GROUP BY st.member, st.period_start, st.vintage HAVING count(*) > 1
    ) d
    UNION ALL
    -- The same key already published with another value: a vintage is never
    -- rewritten.
    SELECT 'R4', st.member, st.period_start, st.vintage FROM st
      JOIN public.ds_observation o
        ON o.series_id = st.series_id AND o.member = st.member
       AND o.period_start = st.period_start AND o.vintage = st.vintage
     WHERE o.value <> st.value
    UNION ALL
    SELECT 'R5', st.member, st.period_start, st.vintage FROM st
     WHERE st.unit IS DISTINCT FROM s.unit
    UNION ALL
    SELECT 'R6', st.member, st.period_start, st.vintage FROM st
     WHERE public.ds_vintage_date(st.vintage) IS NULL
        OR (st.is_projection AND NOT s.is_projection)
        OR (s.is_projection AND st.vintage !~ '^[A-Z]+-[0-9]{4}-[0-9]{2}$')
        OR (NOT s.is_projection AND st.vintage !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
  ),
  rules(rule, descr) AS (VALUES
    ('R1', 'every row has an https source_url; an API series row also has its source_code'),
    ('R2', 'every manual row has a source_locator (page, table or paragraph)'),
    ('R3', format('every period starts on the %s grid', s.frequency)),
    ('R4', 'no duplicate (member, period, vintage) in staging, and no published vintage rewritten'),
    ('R5', format('every row''s unit is the registry''s (%s)', s.unit)),
    ('R6', CASE WHEN s.is_projection
                THEN 'a projection series carries an edition label as its vintage (WEO-2026-10)'
                ELSE 'a dated vintage (YYYY-MM-DD) and no projection row in a non-projection series' END)
  )
  SELECT r.rule, 'fail', count(b.rule) = 0, '0', count(b.rule)::text,
         r.descr || CASE WHEN count(b.rule) = 0 THEN ''
                         ELSE ': ' || array_to_string((array_agg(DISTINCT concat_ws(' ', nullif(b.member, ''), to_char(b.period_start, 'YYYY-MM-DD'), b.vintage)))[1:20], '; ')
                              || CASE WHEN count(DISTINCT (b.member, b.period_start, b.vintage)) > 20
                                      THEN format(' and %s more', count(DISTINCT (b.member, b.period_start, b.vintage)) - 20) ELSE '' END
                    END
    FROM rules r
    LEFT JOIN bad b ON b.rule = r.rule
   GROUP BY r.rule, r.descr
   ORDER BY r.rule;

  -- R7: a move larger than the threshold against the latest published
  -- vintage of the same period. A warning; an admin confirms it.
  RETURN QUERY
  WITH st AS (
    SELECT * FROM public.ds_observation_stage x
     WHERE x.series_id = p_series_id AND x.stage_token = p_stage_token
  ),
  latest AS (
    SELECT DISTINCT ON (o.member, o.period_start) o.member, o.period_start, o.vintage, o.value
      FROM public.ds_observation o
     WHERE o.series_id = p_series_id
     ORDER BY o.member, o.period_start, o.vintage_date DESC, o.published_at DESC
  ),
  moves AS (
    SELECT st.member, st.period_start, l.vintage AS prev_vintage, l.value AS prev, st.value AS cur
      FROM st JOIN latest l ON l.member = st.member AND l.period_start = st.period_start
     WHERE l.vintage <> st.vintage AND l.value <> 0
       AND abs(st.value - l.value) / abs(l.value) > s.r7_threshold
  )
  SELECT 'R7', 'warn', count(*) = 0, format('<= %s%%', round(s.r7_threshold * 100, 1)),
         count(*)::text,
         format('change against the previous vintage of the same period above %s%%', round(s.r7_threshold * 100, 1))
         || coalesce(': ' || string_agg(format('%s%s %s → %s (%s)',
                  CASE WHEN m.member = '' THEN '' ELSE m.member || ' ' END,
                  to_char(m.period_start, 'YYYY-MM-DD'), m.prev, m.cur, m.prev_vintage), '; '), '')
    FROM moves m;

  -- R8: a gap inside the series, counting the published periods with the
  -- staged ones. A warning only.
  IF s.frequency <> 'event' THEN
    RETURN QUERY
    WITH periods AS (
      SELECT x.member, x.period_start FROM public.ds_observation_stage x
       WHERE x.series_id = p_series_id AND x.stage_token = p_stage_token
         AND public.ds_on_grid(x.period_start, s.frequency)
      UNION
      SELECT o.member, o.period_start FROM public.ds_observation o WHERE o.series_id = p_series_id
    ),
    bounds AS (
      SELECT p.member, min(p.period_start) AS lo, max(p.period_start) AS hi FROM periods p GROUP BY p.member
    ),
    grid AS (
      SELECT b.member, g::date AS period_start
        FROM bounds b
       CROSS JOIN LATERAL generate_series(b.lo, b.hi,
         CASE s.frequency WHEN 'A' THEN interval '1 year' WHEN 'Q' THEN interval '3 months' ELSE interval '1 month' END) g
    ),
    gaps AS (
      SELECT e.* FROM grid e
       WHERE NOT EXISTS (SELECT 1 FROM periods p WHERE p.member = e.member AND p.period_start = e.period_start)
    )
    SELECT 'R8', 'warn', count(*) = 0, '0', count(*)::text,
           'no missing period between a member''s first and last'
           || coalesce(': ' || array_to_string((array_agg(concat_ws(' ', nullif(g.member, ''), to_char(g.period_start, 'YYYY-MM-DD'))
                ORDER BY g.member, g.period_start))[1:20], '; '), '')
           || CASE WHEN count(*) > 20 THEN format(' and %s more', count(*) - 20) ELSE '' END
      FROM gaps g;
  END IF;
END
$fn$;

COMMENT ON FUNCTION public.ds_stage_checks(text, uuid) IS
  'Rules R0–R8 against one stage token of one series (PRD, Aturan check). Read-only.';

-- The gate. Locks the series, writes one ds_check run, and publishes the
-- staged rows only when no fail rule failed and every failed R7 warning was
-- confirmed. Rows equal to the latest published value of their period are
-- not written again (a weekly pull that changed nothing adds nothing).
-- Published or not, the run is kept; the staged rows stay until a publish
-- or a discard.
CREATE FUNCTION public.ds__gate(p_series_id text, p_stage_token uuid, p_confirm_warnings boolean)
RETURNS TABLE (run_at timestamptz, rules integer, failed integer, warnings integer,
               published boolean, rows_published integer, rows_unchanged integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
#variable_conflict use_column
DECLARE
  v_status   text;
  v_run      timestamptz := clock_timestamp();
  v_rules    integer;
  v_failed   integer;
  v_warn     integer;
  v_r7       integer;
  v_ok       boolean;
  v_new      integer := 0;
  v_same     integer := 0;
BEGIN
  SELECT x.status INTO v_status FROM public.ds_series x WHERE x.id = p_series_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no ds_series %', p_series_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_status = 'retired' THEN
    RAISE EXCEPTION 'ds_series % is retired', p_series_id USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.ds_check (series_id, stage_token, run_at, rule_id, severity, passed, expected, actual, detail)
  SELECT p_series_id, p_stage_token, v_run, c.rule_id, c.severity, c.passed, c.expected, c.actual, c.detail
    FROM public.ds_stage_checks(p_series_id, p_stage_token) c;
  GET DIAGNOSTICS v_rules = ROW_COUNT;

  SELECT count(*) FILTER (WHERE c.severity = 'fail' AND NOT c.passed),
         count(*) FILTER (WHERE c.severity = 'warn' AND NOT c.passed),
         count(*) FILTER (WHERE c.rule_id = 'R7' AND NOT c.passed)
    INTO v_failed, v_warn, v_r7
    FROM public.ds_check c
   WHERE c.series_id = p_series_id AND c.run_at = v_run;

  v_ok := v_rules > 0 AND v_failed = 0 AND (v_r7 = 0 OR p_confirm_warnings);

  IF v_ok THEN
    WITH st AS (
      SELECT x.* FROM public.ds_observation_stage x
       WHERE x.series_id = p_series_id AND x.stage_token = p_stage_token
    ),
    latest AS (
      SELECT DISTINCT ON (o.member, o.period_start) o.member, o.period_start, o.value
        FROM public.ds_observation o
       WHERE o.series_id = p_series_id
       ORDER BY o.member, o.period_start, o.vintage_date DESC, o.published_at DESC
    ),
    ins AS (
      INSERT INTO public.ds_observation (series_id, member, period_start, vintage, period_label, value, unit,
                                         is_projection, retrieved_at, source_url, source_code, source_locator,
                                         ingest, fetch_run_id, entered_by, published_at)
      SELECT st.series_id, st.member, st.period_start, st.vintage, st.period_label, st.value, st.unit,
             st.is_projection, st.retrieved_at, st.source_url, st.source_code, st.source_locator,
             st.ingest, st.fetch_run_id, st.entered_by, v_run
        FROM st
        LEFT JOIN latest l ON l.member = st.member AND l.period_start = st.period_start
       WHERE l.value IS DISTINCT FROM st.value
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO v_new FROM ins;

    SELECT count(*) - v_new INTO v_same FROM public.ds_observation_stage x
     WHERE x.series_id = p_series_id AND x.stage_token = p_stage_token;

    DELETE FROM public.ds_observation_stage x
     WHERE x.series_id = p_series_id AND x.stage_token = p_stage_token;

    UPDATE public.ds_series SET status = 'published' WHERE id = p_series_id AND status = 'draft';
  END IF;

  INSERT INTO public.ds_check (series_id, stage_token, run_at, rule_id, severity, passed, expected, actual, detail)
  VALUES (p_series_id, p_stage_token, v_run, 'GATE', 'info', v_ok, NULL, NULL,
          CASE
            WHEN v_ok THEN format('published: %s new or revised row(s), %s unchanged', v_new, v_same)
            WHEN v_failed > 0 THEN format('not published: %s fail rule(s) failed', v_failed)
            ELSE format('not published: %s R7 warning(s) await an admin''s confirmation', v_r7)
          END);

  RETURN QUERY SELECT v_run, v_rules, v_failed, v_warn, v_ok, v_new, v_same;
END
$fn$;

COMMENT ON FUNCTION public.ds__gate(text, uuid, boolean) IS
  'The publish gate itself. Not executable by any client role; reached through ds_run_publish_gate (service role) or ds_publish_series (admin).';

-- The fetcher's entry. It can never confirm an R7 warning: a large revision
-- from a job waits in staging for an admin.
CREATE FUNCTION public.ds_run_publish_gate(p_series_id text, p_stage_token uuid)
RETURNS TABLE (run_at timestamptz, rules integer, failed integer, warnings integer,
               published boolean, rows_published integer, rows_unchanged integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM public.ds__gate(p_series_id, p_stage_token, false)
$$;

COMMENT ON FUNCTION public.ds_run_publish_gate(text, uuid) IS
  'The fetcher''s publish call (service role). Same rules as the admin''s; R7 warnings are never confirmed here.';

-- The admin's entry: the admin check, then the gate.
CREATE FUNCTION public.ds_publish_series(p_series_id text, p_stage_token uuid, p_confirm_warnings boolean DEFAULT false)
RETURNS TABLE (run_at timestamptz, rules integer, failed integer, warnings integer,
               published boolean, rows_published integer, rows_unchanged integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'only an admin can publish a series' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY SELECT * FROM public.ds__gate(p_series_id, p_stage_token, p_confirm_warnings);
END
$fn$;

COMMENT ON FUNCTION public.ds_publish_series(text, uuid, boolean) IS
  'The admin''s publish action: re-runs the rules, records the run, publishes when no fail rule failed and R7 warnings are confirmed.';

-- The admin's preview: the rules without a run recorded or a row moved.
CREATE FUNCTION public.ds_preview_stage(p_series_id text, p_stage_token uuid)
RETURNS TABLE (rule_id text, severity text, passed boolean, expected text, actual text, detail text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'only an admin can preview a stage' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY SELECT * FROM public.ds_stage_checks(p_series_id, p_stage_token);
END
$fn$;


-- Taken back at once (granted again in part 4 to the role each needs):
-- CREATE FUNCTION grants EXECUTE to PUBLIC.
REVOKE EXECUTE ON FUNCTION public.ds_stage_checks(text, uuid)            FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ds__gate(text, uuid, boolean)          FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ds_run_publish_gate(text, uuid)        FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ds_publish_series(text, uuid, boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ds_preview_stage(text, uuid)           FROM PUBLIC, anon, authenticated, service_role;

-- --- Public views ------------------------------------------------------------

-- The latest vintage per series, member and period, published series only.
CREATE VIEW public.v_series_latest
WITH (security_invoker = false, security_barrier = true) AS
SELECT DISTINCT ON (o.series_id, o.member, o.period_start)
  o.series_id, o.member, o.period_start, o.period_label, o.value, o.unit, o.is_projection,
  o.vintage, o.vintage_date, o.retrieved_at, o.source_url, o.source_code, o.source_locator, o.ingest
FROM public.ds_observation o
JOIN public.ds_series s ON s.id = o.series_id AND s.status = 'published'
ORDER BY o.series_id, o.member, o.period_start, o.vintage_date DESC, o.published_at DESC;

-- Every published vintage of every published series: the detail page's
-- vintage picker, its revision history, and the FSRE reader's editions.
CREATE VIEW public.v_series_history
WITH (security_invoker = false, security_barrier = true) AS
SELECT o.series_id, o.member, o.period_start, o.period_label, o.value, o.unit, o.is_projection,
       o.vintage, o.vintage_date, o.retrieved_at, o.published_at, o.source_url, o.source_code,
       o.source_locator, o.ingest
FROM public.ds_observation o
JOIN public.ds_series s ON s.id = o.series_id AND s.status = 'published';

-- Published series with their source and the state of their last gate run:
-- the trail under every chart (source, code, last pull, vintage, checks).
CREATE VIEW public.v_series_status
WITH (security_invoker = false, security_barrier = true) AS
SELECT s.id AS series_id, s.title_en, s.title_id, s.unit, s.frequency, s.chain_link, s.ingest,
       s.is_projection, s.definition_note, s.source_code, s.source_url AS series_url, s.review_due,
       src.id AS source_id, src.name AS source_name, src.homepage_url AS source_homepage, src.license AS source_license,
       obs.n_values, obs.first_period, obs.last_period, obs.last_retrieved_at, obs.latest_vintage,
       chk.run_at AS last_check_at, chk.n_rules AS last_check_rules,
       chk.n_failed AS last_check_failed, chk.n_warned AS last_check_warned
FROM public.ds_series s
JOIN public.ds_source src ON src.id = s.source_id
LEFT JOIN LATERAL (
  SELECT count(*) AS n_values, min(o.period_start) AS first_period, max(o.period_start) AS last_period,
         max(o.retrieved_at) AS last_retrieved_at,
         (array_agg(o.vintage ORDER BY o.vintage_date DESC, o.published_at DESC))[1] AS latest_vintage
    FROM public.ds_observation o WHERE o.series_id = s.id
) obs ON true
LEFT JOIN LATERAL (
  SELECT c.run_at,
         count(*) FILTER (WHERE c.severity <> 'info') AS n_rules,
         count(*) FILTER (WHERE c.severity = 'fail' AND NOT c.passed) AS n_failed,
         count(*) FILTER (WHERE c.severity = 'warn' AND NOT c.passed) AS n_warned
    FROM public.ds_check c
   WHERE c.series_id = s.id
     AND c.run_at = (SELECT max(c2.run_at) FROM public.ds_check c2
                      WHERE c2.series_id = s.id AND c2.rule_id = 'GATE' AND c2.passed)
   GROUP BY c.run_at
) chk ON true
WHERE s.status = 'published';

-- Published charts and the series they draw, one row per chart and series
-- (a timeline has one row with no series).
CREATE VIEW public.v_chart_catalog
WITH (security_invoker = false, security_barrier = true) AS
SELECT c.slug AS chart_slug, c.title, c.subtitle, c.chain_link, c.chart_type, c.annotation_sectors,
       c.sort_order AS chart_sort, c.updated_at AS chart_updated_at,
       cs.series_id, cs.label, cs.role, cs.members, cs.sort_order AS series_sort,
       s.unit, s.frequency, s.is_projection, s.title_en AS series_title, s.source_code,
       src.name AS source_name
FROM public.ds_chart c
LEFT JOIN public.ds_chart_series cs ON cs.chart_slug = c.slug
       AND EXISTS (SELECT 1 FROM public.ds_series x WHERE x.id = cs.series_id AND x.status = 'published')
LEFT JOIN public.ds_series s ON s.id = cs.series_id
LEFT JOIN public.ds_source src ON src.id = s.source_id
WHERE c.published;

-- What a chart draws: its series' latest values with the trail of each.
CREATE VIEW public.v_chart_data
WITH (security_invoker = false, security_barrier = true) AS
SELECT cs.chart_slug, cs.series_id, cs.label, cs.role, cs.sort_order AS series_sort,
       l.member, l.period_start, l.period_label, l.value, l.unit, l.is_projection,
       l.vintage, l.retrieved_at, l.source_url, l.source_code, l.source_locator
FROM public.ds_chart c
JOIN public.ds_chart_series cs ON cs.chart_slug = c.slug
JOIN public.v_series_latest l ON l.series_id = cs.series_id
WHERE c.published
  AND (cs.members IS NULL OR l.member = ANY (cs.members));

-- The chain's links and the author's status line for each.
CREATE VIEW public.v_chain
WITH (security_invoker = false, security_barrier = true) AS
SELECT ch.chain_link, ch.title, ch.question, ch.status_text, ch.sort_order
FROM public.ds_chain ch;

-- Published essays that embed a published chart.
CREATE VIEW public.v_chart_usage
WITH (security_invoker = false, security_barrier = true) AS
SELECT DISTINCT n.node -> 'attrs' ->> 'slug' AS chart_slug, e.slug AS essay_slug, e.title AS essay_title
FROM public.essays e
CROSS JOIN LATERAL jsonb_path_query(e.content_json, 'strict $.**') AS n(node)
JOIN public.ds_chart c ON c.slug = n.node -> 'attrs' ->> 'slug' AND c.published
WHERE e.published = true
  AND e.status = 'published'::public.content_status_enum
  AND jsonb_typeof(n.node) = 'object'
  AND n.node ->> 'type' = 'chartEmbed';

COMMENT ON VIEW public.v_series_latest IS 'Public: the latest vintage per series, member and period, published series only. SECURITY DEFINER on purpose; the column list is the boundary.';
COMMENT ON VIEW public.v_series_history IS 'Public: every vintage of every published series.';
COMMENT ON VIEW public.v_series_status IS 'Public: published series, their source, values and last successful gate run.';
COMMENT ON VIEW public.v_chart_catalog IS 'Public: published charts and their published series.';
COMMENT ON VIEW public.v_chart_data IS 'Public: what each published chart draws, with the trail of every value.';
COMMENT ON VIEW public.v_chain IS 'Public: the sequencing chain and the author''s status per link.';
COMMENT ON VIEW public.v_chart_usage IS 'Public: published essays embedding a published chart.';

-- --- RLS ---------------------------------------------------------------------
-- Admin-only on every table, one policy per verb, the admin check inlined
-- over user_roles (the tracker_entry pattern). anon has no policy and no
-- privilege: it reads the views. The service role bypasses RLS; what it may
-- do is set by the privileges below.

DO $rls$
DECLARE
  t text;
  admin_check constant text :=
    'EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ''admin''::public.app_role)';
BEGIN
  FOREACH t IN ARRAY ARRAY['ds_source', 'ds_series', 'ds_fetch_run', 'ds_observation_stage', 'ds_observation',
                           'ds_check', 'ds_chain', 'ds_chart', 'ds_chart_series'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', t || '_select_admin', t, admin_check);
  END LOOP;

  -- Writable by an admin: the registry, the staging table and the charts.
  -- ds_observation, ds_check and ds_fetch_run are written by the gate and
  -- the fetcher only.
  FOREACH t IN ARRAY ARRAY['ds_source', 'ds_series', 'ds_observation_stage', 'ds_chain', 'ds_chart', 'ds_chart_series'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', t || '_insert_admin', t, admin_check);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', t || '_update_admin', t, admin_check, admin_check);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', t || '_delete_admin', t, admin_check);
  END LOOP;
END
$rls$;

-- --- Privileges --------------------------------------------------------------
-- Revoke first: Supabase's default privileges grant ALL on new public objects
-- to anon, authenticated and service_role, and a GRANT cannot take that away.

REVOKE ALL ON public.ds_source, public.ds_series, public.ds_fetch_run, public.ds_observation_stage,
              public.ds_observation, public.ds_check, public.ds_chain, public.ds_chart, public.ds_chart_series
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ds_source, public.ds_series, public.ds_observation_stage,
                                        public.ds_chain, public.ds_chart, public.ds_chart_series TO authenticated;
GRANT SELECT ON public.ds_fetch_run, public.ds_observation, public.ds_check TO authenticated;

-- The fetcher: read the registry, log its runs, stage and clear its rows.
GRANT SELECT ON public.ds_source, public.ds_series, public.ds_observation, public.ds_check,
                public.ds_chain, public.ds_chart, public.ds_chart_series TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.ds_fetch_run TO service_role;
GRANT SELECT, INSERT, DELETE ON public.ds_observation_stage TO service_role;

REVOKE ALL ON public.v_series_latest, public.v_series_history, public.v_series_status, public.v_chart_catalog,
              public.v_chart_data, public.v_chain, public.v_chart_usage
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.v_series_latest, public.v_series_history, public.v_series_status, public.v_chart_catalog,
                public.v_chart_data, public.v_chain, public.v_chart_usage
  TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.ds_vintage_date(text)                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ds_on_grid(date, public.ds_frequency)    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ds_observation_refuse_update()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ds_series_lock()                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ds_stage_checks(text, uuid)              FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ds__gate(text, uuid, boolean)            FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ds_run_publish_gate(text, uuid)          FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ds_publish_series(text, uuid, boolean)   FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ds_preview_stage(text, uuid)             FROM PUBLIC, anon, authenticated, service_role;
-- The generated column and the CHECKs call ds_vintage_date and ds_on_grid
-- as the table owner; the fetcher and the admin never call them directly.
GRANT EXECUTE ON FUNCTION public.ds_vintage_date(text)                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ds_run_publish_gate(text, uuid)        TO service_role;
GRANT EXECUTE ON FUNCTION public.ds_publish_series(text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ds_preview_stage(text, uuid)           TO authenticated;

INSERT INTO public.ds_source (id, name, homepage_url, license, access) VALUES
  ('ember', 'Ember', 'https://ember-energy.org/data/api/', 'CC BY 4.0', 'api'),
  ('imf',   'International Monetary Fund', 'https://data.imf.org/', 'IMF Copyright and Usage, https://www.imf.org/external/terms.htm', 'api'),
  ('esdm',  'Kementerian Energi dan Sumber Daya Mineral', 'https://www.esdm.go.id/', 'Public government document', 'manual'),
  ('pln',   'PT PLN (Persero)', 'https://web.pln.co.id/', 'Public company release', 'manual'),
  ('bei',   'Bursa Efek Indonesia (IDXCarbon)', 'https://idxcarbon.co.id/', 'Public exchange release', 'manual'),
  ('djppr', 'Direktorat Jenderal Pengelolaan Pembiayaan dan Risiko, Kementerian Keuangan', 'https://www.djppr.kemenkeu.go.id/', 'Public government document', 'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ds_series
  (id, source_id, source_code, source_url, title_id, title_en, unit, frequency, chain_link, ingest,
   is_projection, definition_note, review_due)
VALUES
  -- Ember, yearly and monthly electricity data. member = Ember's series name.
  ('ember.idn.generation', 'ember', 'electricity-generation/yearly?is_aggregate_series=false',
   'https://ember-energy.org/data/yearly-electricity-data/',
   'Pembangkitan listrik per sumber', 'Electricity generation by source', 'TWh', 'A', 'infrastructure', 'api',
   false, 'Ember yearly generation for Indonesia (entity_code IDN), field generation_twh, one member per non-aggregate source.', NULL),
  ('ember.idn.capacity', 'ember', 'installed-capacity/monthly?is_aggregate_series=false',
   'https://ember-energy.org/data/monthly-electricity-data/',
   'Kapasitas terpasang per sumber', 'Installed capacity by source', 'GW', 'M', 'infrastructure', 'api',
   false, 'Ember installed capacity for Indonesia, field capacity_gw. Ember publishes capacity monthly only.', NULL),
  ('ember.idn.coal_share', 'ember', 'electricity-generation/yearly?series=Coal',
   'https://ember-energy.org/data/yearly-electricity-data/',
   'Porsi batu bara dalam pembangkitan', 'Coal share of generation', '%', 'A', 'transition', 'api',
   false, 'Ember yearly generation for Indonesia, series Coal, field share_of_generation_pct.', NULL),
  ('ember.idn.co2_intensity', 'ember', 'carbon-intensity/yearly',
   'https://ember-energy.org/data/yearly-electricity-data/',
   'Intensitas karbon listrik', 'Carbon intensity of electricity', 'gCO2e/kWh', 'A', 'transition', 'api',
   false, 'Ember yearly carbon intensity of generation for Indonesia, field emissions_intensity_gco2_per_kwh.', NULL),
  ('ember.idn.power_emissions', 'ember', 'power-sector-emissions/yearly?series=Total',
   'https://ember-energy.org/data/yearly-electricity-data/',
   'Emisi sektor listrik', 'Power sector emissions', 'MtCO2e', 'A', 'transition', 'api',
   false, 'Ember yearly power-sector emissions for Indonesia, aggregate total, field emissions_mtco2.', NULL),
  -- IMF SDMX 3.0. source_code = agency/dataflow/version/key.
  ('imf.idn.policy_rate', 'imf', 'IMF.STA/MFS_IR/9.0.0/IDN.MFS166_RT_PT_A_PT.M',
   'https://data.imf.org/en/datasets/IMF.STA:MFS_IR',
   'Suku bunga kebijakan moneter', 'Monetary policy-related interest rate', '% per annum', 'M', 'finance', 'api',
   false, 'IMF Monetary and Financial Statistics, interest rates: indicator MFS166_RT_PT_A_PT (monetary policy-related rate, percent per annum) for Indonesia, monthly.', NULL),
  ('imf.idn.idr_usd', 'imf', 'IMF.STA/ER/4.0.1/IDN.XDC_USD.PA_RT.M',
   'https://data.imf.org/en/datasets/IMF.STA:ER',
   'Kurs rupiah per dolar AS, rata-rata periode', 'Rupiah per US dollar, period average', 'IDR per USD', 'M', 'finance', 'api',
   false, 'IMF Exchange Rates: XDC_USD (domestic currency per US dollar), PA_RT (period average), Indonesia, monthly.', NULL),
  ('imf.weo.idn.gdp_growth', 'imf', 'IMF.RES/WEO/9.0.0/IDN.NGDP_RPCH.A',
   'https://data.imf.org/en/datasets/IMF.RES:WEO',
   'Pertumbuhan PDB riil', 'Real GDP growth', '% change', 'A', 'macro', 'api',
   true, 'IMF World Economic Outlook, NGDP_RPCH, Indonesia. The vintage is the edition (WEO-YYYY-MM from PUBLICATION_DATE); years after LATEST_ACTUAL_ANNUAL_DATA are IMF staff projections.', NULL),
  ('imf.weo.idn.inflation', 'imf', 'IMF.RES/WEO/9.0.0/IDN.PCPIPCH.A',
   'https://data.imf.org/en/datasets/IMF.RES:WEO',
   'Inflasi IHK, rata-rata periode', 'CPI inflation, period average', '% change', 'A', 'macro', 'api',
   true, 'IMF World Economic Outlook, PCPIPCH, Indonesia. Vintage and projection years as for real GDP growth.', NULL),
  ('imf.pcps.coal_au', 'imf', 'IMF.RES/PCPS/9.0.0/G001.PCOALAU.USD.M',
   'https://data.imf.org/en/datasets/IMF.RES:PCPS',
   'Harga batu bara Australia (Newcastle)', 'Coal price, Australia (Newcastle)', 'USD per tonne', 'M', 'macro', 'api',
   false, 'IMF Primary Commodity Prices, PCOALAU: Australian thermal coal, 12,000 btu/lb, FOB Newcastle/Port Kembla, US$ per metric tonne, monthly.', NULL),
  -- Manual series. One reporter and one definition each; a new definition
  -- is a new series.
  ('pln.idn.spklu_units', 'pln', 'PLN press release: SPKLU units operated by PLN',
   'https://web.pln.co.id/media/siaran-pers',
   'Unit SPKLU yang dioperasikan PLN', 'Public EV charging units operated by PLN', 'units', 'event', 'infrastructure', 'manual',
   false, 'Charging units (not locations) operated by PLN alone, as PLN''s own release states them. Counts from ESDM or that include other operators belong to a different series.', '2027-01-31'),
  ('bei.idxcarbon.volume', 'bei', 'IDXCarbon trading volume, all markets',
   'https://idxcarbon.co.id/',
   'Volume perdagangan IDXCarbon', 'IDXCarbon traded volume', 'tCO2e', 'Q', 'carbon_price', 'manual',
   false, 'Volume traded on IDXCarbon in the quarter, all markets, as BEI''s own release states it. Figures quoted by the press are not a source.', '2027-01-31'),
  ('djppr.idn.green_sukuk', 'djppr', 'Green sukuk issuance, per issuance',
   'https://www.djppr.kemenkeu.go.id/',
   'Penerbitan sukuk hijau pemerintah', 'Government green sukuk issuance', 'IDR trillion', 'event', 'finance', 'manual',
   false, 'Value of each sovereign green sukuk issuance (global and retail) at its settlement date, as DJPPR''s issuance release states it.', '2027-01-31')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ds_chain (chain_link, title, question, sort_order) VALUES
  ('policy',         'Policy',         'Are the rules in place that the rest of the chain depends on?', 1),
  ('infrastructure', 'Infrastructure', 'Is the physical system being built?', 2),
  ('finance',        'Finance',        'Is capital available, and at what cost?', 3),
  ('transition',     'Transition',     'Is the power system actually getting cleaner?', 4),
  ('carbon_price',   'Carbon price',   'Does carbon carry a price that changes decisions?', 5),
  ('macro',          'Macro context',  'What economy is the transition happening in?', 6)
ON CONFLICT (chain_link) DO NOTHING;

INSERT INTO public.ds_chart (slug, title, subtitle, chain_link, chart_type, annotation_sectors, sort_order) VALUES
  ('policy-timeline', '[Finding: which rule the chain is waiting on]',
   'Verified entries of the tracker register, by quarter', 'policy', 'timeline',
   '{geothermal,solar,pln_procurement,jetp,ojk_taxonomy,danantara,other}', 1),
  ('generation-mix', '[Finding: what the generation mix shows]',
   'Electricity generation by source, TWh', 'infrastructure', 'stacked_bar', '{pln_procurement}', 1),
  ('installed-capacity', '[Finding: what installed capacity shows]',
   'Installed capacity by source, GW', 'infrastructure', 'line', '{solar,geothermal}', 2),
  ('spklu-units', '[Finding: what PLN''s charging network shows]',
   'Public EV charging units operated by PLN', 'infrastructure', 'step', '{}', 3),
  ('policy-rate', '[Finding: what the policy rate says about the cost of capital]',
   'Bank Indonesia''s monetary policy-related rate, % per annum', 'finance', 'step', '{jetp,danantara}', 1),
  ('rupiah-per-dollar', '[Finding: what the rupiah means for imported equipment]',
   'Rupiah per US dollar, monthly average', 'finance', 'line', '{}', 2),
  ('green-sukuk', '[Finding: what green sukuk issuance shows]',
   'Government green sukuk issuance, IDR trillion', 'finance', 'bar', '{ojk_taxonomy}', 3),
  ('coal-share', '[Finding: whether coal''s share is falling]',
   'Coal share of electricity generation, %', 'transition', 'line', '{pln_procurement,jetp}', 1),
  ('grid-carbon-intensity', '[Finding: what grid carbon intensity shows]',
   'Carbon intensity of electricity, gCO2e/kWh', 'transition', 'line', '{}', 2),
  ('power-sector-emissions', '[Finding: what power-sector emissions show]',
   'Power-sector emissions, MtCO2e', 'transition', 'bar', '{}', 3),
  ('idxcarbon-volume', '[Finding: whether the carbon exchange is trading]',
   'IDXCarbon traded volume by quarter, tCO2e', 'carbon_price', 'bar', '{}', 1),
  ('weo-growth', '[Finding: what the IMF expects for growth]',
   'Real GDP growth and CPI inflation, % (IMF staff projections after the last actual year)', 'macro', 'line', '{}', 1),
  ('coal-price', '[Finding: what the coal price means for the transition]',
   'Australian thermal coal, US$ per tonne', 'macro', 'line', '{}', 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.ds_chart_series (chart_slug, series_id, label, role, members, sort_order) VALUES
  ('generation-mix', 'ember.idn.generation', 'Generation', 'primary',
   '{Coal,Gas,"Other fossil",Hydro,Bioenergy,"Other renewables",Solar,Wind}', 1),
  ('installed-capacity', 'ember.idn.capacity', 'Capacity', 'primary',
   '{Coal,Gas,"Other fossil",Hydro,Bioenergy,"Other renewables",Solar,Wind}', 1),
  ('spklu-units', 'pln.idn.spklu_units', 'SPKLU units (PLN)', 'primary', NULL, 1),
  ('policy-rate', 'imf.idn.policy_rate', 'Policy rate', 'primary', NULL, 1),
  ('rupiah-per-dollar', 'imf.idn.idr_usd', 'IDR per USD', 'primary', NULL, 1),
  ('green-sukuk', 'djppr.idn.green_sukuk', 'Green sukuk', 'primary', NULL, 1),
  ('coal-share', 'ember.idn.coal_share', 'Coal share', 'primary', NULL, 1),
  ('grid-carbon-intensity', 'ember.idn.co2_intensity', 'Carbon intensity', 'primary', NULL, 1),
  ('power-sector-emissions', 'ember.idn.power_emissions', 'Emissions', 'primary', NULL, 1),
  ('idxcarbon-volume', 'bei.idxcarbon.volume', 'Traded volume', 'primary', NULL, 1),
  ('weo-growth', 'imf.weo.idn.gdp_growth', 'Real GDP growth', 'primary', NULL, 1),
  ('weo-growth', 'imf.weo.idn.inflation', 'CPI inflation', 'context', NULL, 2),
  ('coal-price', 'imf.pcps.coal_au', 'Newcastle coal', 'primary', NULL, 1)
ON CONFLICT (chart_slug, series_id) DO NOTHING;

CREATE FUNCTION public.ds_macro_assumptions(p_edition text)
RETURNS TABLE (
  edition       text,
  indicator     text,
  year          integer,
  value         numeric,
  unit          text,
  is_projection boolean,
  n_months      integer,
  series_id     text,
  source_code   text,
  vintage       text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
#variable_conflict use_column
DECLARE
  v_asof date := public.ds_vintage_date(p_edition);
BEGIN
  IF p_edition !~ '^WEO-[0-9]{4}-[0-9]{2}$' OR v_asof IS NULL THEN
    RAISE EXCEPTION 'edition must look like WEO-2026-10, not %', p_edition USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.ds_observation o
      JOIN public.ds_series s ON s.id = o.series_id AND s.status = 'published'
     WHERE o.series_id = 'imf.weo.idn.gdp_growth' AND o.vintage = p_edition
  ) THEN
    RAISE EXCEPTION 'WEO edition % is not published', p_edition USING ERRCODE = 'no_data_found';
  END IF;

  RETURN QUERY
  SELECT p_edition, m.indicator, extract(year FROM o.period_start)::integer, o.value, o.unit, o.is_projection,
         NULL::integer, o.series_id, o.source_code, o.vintage
    FROM (VALUES ('imf.weo.idn.gdp_growth', 'gdp_growth'), ('imf.weo.idn.inflation', 'inflation')) AS m(series_id, indicator)
    JOIN public.ds_observation o ON o.series_id = m.series_id AND o.vintage = p_edition
    JOIN public.ds_series s ON s.id = o.series_id AND s.status = 'published'
  UNION ALL
  SELECT p_edition, m.indicator, a.yr, round(avg(a.value), 6), min(a.unit), false,
         count(*)::integer, m.series_id, min(a.source_code), max(a.vintage)
    FROM (VALUES ('imf.idn.idr_usd', 'idr_usd'), ('imf.pcps.coal_au', 'coal_usd_t')) AS m(series_id, indicator)
    CROSS JOIN LATERAL (
      SELECT DISTINCT ON (o.period_start)
             extract(year FROM o.period_start)::integer AS yr, o.value, o.unit, o.source_code, o.vintage
        FROM public.ds_observation o
        JOIN public.ds_series s ON s.id = o.series_id AND s.status = 'published'
       WHERE o.series_id = m.series_id
         AND o.vintage_date < (v_asof + interval '1 month')::date
       ORDER BY o.period_start, o.vintage_date DESC, o.published_at DESC
    ) a
   GROUP BY m.series_id, m.indicator, a.yr
   ORDER BY 2, 3;
END
$fn$;

COMMENT ON FUNCTION public.ds_macro_assumptions(text) IS
  'FSRE''s macro assumptions for one named WEO edition: that edition''s GDP growth and inflation, and annual averages of IDR/USD and Newcastle coal as published by its month. Raises on an unpublished edition.';

CREATE VIEW public.v_macro_editions
WITH (security_invoker = false, security_barrier = true) AS
SELECT o.vintage AS edition, min(o.published_at) AS published_at,
       max(extract(year FROM o.period_start)) FILTER (WHERE NOT o.is_projection)::integer AS last_actual_year,
       max(extract(year FROM o.period_start))::integer AS last_year
FROM public.ds_observation o
JOIN public.ds_series s ON s.id = o.series_id AND s.status = 'published'
WHERE o.series_id = 'imf.weo.idn.gdp_growth'
GROUP BY o.vintage;

COMMENT ON VIEW public.v_macro_editions IS 'The WEO editions ds_macro_assumptions accepts.';

REVOKE ALL ON public.v_macro_editions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.v_macro_editions TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.ds_macro_assumptions(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ds_macro_assumptions(text) TO anon, authenticated, service_role;

COMMIT;
