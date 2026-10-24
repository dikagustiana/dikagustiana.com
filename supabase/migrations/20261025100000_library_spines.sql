-- =============================================================================
-- Library phase 2, step 1: the shelf's spines (docs/prd/library-phase-2 §4, Data).
--
-- A book stands on /books-academia as a spine: its height from the page
-- count, its thickness from size_bytes (already on the row), its colour from
-- the shelf's hue family (src/lib/spines.ts). Two columns:
--   page_count   pages in the book's file; written by
--                scripts/books/spine-metrics.ts (and again by the paragraph
--                extraction, step 3). Null for a paid book (no file) or one
--                not yet counted: the spine then stands mid-height.
--   spine_color  '#rrggbb', computed once by the same script and stored, so a
--                later change of shelf order does not repaint the shelf. Null
--                until then: the page computes the same colour.
--
-- Additive: two nullable columns and their checks; no policy or grant
-- changes (readers already see only published, live rows). books_access_shape
-- and the free/paid model are untouched.
--
-- Apply on its own through the MCP (never `supabase db push`). Rollback:
-- supabase/rollback/20261025100100_library_spines_down.sql.
-- =============================================================================

ALTER TABLE public.books_uploads
  ADD COLUMN page_count  integer CONSTRAINT books_page_count_positive CHECK (page_count IS NULL OR page_count > 0),
  ADD COLUMN spine_color text    CONSTRAINT books_spine_color_shape   CHECK (spine_color IS NULL OR spine_color ~ '^#[0-9a-f]{6}$');

COMMENT ON COLUMN public.books_uploads.page_count IS
  'Pages in the file (scripts/books/spine-metrics.ts, extract-paragraphs.ts); the spine''s height. Null: not counted, or paid.';
COMMENT ON COLUMN public.books_uploads.spine_color IS
  'The spine''s colour, #rrggbb, computed once from the shelf''s hue family (src/lib/spines.ts) and stored.';
