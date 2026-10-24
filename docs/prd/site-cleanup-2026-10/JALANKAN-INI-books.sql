BEGIN;


CREATE TABLE public.book_shelves (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text        NOT NULL CHECK (length(btrim(name)) > 0),
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_book_shelves_updated_at
  BEFORE UPDATE ON public.book_shelves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.book_shelves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "book_shelves_select_all"
  ON public.book_shelves FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "book_shelves_insert_admin"
  ON public.book_shelves FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "book_shelves_update_admin"
  ON public.book_shelves FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "book_shelves_delete_admin"
  ON public.book_shelves FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

REVOKE ALL ON public.book_shelves FROM anon, authenticated;
GRANT SELECT                         ON public.book_shelves TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_shelves TO authenticated;
GRANT ALL                            ON public.book_shelves TO service_role;

ALTER TABLE public.books_uploads
  ADD COLUMN shelf_id         uuid REFERENCES public.book_shelves(id) ON DELETE RESTRICT,
  ADD COLUMN slug             text,
  ADD COLUMN access           text NOT NULL DEFAULT 'free' CHECK (access IN ('free', 'paid')),
  ADD COLUMN purchase_url     text,
  ADD COLUMN license_note     text,
  ADD COLUMN synopsis_json    jsonb,
  ADD COLUMN synopsis_html    text,
  -- Plain text, the first ~240 characters of the synopsis, written on save.
  ADD COLUMN synopsis_excerpt text,
  ADD COLUMN sort_order       integer NOT NULL DEFAULT 0,
  ADD COLUMN published        boolean NOT NULL DEFAULT false,
  ADD COLUMN updated_at       timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.books_uploads ALTER COLUMN filepath DROP NOT NULL;
ALTER TABLE public.books_uploads ALTER COLUMN filename DROP NOT NULL;

INSERT INTO public.book_shelves (slug, name, sort_order)
SELECT s.slug, s.name, row_number() OVER (ORDER BY s.slug) - 1
  FROM (
    SELECT DISTINCT
           coalesce(nullif(btrim(regexp_replace(lower(category), '[^a-z0-9]+', '-', 'g'), '-'), ''), 'books') AS slug,
           initcap(replace(category, '-', ' ')) AS name
      FROM public.books_uploads
  ) s
ON CONFLICT (slug) DO NOTHING;

UPDATE public.books_uploads b
   SET shelf_id = sh.id
  FROM public.book_shelves sh
 WHERE b.shelf_id IS NULL
   AND sh.slug = coalesce(nullif(btrim(regexp_replace(lower(b.category), '[^a-z0-9]+', '-', 'g'), '-'), ''), 'books');

UPDATE public.books_uploads
   SET slug = coalesce(nullif(btrim(regexp_replace(lower(coalesce(title, filename, 'book')), '[^a-z0-9]+', '-', 'g'), '-'), ''), 'book')
              || '-' || left(replace(id::text, '-', ''), 6),
       access = 'free',
       license_note = coalesce(license_note, 'legacy upload — review'),
       published = (deleted_at IS NULL)
 WHERE slug IS NULL;

ALTER TABLE public.books_uploads ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.books_uploads ADD CONSTRAINT books_uploads_slug_key UNIQUE (slug);
ALTER TABLE public.books_uploads ADD CONSTRAINT books_slug_shape CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE public.books_uploads ADD CONSTRAINT books_access_shape CHECK (
  (access = 'free' AND filepath IS NOT NULL AND license_note IS NOT NULL AND length(btrim(license_note)) > 0 AND purchase_url IS NULL)
  OR
  (access = 'paid' AND purchase_url ~ '^https://' AND filepath IS NULL)
);

ALTER TABLE public.books_uploads ALTER COLUMN category SET DEFAULT 'books';

CREATE TRIGGER update_books_uploads_updated_at
  BEFORE UPDATE ON public.books_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_books_shelf_order ON public.books_uploads (shelf_id, sort_order) WHERE deleted_at IS NULL;

DROP POLICY "books_uploads_select_anon" ON public.books_uploads;
CREATE POLICY "books_uploads_select_anon"
  ON public.books_uploads FOR SELECT TO anon
  USING (deleted_at IS NULL AND published);

DROP POLICY "books_uploads_select_authenticated" ON public.books_uploads;
CREATE POLICY "books_uploads_select_authenticated"
  ON public.books_uploads FOR SELECT TO authenticated
  USING (
    (deleted_at IS NULL AND published)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

UPDATE storage.buckets
   SET file_size_limit = 52428800,
       allowed_mime_types = ARRAY['application/pdf', 'application/epub+zip', 'image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'books';

COMMIT;
