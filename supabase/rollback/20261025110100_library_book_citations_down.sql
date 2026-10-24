-- =============================================================================
-- Rollback of supabase/migrations/20261025110000_library_book_citations.sql.
--
-- Kept OUT of supabase/migrations/ so `supabase db push` never applies it. Run
-- by hand, only on request. The cover page reads the table but hides "Cited
-- by" when the read fails, so the code may stay; the pairs are rebuilt by
-- scripts/books/rebuild-citations.ts if the table comes back.
-- =============================================================================
BEGIN;
DROP TABLE IF EXISTS public.book_citations;
COMMIT;
