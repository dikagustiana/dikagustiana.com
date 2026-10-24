-- =============================================================================
-- Rollback of supabase/migrations/20261024170000_toolkits.sql.
--
-- Kept OUT of supabase/migrations/ so `supabase db push` never applies it. Run
-- by hand, only on request, and only after the app no longer reads toolkits
-- (revert the code first: /finance/toolkits, /admin/toolkits and the module
-- page query them). The files stay in R2 under toolkits/; list them before
-- dropping if they are to be kept or removed:
--   select file_key from public.toolkit_versions order by published_at;
-- =============================================================================
BEGIN;
DROP TABLE IF EXISTS public.toolkit_versions;
DROP TABLE IF EXISTS public.toolkits;
DROP FUNCTION IF EXISTS public.toolkit_versions_guard();
DROP FUNCTION IF EXISTS public.toolkits_slug_guard();
COMMIT;
