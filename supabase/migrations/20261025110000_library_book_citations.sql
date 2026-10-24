-- =============================================================================
-- Library phase 2, step 2: "Cited by" on a book's cover page
-- (docs/prd/library-phase-2 §3, Cover page; §4, Data).
--
-- book_citations (book_id, essay_id): an essay whose references name the book
-- (title, and the author's surname when there is one), precomputed by
-- scripts/books/rebuild-citations.ts from essays.presentation.references and
-- the footnotes in essays.content_json. Rebuilt by hand whenever essays
-- change; there is no trigger.
--
-- Readers see a pair only when both ends are public: the book published and
-- live, the essay published. The admin sees every pair. Only the service role
-- (the script) writes.
--
-- Apply on its own through the MCP (never `supabase db push`). Rollback:
-- supabase/rollback/20261025110100_library_book_citations_down.sql.
-- =============================================================================

CREATE TABLE public.book_citations (
  book_id  uuid NOT NULL REFERENCES public.books_uploads(id) ON DELETE CASCADE,
  essay_id uuid NOT NULL REFERENCES public.essays(id)        ON DELETE CASCADE,
  PRIMARY KEY (book_id, essay_id)
);

CREATE INDEX idx_book_citations_essay ON public.book_citations (essay_id);

ALTER TABLE public.book_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "book_citations_select_anon"
  ON public.book_citations FOR SELECT TO anon
  USING (
    EXISTS (SELECT 1 FROM public.books_uploads b WHERE b.id = book_id AND b.published AND b.deleted_at IS NULL)
    AND EXISTS (SELECT 1 FROM public.essays e WHERE e.id = essay_id AND e.published)
  );

CREATE POLICY "book_citations_select_authenticated"
  ON public.book_citations FOR SELECT TO authenticated
  USING (
    (
      EXISTS (SELECT 1 FROM public.books_uploads b WHERE b.id = book_id AND b.published AND b.deleted_at IS NULL)
      AND EXISTS (SELECT 1 FROM public.essays e WHERE e.id = essay_id AND e.published)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

-- Supabase's default privileges grant ALL to anon and authenticated; revoke
-- first so the grants below mean something (baseline_cms §7).
REVOKE ALL ON public.book_citations FROM anon, authenticated;
GRANT SELECT ON public.book_citations TO anon, authenticated;
GRANT ALL    ON public.book_citations TO service_role;
