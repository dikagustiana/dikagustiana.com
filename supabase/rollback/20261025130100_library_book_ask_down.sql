-- =============================================================================
-- Rollback of supabase/migrations/20261025130000_library_book_ask.sql.
--
-- Kept OUT of supabase/migrations/ so `supabase db push` never applies it. Run
-- by hand, only on request, after the book-ask function is removed or
-- disabled (it answers 503 lookup_failed without these). The day-by-day
-- record of questions and spend is lost; export it first if it is wanted.
-- =============================================================================
BEGIN;
DROP FUNCTION IF EXISTS public.book_ask_asked(date, text);
DROP FUNCTION IF EXISTS public.book_ask_spent(date);
DROP FUNCTION IF EXISTS public.book_ask_spend(date, text, integer);
DROP FUNCTION IF EXISTS public.book_ask_release(date, text);
DROP FUNCTION IF EXISTS public.book_ask_take(date, text, integer);
DROP TABLE IF EXISTS public.book_ask_usage;
COMMIT;
