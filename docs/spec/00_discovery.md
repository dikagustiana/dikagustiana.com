# Step 0 — Discovery

Two parts. **Part 1** (sections 1–9) was written by the PR 2 (Tracker) session; PR 2 merged
as dikagustiana/dikagustiana.com#69. **Part 2** (sections 10–19, at the end) is the PR 1
(FSLI viewer) discovery.

## Part 1 — PR 2 (Tracker)

Read-only pass over `main` at `1adf987` and the live Supabase project, 11 October 2026.
Written by the PR 2 (Tracker) session. Section 7 records facts relevant to PR 1 seen in
passing; the PR 1 session owns the FSLI decisions.

## 1. Router

- File: `src/App.tsx`. React Router v6: `<BrowserRouter><Routes><Route path element>`, page
  components lazy-loaded at the top of the file.
- Redirects are declared in the router, client-side, as
  `<Route path="…" element={<Navigate to="…" replace />} />` (e.g. `src/App.tsx:166`,
  `:197–204`, `:233–236`). Parameterised redirects use a small component that reads
  `useParams` and returns `<Navigate>` (`src/App.tsx:105–143`).
- No server-side redirects: `vercel.json` rewrites everything to `/index.html`;
  `public/_redirects` is the SPA fallback only.
- Tracker routes (`src/App.tsx:217–220`):

  | Route | Page |
  |---|---|
  | `/green-transition/tracker` | `src/pages/GreenTransitionTracker.tsx` |
  | `/green-transition/tracker/archive` | `src/pages/GreenTransitionTrackerArchive.tsx` |
  | `/green-transition/tracker/:issueSlug` | `src/pages/GreenTransitionTrackerDetail.tsx` |
  | `/green-transition/tracker/:issueSlug/:sectionKey/:entrySlug` | `src/pages/GreenTransitionTrackerEssay.tsx` |

- Green Transition sub-nav: `src/data/greenTransitionTabs.ts`, five tabs (out of scope, PRD §B3).
- FSLI routes, for reference only: `src/App.tsx:172–173`.

## 2. Supabase

- Project `asypkbkiebjvvpimewfp` (`supabase/config.toml`).
- Migrations: `supabase/migrations/`, timestamp-prefixed; pre-baseline history in
  `supabase/migrations/_archive/`. Applied with the Supabase MCP `apply_migration`, filename
  stem as the migration name; `docs/RUNBOOK.md:82–94` forbids `supabase db push` and every
  CLI migration command. Local RLS acceptance harness: `docs/db/verify/`.
- Reversibility: the repo has no down-migration convention (no `-- down` blocks, no paired
  files). PRD §Non-functional requires one; to be settled in 2.2.
- **Tracker content is not in Supabase.** It is a static TypeScript module,
  `src/data/trackerIssues.ts` (561 lines): 2 issues, 22 entries across six sections, 3
  named primary sources, 6 dated corrections. Rendered by the four pages above plus
  `src/components/tracker/{CoverageNotice,TrackerEvidence,WhatChangedPanel}.tsx`. The live
  database has no tracker table (`information_schema.tables`, queried 11 Oct 2026).
- Essays live in `public.essays` (`supabase/migrations/20260731030000_baseline_cms.sql:220`).
  Body in `content_json` (JSONB). Placement by `section`, `phase`, `category_id`
  (`NOT NULL`, FK). Column list: `docs/CONTENT_MODEL.md §4`.
- RLS pattern (`20260731030000_baseline_cms.sql:436–490`):
  - anon `SELECT … USING (published = true)`, referencing no function and no other table;
  - authenticated `SELECT … USING (published = true OR EXISTS (SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'))`;
  - `INSERT` / `UPDATE` / `DELETE` split per verb, admin-only through the same inline
    `EXISTS`; `has_role()` deliberately not called from policies (history in
    `20260731010000_baseline_foundation.sql:1–40`).
- How the app reads: the typed client `src/integrations/supabase/client.ts` with generated
  `src/integrations/supabase/types.ts` (stale against the migrations, per
  `docs/CONTENT_MODEL.md`; several reads cast through `unknown`), wrapped in TanStack Query
  hooks under `src/hooks/queries/`. `published` (boolean) is the visibility gate, `status`
  the workflow label: `src/lib/publication.ts` (`onlyPublished`, `isPublished`).
- The essay series (PRD §B2): "Learn from the UK: It Was Never Just Political Will" exists
  as slug `learn-from-the-uk-it-was-never-just-political-will`, `section='green-transition'`,
  `phase` null, `category_id` = the `finance-general` category, `published=false`,
  `status='draft'`, dated 2026-10-10. A second draft, "Why Indonesia Cannot Afford to Wait",
  sits beside it. The `green-transition` section has no categories and no published essay.
  No series index route exists.

## 3. Admin / publish flow

- Essays, Writer Studio: `/admin/writer/:section/:slug` → `src/components/writer/WriterEditor.tsx`.
  `handleSave(targetStatus)` (`:418`) checks `validation.canPublish` (`:420`), writes
  `published` and `status` together (`:490`), records a `publish` / `unpublish` revision
  (`:553–554`). Confirmation UI: `src/components/writer/PublishModal.tsx`.
- Essays, content list: `/admin/content` → `src/pages/AdminContent.tsx:143` →
  `useTogglePublishContent` (`src/hooks/queries/useUnifiedContent.ts:237`).
- Both behind `<RequireAdmin>` in `src/App.tsx:258–277`.
- There is no admin surface for any non-essay table. The tracker has none (it is code).

## 4. Theme tokens

Defined in `src/index.css` (`@font-face`, `:root` custom properties, component classes)
and mapped to utilities in `tailwind.config.ts`.

**Font families.** Two, self-hosted in `public/fonts/`, no third-party font request:

| Token | Family | Files |
|---|---|---|
| `--font-sans` (body default, `body { font-sans }`) | Plus Jakarta Sans | `plus-jakarta-sans-latin.woff2` (variable 400–800) |
| `--font-serif`, `--font-display` (global `h1–h6 { font-display font-semibold tracking-tight }`) | Spectral | `spectral-{normal,italic}-{400,700}-latin.woff2` |

Monospace is Tailwind's default `font-mono` system stack (no font file). It is used by
`.eyebrow` / `.eyebrow-chip` (`src/index.css:261–267`: 11px, uppercase, 0.18em tracking)
and appears 34 times across the tracker pages and components.

**Type scale.**
- Chrome: Tailwind defaults (`text-xs` 12px … `text-3xl` 30px; body 16px).
- Editorial (`src/index.css:325–540`): essay body `.prose-editorial` Spectral 400
  19px / 1.6, ink `--prose-ink`; in-body headings Plus Jakarta Sans 700 at 2 / 1.625 / 1.3 /
  1.125 / 1 / 0.875em; `.editorial-title` Spectral 700 32/36px; `.editorial-subtitle`
  Spectral 400 18/24px.

**Spacing and width.**
- Tailwind default 4px scale; `container` centred, 2rem padding, 1400px at `2xl`.
- Essay column 728px (`.editorial-column`, `.prose-editorial`: `width: 728px;
  max-width: 100%`); figures may widen to `min(780px, 100vw − 2rem)`.
- Hairline: `--prose-rule` (rgb 230,230,230); `hr` 1px, 32px margin.

**Colour** (HSL custom properties, light only): `--background` 0 0% 98%, `--foreground`
215 25% 17%, `--muted-foreground` 215 15% 45%, `--border` 215 20% 88%, `--accent` /
`--link-primary` 215 60% 32% (navy), `--section-green` 142 71% 45% (section identity and
success states only), `--prose-ink` rgb(54,55,55), `--prose-muted-ink` rgb(119,119,119).

Token-pair contrast, computed from the token values with the WCAG 2.x formula (not yet
measured in a browser; 2.5 measures the rendered page with axe):

| Pair | Ratio |
|---|---|
| `--foreground` on `--background` | 13.95:1 |
| `--prose-ink` on `--background` | 11.43:1 |
| `--muted-foreground` on `--background` | 4.83:1 |
| `--muted-foreground` on `--card` | 4.64:1 |
| `--prose-muted-ink` on `--background` | **4.29:1** (below 4.5:1; not usable for body or table text) |

## 5. Tests and CI that PR 2 touches

- `.github/workflows/ci.yml`: eslint (`--max-warnings=35`), `npm run typecheck`, vitest
  with `TZ=America/Chicago`, then `scripts/assert-test-count.mjs` (floor `MIN_TESTS = 1252`).
  Removing `tests/unit/trackerEvidence.test.ts` lowers the count; the floor has to move in
  the same commit with its reason, per the file's own rule.
- CI has no Supabase credentials. The 2.4 copy test therefore cannot query Supabase; it has
  to read the repo-side source the seed migration is built from.
- `tests/e2e/smoke.spec.ts:26–27` visits `/green-transition/tracker` and `/archive`.
- `src/pages/GreenTransition.tsx:5,99` imports `trackerIssues` for the section landing card
  ("N issues · paused"); it has to be rewired when the static module goes.

## 6. Prior verification work on the tracker

`docs/response-2026-09-14/tracker-claim-ledger.md` (14 Sep 2026) classified the 22 entries:
1 verified, 2 contradicted, 9 no source cited, 10 author observation. Its three sources are
the ESDM RUPTL 2025–2034 release, the OJK TKBI second-edition page and the OJK PTIJK 2025
press release. 2.1 starts from this ledger and re-reads every source; the ledger's
statuses are not carried over unchecked.

Reachability of primary-source sites from this container (11 Oct 2026, HTTP status):
`esdm.go.id` 200, `jdih.esdm.go.id` 200, `ojk.go.id` 200, `jetp-id.org` 200, `adb.org` 200,
`danantaraindonesia.co.id` 301, `peraturan.bpk.go.id` **403**, `web.pln.co.id` **no
response**.

## 7. Facts relevant to PR 1, recorded only

- Existing FSLI tables: `fsli_pages`, `fsli_sections`
  (`supabase/migrations/20260731020000_baseline_finance.sql:420,492`); live DB has no `fs_*`
  table.
- CI installs Node only; there is no `setup-python` step. The `ubuntu-latest` runner image
  ships `python3`, but no CI step uses it today.
- No `checker` agent definition was found: the repo has no `.claude/` directory, and none
  exists in this container's `~/.claude/agents`.

## 8. Contradictions and gaps

### Contradictions with the PRD

1. **Issue-section typography (PRD §B5, D7).** §B5 asks for "serif headings, sans body" and
   for issue body text "at the site's standard essay size". In the code those point at two
   different things. The site's essay surface, `.prose-editorial`, sets a **serif** body
   (Spectral 19px) under **sans** headings, the inverse of §B5. Page chrome sets serif
   headings over a sans body, matching D7. No essay-surface rule gives a sans body at 19px.
2. **Register width (PRD §B5 vs Plan 2.3).** §B5: "full content width (max ~880px)". Plan
   2.3: "Content width = the essay content width already used elsewhere on the site", which
   is 728px. No 880px value exists in the theme, so using it would add a spacing value
   (session rule 4).
3. **Existing editorial rule (superseded by D6).** `src/data/trackerIssues.ts:113–121` and
   the 14 Sep 2026 ledger hold that entry bodies are never rewritten, that corrections are
   dated and kept on the page, and that "author observation" is a fourth evidence state. D6
   replaces this. Consequences: the 10 author-observation entries go to the deletion list
   unless a primary document supports them, and the 6 dated corrections leave the page
   (their text stays in git history, Plan §Rollback).

### Gaps the PRD does not settle

4. **Tracker sub-routes.** D5 keeps `/green-transition/tracker` so inbound links survive.
   Three more routes exist (`/archive`, `/:issueSlug`, and 22 entry pages at
   `/:issueSlug/:sectionKey/:entrySlug`) whose content the single-page design in §B5
   absorbs or deletes. The PRD does not say what they become.
5. **Series index target.** The §B5 status line links to the series index, and Plan 2.3 says
   a stub listing "Learn from the UK" is enough. That essay is `published=false`, so an
   anonymous reader would see a title with no readable page behind it.
6. **Publishing `tracker_entry`.** Plan 2.2 seeds `published=false`; §B6 requires Dika's
   sign-off before `published=true`. No admin surface exists for a non-essay table, and
   preview deployments read the same Supabase project, so draft rows are visible on a
   preview only to a signed-in admin.
7. **Status labels.** §B4's status enum has four values (`advanced`, `unchanged`,
   `regressed`, `mixed`); §B5 lists three labels. `mixed` has no stated display label.

### Operational

8. **Branch.** This cloud session can only push to `claude/sharp-noether-a2fkj7`, not
   `feat/tracker-rebuild`. Draft PR: dikagustiana/dikagustiana.com#69.
9. **This file.** The PR 1 session writes its own `docs/spec/00_discovery.md` on
   `feat/fsli-viewer`. Whichever PR merges second gets an add/add conflict on this path.
   `01_PRD.md` and `02_PLAN.md` are byte-identical copies and will not conflict.

## 9. Owner's answers (Dika, 11 October 2026)

| Item | Answer |
|---|---|
| 1. Issue-section body | Sans (Plus Jakarta Sans) at 19px, the essay size. Headings serif. |
| 2. Register width | 728px, the essay column. |
| 4. Sub-routes | Redirect to `/green-transition/tracker`: issue pages to `#q2-2025` / `#q1-2025`, entry pages and `/archive` to the page. |
| 5–7 | Open; not needed for 2.1. To settle at 2.2–2.3. |

---

## Part 2 — PR 1 (FSLI viewer)

Read-only pass over `main` at `509c737` and the live Supabase project, 11 October 2026.
Nothing in the repo or the database was changed.

## 10. Router

- File: `src/App.tsx`, same pattern as section 1 (React Router v6, lazy pages, client-side
  `<Navigate replace>` redirects, `vercel.json` rewrites everything to `/index.html`).
- FSLI routes today (`src/App.tsx:180–181`):

  | Route | Page | What it is |
  |---|---|---|
  | `/accounting/fsli` | `src/pages/FsliList.tsx` | The asset side of one statement, built from `fsli_pages`; every row links to its line-item page |
  | `/accounting/fsli/:slug` | `src/pages/FsliDetail.tsx` | One line-item page: its figures (`FsliDetail.tsx:126–130`) and the published essays filed under it (`useFsliEssayBodies`, `src/hooks/queries/useEssays.ts:139`) |

- The new route `/accounting/fsli/:company/:period` has two segments and does not collide
  with `/:slug`. The D4 redirect `/accounting/fsli` → `/accounting/fsli/phe/fy2024` is one
  `<Navigate replace>`.
- Other entry points to `/accounting/fsli`: the nav entry "FSLI Detail"
  (`src/config/navConfig.ts:24`) and the Accounting landing card, whose standing line counts
  `fsli_pages` rows ("24 line items", `src/pages/Accounting.tsx:16–23`).

## 11. Supabase

- Migrations, MCP-only application, RLS pattern and typed client: as in section 2.
- **Existing FSLI tables** (`supabase/migrations/20260731020000_baseline_finance.sql:420–560`):
  - `fsli_pages`: 24 rows, all PHE FY2024, asset side only (`category` is
    `current_assets` or `non_current_assets`). Columns `slug, title` (EN), `subtitle` (ID),
    `notes_ref, dec_2024, dec_2023` (TEXT, pre-formatted: `'2,614,318'`), `category,
    sort_order, is_component`. RLS: anon and authenticated read **every** row
    (`USING (true)`, no publish gate); writes admin-only.
  - `fsli_sections`: 0 rows. FK `page_slug → fsli_pages.slug` (cascade).
  - These are the D2 rows: the live values match the "site value" column of PRD §A1 row for
    row (`related-parties` 823,348 / 801,429; `trade-receivables-net` 2,203,018;
    `notes_ref` `3i.6`, `3b,4dc`; and the rest).
- **`essays.fsli_slug`** is a plain-text back-reference to `fsli_pages.slug` (no FK).
  26 essays carry one; **13 are published**, one on each of 13 line-item pages:

  | `fsli_pages.slug` | Published essay slug |
  |---|---|
  | `cash-and-cash-equivalents` | `cash-and-cash-equivalents-reading-a-fall` |
  | `restricted-cash` | `restricted-cash-abandonment-fund-and-debt-reserve` |
  | `trade-receivables-net` | `trade-receivables-upstream-expected-credit-losses` |
  | `due-from-government` | `due-from-government-underlift-vat-and-other-receivables` |
  | `inventories-net` | `inventories-net-upstream-materials-and-spares-superseded` |
  | `corporate-dividend-taxes-receivable-current` | `corporate-dividend-taxes-receivable-refund-claims-and-disputes` |
  | `advances-prepayments-current` | `advances-and-prepayments-destination-decides` |
  | `fixed-assets-net` | `fixed-assets-boundary-with-oil-and-gas-properties` |
  | `investment-properties` | `investment-property-classification-models-transfers` |
  | `deferred-tax-assets` | `deferred-tax-assets-four-ways-the-line-can-fall` |
  | `long-term-investments` | `long-term-investments-splitting-a-fall` |
  | `oil-gas-properties-net` | `oil-gas-properties-capitalised-cost-and-reserves-superseded` |
  | `right-of-use-assets-net` | `right-of-use-assets-reading-a-fall` |

  The other 13 are drafts. The canonical URL of every one is `/accounting/fsli/<fsli_slug>`
  (`src/lib/essayUrl.ts:122`, `src/domains/writing/schema/placement.ts:92`).
- Other readers of `fsli_pages`: the Writer Studio's FSLI placement picker
  (`src/components/writer/WriterEditor.tsx:131`), the admin content list and delete
  (`src/hooks/queries/useUnifiedContent.ts:107,159,366–374`), `FsliMobileSidebar`,
  `FsliRelatedItems`, `FsliCoveredBy`.
- No `fs_*` table exists. No `_legacy_*` table exists.
- `src/integrations/supabase/types.ts` is generated and stale (section 2); Plan 1.1's
  regeneration is done with the Supabase MCP `generate_typescript_types`.

## 12. Admin / publish flow

- Essays: Writer Studio and `/admin/content`, as in section 3. Publishing an essay writes
  `published` and `status` on the row from the client; there is no server-side gate.
- The app calls no RPC today (`supabase.rpc(`: 0 hits in `src/`). One edge function exists,
  `supabase/functions/link-preview`.
- No admin surface exists for a non-essay table.
- **Decision for 1.7:** the gate is a SQL function `fs_publish_period(period_id uuid)`,
  `SECURITY DEFINER` with `SET search_path = ''`, admin-checked inside through the same
  inline `user_roles` test the policies use. It re-runs the tie-out rules on
  `fs_line` / `fs_soce_cell`, writes one `fs_check` row per rule, and sets
  `status = 'published'` only when every rule passes. The client cannot write
  `fs_period.status` directly (no UPDATE grant on that column to `authenticated`). The
  publish button sits on the FSLI page, shown to an admin only, disabled while the latest
  run has a failure. An RPC over an edge function: the rules are sums over rows the
  database already holds, and an edge function would add a deploy step and a service key.

## 13. Theme tokens

As in section 4: Plus Jakarta Sans (body) and Spectral (headings), Tailwind's default type
and 4px spacing scales, the 728px essay column, HSL colour tokens in `src/index.css`.
FSLI-specific:

- The current FSLI table sets figures in `font-mono` (`FsliList.tsx:44–45`) and header rows
  in `bg-header`. The new table sets figures in the body font with `tabular-nums`
  (`font-variant-numeric`, a Tailwind utility, not a new value). That Plus Jakarta Sans
  carries a `tnum` feature is checked in 1.6 by measuring digit widths; if it does not,
  this is reported before any other choice is made.
- No tabs primitive exists in `src/components/ui/` and no `@radix-ui/react-tabs` dependency.
  `FsTabs` is a `role="tablist"` of buttons on existing tokens; no dependency is added.
- Total rows: a double rule is `border-b-4 border-double` (existing scale).
- Table width: the statement is a four-column table with two figure columns; it sits in
  `container` width, not the 728px essay column, which would wrap the bilingual labels.
  To confirm with screenshots at 1.6.

## 14. PDF and JSON storage

- The repo already commits binary sources with their published artefacts pinned to them:
  `docs/consolidation/source/*.xlsx` (marked `binary` in `.gitattributes`, sha256 pinned by
  the published JSON), `scripts/og-fonts/*.ttf`. `.gitignore` excludes no PDF or `data/`
  path. `.git` is 120 MB.
- **Decision:** repo `data/fs/<company>/<period>/` for `source.pdf` and `statements.json`
  (Plan default). `.gitattributes` gains `data/fs/**/*.pdf binary`.
  `fs_period.source_file` holds the repo path. The README records the PDF's sha256.
  Supabase Storage is not used.

## 15. Checker runtime in CI

- CI installs Node only (`.github/workflows/ci.yml`); no step runs Python today. The
  runner image ships `python3`; this container has 3.13. One Python script exists in the
  repo (`scripts/world/fetch-issuers.py`), run by hand.
- **Decision:** the checker is Python stdlib, as the PRD asks. CI gains two steps on the
  runner's `python3`, no `setup-python` and no package install:
  `python3 -m unittest discover -s scripts/tests` and
  `python3 scripts/fs_check.py data/fs/phe/fy2024/statements.json`. No TypeScript port.
- The rules exist twice: in `fs_check.py` (gate before loading) and in the SQL publish
  function (gate before publishing, Plan 1.7). Both are run against the same loaded data on
  the local Postgres harness (`docs/db/verify/`) and their outputs compared rule by rule;
  the comparison is an artefact in 1.8.

## 16. Existing checker agent

None. The repo has no `.claude/` directory, and this container has no `~/.claude/agents`.
`scripts/fs_check.py` stands alone.

## 17. Loader

Repo scripts are Node (`.mjs`, and `.ts` run with `--experimental-strip-types`). Neither CI
nor this environment holds a service-role key; database writes go through the Supabase MCP,
as the tracker seed did. **Decision:** `scripts/fs_load.mjs` reads `statements.json` and the
checker's `--json` output, refuses if any result has `passed=false`, and writes the load as
SQL (`fs_period` as `draft`, `fs_line`, `fs_soce_cell`, `fs_check`). That SQL is applied with
`apply_migration`, and a unit test fails if the committed SQL differs from what the script
produces (the tracker seed's pattern).

## 18. Contradictions and gaps

### Contradictions with the PRD and plan

1. **The table D2 retires is also the line-item essay index.** Plan 1.1 renames "the current
   FSLI asset table" to `_legacy_*`. That table, `fsli_pages`, is also what
   `/accounting/fsli/:slug` reads, and those pages carry the 13 published essays in section
   11. Renaming it takes all 13 offline. It also breaks the Writer Studio's FSLI placement
   picker and the admin content list. The PRD and plan do not say what becomes of the
   line-item pages or their essays.
2. **The wrong figures are on the line-item pages too.** `FsliDetail` prints `dec_2024`,
   `dec_2023` and `notes_ref` from `fsli_pages` (`FsliDetail.tsx:126–130`). Plan 1.8 asks
   for confirmation that the PRD §A1 figures appear nowhere, so these pages change in this
   PR whatever is decided in item 1.
3. **Two published essays sit under rows the FS does not have as labelled.**
   `trade-receivables-net` is the 2,203,018 total the PRD says does not exist in the FS;
   `corporate-dividend-taxes-receivable-current` is the figure the PRD identifies as
   *Other taxes receivable – current*. Their slugs are their essays' public URLs.
4. **"Not yet loaded" against loaded data.** D1 and §A7 have the SoCE and Cash Flow tabs
   say "Not yet loaded from the FY2024 report." Plan 1.4 extracts SoCE and CF, and 1.5 loads
   them, because XS-SOCE-PROFIT, XS-SOCE-BAL and XS-CF-CASH need them, including in the
   server-side re-check (1.7). Once loaded, that sentence is untrue.

### Gaps

5. **The source PDF is not in this session.** Only `01_PRD.md` and `02_PLAN.md` were
   attached. The `0 spec` commit and every step from 1.2 on need
   `data/fs/phe/fy2024/source.pdf`. No public copy of the audited FY2024 report was found
   on phe.pertamina.com. 1.1 (schema) and 1.3 (checker on the golden fixture) do not need
   it.
6. **"Authenticated owner"** (Plan 1.1) is read as the `admin` role in `user_roles`, the
   repo's only owner concept.
7. **Child-table RLS.** The repo's anon policies reference no other table (section 2).
   `fs_line`, `fs_soce_cell` and `fs_check` have no publish flag of their own, so their anon
   policy has to test the parent: `EXISTS (SELECT 1 FROM public.fs_period p WHERE p.id =
   period_id AND p.status = 'published')`. This works because anon can read published
   `fs_period` rows. It is a deliberate departure from the pattern, recorded here.

### Checked and consistent

- PRD §A6 golden table: every identity it implies holds to the unit for both years
  (TCA + TNCA = TA, TCL + TNCL = TL, EQ + NCI = TE, TL + TE = TA, Rev + CoR = GP,
  PBT + tax = NI, parent + NCI for profit and for TCI). Implied items below gross profit:
  (107,050) / (1,158,490). Implied OCI: (37,360) / 1,376.

### Operational

8. **Branch.** This session pushes to `claude/sharp-noether-a2fkj7`, not
   `feat/fsli-viewer`; the branch was restarted from `main` at `509c737` after PR 2 merged.
9. **This file.** PR 2 merged first, so the add/add conflict in item 9 does not arise; PR 1
   appends Part 2 here.

## 19. Owner's answers

Pending.
