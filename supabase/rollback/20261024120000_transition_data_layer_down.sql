-- =============================================================================
-- Rollback of 20261024120000_transition_data_layer.sql, its seed
-- (20261024120100_transition_data_layer_seed.sql) and the macro assumptions
-- (20261024120200_transition_macro_assumptions.sql).
--
-- Kept outside supabase/migrations/ so nothing ever applies it by accident.
-- It DROPS every published value and every check run: take the content
-- backup first if any value has been published. tracker_entry and essays are
-- not touched; a chartEmbed left in an essay renders as nothing once the
-- views are gone.
-- =============================================================================

BEGIN;

DROP VIEW IF EXISTS public.v_macro_editions;
DROP FUNCTION IF EXISTS public.ds_macro_assumptions(text);

DROP VIEW IF EXISTS public.v_chart_usage, public.v_chain, public.v_chart_data, public.v_chart_catalog,
                    public.v_series_status, public.v_series_history, public.v_series_latest;

DROP FUNCTION IF EXISTS public.ds_preview_stage(text, uuid);
DROP FUNCTION IF EXISTS public.ds_publish_series(text, uuid, boolean);
DROP FUNCTION IF EXISTS public.ds_run_publish_gate(text, uuid);
DROP FUNCTION IF EXISTS public.ds__gate(text, uuid, boolean);
DROP FUNCTION IF EXISTS public.ds_stage_checks(text, uuid);

DROP TABLE IF EXISTS public.ds_chart_series, public.ds_chart, public.ds_chain, public.ds_check,
                     public.ds_observation, public.ds_observation_stage, public.ds_fetch_run,
                     public.ds_series, public.ds_source;

DROP FUNCTION IF EXISTS public.ds_series_lock();
DROP FUNCTION IF EXISTS public.ds_observation_refuse_update();
DROP FUNCTION IF EXISTS public.ds_on_grid(date, public.ds_frequency);
DROP FUNCTION IF EXISTS public.ds_vintage_date(text);

DROP TYPE IF EXISTS public.ds_frequency;
DROP TYPE IF EXISTS public.ds_chart_type;
DROP TYPE IF EXISTS public.ds_chain_link;

COMMIT;
