-- =============================================================================
-- Library phase 2, step 3: which free books may take margin questions
-- (docs/prd/library-phase-2 §4, Data and Extraction).
--
--   books_uploads.ai_ready  true once scripts/books/extract-paragraphs.ts has
--                           written the book's text; false for a scanned book
--                           (no text layer; OCR is out of scope), a paid book
--                           (no text exists), and any book not yet run.
--
-- The text itself is not in the database: by the owner's decision
-- (2026-10-25) it lives beside the book's file in the private R2 bucket,
-- text/<book id>/index.json and text/<book id>/ch-<n>.json
-- (supabase/functions/_shared/bookText.ts), read through URLs the book-ask
-- edge function signs. This replaces the PRD's book_paragraphs table.
--
-- Additive: one column with a default; no policy or grant changes (readers
-- already see only published, live rows). books_access_shape and the
-- free/paid model are untouched.
--
-- Apply on its own through the MCP (never `supabase db push`). Rollback:
-- supabase/rollback/20261025120100_library_ai_ready_down.sql.
-- =============================================================================

ALTER TABLE public.books_uploads
  ADD COLUMN ai_ready boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.books_uploads.ai_ready IS
  'Text extracted to R2 (text/<id>/) and the book may take margin questions. False for scans, paid books and books not yet run.';
