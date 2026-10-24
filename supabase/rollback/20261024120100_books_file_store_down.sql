-- =============================================================================
-- Rollback of supabase/migrations/20261024120000_books_file_store.sql.
--
-- Kept OUT of supabase/migrations/ so `supabase db push` never applies it. Run
-- by hand (Supabase SQL editor), only on request, and only after the app no
-- longer selects file_store (revert the code first: the page's query names it).
-- Rows that point into R2 lose the marker that says so; their files stay in
-- the bucket, and the page would look for them in the `books` bucket instead,
-- so unpublish them first:
--   update public.books_uploads set published = false where file_store = 'r2';
-- =============================================================================
BEGIN;
ALTER TABLE public.books_uploads DROP COLUMN IF EXISTS file_store;
COMMIT;
