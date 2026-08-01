# DECISIONS

Design decisions taken during the full-site upgrade pass, with rationale and rejected
alternatives. Newest first.

---

# 2026-08-01 — Section 5: the writing experience (Session B)

## The upload placeholder is a decoration, not a node
- **Decision:** the "Uploading image…" block shown while a pasted image uploads is a
  ProseMirror *widget decoration*, held in plugin state, not a node in the document.
- **Why:** the gate requires that a rejected upload leave no dead placeholder. A
  placeholder node would be part of the document, which means it can be serialized by
  `getHTML()`, stored by autosave into `essay_revisions`, and recovered days later as a
  permanent artefact of an upload that failed. Cleaning it up correctly on every failure
  path — network error, RLS refusal, oversized file, the author deleting the surrounding
  paragraph mid-flight — is a discipline you can forget. A decoration cannot be
  serialized, cannot be saved, and disappears with the plugin state.
- **Rejected:** an atom node with a `pending` attribute, filtered out at save time. That
  puts the correctness burden on every future writer of a save path.
- **Consequence:** if the anchor position is gone when the upload lands (the author
  deleted that part of the text), the image is dropped rather than inserted at a guessed
  position. Losing an upload the author can retry beats silently putting a picture
  somewhere they did not ask for.

## Pasted image files become `figure` nodes, not `image` nodes
- **Decision:** two node types coexist. A pasted or dropped image *file* is uploaded and
  inserted as a `figure`; a bare `<img>` (pasted markup, or legacy HTML in `essays.content`)
  is parsed as an `image`.
- **Why:** `figure` is the editorial primitive that already carries alt text, caption,
  source attribution and width mode, and already round-trips through all four places of
  the content contract. Routing uploads into it reuses a proven path. But `image` still has
  to exist, because without it a bare `<img>` matches no node and ProseMirror discards it —
  which is also why a legacy body containing `<img>` rendered as nothing.
- **Rejected:** one node for both. Collapsing them would either strip captions from
  uploads or fabricate empty figure furniture around every incidental image.

## `Link` is configured inside StarterKit rather than beside it
- **Decision:** `StarterKit.configure({ link: {...} })`, and `@tiptap/extension-link` is
  no longer a direct dependency.
- **Why:** StarterKit v3 bundles it. Registering a standalone copy alongside produced the
  duplicate-extension warning and two competing definitions of the same mark. Verified by
  reading the installed StarterKit's dependency list, not by assuming.
- Five further `@tiptap/extension-*` packages were declared in `package.json` and imported
  nowhere; removed.

## `WriterStudio` becomes a redirect rather than a deletion
- **Decision:** Stack B is retired by replacing `WriterStudio` with a component that
  resolves the old `/admin/writer/:id` URL and forwards to `/admin/writer/:section/:slug`.
- **Why:** the gate requires exactly one route that *authors* essays. Deleting the route
  outright means editing `src/App.tsx`, which Session A owns and whose Gate 4 is not
  terminal. A redirect satisfies the gate inside Session B's own surface, and keeps
  bookmarks and the dashboard's "New Essay" link working. The route can be deleted later
  with no further code change.

## Preview renders through `ArticleBody`
- **Decision:** `WriterPreview` no longer builds its own HTML; it renders the same
  component the published page renders.
- **Why:** two renderers means two lists of understood block types, so a block appearing
  in the preview was never evidence it would appear when published — the same class of
  failure as the homepage card that 404'd. One path, or the preview is decoration.

---

# 2026-08-01 — Section 7: the never-checked groups (Session B)

## `.single()` is the wrong call for a lookup that can legitimately miss
- **Decision:** `useFsliPage`, `useBook` and `useFinanceModelBySlug` use `maybeSingle()`.
- **Why:** PostgREST answers `single()` with HTTP **406** when no row matches. The pages
  swallowed it, so an unknown slug produced a thin shell and a red line in the console
  instead of a "not found" page. `maybeSingle()` makes "no such row" ordinary data.

## A miss renders `NotFound`, it does not redirect
- **Decision:** `FsliDetail` and `FinanceModelDetail` render `<NotFound />` instead of
  `<Navigate to={index} replace />`.
- **Why:** consistency with the correction GATE 1f already made to the four essay pages.
  A slug that matches nothing means the URL is wrong; moving the reader to an index they
  did not ask for hides that and makes a typo indistinguishable from a working link.

## Counts come from the table, or the page says it is empty
- **Decision:** `BooksCategories` counts real `books_uploads` rows; with none, it shows an
  empty state instead of four category cards.
- **Why:** it previously advertised 12, 8, 15 and 10 books against a table with zero rows —
  45 books that do not exist, each card leading to an empty list. Hardcoded counts are a
  claim about data, and this one was false.
- **Kept hardcoded:** the four category *titles*. Those are editorial taxonomy, not
  measurements, and deriving them from an empty table would leave nothing to browse once
  books exist.

---

# 2026-07-31 — Greenfield Supabase rebuild

The old Supabase project (`rhwzvgklasvitocbbhvi`) is gone; the frontend stays; the
database is rebuilt fresh. Decisions below, newest first within this section.

## Old project is deleted, not paused — no legacy dump possible
- **Observation:** The account lists 3 projects: `ascbthsgborseynmmthm` (dikagustiana-prod,
  ACTIVE — a different app, the personal-OS schema, untouched by this rebuild),
  `fqayxopcfxlkuftglqbl` (Sep 2025, paused) and `llqehykfmbgjnbwbijfs` (Nov 2025, paused).
  `rhwzvgklasvitocbbhvi` is absent — deleted, unrecoverable via restore.
- **Evidence the paused projects never hosted the site:** across the entire archived git
  history (Lovable scaffold 2025-12-23 → PR #34 merge 2026-07-26), the only Supabase ref
  ever present in `supabase/config.toml`, `client.ts`, or any file is `rhwzvgklasvitocbbhvi`.
- **Consequence:** `docs/db/legacy-dump.sql` cannot exist. All CMS content authored after
  the last content-bearing migration (2026-07-04) is lost. What survives is what the 43
  migrations seed.
- **Production was already dark:** the deployed JS bundle on www.dikagustiana.com contains
  no Supabase URL at all (env vars were unset at its build time), so the live site has been
  throwing at boot independent of the DB deletion.

## Free-project slot blocker — user authorized deleting the two paused 2025 projects
- Creating (or restoring) any project fails: the account owner is at the free plan's
  2-active-free-project limit. The Supabase MCP has no `delete_project` tool, so the
  deletion the owner approved (both paused 2025 projects) must be done in the dashboard.
  Creation is retried automatically until a slot frees up.

## Reseed strategy: reconstruct, never invent
- **Decision:** Reseed the 8 sections, 24 fsli_pages, 4 finance_sections, 2 finance_settings,
  49 finance_modules and 105 essay draft stubs; resolve every foreign key by subquery rather
  than by literal UUID; leave a column NULL where the archive holds no value.
- **Why the essay stubs are recoverable at all:** the three seed migrations hardcode
  `module_id` UUIDs for modules that no migration ever creates (they existed only in
  production), so a verbatim replay fails the foreign key. But each file groups its essays
  under a `-- Module NN:` comment and the slug prefix encodes the mapping (`sf-07-03` =
  strategic-finance module 07, essay 03), so the 29 missing modules and the whole
  105-essay outline are deterministically reconstructible.
- **Rejected:** replaying the three INSERTs verbatim (FK failure); dropping the stubs
  (throws away the curriculum plan of record); inventing theses for the 11 modules with no
  authored source (would put words in the owner's mouth).

## No `docs/db/legacy-dump.sql`, and `import.sql` is not the baseline
- **Decision:** author the baseline from scratch rather than from `docs/db/import.sql`.
- **Evidence:** `import.sql` concatenates only the first 38 of 43 migrations (last header
  `20260310000954`). It omits the security hardening, `admin_audit_log`, `council_sessions`,
  and **both** P0 auth-gating repairs — so it reproduces the *broken* state of both
  historical failures and ships without two tables the app queries.
  `docs/DB_READINESS.md` still says "38 migrations", confirming both docs predate the last
  five migrations. Its own header also recommends `supabase db push`, which is prohibited here.

## RLS: inline the role check instead of calling `has_role()`
- **Decision:** every policy uses `EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id =
  (SELECT auth.uid()) AND ur.role = 'admin')`. `has_role()` is still created (types.ts
  declares it) but no policy depends on it.
- **Rationale:** the P0 outage happened because `EXECUTE` on `has_role()` was revoked from
  `anon`/`authenticated` while dozens of policies called it — Postgres requires the *calling*
  role to hold EXECUTE on a function used in a policy expression. A policy that reads
  `user_roles` directly cannot be broken by a future grant change. The `essays` anon SELECT
  policy is `published = true` and references no function at all.

## Restore `src/` from the tracked zip — nothing to arbitrate on configs
- `src/` (284 files), `tests/` (30), and `public/_redirects`, `placeholder.svg`,
  `robots.txt` existed only inside `dika-s-digital-studio.zip`. Every root config file in
  the zip is byte-identical to the tracked copy, so the upload at `e9bf047` was simply
  incomplete — no conflicting versions existed to choose between.
- Verified after restore: `tsc --noEmit` passes; `vite build` succeeds.

## Package manager: npm, single lockfile
- The production bundle (`/assets/index-tLuHZmHp.js`) is byte-identical to a local
  `npm ci` + `vite build` from `package-lock.json` — production was provably built with
  the npm dependency tree. `bun.lock`/`bun.lockb` removed; `typecheck` script added.

## Zips untracked after extraction; history preserved as a branch
- `dika-s-digital-studio.zip` untracked (recoverable at `02c4c36`). Its embedded git
  history (template → PR #34, ~40 working branches) pushed to
  `archive/pre-rebuild-history` so 7 months of provenance survives outside a binary blob.
  Only the main line was pushed; the 39 stale work branches add noise, not information.
- `tmp/Attach_feature.zip` untracked: it is a Figma Make export of an "Attach feature"
  design prototype (MUI scaffold, 66 files) — a design artifact, not site code.
- `*.zip` is now gitignored.

## Branch & coordination
- **Work on `claude/keen-galileo-occyc8`, based on the merged PR #30** (which already inherited the
  editor/test work from `claude/quirky-albattani-wlphbf`). We do **not** push to or edit
  `claude/quirky-albattani-wlphbf` / PR #30 — a concurrent session owns those and the live DB
  migration. Two PRs must be merged **in order: migration first, then this upgrade.**
- **Never touch the live database.** No `db push`, `functions deploy`, `seed`, or destructive CRUD.
  All verification is at the mock/static level (Vitest + mocked Playwright). Live verification is
  queued in UPGRADE_REPORT.
- **Schema changes go into NEW migrations** with a later timestamp, are **not applied**, and are
  flagged for manual reconciliation. We do **not** edit existing migration files.

## Writer Studio: dead `tags` / `meta_description` fields
- **Decision:** Remove the non-functional `tags` and `meta_description` inputs from the editor.
- **Rationale:** Neither column exists on `essays`; the fields silently discarded input — a
  data-integrity/UX defect. Removing them makes the surface honest.
- **Rejected:** (a) Wiring them to the save payload — would make `insert/update` fail at the DB
  (unknown column). (b) Adding a new migration + UI wiring tonight — the live DB is mid-migration and
  the essay `snippet`/deck already supplies the SEO description on public essay pages, so a dedicated
  `meta_description` column is low value. The ready-to-apply SQL is documented in
  `UPGRADE_REPORT.md` if it is ever wanted, rather than shipped as an unapplied migration file that
  could collide with the concurrent migration session.

## Writer Studio: category required on every save
- **Decision:** Validate `category_id` (and section) on **draft saves too**, not only on publish.
- **Rationale:** `essays.category_id` is `NOT NULL` with FK `RESTRICT`. Saving a draft without a
  category produced an opaque DB error. Validating early gives a clear message and prevents the
  failed round-trip. This enforces the "no orphan essays" guarantee at the UI layer.

## Performance: route-level code splitting
- **Decision:** Lazy-load page routes with `React.lazy` + a `Suspense` fallback, and define
  `manualChunks` for heavy vendors (React, Supabase, TanStack Query, TipTap, Recharts, KaTeX).
- **Rationale:** The single JS bundle was ~1.53 MB (436 kB gzip) with a chunk-size warning. Splitting
  keeps initial load small and isolates rarely-used admin/editor code.
- **Rejected:** Manually re-architecting imports per page — higher risk; `manualChunks` + `lazy`
  achieves most of the win with minimal churn.

## SEO: canonical + sweep
- **Decision:** Add a `<link rel="canonical">` to the shared `SEO` component and add `<SEO>` to the
  public pages that lacked it. Admin/utility pages get `noindex` rather than rich tags.
- **Rationale:** Canonicalization benefits every page from one change; indexing admin tools is
  undesirable.

## Resilience: global error boundary + console hygiene
- **Decision:** Wrap the router in a global `ErrorBoundary`; gate `NotFound`'s `console.error`
  to dev only; remove `console.log` noise from `PersonalFinance`.
- **Rationale:** "Zero uncaught errors/warnings in console on normal flows"; a render error in one
  route should not white-screen the whole app.

## Testing strategy
- New behavior is guarded by **Vitest unit/component tests with a mocked Supabase client** (the repo
  already mocks Supabase in `src/test/`), keeping the suite green without touching any backend. Live
  e2e (`tests/live`) stays queued for after the migration session completes.

---

# 2026-07-31 (session 2) — verifying the baseline before applying it

## Dry-run the baseline against a local Postgres before it ever meets Supabase
- **Decision:** stand up a throwaway Postgres 16 with the Supabase role, schema and
  default-privilege shape replayed (`docs/db/verify/`), apply the real migration files to
  it, and run the whole acceptance bar against real RLS — before creating the project.
- **Rationale:** the SQL had never been executed. Four adversarial review lenses had read
  it and found seven defects; running it found an eighth they structurally could not see
  (see below). A 2,400-line schema should not meet a real database for the first time in
  production, and the project-creation blocker made the wait free.
- **Not a rule violation:** the prohibition is on `supabase db push` / `db reset` / any
  CLI migration command against the project. This is plain `psql` against a scratch
  cluster and touches no Supabase project.
- **Rejected:** applying straight to the new project and fixing forward — every fix would
  then be a migration on top of a wrong baseline, which is exactly the history the rebuild
  exists to escape.

## On managed Supabase, a privilege is never absent by default
- **Observation:** the platform ships `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL
  ON TABLES/FUNCTIONS TO postgres, anon, authenticated, service_role`. Every new table and
  function is therefore *born* with ALL granted to `anon` and `authenticated`, and `GRANT`
  is additive — it cannot subtract.
- **Consequence 1 (defect 7):** `admin_audit_log`'s "second, independent barrier behind
  RLS" did not exist. The table was UPDATE-able and DELETE-able at the privilege layer
  despite the deliberately absent policies.
- **Consequence 2 (the 8th defect):** `REVOKE EXECUTE ON FUNCTION has_role FROM PUBLIC` —
  the natural fix for "has_role is a public admin oracle" — leaves `anon`'s *named* grant
  intact. Verified: `SET ROLE anon; SELECT public.has_role(<uuid>,'admin')` still returned
  true. The revoke must name `anon`.
- **Decision:** every table and the one policy-callable function REVOKEs before granting.
  Stated as a rule in `docs/SCHEMA_PLAN.md` §1 so it is not undone by someone adding a
  table later and copying the grant block without the revoke.

## `user_roles` writes: delete what does not work rather than ship a silent no-op
- **Decision:** removed the admin UPDATE and DELETE policies on `user_roles`; kept INSERT.
- **Rationale:** Postgres applies a table's SELECT policies to the rows an UPDATE/DELETE
  *reads*. With only the own-row SELECT policy, a targeted admin UPDATE matched zero rows
  and **returned success**, and the only working DELETE was the unqualified one — which
  deleted the admin's own role and would lock the owner out of their own site. A policy
  that reports success while doing nothing is worse than no policy.
- **Rejected:** adding an admin SELECT policy to make them work. Permissive SELECT policies
  are ORed, so sign-in's admin probe would become `user_id = auth.uid() OR has_role(...)`
  and a future EXECUTE revoke would take the public site down — that is historical failure
  (a) exactly. Role administration stays a service_role/SQL operation, which is what it
  already was: nothing in `src/` administers roles.

## Filenames must encode dependency order
- **Decision:** `01/03/02/04` became `20260731010000/020000/030000/040000`.
- **Rationale:** the numbering was authoring order, but `essays.module_id` has an FK to
  `finance_modules`, so the real apply order was `01 → 03 → 02 → 04`. Nothing infers that,
  and `supabase db reset` — which the live e2e suite depends on — applies files in sorted
  order and would have failed. Correctness that lives only in a README is not correctness.

## The placeholder essay states losses, not reassurance
- **Decision:** rewrote the one published essay to remove four claims that were false —
  that the curriculum outline is "intact", that 49 modules belong to the three tracks that
  hold 29, that the outline "is what you see below", and a data-loss date the rebuild does
  not establish.
- **Rationale:** it is the only thing an anonymous visitor can read. A note explaining a
  data loss that overstates what survived is the worst possible first impression, and the
  same migration's own loss list contradicted it three paragraphs earlier. Every number in
  the replacement was re-counted against the seed data.

---

# 2026-07-31 (session 3) — live project, framework-v2 taxonomy, import test

## Slug scheme: the framework's own cross-reference convention (t4-m07)
- **Decision:** `finance_modules.slug` = lowercase of the framework's cross-ref tokens:
  `t1-m07`, `t4-m07`, `t1-m08a`, `t4-qm3`.
- **Rationale:** `slug` is globally UNIQUE and "Module 07" exists in four sections, so
  `module-07` inserts once then fails. The framework document already writes its own
  cross-references as `T1-M09 / T3-M01 / T4-M07`, treating that as the canonical id. Any
  other scheme disagrees with the source of record across 160 rows.
- **Rejected:** `section-module-07` style (verbose, and still not what the document uses);
  a synthetic integer id (loses the human-meaningful track/module encoding the slug URLs
  expose).

## sort_order stays integer; the display label moves to module_meta
- **Decision:** `sort_order` is the integer ordinal position within the track; the label a
  reader sees (`07`, `08A`, `QM1`) lives in `module_meta.display_label`.
- **Rationale:** three consumers already depend on `sort_order` being a clean integer — the
  `UNIQUE (track_slug, sort_order)`, the essay-stub `module_id` subqueries, and track
  ordering. `08A`/`08B` occupy ordinals 8/9 uncoerced. Coercing `08A`→8 and `08B`→8 would
  collide on the UNIQUE and silently merge two modules.

## Heading levels: title is H1, body demotes by one
- **Decision:** on import, H1→H2 and H2→H3; the essay title is the page's only H1.
- **Rationale:** the editor's StarterKit allows only `heading: [2,3]`, and an
  unrepresentable node is dropped silently — the highest-risk content-loss path. Demotion
  keeps the full hierarchy inside the allowed range without touching the editor schema, and
  one-H1-per-document is correct anyway. Verified: zero headings dropped end to end.

## ANCHORS → References; Post-Flight → body; equations stay bold text
- **ANCHORS USED** is bibliographic metadata → the `References` component
  (`economist_fields.references`), which the app already renders.
- **Post-Flight** is authored prose with no metadata home → body content (demoted headings).
- **Display equations** are plain-text arithmetic (`x` as multiplier), not LaTeX → kept as
  bold paragraphs. A KaTeX math block would be a new node type needing the full four-place
  contract for no rendering gain on this content. Revisit if real LaTeX appears later.

## Cross-tree placement coherence via trigger, not CHECK
- **Decision:** a BEFORE INSERT/UPDATE trigger refuses an essay that carries a curriculum
  `module_id` but an editorial (non-finance) `category_id` or section cache.
- **Rationale:** the two taxonomy trees share one `essays` table with nothing keeping them
  coherent. A CHECK constraint cannot reference another table (the category's section is two
  joins away); a trigger can. The route `/admin/writer/:section/:slug` already asserts which
  tree an essay lives in, so the constraint just makes the DB agree with the URL. Verified
  live: an incoherent UPDATE was refused with ERRCODE 23514, fail-closed even when the
  category doesn't resolve.
- **Deliberately NOT enforced:** the denormalised `essays.section` cache going stale when a
  category changes — owned by the writing-experience workstream, not this trigger.

## Count reconciliation: seed to the module detail, not the overview
- **Decision:** seed 161 essay stubs (56 Fundamentals), not the overview table's 160.
- **Rationale:** the framework is internally inconsistent — its overview claims 55
  Fundamentals essays, its module-by-module lists sum to 56. The enumerated module lists are
  the authoritative side; the overview is a roll-up that undercounts by one. Reported as a
  finding rather than quietly matching either number.

## Local CORS relay for the browser import test (dev-only)
- **Decision:** run the editor import test through a local relay
  (`127.0.0.1:8787` → the real project via Node fetch) rather than mocking Supabase.
- **Rationale:** the in-container Chromium cannot complete TLS to `*.supabase.co` through
  the egress gateway (connection reset at the fingerprint layer), but Node fetch through
  `HTTPS_PROXY` can. The relay keeps the test hitting the REAL project — real RLS, triggers,
  storage, edge function — which a mock would not. The relay is dev-only and never part of
  the app or deployment; `.env` is restored to production values.

---

## 2026-08-01 — The key-takeaways publish gate

**Where it actually is:** `src/components/writer/WriterValidation.tsx:54-60`.

```ts
const filledTakeaways = keyTakeaways.filter(k => k.trim()).length;
if (filledTakeaways < 3) {
  errors.push({ field: 'keyTakeaways',
    message: `At least 3 key takeaways required (${filledTakeaways}/3)` });
}
```

Not in the deleted `src/lib/admin/publishValidation.ts` — that module was dead code imported
only by its own test and was removed with the persona system. `WriterValidation.validateEssay`
is the live gate: `WriterEditor` computes it into `validation.canPublish`, which disables the
Publish button.

### What it protects

Something real. `KeyTakeaways` renders as a standing block in the article shell, and the
Economist-style layout the site borrows treats it as part of the furniture rather than an
optional extra. Three is the point below which the block stops reading as a summary and starts
reading as a stray bullet — one takeaway is a sentence that belonged in the deck, two look like
an unfinished list. The rule is really "if you are going to show this block, fill it", and it
also functions as a forcing device: being made to state three claims before publishing is a
cheap editorial check on whether the piece has a thesis.

### What it costs

It blocked a finished 3,246-word essay in a previous session. `fa-07-01` only satisfies it
because three takeaways were authored into `economist_fields` by hand to get past the gate.
That is the tell: a rule that gets satisfied by hand-editing the database is not shaping the
writing, it is being routed around.

The deeper mismatch is that it is a **uniform** rule over a **non-uniform** corpus. The
curriculum is 161 lesson stubs. `lesson_type` currently reads `concept` on all 162 rows, but
the enum already anticipates `framework`, `case-study`, `exercise`, `model-walkthrough`. An
exercise or a model walkthrough has no natural "three key takeaways" — its takeaway is the
worked artefact. Forcing three onto it produces filler, and filler in a standing block is worse
than no block, because the reader learns to skip it.

### Recommendation — scope per `lesson_type`, do not relax globally

1. **Require 3 for the essay-shaped types** (`concept`, `framework`) — the pieces where the
   block earns its place and the forcing function is worth having.
2. **Advisory for the rest** (`case-study`, `exercise`, `model-walkthrough`) — surface it as a
   warning in `WriterValidation`, not an error, so it never blocks Publish.
3. **All-or-nothing within a type:** if takeaways are supplied at all, require the full three.
   One or two should stay an error under every `lesson_type`, because a half-filled standing
   block is the actual failure mode.

Relaxing globally throws away a rule that is doing real work on the essays. Making it purely
advisory has the same effect more slowly. Scoping keeps the pressure where it helps and lifts
it where it manufactures filler.

**Not implemented in this session** — recorded as a recommendation, per the mandate's
instruction not to silently delete it.

---

## 2026-08-01 — Topic and Phase are required but redundant for curriculum essays

### The finding, with counts from the live database

| column | populated | of 162 |
|---|---|---|
| `topic` | **0** | 162 |
| `phase` | 1 | 162 |
| `module_id` | 161 | 162 |
| `finance_order` | 161 | 162 |

`topic` is NULL on **every single essay**. `phase` is set on exactly one. Meanwhile
`module_id` is set on 161. The fields the author is asked to fill are empty; the field that
actually locates the essay is populated.

**The asterisk is already decorative.** `WriterMetadata.tsx:162` labels the control
`Topic/Phase *`, but `WriterValidation.validateEssay` never checks either field — it validates
title, category, deck, key takeaways, word count and figures. So the UI signals "required"
while nothing enforces it. That is worse than either honest option: it trains the author to
fill a field that does not matter and would not have been checked anyway.

### Why they are redundant

For a curriculum essay, placement already determines both. `module_id` → `finance_modules`
gives `track_slug` and the module, and the essay's position is `finance_order`. The editorial
`phase` is a parallel, weaker encoding of the same fact — which is exactly why the placement
coherence trigger exists to stop the two trees disagreeing. Asking for three fields where one
determines the others is an invitation for them to drift apart.

### Recommendation — derive, do not ask

1. **Make module the single placement input** for `section = 'finance'`. Choosing the module
   sets `finance_section` (from `finance_modules.track_slug`) and `phase` (from the track), the
   way `resolvePlacementFields` already does in the WriterStudio stack.
2. **Hide Topic/Phase for curriculum essays.** Show it read-only as *"Derived from module:
   Analytics · T4-M07"* so the author can see the consequence of their one choice without being
   able to contradict it.
3. **Keep it editable only where nothing derives it** — the editorial sections
   (`green-transition`, `development-finance`, `critical-thinking`) where `phase` is the real
   placement and there is no module.
4. **Drop the asterisk** wherever the field is not actually validated. Either enforce it or do
   not mark it required.

`topic` is a separate concern: it is used by the accounting consolidation route
(`/accounting/consolidation/:topic`) and by `useEssaysByTopic`, so it should stay in the schema
— but it has no business being a required field on a finance curriculum essay, where zero rows
use it.

**Not implemented in this session** — recorded as a proposal.

---

## 2026-08-01 (session 7) — Both Section-2 recommendations applied

**Key-takeaways gate, scoped per `lesson_type`** (was: recommendation of 2026-08-01, now
implemented in `WriterValidation.tsx`):
- `concept` / `framework` — and every editorial essay — still require three (error).
- `case-study` / `exercise` / `model-walkthrough` — zero takeaways is an advisory warning.
- One or two takeaways is an error under **every** type: a half-filled standing block is the
  real failure mode.
Observed live on real stubs: an `exercise` with 0 takeaways published; a `concept` with 0
takeaways had Publish disabled.

**Topic and Phase derived from placement** (was: proposal, now implemented in
`WriterEditor.tsx` + `WriterMetadata.tsx`):
- Choosing the module sets `finance_section` (= track), `phase` (track mapped to the finance
  phase vocabulary via `TRACK_TO_PHASE`) and `topic` (= module slug — the module *is* the
  topic).
- The Topic/Phase control is read-only for curriculum essays — *"Derived from module:
  Strategic Finance · T2-M01"* — and editable only where nothing derives it. The decorative
  asterisk is gone: the field was labelled required while `validateEssay` never checked it.
- `topic` is only ever written for module-placed finance essays, so accounting's use of the
  column (its consolidation pages key on it) cannot be clobbered from this editor.
