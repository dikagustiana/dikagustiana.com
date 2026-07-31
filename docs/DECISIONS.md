# DECISIONS

Design decisions taken during the full-site upgrade pass, with rationale and rejected
alternatives. Newest first.

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
