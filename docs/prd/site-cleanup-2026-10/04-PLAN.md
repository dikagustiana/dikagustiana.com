# Detailed plan — dikagustiana.com cleanup and Books shelves

Branch: `feat/site-cleanup-2026-10` from `main` @ `b8044af`.
One PR, one commit per work package (WP), so each can be reverted alone.
Gates: **A** (proposal approved), **B** (essay content diff approved), **C** (preview approved, merge). Nothing passes a gate without the owner's explicit "go".

## Phase 0 — Discovery and proposal (no code, no data changes)

| # | Task | Output | Done when |
|---|---|---|---|
| 0.1 | Create branch; copy the four spec files to `docs/prd/site-cleanup-2026-10/`; commit. | commit | files on branch |
| 0.2 | Baseline: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:unit`. Record pre-existing failures. | `discovery.md` §Baseline | failures listed, not fixed |
| 0.3 | Screenshots of `/accounting/consolidated-reporting` (normal + full screen), `/books-academia`, `/critical-thinking-research` at 1440 / 1920 / 2560 / 390 px. | `docs/prd/site-cleanup-2026-10/before/*.png` | 16 images |
| 0.4 | Workbook: list every import of `Legend`, `CellInspector`, `MethodPanel`, `Toolbar`, `WORKBOOK_XLSX_URL`, `EXCLUDED_SHEETS`, `ERROR_CELLS`, `precedentsOf`, `dependentsOf` outside `src/components/workbook/`. | `discovery.md` §Workbook | list complete |
| 0.5 | Column clipping: confirm SOFP `dimension`, `lastCol`, and the widest text in the last used column. | `discovery.md` §A10 | root cause confirmed or corrected |
| 0.6 | Centring audit of every file in `src/pages` (and `src/pages/**`): route, wrapper classes, offender y/n, proposed `width`. | `discovery.md` §B table | every page has a row |
| 0.7 | Essays: read-only query on `essays` (`content`, `content_json`) for `lecture note`, `Rumpun Akuntansi`, `AKL – Chapter`, `AKL - Chapter`, `the notes `, `this page follows`. Inventory citation markup in the matching rows. | `discovery.md` §C (counts per section, published/draft, citation format) | counts + format known |
| 0.8 | Books: confirm `books_uploads` row count and bucket `books` contents in production; check `types.ts` generation command. | `discovery.md` §D | count known |
| 0.9 | Draft the Books migration from 02-ARCHITECTURE §4 adjusted to findings; **do not apply**. | `supabase/migrations/20261024100000_books_shelves.sql` (uncommitted draft shown in report) | SQL reviewed |
| 0.10 | Report to owner: findings, any deviation from the spec, the open decisions X1–X7 (PRD §4), and R1 (public repo). | message | **Gate A** |

## Phase 1 — Workbook viewer (WP1)

| # | Task | Acceptance |
|---|---|---|
| 1.1 | Delete `Legend.tsx`, `CellInspector.tsx`, `MethodPanel.tsx`; remove their imports and props. | build passes |
| 1.2 | `FormulaBar`: remove Inspector button and props. | no "Inspector" text in DOM |
| 1.3 | `Toolbar` → single Full screen / Exit control; remove Copy address and Download. | toolbar has one button |
| 1.4 | `WorkbookViewer`: remove inspector state, `marks`, `onActivate`; full-screen layout per 03-DESIGN §2 (exit control at right end of tabs row). | full screen shows only tabs, formula bar, grid, exit |
| 1.5 | `SheetGrid`: gridlines off; remove precedent/dependent rendering; headers keep borders; workbook borders kept. | no `border-r` on data cells; total rules still visible on SOFP row 22/61/76 |
| 1.6 | Column extent fix in `buildSheetModel` + trailing columns in `SheetGrid` (02-ARCHITECTURE §1). | SOFP col P labels fully readable; no blank band at 2560 px |
| 1.7 | Tab overflow fade + ▸ control in `SheetTabs`. | last tab reachable and visibly indicated |
| 1.8 | `method.ts`: drop xlsx `?url` import and lists; `copy.ts`: new strings (03-DESIGN §1). `WorkingPaperSection`: disclaimer line, no MethodPanel. | `npm run build`; `grep -r "\.xlsx" dist/` returns nothing |
| 1.9 | Update `tests/unit/workbookViewer.test.tsx`, `tests/e2e/workbook.spec.ts`; add tests listed in 02-ARCHITECTURE §5. | unit + e2e green |

## Phase 2 — Consolidated page and centring (WP2)

| # | Task | Acceptance |
|---|---|---|
| 2.1 | `PageLayout`: add `width` prop (`reading` / `wide` / `full`, default `full`), applied to breadcrumb inner wrapper and optional content wrapper. | default pages unchanged pixel-for-pixel |
| 2.2 | `ConsolidatedReporting.tsx`: remove Topics section (keep route and `CONSOLIDATION_TOPICS`); `width="wide"`; series list full width of block. | Topics gone; `/accounting/consolidation/<slug>` still resolves for series essays |
| 2.3 | Apply `width` to every offender from the 0.6 audit (Books, Critical Thinking at minimum). | after screenshots: column centre within ±2 px of viewport centre at 1440/1920/2560 |
| 2.4 | After screenshots for every changed page. | `after/*.png` |

## Phase 3 — Essays lecture-notes cleanup (WP3, data)

| # | Task | Acceptance |
|---|---|---|
| 3.1 | Write `scripts/content/strip-lecture-notes.ts` (dry-run default, `--apply` flag) and `scripts/content/restore-from-backup.ts`. Service key read from env only. | scripts committed, no secrets |
| 3.2 | Backup all matching rows to `backups/essays-lecture-notes-<ts>.json`; commit. | file present, row count = 0.7 count |
| 3.3 | Dry run → `lecture-notes-diff.md`: per essay, removed reference, renumbered list, every changed sentence before/after with the proposed rewrite. | owner can read one table per essay |
| 3.4 | **Gate B** — owner approves (may edit individual rewrites in the diff file; the script reads overrides from it). | explicit "go" |
| 3.5 | `--apply` in one transaction; write `essay_revisions` rows as the editor does. | transaction committed |
| 3.6 | Verify: zero matches across `content` and `content_json`; citation integrity check passes; `content` regenerated from `content_json` matches; three essays render correctly on the preview. | report section with counts = 0 |

## Phase 4 — Books shelves (WP4)

| # | Task | Acceptance |
|---|---|---|
| 4.1 | Apply migration `20261024100000_books_shelves.sql` (after Gate A approved the draft). Regenerate `types.ts`. | `get_advisors` shows no new security warning |
| 4.2 | Hooks (02-ARCHITECTURE §4). | unit tests for mapping and access shape |
| 4.3 | Public `BooksAcademia` with `Shelf`, `BookCard`, `BookCover`, `BookDialog`; `?shelf=` and `?book=` handling; localStorage open-state. | 03-DESIGN §5 at 390 and 1440 px |
| 4.4 | `/admin/books` with `ShelfAdmin` and `BookForm` (TipTap reduced toolbar); dashboard link. | admin can add/edit/reorder/publish |
| 4.5 | Redirects for `/books/:category` and `/books/:category/:bookId/read`; remove `BooksList.tsx`, `BookReader.tsx`, `BookUploadCard.tsx`. | old URLs land on the right shelf/book |
| 4.6 | Tests `books.test.tsx`, `books.spec.ts`. | green |

## Phase 5 — Verification and handover

| # | Task | Acceptance |
|---|---|---|
| 5.1 | `npm run typecheck && npm run lint && npm run test:unit && npm run test:e2e && npm run build` | all green (pre-existing failures from 0.2 called out separately) |
| 5.2 | Independent check: a fresh sub-agent that has not seen the work checks every PRD acceptance line against the preview and the code, and reports pass/fail per line. | report attached to PR |
| 5.3 | Open PR with: summary per WP, screenshots before/after, Gate B diff link, migration SQL, rollback steps (revert commit per WP; `restore-from-backup.ts`; migration down script). | PR open, Vercel preview URL |
| 5.4 | Owner tests the Books admin on the preview with one free and one paid book. | **Gate C** |
| 5.5 | Merge only after owner's "go"; confirm production shows the changes on `dikagustiana.com` (not a stale project). | live check passed |

## Rollback

- WP1, WP2, WP4 front end: revert the WP commit.
- WP3: `npx tsx scripts/content/restore-from-backup.ts backups/essays-lecture-notes-<ts>.json`.
- WP4 schema: `supabase/migrations/20261024100100_books_shelves_down.sql` (drafted with 4.1, applied only on request).
