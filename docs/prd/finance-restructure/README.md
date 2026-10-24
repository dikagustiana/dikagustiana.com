# Package 2 — Finance section restructure: Finance in Action + Toolkits

Status: decided, build after Package 1. Owner: Dika. Date: 2026-10-24.
Branch: `feat/finance-restructure`.

## 1. PRD

### Problem
`/finance` presents five cards: four theory tracks (01–04) and "05 Capital Allocation" (the 21 Capital in Motion conditions). Finance in Action — the company models built by FSRE — is not on the page at all; it is reachable only by URL. The theory → application → company link, which is the site's argument ("where Damodaran ends and execution begins"), is invisible from the section's front door. There is also no place for the downloadable templates the owner intends to publish.

### Goal
From `/finance`, a reader moves in one click from theory (01–04) to how the theory shows up at company scale (Capital in Motion), to the IDX companies where it is happening now (company models), to the files they can use themselves (Toolkits). Every condition lists the companies exhibiting it; every company model lists the conditions it exhibits; every toolkit names the module it comes from.

### Non-goals
- The text of the 21 conditions. Owner will revise it separately; this package moves and links the content, it does not rewrite it.
- Uploading toolkit files. Owner uploads; this package builds the path.
- FSRE pipeline changes. Coverage display reads what the registry already knows.

### Scope

**A. `/finance` landing**
- Cards 01–04 unchanged.
- Card 05 becomes **Finance in Action** with two sub-entries: *Capital in Motion* and *Company models*.
- Card 06 **Toolkits**, new.
- The standalone "05 Capital Allocation" card is removed. Grid becomes 3 × 2.

**B. Finance in Action index** (`/finance/finance-in-action`)
- Subsection A — Capital in Motion: the 21 conditions, each with (i) the Track 1–4 modules it rests on, (ii) the published companies currently tagged with it, (iii) a coverage note when no company is tagged yet.
- Subsection B — Company models: sector → sub-industry → company, as `FiaIndex.tsx` already renders, plus a **coverage tracker**: every IDX company on the FSRE slate appears, published ones as links, the rest with status (`queued`, `in review`, `rejected`) — the same way the 161 essay stubs are kept visible as a progress tracker.

**C. Capital in Motion pages**
- Move from `/finance/capital-allocation[/:slug]` to `/finance/finance-in-action/capital-in-motion[/:slug]`, with 301-equivalent client redirects from the old paths (the `CapitalConditionLegacyRedirect` pattern in `App.tsx` already exists for an earlier move; extend it).
- Each condition page gains a "Companies exhibiting this" block fed by `conditionIds` in the published packages.

**D. Company model pages**
- The "Related reading" line from Package 1 item 9 becomes `Conditions present: 03 Commodity Windfall · 09 Strategic Downstreaming`, linking into subsection A.

**E. Toolkits** (`/finance/toolkits`)
- Public page: one card per published template — title, one-line purpose, format, version, updated date, linked module, Download.
- Admin flow (Admin → Toolkits): upload `.xlsx` → fill metadata → two mandatory checkboxes (*free of SAMB/client data*, *passed verify-financial-model*) gate the Publish button → file goes to R2 `dg-books-public/toolkits/<slug>/<version>/<filename>` → new version never overwrites the previous → card appears; the linked module page shows a "Toolkit" link automatically.

### Acceptance
- `/finance` shows six cards; no route 404s; old capital-allocation URLs redirect.
- Each condition page lists the right companies for the four published packages (ADRO lists 03 and 09; verify PTBA/ITMG/INDY against their `conditionIds`).
- Coverage tracker counts equal the registry's slate counts.
- Toolkit publish is refused (server-side, not only in the UI) when either checkbox is false.
- Downloading a v1 link after v2 is published still returns v1.

## 2. Plan

| Step | Work | Depends on |
|---|---|---|
| 1 | Routes + redirects for Capital in Motion; nav config | — |
| 2 | `/finance` landing cards (05, 06) | 1 |
| 3 | Finance in Action index with subsections A and B | 1; Package 1 item 9 |
| 4 | Condition page "Companies exhibiting this" block; model page "Conditions present" line | 3 |
| 5 | Coverage tracker (reads registry slate) | 3 |
| 6 | Toolkits: table, RLS, storage path, edge function for signed download | — |
| 7 | Toolkits admin flow + public page + module-page link | 6 |
| 8 | Verify: route table in `docs/ROUTE_VERIFICATION.md` updated; Playwright | all |

Steps 1–5 and 6–7 are independent; two branches are acceptable if the owner wants Toolkits earlier.

## 3. Design

### `/finance` cards
Same card component as today (number, title, one line, arrow). Copy:
- **05 Finance in Action** — "The theory at company scale: twenty-one conditions, and the IDX companies where they are happening now."
- **06 Toolkits** — "The working files behind the essays. Download, open, use."
No "START HERE" chip on 05/06.

### Finance in Action index
Two stacked subsections, each with a heading, a one-line intro, and its own list. No tabs: a reader should see both on one scroll.
- Subsection A list: number, condition title, the module chips (e.g. `T2 · M14B`), then ticker chips for companies (published → link; none → `No company tagged yet` in muted text).
- Subsection B: existing `FiaIndex` layout. Below each sub-industry group the coverage line: `4 of 11 modelled · 3 queued · 1 in review · 3 not started`, with the unmodelled names in a collapsed list.

### Condition page block
Heading `Companies exhibiting this condition`; a row of company cards (ticker, name, sub-industry, period of the package); each links to the model page anchored at the Related-reading/Conditions line.

### Toolkits public page
Cards in a two-column list (not a three-column feature row). Card body: title · purpose · `xlsx · v1.2 · updated 24 Oct 2026` · `From: T4 · Driver Tree Construction` · Download button (names the file, e.g. `Download driver-tree-v1.2.xlsx`).

### Toolkits admin form
Fields: Title, Slug (auto), Purpose (one sentence, 140 chars), Linked module (select from `essay_structure` where section = finance), Version (semver), Changelog (textarea), File (xlsx only, ≤ 25 MB). Two checkboxes with explicit labels:
- `This file contains no SAMB Group or client data (names, figures, structures).`
- `This file passed verify-financial-model (formulas, links, tie-outs).`
Publish disabled until both are checked; the server re-checks.

## 4. Architecture

### Routes (`src/App.tsx`)
```
/finance                                   FinanceLanding (cards 01–06)
/finance/finance-in-action                 FiaIndexPage (subsections A + B)
/finance/finance-in-action/capital-in-motion           FinanceInMotion (moved)
/finance/finance-in-action/capital-in-motion/:slug     CapitalConditionDetail (moved)
/finance/finance-in-action/:sector/...     existing model routes (unchanged)
/finance/toolkits                          ToolkitsPage
/finance/capital-allocation[/:slug]        → Navigate replace to the new path
/admin/toolkits                            RequireAdmin → ToolkitsAdmin
```
`src/lib/finance-in-action/conditions.ts` `conditionHref()` is the single place the condition path is built; change it there. `src/config/navConfig.ts`: Finance dropdown gains "Finance in Action" and "Toolkits"; "Capital Allocation" entry removed.

### Condition ↔ company relation
Already present: every package carries `meta.conditionIds: integer[]` (`contract/model-package.schema.json:41`) and `conditionNotes`. No new table.
- `src/lib/finance-in-action/conditionIndex.ts`: `companiesByCondition(registry): Map<number, CompanyEntry[]>` built once from `registry.packages` (published only).
- Condition page reads it through the existing live registry hook (`useLiveRegistry.ts`).
- Module chips per condition: `src/data/capitalConditions.ts` gains an optional `modules: string[]` field (module ids from `essay_structure`); empty until the owner fills it — the UI omits the chip row when empty rather than showing a placeholder.

### Coverage tracker
`registry.ts` already merges `fromPackages` and `fromSlate` into `companies[]` with a `modelled` set. The tracker needs one more field on the slate entry: `status` (`queued` | `in_review` | `rejected` | `not_started`). Source: `fia.manual_release.status` for manual, and the FSRE channel's own status if the `fia_private.fsre_packages()` function exposes it — check; if it does not, add a `fia.slate_status` table keyed by ticker, written by the FSRE pipeline on each run, read by the view. Counts are computed client-side from the registry; nothing is stored twice.

### Toolkits
**Table** `public.toolkits`:
```
id uuid pk, slug text unique, title text, purpose text, module_id text references essay_structure(id),
format text check (format in ('xlsx')), status text check (status in ('draft','published')),
checks jsonb not null default '{}',   -- {"no_client_data": true, "verified_model": true}
created_by uuid, created_at, updated_at
```
**Table** `public.toolkit_versions`:
```
id uuid pk, toolkit_id uuid references toolkits, version text, changelog text,
file_key text,         -- toolkits/<slug>/<version>/<filename> in dg-books-public
size_bytes int, sha256 text, published_at timestamptz
unique (toolkit_id, version)
```
**Constraint** (mirrors `books_access_shape`): `check (status = 'draft' or (checks->>'no_client_data')::boolean and (checks->>'verified_model')::boolean)`. RLS: anon selects published only; admin full.

**Storage**: R2 `dg-books-public`, prefix `toolkits/`. Reuse the SigV4 signer in `supabase/functions/book-file` by extracting it to `supabase/functions/_shared/r2.ts`; new function `toolkit-file` presigns a GET with `response-content-disposition: attachment; filename=…`. Upload from the admin UI goes through a presigned PUT from the same function (bucket CORS already allows PUT after Package 0).

**Versioning**: a new version inserts a row and uploads to a new key; old keys are never deleted or overwritten. The public card always shows the latest `published_at`; older versions are listed under a "Previous versions" disclosure.

**Module link**: `FinanceModulePage.tsx` queries `toolkits` where `module_id = current` and renders a "Toolkit" line under the module header. One query, cached with the page's existing query client.

### Tests
- Route tests: old capital-allocation URLs redirect; all six cards resolve.
- `conditionIndex.test.ts`: ADRO → {3, 9}; a condition with no package → empty array, not undefined.
- DB test (pgTAP or SQL in CI): inserting a published toolkit with a false check fails.
- Playwright: publish flow with both checks; download link returns 200 with attachment header; v1 link after v2.
