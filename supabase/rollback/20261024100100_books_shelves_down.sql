-- =============================================================================
-- Rollback of supabase/migrations/20261024100000_books_shelves.sql.
--
-- Kept OUT of supabase/migrations/ on purpose: a file there is applied by
-- `supabase db push` as a forward migration. Run this by hand (Supabase SQL
-- editor), and only on request. It deletes every paid book (they have no file,
-- so the old NOT NULL on filepath cannot hold them) and every shelf; free books
-- stay, with their category.
-- =============================================================================
BEGIN;

DROP POLICY IF EXISTS "books_uploads_select_anon" ON public.books_uploads;
CREATE POLICY "books_uploads_select_anon"
  ON public.books_uploads FOR SELECT TO anon
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "books_uploads_select_authenticated" ON public.books_uploads;
CREATE POLICY "books_uploads_select_authenticated"
  ON public.books_uploads FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

DROP INDEX IF EXISTS public.idx_books_shelf_order;
DROP TRIGGER IF EXISTS update_books_uploads_updated_at ON public.books_uploads;
ALTER TABLE public.books_uploads DROP CONSTRAINT IF EXISTS books_access_shape;
ALTER TABLE public.books_uploads DROP CONSTRAINT IF EXISTS books_slug_shape;
ALTER TABLE public.books_uploads DROP CONSTRAINT IF EXISTS books_uploads_slug_key;
ALTER TABLE public.books_uploads ALTER COLUMN category DROP DEFAULT;

-- Each book keeps its shelf as its category.
UPDATE public.books_uploads b SET category = sh.slug FROM public.book_shelves sh WHERE sh.id = b.shelf_id;
DELETE FROM public.books_uploads WHERE filepath IS NULL OR filename IS NULL;
ALTER TABLE public.books_uploads ALTER COLUMN filepath SET NOT NULL;
ALTER TABLE public.books_uploads ALTER COLUMN filename SET NOT NULL;

ALTER TABLE public.books_uploads
  DROP COLUMN shelf_id,
  DROP COLUMN slug,
  DROP COLUMN access,
  DROP COLUMN purchase_url,
  DROP COLUMN license_note,
  DROP COLUMN synopsis_json,
  DROP COLUMN synopsis_html,
  DROP COLUMN synopsis_excerpt,
  DROP COLUMN sort_order,
  DROP COLUMN published,
  DROP COLUMN updated_at;

DROP TABLE public.book_shelves;

UPDATE storage.buckets SET file_size_limit = NULL, allowed_mime_types = NULL WHERE id = 'books';

COMMIT;
