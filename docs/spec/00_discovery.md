# Step 0 — Discovery

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
