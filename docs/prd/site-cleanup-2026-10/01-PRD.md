# PRD — dikagustiana.com cleanup and Books shelves (Oct 2026)

Owner: Dika Gustiana Irawan
Repo: `dikagustiana/dikagustiana.com` (main @ `b8044af`, PR #78 merged)
Supabase project: `asypkbkiebjvvpimewfp`
Status: approved for build, subject to the gates in 04-PLAN.md

## 1. Why

The consolidation working paper still carries the scaffolding of its first build (legend, inspector, method notes, download buttons). It reads as a tool demo rather than a finished page. Several reading pages sit visibly off-centre. Essays still cite the owner's lecture notes as a source. The Books page is a dead end: it shows "No books added yet" and there is no way to add a book from it.

## 2. Scope

### A. Consolidation working paper (`/accounting/consolidated-reporting`)

| ID | Requirement |
|---|---|
| A1 | Remove the Cell Inspector panel and its "Inspector" button entirely. |
| A2 | Remove the whole legend above the sheet tabs ("from the workbook", "formula", "#REF! error", "red type", "blue type", "Feeds the selection", "Fed by the selection", "hidden in the workbook"). |
| A3 | Remove every "Download .xlsx" control (toolbar and Method panel). The JSON that drives the grid stays served. |
| A4 | Remove the Method section entirely. Keep one line under the lede: "Figures are dummy and do not represent any company's data." |
| A5 | Remove the "Topics" section from the page. The `/accounting/consolidation/:topic` route and `CONSOLIDATION_TOPICS` stay (the route also serves Consolidation series essays, and Writer Studio reads the config). |
| A6 | Full screen means full screen: only sheet tabs, formula bar, grid and one exit control are visible. No legend, no toolbar row. Esc exits. |
| A7 | Hide cell gridlines in both normal and full-screen mode. Borders that exist in the workbook (subtotal rules, double underline on totals) stay. |
| A8 | Remove "Copy cell address". |
| A9 | Remove precedent/dependent highlighting in the grid ("Feeds/Fed by"); with the inspector and legend gone it has no explanation. Keep the selected-cell highlight. |
| A10 | Fix column clipping: text in the right-most used column (English labels in column P on SOFP, the English title block in N) must be fully readable. The grid must not stop short and leave an empty band on the right. |
| A11 | Rewrite copy that refers to removed features (lede "Click a cell to see its formula and follow where it comes from", `failedMessage` that mentions the Method panel and download). |

Kept: sheet tabs, name box + Go To (Ctrl+G), formula bar, row/column headers, frozen panes, URL deep links (`?sheet=&cell=`), the Full screen button.

### B. Layout centring (site-wide)

| ID | Requirement |
|---|---|
| B1 | On pages without a right-hand TOC, the reading column is centred in the viewport. Known offenders: Consolidated Reporting (series list), Books, Critical Thinking. Audit every page in `src/pages`. |
| B2 | Within one page, blocks share one left edge. The breadcrumb aligns with the content column it sits over. |
| B3 | Essay pages with the "On this page" TOC are out of scope (they are correct). |

### C. Essays — remove the lecture-notes source

| ID | Requirement |
|---|---|
| C1 | In every essay (all sections, published and draft), remove the reference entry "Lecture notes this page follows, 'AKL – Chapter …' … (Rumpun Akuntansi Keuangan) …". |
| C2 | Renumber the remaining references and every inline citation that points to them. |
| C3 | Remove or rephrase every mention in the body: "lecture notes", "the notes say/cite …", "this page follows …", "AKL – Chapter …", "Rumpun Akuntansi Keuangan". A sentence that corrects the notes ("the notes cite PSAK 22; the correct standard is …") becomes a plain statement of the correct position, with no reference to the corrected source. |
| C4 | Keep Beams et al., *Advanced Accounting* as a textbook reference where it is cited in its own right. |
| C5 | `content` (HTML) and `content_json` (TipTap) stay in sync for every changed row. |
| C6 | Nothing is written to the database before the owner approves the dry-run diff (Gate B). |

### D. Books shelves (`/books-academia`)

| ID | Requirement |
|---|---|
| D1 | The Books page shows books grouped into shelves. Each shelf is a collapsible row (expand/collapse). Default: first shelf open, the rest closed; the reader's last open/closed state is remembered per browser. |
| D2 | Each book card: cover (or a typographic placeholder), title, author · year, a two-line synopsis preview, and an access badge (Free / Buy). |
| D3 | Clicking a book opens a dialog with cover, full metadata, the full synopsis, and one primary action: **Download** (free) or **Buy** (paid, opens the purchase URL in a new tab). The dialog is deep-linkable: `/books-academia?book=<slug>`. |
| D4 | Free book = file hosted in the `books` bucket and downloadable. Only allowed when the owner records the redistribution basis (`license_note`, e.g. "CC BY 4.0", "author's open-access copy"). Paid book = `purchase_url` (https) and no file. |
| D5 | Synopsis is written by the owner in a rich-text editor (TipTap, same as essays). |
| D6 | Admin path: `/admin/books` (behind `RequireAdmin`), linked from the Admin Dashboard. Manage shelves (add, rename, reorder, delete when empty) and books (add, edit, reorder within a shelf, move between shelves, publish/unpublish, soft-delete). |
| D7 | Unpublished books and empty shelves are invisible to readers. If no shelf has a published book, the page shows a quiet empty state (no dead ends). |
| D8 | Old routes keep working: `/books/:category` → `/books-academia?shelf=<slug>`; `/books/:category/:bookId/read` → `/books-academia?book=<slug>`. |

## 3. Out of scope

- Critical Thinking "Nothing written yet" placeholders (owner fills them by uploading writing).
- Any redesign of the theme, header, footer or essay layout.
- The essay-page TOC.
- Changing what the workbook JSON contains.

## 4. Decisions taken by default (owner may override at Gate A)

| # | Decision | Default |
|---|---|---|
| X1 | Dummy disclaimer | Keep one line under the lede (A4). |
| X2 | Formula bar | Kept in both modes. |
| X3 | Row/column headers | Kept. |
| X4 | Shelf default state | First open, rest closed, remembered per browser. |
| X5 | Synopsis surface | Dialog, deep-linkable. |
| X6 | Beams et al. | Kept. |
| X7 | The .xlsx asset | Once no code imports it, Vite stops emitting it, so it disappears from the deployed site. The source file stays in `docs/consolidation/source/`. See risk R1. |

## 5. Risks

| ID | Risk | Handling |
|---|---|---|
| R1 | The repo is **public**. `docs/consolidation/source/pt-dummy-psak-338.xlsx` and `public/consolidation/*.workbook.json` are downloadable from GitHub regardless of the site. | Owner decides: make the repo private, or move the xlsx out of the repo. Not done by the build. |
| R2 | Lecture-notes removal is a content rewrite across many rows. | Backup → dry-run diff → owner approval → apply → verify; rollback script committed. |
| R3 | Renumbering citations can break anchors. | Discovery inventories the citation markup first; verify every `[n]` resolves after apply. |
| R4 | Hosting a "free to read" book that is not licensed for redistribution. | `license_note` required for free books; admin form blocks save without it. |
| R5 | Existing unit/e2e tests assert the legend, inspector, download and Method panel. | Tests updated in the same PR, not deleted wholesale. |

## 6. Acceptance

- A1–A11 visible on the live preview at 1440, 1920 and 2560 px wide and at 390 px (phone).
- No `.xlsx` link or asset in the built `dist/`.
- B1 audit table: every page checked, before/after screenshot for each changed page.
- C: zero matches for `lecture note`, `Rumpun Akuntansi`, `AKL – Chapter`/`AKL - Chapter` across `essays.content` and `content_json`; every inline citation resolves; backup file committed.
- D: owner adds one free and one paid book from `/admin/books` on the preview; both render, free downloads, paid opens the purchase URL; deep link opens the dialog.
- `npm run typecheck`, `lint`, unit and e2e green.
