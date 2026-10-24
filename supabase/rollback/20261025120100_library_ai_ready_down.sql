-- =============================================================================
-- Rollback of supabase/migrations/20261025120000_library_ai_ready.sql.
--
-- Kept OUT of supabase/migrations/ so `supabase db push` never applies it. Run
-- by hand, only on request, and only after the book-ask function and the
-- reader no longer read ai_ready (revert the code first: the reader then
-- shows no text view, and book-ask cannot tell which books are ready). The
-- extracted text stays in R2 under text/; remove it there if it is not
-- wanted.
-- =============================================================================
BEGIN;
ALTER TABLE public.books_uploads DROP COLUMN IF EXISTS ai_ready;
COMMIT;
