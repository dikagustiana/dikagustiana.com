-- =============================================================================
-- The transition data layer (docs/prd/transition-data-layer/01-PRD.md, Fase 1).
--
-- Sourced series for the Green Transition Tracker and the essays that embed
-- its charts. Two ways in, one gate:
--
--   * the fetcher (pipelines/transition/, GitHub Actions, service role) writes
--     API series to ds_observation_stage and calls ds_run_publish_gate();
--   * an admin types or pastes a manual series into the same staging table
--     from /admin/transition-data and calls ds_publish_series().
--
-- Both end in ds__gate(), which runs rules R0–R8 against the staged rows,
-- records every result in ds_check, and moves the rows to ds_observation only
-- when no fail-severity rule failed (and, for an admin, when the R7 warnings
-- were confirmed). The pattern is FSLI's fs_run_publish_gate() and fs_check
-- (20261011190000_fs_publish_gate.sql).
--
-- Rules the schema holds by structure, so no check is needed for them:
--   * one series, one source: source_id lives on ds_series and cannot change;
--   * a revision never overwrites: ds_observation refuses UPDATE, its key
--     carries the vintage, and only the gate (the table owner) inserts;
--   * the service role can stage and log, nothing else. INSERT, UPDATE and
--     DELETE on ds_observation, ds_check, the registry and the charts are
--     revoked from it, so a leaked key cannot publish around the rules
--     (PRD, Risiko: "Key hanya bisa menulis staging").
--
-- Reads. anon has no privilege on any ds_ table. It reads seven views, each
-- owned by postgres with security_invoker = false and security_barrier = true,
-- whose column lists and WHERE clauses are the public contract (the
-- essay_structure precedent, 20260803150000). Supabase's linter flags a
-- SECURITY DEFINER view; here that is the design. An admin reads the tables
-- under RLS.
--
-- Every function runs with an empty search_path and names objects by schema.
--
-- DOWN: supabase/rollback/20261024120000_transition_data_layer_down.sql
-- =============================================================================

-- --- Enums -------------------------------------------------------------------

-- The sequencing thesis, in order: policy → infrastructure → finance →
-- transition → carbon price. macro is context, not a link of the chain.
CREATE TYPE public.ds_chain_link AS ENUM (
  'policy', 'infrastructure', 'finance', 'transition', 'carbon_price', 'macro'
);

-- timeline is a chart with no series: the verified tracker_entry rows as
-- events on a time axis (the policy link's chart).
CREATE TYPE public.ds_chart_type AS ENUM (
  'line', 'bar', 'stacked_bar', 'step', 'dot_whisker', 'timeline'
);

CREATE TYPE public.ds_frequency AS ENUM ('A', 'Q', 'M', 'event');

-- --- Helpers -----------------------------------------------------------------

-- The date a vintage stands for: 'YYYY-MM-DD' (a pull or a document date) is
-- that day; an edition label such as 'WEO-2026-10' is the first of its month.
-- Anything else is NULL, which R6 reports and ds_observation refuses.
CREATE FUNCTION public.ds_vintage_date(p_vintage text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $fn$
BEGIN
  IF p_vintage ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RETURN p_vintage::date;
  ELSIF p_vintage ~ '^[A-Z]+-[0-9]{4}-[0-9]{2}$' THEN
    RETURN (substring(p_vintage FROM '[0-9]{4}-[0-9]{2}$') || '-01')::date;
  END IF;
  RETURN NULL;
EXCEPTION WHEN others THEN
  RETURN NULL;
END
$fn$;

COMMENT ON FUNCTION public.ds_vintage_date(text) IS
  'The date a vintage stands for: YYYY-MM-DD as itself, an edition label (WEO-2026-10) as the first of its month, else NULL.';

-- Whether a period start lies on its frequency's grid (R3).
CREATE FUNCTION public.ds_on_grid(p_period date, p_frequency public.ds_frequency)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_frequency
    WHEN 'A' THEN extract(month FROM p_period) = 1 AND extract(day FROM p_period) = 1
    WHEN 'Q' THEN extract(month FROM p_period) IN (1, 4, 7, 10) AND extract(day FROM p_period) = 1
    WHEN 'M' THEN extract(day FROM p_period) = 1
    ELSE true
  END
$$;

-- --- Registry ----------------------------------------------------------------

CREATE TABLE public.ds_source (
  id           text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_]*$'),
  name         text NOT NULL CHECK (btrim(name) <> ''),
  homepage_url text NOT NULL CHECK (homepage_url ~ '^https://'),
  license      text NOT NULL CHECK (btrim(license) <> ''),
  access       text NOT NULL CHECK (access IN ('api', 'manual', 'download')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ds_source IS
  'One row per institution a series comes from (transition data layer).';

CREATE TABLE public.ds_series (
  id              text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$'),
  source_id       text NOT NULL REFERENCES public.ds_source (id) ON DELETE RESTRICT,
  -- The source's own code. For an IMF series it names the dataflow and its
  -- version, so a new version fails the fetch instead of reading a different
  -- structure: 'IMF.STA/ER/4.0.1/IDN.XDC_USD.PA_RT.M'.
  source_code     text NOT NULL CHECK (btrim(source_code) <> ''),
  -- The page a reader opens to check the series; each staged row carries
  -- its own source_url too.
  source_url      text NOT NULL CHECK (source_url ~ '^https://'),
  title_id        text NOT NULL CHECK (btrim(title_id) <> ''),
  title_en        text NOT NULL CHECK (btrim(title_en) <> ''),
  unit            text NOT NULL CHECK (btrim(unit) <> ''),
  frequency       public.ds_frequency NOT NULL,
  chain_link      public.ds_chain_link NOT NULL,
  ingest          text NOT NULL CHECK (ingest IN ('api', 'manual')),
  is_projection   boolean NOT NULL DEFAULT false,
  definition_note text NOT NULL CHECK (btrim(definition_note) <> ''),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'retired')),
  -- R7's threshold: a change against the previous vintage larger than this
  -- share of it is a warning an admin must confirm.
  r7_threshold    numeric NOT NULL DEFAULT 0.25 CHECK (r7_threshold > 0),
  -- A manual series is due for review on this date; the admin lists overdue
  -- ones (PRD, Risiko: "Seri manual tidak diperbarui").
  review_due      date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ds_series_manual_has_review CHECK (ingest = 'api' OR review_due IS NOT NULL)
);

COMMENT ON TABLE public.ds_series IS
  'Series registry. One series, one source, locked: source_id never changes; source_code, unit and frequency are fixed once a value is published.';

CREATE INDEX ds_series_source_idx ON public.ds_series (source_id);

CREATE TRIGGER update_ds_series_updated_at
  BEFORE UPDATE ON public.ds_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --- Fetch runs --------------------------------------------------------------

CREATE TABLE public.ds_fetch_run (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    text NOT NULL REFERENCES public.ds_source (id) ON DELETE RESTRICT,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  status       text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'partial', 'failed')),
  rows_staged  integer NOT NULL DEFAULT 0 CHECK (rows_staged >= 0),
  error        text,
  git_sha      text,
  run_url      text CHECK (run_url IS NULL OR run_url ~ '^https://'),
  CONSTRAINT ds_fetch_run_finished CHECK ((status = 'running') = (finished_at IS NULL))
);

COMMENT ON TABLE public.ds_fetch_run IS 'One row per fetcher job per source.';

CREATE INDEX ds_fetch_run_source_started_idx ON public.ds_fetch_run (source_id, started_at DESC);

-- --- Observations ------------------------------------------------------------

-- Where every value lands first. Deliberately lax: a bad row is staged and
-- then reported by a rule, rather than refused by a constraint the admin
-- never sees. No key on (series, member, period, vintage), so R4 can count
-- duplicates.
CREATE TABLE public.ds_observation_stage (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stage_token    uuid NOT NULL,
  series_id      text NOT NULL REFERENCES public.ds_series (id) ON DELETE CASCADE,
  -- The member within a series: the energy source of a generation mix
  -- ('Coal', 'Solar'), '' for a series with one line.
  member         text NOT NULL DEFAULT '',
  period_start   date NOT NULL,
  period_label   text,
  value          numeric NOT NULL,
  unit           text,
  vintage        text NOT NULL,
  is_projection  boolean NOT NULL DEFAULT false,
  retrieved_at   timestamptz NOT NULL DEFAULT now(),
  source_url     text,
  source_code    text,
  source_locator text,
  ingest         text NOT NULL CHECK (ingest IN ('api', 'manual')),
  fetch_run_id   uuid REFERENCES public.ds_fetch_run (id) ON DELETE SET NULL,
  entered_by     uuid DEFAULT auth.uid(),
  staged_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ds_observation_stage IS
  'Staging: every value lands here first and reaches ds_observation only through ds__gate().';

CREATE INDEX ds_observation_stage_token_idx ON public.ds_observation_stage (series_id, stage_token);
CREATE INDEX ds_observation_stage_run_idx ON public.ds_observation_stage (fetch_run_id) WHERE fetch_run_id IS NOT NULL;

-- Published values. A revision is a new row under a new vintage; the old one
-- stays for audit. Strict where staging is lax.
CREATE TABLE public.ds_observation (
  series_id      text NOT NULL REFERENCES public.ds_series (id) ON DELETE RESTRICT,
  member         text NOT NULL DEFAULT '',
  period_start   date NOT NULL,
  vintage        text NOT NULL,
  vintage_date   date GENERATED ALWAYS AS (public.ds_vintage_date(vintage)) STORED,
  period_label   text,
  value          numeric NOT NULL,
  unit           text NOT NULL,
  is_projection  boolean NOT NULL DEFAULT false,
  retrieved_at   timestamptz NOT NULL,
  source_url     text NOT NULL CHECK (source_url ~ '^https://'),
  source_code    text,
  source_locator text,
  ingest         text NOT NULL CHECK (ingest IN ('api', 'manual')),
  fetch_run_id   uuid REFERENCES public.ds_fetch_run (id) ON DELETE SET NULL,
  entered_by     uuid,
  published_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series_id, member, period_start, vintage),
  CONSTRAINT ds_observation_vintage_valid CHECK (vintage_date IS NOT NULL),
  CONSTRAINT ds_observation_manual_located CHECK (ingest = 'api' OR coalesce(btrim(source_locator), '') <> ''),
  CONSTRAINT ds_observation_api_coded CHECK (ingest = 'manual' OR coalesce(btrim(source_code), '') <> '')
);

COMMENT ON TABLE public.ds_observation IS
  'Published values, append-only. Written only by ds__gate(); UPDATE is refused.';

CREATE INDEX ds_observation_latest_idx
  ON public.ds_observation (series_id, member, period_start, vintage_date DESC, published_at DESC);
CREATE INDEX ds_observation_run_idx ON public.ds_observation (fetch_run_id) WHERE fetch_run_id IS NOT NULL;

CREATE FUNCTION public.ds_observation_refuse_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  RAISE EXCEPTION 'ds_observation is append-only: publish a new vintage instead of changing %/%/%',
    OLD.series_id, OLD.period_start, OLD.vintage
    USING ERRCODE = 'object_not_in_prerequisite_state';
END
$fn$;

CREATE TRIGGER ds_observation_append_only
  BEFORE UPDATE ON public.ds_observation
  FOR EACH ROW EXECUTE FUNCTION public.ds_observation_refuse_update();

-- One series, one source: source_id never changes. Once a value is
-- published, neither do the code, the unit or the frequency; a new
-- definition is a new series, shown beside the old one (PRD, SPKLU).
CREATE FUNCTION public.ds_series_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'a series id cannot change (%)', OLD.id USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF NEW.source_id IS DISTINCT FROM OLD.source_id THEN
    RAISE EXCEPTION 'series % belongs to source %: one series, one source', OLD.id, OLD.source_id
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF (NEW.source_code, NEW.unit, NEW.frequency, NEW.ingest, NEW.is_projection)
     IS DISTINCT FROM (OLD.source_code, OLD.unit, OLD.frequency, OLD.ingest, OLD.is_projection)
     AND EXISTS (SELECT 1 FROM public.ds_observation o WHERE o.series_id = OLD.id) THEN
    RAISE EXCEPTION 'series % has published values: its code, unit, frequency, ingest and projection flag are fixed; register a new series', OLD.id
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER ds_series_locked
  BEFORE UPDATE ON public.ds_series
  FOR EACH ROW EXECUTE FUNCTION public.ds_series_lock();

-- --- Checks ------------------------------------------------------------------

CREATE TABLE public.ds_check (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  series_id   text NOT NULL REFERENCES public.ds_series (id) ON DELETE CASCADE,
  stage_token uuid NOT NULL,
  run_at      timestamptz NOT NULL,
  rule_id     text NOT NULL,
  severity    text NOT NULL CHECK (severity IN ('fail', 'warn', 'info')),
  passed      boolean NOT NULL,
  expected    text,
  actual      text,
  detail      text NOT NULL
);

COMMENT ON TABLE public.ds_check IS
  'Rule results per gate run. A chart''s badge reads its series'' latest run.';

CREATE INDEX ds_check_series_run_idx ON public.ds_check (series_id, run_at DESC);

-- --- Charts ------------------------------------------------------------------

-- The chain's links as the tracker shows them. status_text is the author's,
-- never computed (PRD, Desain: "slot status yang ditulis penulis").
CREATE TABLE public.ds_chain (
  chain_link  public.ds_chain_link PRIMARY KEY,
  title       text NOT NULL CHECK (btrim(title) <> ''),
  question    text NOT NULL CHECK (btrim(question) <> ''),
  status_text text,
  sort_order  integer NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_ds_chain_updated_at
  BEFORE UPDATE ON public.ds_chain
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ds_chart (
  slug               text PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- A sentence that states the finding, not a label (PRD, Risiko).
  title              text NOT NULL CHECK (btrim(title) <> ''),
  subtitle           text,
  chain_link         public.ds_chain_link NOT NULL,
  chart_type         public.ds_chart_type NOT NULL,
  -- tracker_entry sectors whose verified, published rows mark the time axis.
  annotation_sectors public.tracker_sector[] NOT NULL DEFAULT '{}',
  published          boolean NOT NULL DEFAULT false,
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  -- An unwritten title is a bracketed placeholder; it never goes public.
  CONSTRAINT ds_chart_published_has_finding CHECK (NOT published OR title !~ '^\s*\[')
);

COMMENT ON TABLE public.ds_chart IS
  'Chart definitions. The tracker page and every chartEmbed in an essay read the same row.';

CREATE TRIGGER update_ds_chart_updated_at
  BEFORE UPDATE ON public.ds_chart
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ds_chart_series (
  chart_slug text NOT NULL REFERENCES public.ds_chart (slug) ON DELETE CASCADE ON UPDATE CASCADE,
  series_id  text NOT NULL REFERENCES public.ds_series (id) ON DELETE RESTRICT,
  label      text NOT NULL CHECK (btrim(label) <> ''),
  role       text NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'context')),
  -- Members to draw, in order; NULL draws every member.
  members    text[],
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (chart_slug, series_id)
);

CREATE INDEX ds_chart_series_series_idx ON public.ds_chart_series (series_id);

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
