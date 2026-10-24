# Architecture — dikagustiana.com cleanup and Books shelves

Stack: Vite + React 18 + TypeScript + Tailwind + shadcn/ui + TanStack Query + TipTap, Supabase (Postgres, Storage, Auth, RLS via `user_roles.role = 'admin'`), Vercel. Line numbers below refer to main @ `b8044af`.

## 1. Workbook viewer (A1–A11)

Files today, `src/components/workbook/`:

| File | Today | Change |
|---|---|---|
| `WorkingPaperSection.tsx` | heading, lede, lazy viewer, `<MethodPanel />` | Drop `MethodPanel`; add the one-line dummy disclaimer under the lede (from `copy.ts`). |
| `MethodPanel.tsx` | Method list + download link | **Delete.** |
| `Legend.tsx` | legend row | **Delete.** |
| `CellInspector.tsx` | right-hand inspector | **Delete.** |
| `Toolbar.tsx` | Copy address, Full screen, Download | Reduce to one Full screen / Exit control. Rename to `FullScreenButton.tsx` if cleaner. |
| `FormulaBar.tsx` | name box, fx, back, "Inspector" button | Remove the inspector button and its props. Keep name box, fx, back. |
| `WorkbookViewer.tsx` | composes all of the above; `open` state; `marks` (precedents/dependents) | Remove inspector state/handlers, `Legend`, `marks` computation, `onActivate`. Full-screen layout: tabs + formula bar + grid + exit control only. Keep the existing Fullscreen API path and the `page` fallback (phones). |
| `SheetGrid.tsx` | `GRIDLINE = 'border-b border-r border-border'` (l.35); precedent/dependent fills | Gridlines off (prop `gridlines={false}` default false, so the class is not applied); keep workbook borders from `borderCss`. Drop `marks` rendering. Keep header cells' own borders. |
| `look.ts` | LOOK incl. precedent/dependent | Remove precedent/dependent entries if unused. |
| `src/lib/workbook/method.ts` | `WORKBOOK_XLSX_URL` via `?url` import, `EXCLUDED_SHEETS`, `ERROR_CELLS` | Remove the xlsx import and the two lists. Keep `WORKBOOK_JSON_URL` (move it if the file becomes JSON-only). With no importer, Vite no longer emits the xlsx. |
| `src/lib/workbook/copy.ts` | strings | Remove download/legend/inspector/method strings; rewrite `lede` and `failedMessage`; add `disclaimer`. |

Graph code (`buildRefGraph`, `precedentsOf`, `dependentsOf` in `src/lib/workbook/refs.ts`): if nothing else uses them after the change, leave them in place (tests cover them) but stop calling them in the viewer. Do not refactor `refs.ts`.

### Column clipping (A10)

`buildSheetModel` (`src/lib/workbook/sheet.ts` l.71–72) sets `lastCol = max(dimension end, used.right)`. On SOFP the dimension ends at P, so labels in P cannot spill and the grid stops. Fix in the model, not with CSS:

1. Compute `spillCols`: for each text cell in the last N used columns whose content is wider than its column, the number of extra columns its text needs (using the existing spill logic and `SPILL_MAX = 12`).
2. `lastCol = max(dimension end, used.right, rightmost spill end)` plus `TRAILING_COLS` (e.g. 3) empty columns.
3. In `SheetGrid`, when the sheet is narrower than the viewport, render empty trailing columns to fill the width (as Excel does), so no blank band appears.

Unit test: SOFP model reaches beyond P; the English label in P renders untruncated.

## 2. Centring (B1–B3)

Cause: `container` (Tailwind, `center: true`, max 1400px, 2rem padding) is centred, but child blocks use `max-w-3xl` (or `max-w-6xl`) **without** `mx-auto`, so they hug the left edge. `grep` finds 24 page files with `max-w-*` and no `mx-auto`. Some are intentional (a narrow lede inside a wider centred block).

Approach:
- Add a `width` prop to `PageLayout` (`'reading' | 'wide' | 'full'`, default `'full'` to keep every page as it is). `reading` = `max-w-3xl mx-auto`, `wide` = `max-w-6xl mx-auto`. It applies to the breadcrumb's inner wrapper and to an optional content wrapper, so the breadcrumb and the column share one left edge (B2).
- Pages opt in one by one after the audit: Books (`reading`), Critical Thinking (`reading`), Consolidated Reporting (`wide`; the series list becomes full width of the `wide` block so its left edge matches the hero).
- Ledes inside a centred block stay `max-w-3xl` left-aligned on purpose; they are not offenders.

The audit output is a table: page, route, current wrapper classes, offender yes/no, fix.

## 3. Essays content cleanup (C1–C6)

Data lives in Supabase `public.essays` — `content` (HTML) and `content_json` (TipTap JSON) must stay in sync (the FSLI pages render `content`). The strings are not in the repo; the sweep is against the database.

Pipeline (a script under `scripts/content/strip-lecture-notes.ts`, run locally with the service role key from the owner's environment, never committed):

1. **Backup**: dump `id, slug, category, published, content, content_json, updated_at` for every matching row to `backups/essays-lecture-notes-<timestamp>.json` (the `backups/` folder already holds a consolidation backup).
2. **Inventory**: per row, list matches (reference entry, body mentions) and how citations are marked up (`<sup>`, `[n]`, anchors `#ref-n`, an ordered list). The renumbering logic is written only after this inventory.
3. **Transform** in `content_json` (structure-aware): remove the reference list item; renumber citations; rewrite body sentences per C3. Sentence rewrites are **not** generated blindly: the script emits a proposal per sentence, and the proposal table is what the owner approves.
4. Regenerate `content` from the transformed `content_json` with the same TipTap extensions the editor uses (`src/components/editorial/EssayEditor.tsx` extension set), so HTML and JSON match.
5. **Dry run** writes `docs/prd/site-cleanup-2026-10/lecture-notes-diff.md`: per essay, before/after for every changed paragraph and the reference list. **Gate B.**
6. **Apply** in one transaction; record in `essay_revisions` the same way the editor does when it saves (check `src/domains/writing` for the revision write path) so the change is auditable.
7. **Verify**: zero matches; citation integrity check (every `[n]` has a reference `n`, no gaps); spot-render three changed essays on the preview.
8. **Rollback**: `scripts/content/restore-from-backup.ts <backup.json>`.

## 4. Books shelves (D1–D8)

### What exists

- Table `public.books_uploads` (baseline `20260731030000_baseline_cms.sql` l.638): `category text`, `filepath`, `filename` (both NOT NULL), `mime_type`, `size_bytes`, `title`, `author`, `year`, `cover_path`, `uploaded_by`, `uploaded_at`, `deleted_at`. RLS: anon read where `deleted_at IS NULL`; admin insert/update/delete.
- Bucket `books`, public read, admin write (`public_buckets_*` policies, foundation migration l.489–545).
- `useBooks`, `useBook`, `useUploadBook`, `useBookCategories` (`src/hooks/queries/useBooks.ts`); `BookUploadCard` renders only on `/books/:category`, which is unreachable while there are no categories — hence the dead end.

Extend this rather than build a parallel table.

### Migration `supabase/migrations/20261024100000_books_shelves.sql`

```sql
create table public.book_shelves (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.book_shelves enable row level security;
-- anon + authenticated: select all; admin: insert/update/delete (same user_roles predicate as books_uploads)

alter table public.books_uploads
  add column shelf_id        uuid references public.book_shelves(id) on delete restrict,
  add column slug            text unique,
  add column access          text not null default 'free' check (access in ('free','paid')),
  add column purchase_url    text,
  add column license_note    text,
  add column synopsis_json   jsonb,
  add column synopsis_html   text,
  add column synopsis_excerpt text,       -- plain text, first ~240 chars, written on save
  add column sort_order      integer not null default 0,
  add column published       boolean not null default false,
  add column updated_at      timestamptz not null default now();

alter table public.books_uploads alter column filepath drop not null;
alter table public.books_uploads alter column filename drop not null;

alter table public.books_uploads add constraint books_access_shape check (
  (access = 'free' and filepath is not null and license_note is not null and purchase_url is null)
  or
  (access = 'paid' and purchase_url ~ '^https://' and filepath is null)
);

-- Replace books_uploads_select_anon: readers see published, live rows only.
--   USING (deleted_at IS NULL AND published)
-- Admin select policy unchanged (sees everything).

create index idx_books_shelf_order on public.books_uploads (shelf_id, sort_order) where deleted_at is null;
```

Before applying: confirm `books_uploads` is empty in production (it is expected to be). If it has rows, add a backfill: one shelf per distinct `category`, `shelf_id` set, `published = true`, `access = 'free'`, `license_note = 'legacy upload — review'`. Regenerate `src/integrations/supabase/types.ts`.

Storage layout in bucket `books`: `files/<slug>/<timestamp>-<safe-name>.pdf|epub`, `covers/<slug>/<timestamp>.<ext>` (jpg/png/webp, ≤ 2 MB).

### Front end

| Piece | File |
|---|---|
| Hooks | `useBooks.ts` → `useShelves()` (shelves + published books, one query each, joined client-side), `useBookBySlug()`, admin mutations `useSaveShelf`, `useReorderShelves`, `useSaveBook`, `useReorderBooks`, `useDeleteBook` (soft). Keep the upload/rollback pattern of `useUploadBook` (remove the object if the row write fails). |
| Public page | `src/pages/BooksAcademia.tsx` rewritten: `ShelfList` → `Shelf` (collapsible, shadcn `Collapsible`) → `BookCard`; `BookDialog` (shadcn `Dialog`) driven by `?book=`. |
| Components | `src/components/books/{Shelf,BookCard,BookCover,BookDialog,ShelfAdmin,BookForm}.tsx`. Delete `BookUploadCard.tsx` once `BookForm` replaces it. |
| Synopsis editor | Reuse the TipTap setup from `src/components/editorial/EssayEditor.tsx` with a reduced toolbar (paragraph, bold, italic, lists, link). Save JSON + HTML + excerpt. Public render uses `synopsis_html` through `src/lib/sanitizeHtml.ts`, the sanitiser essays use. |
| Admin route | `src/pages/AdminBooks.tsx` at `/admin/books` wrapped in `RequireAdmin`; card link on `AdminDashboard.tsx` next to Content / Audit log. |
| Download | `supabase.storage.from('books').getPublicUrl(path, { download: <title>.pdf })`. |
| Routes | In `App.tsx`: `/books/:category` → `BooksCategoryRedirect` (maps slug → `?shelf=`), `/books/:category/:bookId/read` → `BookRedirect` (maps id → `?book=<slug>`). `BooksList.tsx` and `BookReader.tsx` are removed after redirects are in. |
| Shelf state | `localStorage` key `books.shelves.open` (array of slugs), every access wrapped in try/catch; works without storage. |
| SEO | `SEO` per page; when `?book=` is open, title becomes the book title. |

### Security

- RLS is the defence; UI gates are courtesy (pattern already documented in `useBooks.ts`).
- `purchase_url` must be https; rendered with `rel="noopener noreferrer" target="_blank"`.
- Synopsis HTML goes through `src/lib/sanitizeHtml.ts`; no raw `dangerouslySetInnerHTML` without it.

## 5. Tests touched

- `tests/unit/workbookViewer.test.tsx` — drop legend/inspector/method/download assertions, and the test that holds `EXCLUDED_SHEETS`/`ERROR_CELLS` to the JSON (the lists go). Add: no gridline class on cells; no download link; SOFP renders past P.
- `tests/e2e/workbook.spec.ts` — update selectors; add full-screen visibility check (only tabs, formula bar, grid, exit visible).
- New: `tests/unit/books.test.tsx` (shelf collapse/expand, card → dialog, free vs paid action, deep link), `tests/e2e/books.spec.ts` (public page, empty state, redirects).
