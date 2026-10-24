-- =============================================================================
-- Books on Cloudflare R2 (docs/books/R2-RUNBOOK.md; docs/DECISIONS.md, "Books
-- on R2: signed URLs, no public bucket").
--
-- A free book's file now lives in the private R2 bucket dg-books-public and is
-- reached only through a short-lived URL the `book-file` edge function signs.
-- file_store says where a row's filepath points:
--   'supabase'  the public `books` bucket, as before (rows that exist today)
--   'r2'        R2, key files/<slug>/<stamp>-<name>.pdf|epub (every new upload)
-- Existing rows keep 'supabase' (production has none); new rows default to 'r2'.
--
-- Additive: one column, one check, no policy or grant changes. Readers already
-- see only published, live rows (20261024100000_books_shelves.sql), and the
-- edge function reads the row with the reader's own token, so RLS decides
-- who may open a file.
--
-- Apply on its own (never `supabase db push`: production's migration history
-- uses different version numbers). Rollback:
-- supabase/rollback/20261024120100_books_file_store_down.sql.
-- =============================================================================

ALTER TABLE public.books_uploads
  ADD COLUMN file_store text NOT NULL DEFAULT 'supabase'
  CONSTRAINT books_file_store_known CHECK (file_store IN ('supabase', 'r2'));

ALTER TABLE public.books_uploads ALTER COLUMN file_store SET DEFAULT 'r2';

COMMENT ON COLUMN public.books_uploads.file_store IS
  'Where filepath points: supabase = public books bucket (legacy), r2 = private R2 bucket via the book-file edge function.';
