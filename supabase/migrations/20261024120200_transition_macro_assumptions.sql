-- =============================================================================
-- Macro assumptions for FSRE (docs/prd/transition-data-layer, Fase 4).
--
-- The PRD names a view, v_macro_assumptions, "dengan parameter edisi WEO
-- eksplisit". A view takes no parameter, so the contract is a function that
-- requires the edition and a view that lists the editions it accepts:
--
--   SELECT * FROM public.ds_macro_assumptions('WEO-2026-10');
--   SELECT * FROM public.v_macro_editions;
--
-- One row per indicator per year:
--   gdp_growth, inflation    the WEO values OF THAT EDITION, actuals and IMF
--                            staff projections alike (is_projection says
--                            which); never another edition's;
--   idr_usd, coal_usd_t      the calendar-year average of the monthly series
--                            as published on or before the edition's month,
--                            with the months it averages (n_months < 12 is a
--                            partial year, stated, never filled).
-- No projection of our own is made (PRD, Bukan tujuan): years after the last
-- published month have no FX or coal row.
--
-- An edition that is not published raises, so a model can never run on an
-- assumption set that silently fell back to another.
--
-- DOWN:
--   DROP VIEW public.v_macro_editions;
--   DROP FUNCTION public.ds_macro_assumptions(text);
-- =============================================================================

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
