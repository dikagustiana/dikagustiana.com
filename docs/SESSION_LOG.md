# SESSION LOG — Supabase greenfield rebuild

Append-only. Newest entry first. A fresh session must be able to resume from this file.

## STATUS (session 2, 2026-07-31): everything not requiring the project is DONE.
The baseline SQL is fixed, verified by execution, and moved to `supabase/migrations/`.
`docs/SCHEMA_PLAN.md` is written. Still nothing applied to Supabase — no project exists.

## NEXT ACTION
**BLOCKED on the owner, three independent actions. Full detail in `docs/RUNBOOK.md`.**

1. **Delete the two paused 2025 Supabase projects** (`fqayxopcfxlkuftglqbl`,
   `llqehykfmbgjnbwbijfs`) at https://supabase.com/dashboard. Re-confirmed this session:
   `create_project` still returns `BadRequestException: 2 project limit`, and the limit
   counts paused projects. The MCP has no `delete_project` tool. **This blocks everything.**
2. **Vercel** — re-confirmed zero projects in the only reachable team
   (`team_qkOkuTIM75I336YmxaGlDwWZ`). Connect the owning account, or set
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` by hand **and redeploy** (Vite
   inlines env at build time).
3. **Set `LOVABLE_API_KEY`** in the new project's edge-function secrets. No MCP tool for it.

The moment slot 1 frees, `docs/RUNBOOK.md` is a mechanical 8-step sequence.

## 2026-07-31 (session 2)

- **Fixed all 7 reviewed defects** in the drafted SQL (commit `aa29c03`), including both
  blockers: `essays.category_id` got back the DEFAULT the live schema had (pinned to
  `finance-general`), which unbreaks four insert paths while keeping NOT NULL + FK
  RESTRICT; and the published placeholder essay was rewritten to drop four false claims.
- **Built a local dry-run harness** (`docs/db/verify/`) — a throwaway Postgres 16 with the
  Supabase role/schema/default-privilege shape replayed, so the baseline could be executed
  and attacked before touching a real project. Plain `psql`, not a CLI migration command.
- **Running it found an 8th defect that four reading-based review lenses had missed:**
  `REVOKE EXECUTE ... FROM PUBLIC` does not remove `anon`'s EXECUTE on `has_role()`,
  because `ALTER DEFAULT PRIVILEGES` grants it to `anon` *by name* as well. The fix for
  defect 3 was incomplete until it revoked `FROM PUBLIC, anon`. General rule for this
  platform: **a privilege is never absent by default, only ever explicitly taken away.**
  The same trap is what made defect 7 (`admin_audit_log` append-only) real rather than
  claimed — every table now REVOKEs before granting.
- **Defect 4 re-derived rather than patched.** The three `user_roles` write policies were
  worse than non-functional: a targeted admin UPDATE/DELETE matched zero rows and
  *reported success*, and the only DELETE that worked was the unqualified one — which,
  because the visible row set is the caller's own rows, deleted **the admin's own role**.
  UPDATE/DELETE removed; INSERT kept and verified working for granting another user.
- **Verified against real RLS locally:** anon reads the 1 published essay and 0 of 105
  drafts, and holds no write privilege on any of the 14 tables; admin create/update/delete
  round-trips; non-admin blocked everywhere; audit log append-only on both layers;
  self-grant blocked; `(track_slug, sort_order)` uniqueness enforced.
- **Moved the baseline to `supabase/migrations/`** with timestamps that encode dependency
  order (commit `5810bc0`). The old `01/02/03/04` numbering was authoring order and
  contradicted the real order (`01 → 03 → 02 → 04`, because `essays.module_id` has an FK
  to `finance_modules`) — `supabase db reset`, which the live e2e suite depends on, would
  have applied them wrongly. Plain sorted order now works and is verified.
- **Wrote `docs/SCHEMA_PLAN.md`** (commit `587a057`) by introspecting the applied schema
  rather than restating the drafts: 14 tables, 151 columns, 5 enums, 4 functions, 12
  triggers, 3 buckets, the role model, FK actions with reasons, everything cut with
  reasons, and the permanent losses. It corrects the drafts in two places — the initplan
  performance rationale was overstated, and the privilege-layer claims were untrue until
  the REVOKEs were added.
- **Fixed a test that phase 1 left broken** (commit `8b696d9`). `tests/unit/council.test.ts`
  failed to load at all — it read a migration path phase 1 had archived — so the suite
  reported "138 passed" while a whole file silently never ran. It also asserted the
  `has_role()` spelling the rebuild deliberately replaced with an inlined check. Now
  17/17 files, **163 tests**.
- **Type regeneration could not be done offline** (the CLI's `gen types` needs Docker),
  but the diff was determined statically and is a clean swap: 25 cut table types
  disappear and **no cut table is queried anywhere**; `essays.fundamental_id` disappears
  and it appears **only inside `types.ts` itself**; nothing new appears.
- **Verified green:** `tsc --noEmit` ✓, `vite build` ✓, 163 unit tests ✓, 66 route
  declarations in `src/App.tsx` with every element resolving.

## 2026-07-31 (session 1) — status at the time: stopped by the owner on credit cost
No Supabase project was ever created, so no migration ran and the live site is unchanged
(still broken at boot — its deployed bundle has no Supabase URL compiled in). All work is
committed and pushed to `claude/dikagustiana-supabase-rebuild-ioiyd1`. Resume from this file.

### Session 1's next action (superseded by session 2's, above — kept for the record)
**BLOCKED on the owner, one action:** delete the two paused 2025 Supabase projects
(`fqayxopcfxlkuftglqbl`, `llqehykfmbgjnbwbijfs`) at https://supabase.com/dashboard. The
owner approved this but the Supabase MCP exposes no `delete_project` tool, so it cannot be
done from a session. Until a free-project slot exists, `create_project` returns
`BadRequestException: 2 project limit` and NOTHING can be applied.
The moment a slot frees: `create_project(name=dikagustiana-com, region=ap-southeast-1,
org=rwgsxtztlyoiinhbbleh)` → `apply_migration` baseline → `apply_migration` seed →
regenerate types → rewire env → deploy council-review → bootstrap admin → acceptance run.
Baseline SQL and seed SQL are authored and committed under `supabase/migrations/`, so the
apply step is mechanical.

**Second owner action (independent):** the Vercel account connected to this session
(`team_qkOkuTIM75I336YmxaGlDwWZ`) has zero projects, but www.dikagustiana.com is served by
Vercel — the owning account is not reachable from here. Either connect that account, or the
new env vars must be set there by hand (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`). Note the currently-deployed bundle has NO Supabase URL
compiled in at all, so the live site is already broken at boot regardless of the DB.

**Third owner action:** set `LOVABLE_API_KEY` on the new project's edge function secrets.
The MCP has no secret-setting tool. Without it the Writing Council route loads and lists
sessions but a council run returns an error.

**Before applying anything:** `docs/db/pending/README.md` lists 7 defects the adversarial
review found in the drafted SQL — two rated blocker. The `essays.category_id NOT NULL`
change breaks three insert paths and the repo's own RLS test, and the published placeholder
essay overclaims what survived. Fix those first; the SQL has never been executed.

## 2026-07-31 (session 1)

- Branch: `claude/dikagustiana-supabase-rebuild-ioiyd1` (all work lands here; PR → main at end).
- **Restored `src/`** (284 files), `tests/`, 3 public files from `dika-s-digital-studio.zip`;
  all root configs were byte-identical between zip and repo. Commit `1942784`, pushed.
  `tsc --noEmit` ✓, `vite build` ✓.
- **Salvage settled:** old project `rhwzvgklasvitocbbhvi` is deleted from the account
  (not paused). Entire archived git history references only that ref → the two paused 2025
  projects never hosted the site; content authored via CMS after 2026-07-04 is lost.
  No `legacy-dump.sql` possible. Production bundle currently deployed has NO Supabase URL
  baked in (identical hash to an env-less local build) — live site already broken at boot.
- **Vercel:** connected Vercel account/team (`team_qkOkuTIM75I336YmxaGlDwWZ`) has ZERO
  projects — the deployment serving www.dikagustiana.com lives under a different Vercel
  account. Rewiring existing env vars is impossible from here; a fresh deploy +
  domain move will be needed, or the user connects the owning account.
- **Supabase account:** 3 projects; `dikagustiana-prod` (`ascbthsgborseynmmthm`) is the
  user's OTHER app (personal-OS schema, active, touched today) — never touch it.
  Creation of `dikagustiana-com` blocked by 2-active-free-project limit; user approved
  deleting both paused 2025 projects; MCP lacks delete_project → user must do it in
  dashboard; creation being retried automatically.
- **Housekeeping commit `5688d9d`:** zips untracked (`*.zip` ignored), bun lockfiles
  removed (npm proven by bundle-hash match), `typecheck` script added.
- **History:** zip's embedded git history pushed to `archive/pre-rebuild-history`.
- **Analysis workflow** `wf_c3524677-f2d`: 8 parallel agents (route map, CMS core, finance
  curriculum, PF tracker, quant+remora, content inventory, import.sql audit, auth/storage/ops).
  Findings that changed the plan:
  - `docs/db/import.sql` is **STALE** — it concatenates only the first 38 of 43 migrations
    (last header `20260310000954`) and omits exactly the five that matter most: the security
    hardening, `admin_audit_log`, `council_sessions`, and BOTH P0 auth-gating repairs. Using
    it as the baseline would have reintroduced both historical failures and shipped without
    two tables the app queries. `docs/DB_READINESS.md` still says "38 migrations", confirming
    both docs predate the last five migrations. Baseline authored from scratch instead.
  - There are **43** migration files, not 44.
  - **No published content exists anywhere in the repo.** The migrations hold 105 essay
    *draft stubs* (title + slug + module + order, no body, `published=false`) — not "~18
    essays". The 68 fundamentals lesson stubs were deleted by `20260301070510`. All real
    prose lived only in the deleted DB.
  - The 105 stubs hardcode `module_id` UUIDs that **no migration creates** (production-only
    modules), so a verbatim replay FK-fails. Recoverable: module titles are in SQL comments
    and the slug prefix encodes the mapping (`sf-07-03` = strategic-finance module 07).
  - Frontend never calls `supabase.rpc()`; admin is resolved by a direct `user_roles` select
    in `AuthContext.tsx:23-36`.
- **Scope cut** (commit `9268fdb`): personal-finance tracker, quant, remora, 5 placeholder
  admin pages, AdminHealth, and dead `content_blocks` inline editing. 40 tables → 14;
  13 edge functions → 1 (`council-review`). Full reasoning in `docs/DECISIONS.md`.
  `tsc --noEmit` ✓, `vite build` ✓, 162 unit tests ✓ after the cuts.
- **43 old migrations archived** to `supabase/migrations/_archive/` with a README recording
  the two auth-gating failures. `supabase/config.toml` rewritten for the one function.
- **Schema workflow** `wf_69d7acb7-80a`: 3 authoring agents (foundation / cms / finance) +
  4 adversarial lenses each (types-match, src-queries, rls-attack, postgres-valid).
- **Seed workflow** `wf_c2879cfb-282` (complete): reconstructs 8 sections, 24 fsli_pages, 4
  finance_sections, 2 finance_settings, **49 finance_modules**, **105 essay stubs** (module_id
  resolved by subquery on track_slug+sort_order, never a literal UUID), 1 category, and 1
  published placeholder essay so the anon-read acceptance check has a subject. 194 rows.
  The 29 non-fundamentals modules were reconstructed from the `-- Module NN:` comments in the
  three essay-seed migrations, with slug/title/thesis taken from `20260218_002` for the 18
  that had an authored match; the other 11 get a derived slug and a NULL thesis rather than an
  invented one.
- **All drafted SQL is in `docs/db/pending/`** (2,476 lines across 4 files) with each author's
  notes and the full verifier output. Apply order is 01 → 03 → 02 → 04, NOT filename order:
  `essays.module_id` has a FK to `finance_modules`.
- **The drafted SQL is NOT clean.** The schema workflow was stopped mid-verification (9 of 12
  lenses had reported); those 9 plus all 4 seed lenses found 7 blocker/major defects, listed
  with fixes in `docs/db/pending/README.md`. Do not apply before fixing them.

### What is verified working
`tsc --noEmit` ✓ · `vite build` ✓ · 162 unit tests ✓ — all after the module cuts, on a clean
`npm ci`. Every route in `src/App.tsx` either survives or was removed with its page,
components, nav entries, tests and edge functions; 66 route declarations remain of 77.

### What was never reached
Baseline apply · seed apply · RLS verification · types regeneration · env rewiring · edge
function deploy · admin bootstrap · Vercel deploy · the acceptance checklist. `docs/SCHEMA_PLAN.md`
was not written — `docs/db/pending/*.notes.json` holds the same material in raw form.
