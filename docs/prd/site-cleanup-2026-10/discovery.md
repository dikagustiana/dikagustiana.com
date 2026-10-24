# Discovery — site cleanup 2026-10 (Phase 0) and what the build found

Branch `claude/optimistic-gates-rovcj7` from `main` @ `b8044af` (see §0 for why not `feat/site-cleanup-2026-10`).
Read-only throughout Phase 0. Where the code disagreed with the spec, the code is taken as fact and the disagreement is listed in §8.

## 0. Environment facts that shaped the work

- **Database access.** This session's Supabase connector is signed in to a different Supabase account; every call on project `asypkbkiebjvvpimewfp` returns *"You do not have permission"*. No service-role key or database password is in the environment. So: nothing was written to production — the Books migration is **not applied**, and the essays are **not changed** (both are ready to run; see the PR's runbook).
- Discovery reads used the site's public (publishable, RLS-bound) key, which sees **published** essays only. Drafts are invisible from here; the apply script reads every row itself and refuses to write while any essay still mentions the notes without an approved edit.
- **Branch.** The session was assigned `claude/optimistic-gates-rovcj7`; the spec names `feat/site-cleanup-2026-10`. The work is on the assigned branch, one commit per WP.

## 1. Baseline (main @ b8044af, before any change)

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass, 0 errors, 22 warnings (pre-existing) |
| `npm run test:unit` | 108 files, 1451 tests, all pass |
| `npm run test:e2e` | 110 pass, 1 fail: `fsli.spec.ts:218` "a link to one of the essay's headings opens at that heading" — passes when run alone; flaky under parallel load. **Pre-existing**, not touched. |

E2E in this container needs the container's Chromium (`/opt/pw-browsers/chromium`); a local, uncommitted override config (`pw.sandbox.config.ts`) points Playwright at it. CI is unaffected.

## 2. Workbook (A) — imports outside `src/components/workbook/`

| Symbol | Imported by (outside the folder) |
|---|---|
| `Legend`, `CellInspector`, `MethodPanel`, `Toolbar` | none (only `WorkbookViewer` / `WorkingPaperSection`) |
| `WORKBOOK_XLSX_URL`, `EXCLUDED_SHEETS`, `ERROR_CELLS` | `tests/unit/workbookViewer.test.tsx` only |
| `precedentsOf`, `dependentsOf` | `tests/unit/workbookRefs.test.ts` only (left in `refs.ts`, untouched) |
| `WorkingPaperSection` | `src/pages/ConsolidatedReporting.tsx` |

`buildRefGraph` is still called by the viewer: its `used` area grows each sheet to every cell a formula names, so Go To can land past the last value (kept behaviour).

## 3. Column P clipping (A10) — cause confirmed

SOFP `dimension` is `A1:P81`; the last used column is P (16), 1.45 characters wide; it holds 56 English labels (longest: "Capital proforma arising from restructuring under common control"). `buildSheetModel` set `lastCol = max(dimension end, used.right) = 16`, and a label could spill only `while (to < lastCol)`, so every P label was cut at 13 px and the grid ended there. The English title block in N spilled only as far as P.

Fix (model, not CSS): within the sheet a label spills as before; past the sheet's last column it spills only as far as its estimated text width needs (≤ `SPILL_MAX`), `lastCol` = furthest spill + `TRAILING_COLS` (3). End / Ctrl+End still go to the sheet's own last column (`endCol`). The grid's column letters fill the view past the sheet.

## 4. Centring audit (B) — every page in `src/pages`

Reading column measured at 1440 / 1920 / 2560 / 390 px with Playwright: offset of the column's centre from the viewport's, and the breadcrumb's left edge against the h1's.

| Page | Route | Wrapper before | Offender | Fix |
|---|---|---|---|---|
| BooksAcademia | /books-academia | `container` > `max-w-3xl` | **B1** (−284 px) + B2 | `width="reading"` |
| CriticalThinkingResearch | /critical-thinking-research | `container` > `max-w-3xl` | **B1** + B2 | `reading` |
| CriticalThinkingPhase | /critical-thinking-research/:phase | `container` > `max-w-3xl` | **B1** + B2 | `reading` |
| Accounting | /accounting | `container` > `max-w-3xl` | **B1** + B2 | `reading` |
| StatutoryReporting | /accounting/statutory-reporting | `container` > `max-w-3xl` | **B1** + B2 | `reading` |
| ConsolidationDetail (topic template) | /accounting/consolidation/:topic | `container` > `max-w-3xl` | **B1** + B2 | `reading` (series essays use ArticleShell, unchanged) |
| ConsolidatedReporting | /accounting/consolidated-reporting | `container` > `max-w-6xl mx-auto`; series & topics `max-w-3xl` | B1 (series list), B2 | `wide`; series full width; Topics removed |
| FinanceLanding | /finance | `container max-w-3xl` | B2 (breadcrumb at container edge) | `reading` |
| FinanceInMotion | /finance/capital-allocation | `container max-w-3xl` | B2 | `reading` |
| FinanceInActionIndex | /finance/finance-in-action | `container max-w-3xl` | B2 | `reading` |
| FinanceModelDetail | /finance/finance-in-action/:modelSlug | `container max-w-3xl` | B2 | `reading` |
| FinanceModulePage | (track module pages) | `container max-w-3xl` | B2 | `reading` |
| FinanceTrackIndex | /finance/:track | `container max-w-3xl` | B2 | `reading` |
| DevelopmentFinance | /development-finance | `container max-w-3xl` | B2 | `reading` |
| GreenTransition | (landing) | `container max-w-3xl` | B2 | `reading` |
| TheNextBigThing | /the-next-big-thing | header `container max-w-3xl`, feed `container max-w-4xl` | B2 | `reading` (breadcrumb now over the header; the 4xl feed below is unchanged — see §8) |
| ClimateFinance, DevelopmentFinancePhase, GreenTransitionPhase | GT/DF phase pages | `container max-w-4xl` | centred; B2 breadcrumb offset | **not changed** — no `4xl` width in the spec (§8) |
| FinanceWorkspace | /finance-workspace | `container max-w-4xl` (admin tool) | as above | not changed |
| GreenTransitionCurrentCondition, GreenTransitionTracker | GT series / tracker | `container` > `.editorial-column` (728 px, centred) | centred; B2 offset | not changed (§8) |
| EnglishIelts | /english-ielts | `container`, centred heading, `max-w-5xl mx-auto` grid | no | — |
| FiaIndex, FiaModelPage (+ routers) | /finance/finance-in-action (flagged) | `container max-w-5xl` / `max-w-7xl` | tool pages, centred | — |
| FsViewer, FsliDetail | /accounting/fsli/… | `container`; essay body 728 px centred | no | — |
| CapitalConditionDetail | /finance/capital-allocation/:slug | `max-w-[860px] mx-auto` | no | — |
| Index, NotFound, Auth | /, *, /auth | own layouts | no | — |
| Essay pages (EssayBySlug, FinanceEssayPage, GreenTransitionEssayPage, NextBigThingEssayPage, DevelopmentFinanceEssayPage, CriticalThinkingEssay) | essays | ArticleShell with TOC | out of scope (B3) | — |
| Admin, writer, settings, debug, KawasanPage | admin / tools | dashboards | no | — |
| BookReader, BooksList | /books/… | removed in WP4 (redirects) | — | — |

Before/after screenshots and measurements for all of them are in `before/` and `after/` (`measure-*.json`; `MORE=1` set in `shots.cjs` for the second set). After the change every `reading`/`wide` page measures a centre offset of **0 px** and the breadcrumb's left edge equals the h1's at 1440, 1920, 2560 and 390 px.

## 5. Essays (C)

Read-only query of the 46 published essays (drafts not visible, §0).

| Pattern | Published essays matching (content or content_json) |
|---|---|
| `lecture note` | 36 |
| `Rumpun Akuntansi` | 30 |
| `AKL – Chapter` | 8 |
| `AKL - Chapter` | 0 |
| `the notes ` | 26 (many are financial-statement notes) |
| `this page follows` | 11 (some are about a note's language column) |

All 36 are in section `accounting` (FSLI essays and the consolidation series). One essay (`consolidated-cash-flows-and-mid-year-acquisitions`) also carried the phrase in its `presentation` JSON (key takeaways); that is edited too.

**Citation markup.** References are a plain TipTap `orderedList` under an h2 "References" (no `start` attribute, numbers rendered by the browser). The body cites them as plain text `ref. N` (12 occurrences in published essays; no `[n]`, no `<sup>`, no `#ref-n` anchors). One citation names another essay's list: "as verified in essay 08, ref. 7" (essay 08 = cash and cash equivalents, whose list keeps item 7 in place — still correct). `content` equals `generateHTML(content_json)` for all 36 rows, so regenerating the HTML from the edited JSON keeps them in sync byte for byte.

## 6. Books (D)

- `books_uploads`: **0** rows visible to readers (`deleted_at IS NULL`); soft-deleted rows, if any, are invisible from here. Bucket `books`: **0** objects listed. The migration backfills any existing row (one shelf per category, `license_note = 'legacy upload — review'`), tested on a local Postgres with legacy rows.
- `types.ts` generation: normally `supabase gen types typescript --project-id asypkbkiebjvvpimewfp`; not possible from here, so the new table and columns were added by hand in the generator's shape. Regenerate after the migration is applied.

## 7. Migration

`supabase/migrations/20261024100000_books_shelves.sql` — the 02-ARCHITECTURE §4 draft plus: shelf/book slug shape checks, `updated_at` triggers, grants (REVOKE then GRANT, as the baseline does), the non-admin **authenticated** select policy also limited to published rows, the backfill made NOT NULL/UNIQUE afterwards, and the bucket's own size/type limits. Rollback: `supabase/rollback/20261024100100_books_shelves_down.sql`. Both were run on a local Postgres 16 carrying the baseline's `books_uploads`, policies and grants: backfill, every CHECK, RLS as anon / non-admin / admin, and the rollback restoring the original policies.

## 8. Where the code or the environment contradicts the spec

1. **No production access** (§0): migration not applied, essays not changed, preview's Books page shows its load-error state until the migration is applied.
2. **`grep -r "\.xlsx" dist/` cannot return nothing** without breaking scope: the built `dist/` has no `.xlsx` asset and no link to one, but two strings remain — the workbook JSON's own `source.path` ("docs/consolidation/source/pt-dummy-psak-338.xlsx", and the PRD puts "changing what the workbook JSON contains" out of scope) and the Finance-in-Action admin upload's "Only .xlsx files are accepted" label.
3. **Down migration location.** 04-PLAN names `supabase/migrations/20261024100100_books_shelves_down.sql`; a file there would be applied by `supabase db push` as a forward migration and drop the new tables. It is in `supabase/rollback/` instead.
4. **Authenticated select policy.** The spec changes only the anon policy; the existing authenticated policy would still have shown unpublished books to any signed-in non-admin. Both are limited to published rows (admin still sees all).
5. **Citations** are `ref. N` text, not `[n]`; the renumbering works on that form, and refuses a citation of a removed item.
6. **4xl and editorial-column pages** (ClimateFinance, DF/GT phase pages, FinanceWorkspace, GT current condition and tracker, The Next Big Thing's feed) keep a breadcrumb offset from their centred column. The spec's widths are `reading` (3xl) / `wide` (6xl) / `full`; aligning these needs a fourth width or a narrower measure — the owner's call.
7. **`reading` width** is `container max-w-3xl` (the site's existing centred-column pattern, = `max-w-3xl mx-auto` with the container's padding), so the breadcrumb and the column use the identical wrapper.
8. **CI test floor** (`scripts/assert-test-count.mjs`) raised to match the new count, per that file's rule.

## 9. Defaults taken (PRD §4)

X1 dummy disclaimer kept under the lede · X2 formula bar kept in both modes · X3 headers kept · X4 first shelf open, rest closed, remembered per browser (`localStorage` `books.shelves.open`) · X5 synopsis in a deep-linkable dialog · X6 Beams and Kieso kept · X7 the xlsx is no longer emitted; its source stays in `docs/consolidation/source/`.

## 10. Risk R1 — the repo is public

`docs/consolidation/source/pt-dummy-psak-338.xlsx` and `public/consolidation/pt-dummy-psak-338.workbook.json` remain downloadable from GitHub whatever the site does. Removing the download from the site does not make the workbook private. The owner decides: make the repository private, or move the xlsx out of it (and out of its history). Not done by this build.
