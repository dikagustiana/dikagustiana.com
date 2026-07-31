# Baseline authoring + review record

> **The SQL that used to live here has been fixed and moved.** This directory is now
> the *record* of how it was written and reviewed, not pending work.

## Where the SQL is now

`supabase/migrations/`, renamed so that **plain filename order is dependency order**:

| was | is now |
|---|---|
| `01_foundation.sql` | `20260731010000_baseline_foundation.sql` |
| `03_finance.sql` | `20260731020000_baseline_finance.sql` |
| `02_cms.sql` | `20260731030000_baseline_cms.sql` |
| `04_seed.sql` | `20260731040000_seed_surviving_content.sql` |

The old numbering was authoring order, and applying in it fails: `essays.module_id`
carries a foreign key to `finance_modules`, so finance must precede CMS. That made the
real order `01 → 03 → 02 → 04`, which no tool infers and which `supabase db reset` would
have got wrong. The rename encodes it, and applying `supabase/migrations/*.sql` in sorted
order is now verified to work with no special knowledge.

## What is still here

- `*.notes.json` — each author's column list, policy list, decisions and self-reported
  risks. Raw material; `docs/SCHEMA_PLAN.md` supersedes it and was written from the
  applied schema rather than from these.
- `schema_verifier_defects.json`, `seed_verifier_defects.json` — the full output of the
  four adversarial review lenses. Kept as the record of what was found and why the fixes
  look the way they do.

## The seven reviewed defects — all fixed

Fixed in commit `aa29c03`, then verified by applying the whole baseline to a local
Postgres 16 and running the acceptance bar against real RLS (`docs/db/verify/`).

| # | defect | resolution |
|---|---|---|
| 1 | **BLOCKER** `essays.category_id` NOT NULL with no DEFAULT | restored the DEFAULT the live schema had, pinned to `finance-general`; keeps NOT NULL + FK RESTRICT and the no-orphan guarantee while unbreaking four insert paths |
| 2 | **BLOCKER** the published placeholder essay overclaimed | rewritten; every number re-checked against the seed data |
| 3 | `has_role()` granted to `anon` = public admin oracle | granted to `authenticated` + `service_role` only |
| 4 | the three `user_roles` write policies were non-functional | re-derived: INSERT kept and verified working, UPDATE/DELETE removed rather than shipped as silent no-ops |
| 5 | `finance-general` seeded with a generated UUID | pinned to the archive's `0f111111-…`, asserted in the seed's own check block |
| 6 | module `sort_order` assumed unique per track | `UNIQUE (track_slug, sort_order)` added |
| 7 | `admin_audit_log` append-only rested on a no-op grant model | every table now REVOKEs before granting, making the privilege layer real |

Also acted on: the review noted the inline `EXISTS` does not by itself deliver the
initplan optimisation the author's comments claimed. Correctness was unaffected, so the
SQL is unchanged; `docs/SCHEMA_PLAN.md` §1 states the honest version rather than
repeating the overstatement.

### The eighth defect, found by running it

`REVOKE EXECUTE ON FUNCTION public.has_role(...) FROM PUBLIC` — the obvious fix for
defect 3 — **does not work on Supabase**, and reading the SQL could not reveal it.
`CREATE FUNCTION` grants EXECUTE to `PUBLIC`, but `ALTER DEFAULT PRIVILEGES` additionally
grants it to `anon` *by name*; revoking one leaves the other, and `SET ROLE anon; SELECT
public.has_role(<uuid>,'admin')` still returned `true`. The fix is `FROM PUBLIC, anon`.

This is the same trap as defect 7, one layer over, and it is the general rule for this
platform: **a privilege is never absent by default, only ever explicitly taken away.**

## Applying

All schema changes go through the `apply_migration` MCP tool. Never `supabase db push`,
`supabase db reset`, or any CLI migration command. (`docs/db/import.sql`'s own header
recommends `db push`; ignore it — that file is also stale, see `docs/DECISIONS.md`.)

The local dry-run in `docs/db/verify/` is plain `psql` against a throwaway cluster and is
not covered by that rule; it touches no Supabase project.
