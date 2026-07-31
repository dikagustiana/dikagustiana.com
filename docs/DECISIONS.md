# DECISIONS

Design decisions taken during the full-site upgrade pass, with rationale and rejected
alternatives. Newest first.

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
