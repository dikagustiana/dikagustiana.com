-- =============================================================================
-- Rollback of supabase/migrations/20261025100000_library_spines.sql.
--
-- Kept OUT of supabase/migrations/ so `supabase db push` never applies it. Run
-- by hand, only on request, and only after the app no longer selects the two
-- columns (revert the code first: useShelfBooks names them). Nothing else
-- depends on them; the page would compute every spine's colour again.
-- =============================================================================
BEGIN;
ALTER TABLE public.books_uploads DROP COLUMN IF EXISTS spine_color;
ALTER TABLE public.books_uploads DROP COLUMN IF EXISTS page_count;
COMMIT;
