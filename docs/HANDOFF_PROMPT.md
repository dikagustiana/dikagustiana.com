# Handoff prompt — dikagustiana.com Supabase rebuild, phase 3

Copy everything below the line into a fresh Claude Code session (any account, as long as it
can reach the repo, a Supabase account, and Vercel).

The phase-2 version of this file is at commit `8caa555` if you ever need it; everything in it
that still matters has been folded in below.

---

## Mandate

Finish the greenfield Supabase rebuild of **`github.com/dikagustiana/dikagustiana.com`**.

Phases 1 and 2 are done and merged to `main` (phase 2 = PR #2, merge commit `66a7dfc`).
Phase 1 restored the application source, cut the out-of-scope modules, archived the old
migrations, and drafted the baseline schema and seed SQL. Phase 2 fixed every known defect in
that SQL, proved it works by executing it against a local Postgres, and wrote the schema
documentation.

**No database work has been applied. The Supabase project still does not exist.** That is not
an oversight — it is blocked on an owner action described below, and it has been blocked
across two sessions.

Your job is phase 3: create the database, apply the (already verified) SQL, wire the app to
it, and get the live site working. You own the decisions. Log each significant one in
`docs/DECISIONS.md` and keep `docs/SESSION_LOG.md` current (append-only, single next action at
the very top). Don't stop to ask for approval at each step; escalate only for something
irreversible that loses data, or spend beyond the free tier.

## Read these first, in this order

1. **`docs/RUNBOOK.md`** — the mechanical 8-step sequence for everything that remains,
   written at the end of phase 2. If you read nothing else, read this.
2. `docs/SCHEMA_PLAN.md` — what the schema is and why. Written from the applied schema, not
   from the drafts, so it is authoritative wherever anything else disagrees.
3. `docs/SESSION_LOG.md` — state of the world, newest first.
4. `docs/DECISIONS.md` — the judgement calls and their rejected alternatives.

## The repository

- **Repo:** `https://github.com/dikagustiana/dikagustiana.com`
- **Work on `main`** unless the account's workflow requires a feature branch. The phase-1 and
  phase-2 branches (`claude/dikagustiana-supabase-rebuild-ioiyd1`,
  `claude/dikagustiana-supabase-phase-2-w564rz`) are merged and can be deleted.
- **`archive/pre-rebuild-history`** — the 7-month git history of the app (Lovable scaffold
  2025-12-23 through the PR #34 merge 2026-07-26), recovered out of a tracked zip. Anything
  cut in phase 1 can be retrieved from here. **Do not delete this branch.**

Stack: Vite 5 + React 18 + TS 5.8, Tailwind 3 + shadcn/ui, React Router 6, TanStack Query 5,
TipTap 3, Recharts, Zod, DOMPurify, KaTeX, `@supabase/supabase-js` ^2.89. Deployed on Vercel.
Package manager is **npm**. Scripts: `npm run build`, `npm run typecheck`, `npm run test:unit`,
`npm run lint`.

## Hard rules

1. **All schema changes go through the `apply_migration` MCP tool.** Never `supabase db push`,
   `supabase db reset`, or any CLI migration command — no exceptions, including "just to
   test". (`docs/db/import.sql`'s own header recommends `db push`; ignore it — that file is
   also stale and is not the baseline.)
   The local dry-run in `docs/db/verify/` is plain `psql` against a throwaway cluster and is
   **not** covered by this rule. Use it freely; it touches no Supabase project.
2. **RLS enabled on every table, deny-by-default, no table without an explicit policy.**
3. **Revoke before you grant.** See failure 3 below — this is the rule most likely to be
   undone by a well-meaning edit.
4. Never print secrets into the chat — names only.
5. **Do not touch the Supabase project `ascbthsgborseynmmthm` (`dikagustiana-prod`).** That is
   a different application (a personal-OS app with an `os_*` schema) and it is live.
6. Don't delete `supabase/migrations/_archive/` — it is the record of why the schema looks the
   way it does, including the failures below.

---

## THE BLOCKER — check this first, every session

`create_project` fails with:

> `BadRequestException: The following organization members have reached their maximum limits
> for the number of active free projects … dikagustiana (2 project limit)`

The account holds three projects and **the limit counts paused ones**:

| ref | name | state | what it is |
|---|---|---|---|
| `ascbthsgborseynmmthm` | dikagustiana-prod | ACTIVE | **different app — do not touch** |
| `fqayxopcfxlkuftglqbl` | dikagustiana's Project | paused, Sep 2025 | never hosted this site |
| `llqehykfmbgjnbwbijfs` | dikagustiana-main | paused, Nov 2025 | never hosted this site |

**The owner has already approved deleting both paused 2025 projects.** The Supabase MCP
exposes no `delete_project` tool, so it must be done by the owner at
<https://supabase.com/dashboard>, or by you if your session has a tool that can.

Evidence they are safe to delete: across the entire archived git history, the only Supabase
ref ever appearing in `supabase/config.toml`, `client.ts`, or any file is
`rhwzvgklasvitocbbhvi` — the deleted project. Neither paused project ever hosted this site.
Paused projects cannot be inspected or dumped first, so the deletion is blind and
irreversible, which is why it was approved explicitly rather than assumed.

Two sessions have now ended here. If it is still blocked, **say so plainly and early** rather
than burning the session rediscovering it — then do whatever genuinely useful work remains
that does not depend on it, and stop.

---

## What phases 1 and 2 established (do not redo this work)

### From phase 1

- **`src/` was never in the repository.** 284 application files existed only inside a tracked
  `dika-s-digital-studio.zip`. They are now committed. `*.zip` is gitignored.
- **The old Supabase project `rhwzvgklasvitocbbhvi` is deleted, not paused.** It cannot be
  restored or dumped. There is no `legacy-dump.sql` and there never can be.
- **There is no published content anywhere in the repo.** The archived migrations contain 105
  essay *draft stubs* — title, slug, module, ordering, `published=false`, no body. All real
  prose lived only in the deleted database.
- **Scope was cut from ~40 tables to 14** and from 13 edge functions to 1. Cut: the
  personal-finance tracker, quant, remora, five placeholder admin pages, AdminHealth, and the
  dead `content_blocks` inline-editing surface.
- **`docs/db/import.sql` and `docs/DB_READINESS.md` are stale.** import.sql concatenates only
  the first 38 of 43 migrations and omits the security hardening, `admin_audit_log`,
  `council_sessions`, and both P0 auth-gating repairs. Neither is the baseline.

### From phase 2

- **The baseline SQL is fixed, executed, and lives in `supabase/migrations/`:**

  ```
  20260731010000_baseline_foundation.sql
  20260731020000_baseline_finance.sql
  20260731030000_baseline_cms.sql
  20260731040000_seed_surviving_content.sql
  ```

  Renamed from `01/02/03/04` because that was *authoring* order and contradicted dependency
  order (`essays.module_id` has an FK to `finance_modules`, so finance must precede CMS).
  **Filename order is now dependency order** — apply them sorted, no special knowledge needed.
  Not cosmetic: `supabase db reset`, which the live e2e suite depends on, applies files in
  sorted order and would have failed.

- **All seven reviewed defects are fixed**, including both blockers: `essays.category_id` got
  back the column DEFAULT the live schema had (pinned to the `finance-general` category),
  which keeps NOT NULL + FK RESTRICT while unbreaking four insert paths that structurally
  cannot supply a category; and the published placeholder essay was rewritten to drop four
  false claims. Details in `docs/db/pending/README.md`.

- **`docs/SCHEMA_PLAN.md` is written**, by introspecting the applied schema rather than
  restating the drafts.

- **Verified locally against real RLS** (re-runnable in ~10s via `docs/db/verify/`): anon reads
  the 1 published essay and 0 of 105 drafts and holds no write privilege on any of the 14
  tables; admin create/update/delete round-trips; non-admin blocked everywhere; audit log
  append-only on both layers; self-grant blocked; 14/14 tables with RLS, none policy-less;
  194 rows seeded.

- **Green:** `tsc --noEmit`, `vite build`, **163 unit tests** (17/17 files), 66 route
  declarations in `src/App.tsx` with every element resolving.

## The three historical failures the schema must not reintroduce

The first two are documented in `supabase/migrations/_archive/README.md`. The third was found
in phase 2.

1. **`has_role()` EXECUTE was revoked while RLS policies called it.** Postgres checks EXECUTE
   against the **calling** role for a function used in a policy expression — `SECURITY
   DEFINER` changes the body's privileges, not the caller's right to invoke. The public site
   went down with "permission denied for function has_role". The baseline avoids this by
   **inlining** the role check into every policy:
   `EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin')`.
   Only one policy still calls `has_role()` — `user_roles`' own INSERT policy, where inlining
   would recurse.

2. **The `essays` SELECT policy was set to `USING (true)`,** leaking every draft through
   PostgREST. The fix is split policies: the `anon` policy is `USING (published = true)` and
   references no function and no other table at all.

3. **A privilege on managed Supabase is never absent by default, only ever explicitly taken
   away.** The platform ships `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON
   TABLES/FUNCTIONS TO postgres, anon, authenticated, service_role`. Every new table and
   function is *born* with ALL granted to `anon` and `authenticated`, and `GRANT` is additive
   — it cannot subtract. Consequences:
   - `admin_audit_log`'s "append-only" rested on a grant list and was a no-op; the table was
     UPDATE-able and DELETE-able at the privilege layer despite the deliberately absent
     policies. (Reviewed defect 7.)
   - `REVOKE EXECUTE ON FUNCTION has_role FROM PUBLIC` — the natural fix for "has_role is a
     public admin oracle" — leaves `anon`'s *named* grant intact. `SET ROLE anon; SELECT
     public.has_role(<uuid>,'admin')` still returned `true`. It needs `FROM PUBLIC, anon`.
     **Four adversarial review lenses reading the SQL all missed this; executing it caught it
     in one query.**

   Every table and the one policy-callable function now REVOKEs before granting. **If you add
   a table, copy the revoke, not just the grant.**

## PENDING WORK

`docs/RUNBOOK.md` has the full detail. Summary:

### Owner actions (you cannot do these)

1. **Delete the two paused Supabase projects** — see THE BLOCKER above. Gates everything.
2. **Vercel.** `www.dikagustiana.com` is served by Vercel, but the only reachable account
   (`team_qkOkuTIM75I336YmxaGlDwWZ`, "dikagirawan-4804's projects") has **zero projects** —
   re-confirmed twice. Find the project by matching the `dikagustiana.com` domain rather than
   assuming an id. If you cannot reach it either, the owner must set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` by hand **and redeploy** — Vite inlines `import.meta.env`
   at build time, so setting them without a rebuild changes nothing.
   Important: the **currently deployed bundle has no Supabase URL compiled into it at all**
   (its hash matches an env-less local build), so the live site has been broken at boot
   independently of the database deletion. Fixing the env vars plus a rebuild is what makes it
   work again.
3. **Set `LOVABLE_API_KEY`** in the new project's edge-function secrets. The MCP has no
   secret-setting tool. Without it, `/admin/council` loads and lists sessions but a council
   run returns an error. Say so plainly rather than leaving it looking broken.

### Then, your work

1. **Create the project:** name `dikagustiana-com`, region `ap-southeast-1` (Singapore,
   closest to Jakarta), org `rwgsxtztlyoiinhbbleh`, free tier. Report ref, region, tier.
2. **Apply** the four migrations with `apply_migration`, in filename order, using the filename
   stem as the migration name so remote history matches the repo.
3. **Verify:** `list_tables` → `rls_enabled` true on all 14; `get_advisors` for both
   `security` and `performance` → clean, or each remaining notice explained.
4. **Regenerate `src/integrations/supabase/types.ts`** — replace, do not merge. Phase 2 could
   not do this offline (the CLI's `gen types` needs Docker) but determined the diff
   statically, so it should be a clean swap: 25 cut table types disappear (**verified: no cut
   table is queried anywhere** in `src/` or `tests/`); `essays.fundamental_id` disappears
   (**verified: it appears only inside `types.ts` itself**); nothing new appears. Re-run
   `npm run typecheck`.
5. **Wire:** `supabase/config.toml` `project_id` is the literal string `"PENDING"` — set it to
   the new ref. Create `.env` with the two `VITE_SUPABASE_*` vars.
   `src/integrations/supabase/client.ts` reads exactly those two and nothing else.
6. **Bootstrap admin.** Order matters — no migration can seed a user. The owner signs up at
   `/auth` with **`dika.irawan@samb.co.id`** (plain email+password), *then* you run via
   `execute_sql`:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin' FROM auth.users WHERE email = 'dika.irawan@samb.co.id'
   ON CONFLICT (user_id, role) DO NOTHING;
   ```
   This cannot be done client-side by design: granting admin requires being admin, and
   `user_roles_no_self_grant_insert` blocks self-grants. Report exactly what you did so the
   owner can log in.
7. **Deploy `council-review`** with **`verify_jwt = true`**. Files: `index.ts`, `personas.ts`,
   `pipeline.ts`. The platform gate plus its own server-side admin re-check against
   `user_roles` (`index.ts:100-112`) are both deliberate. It never uses a service-role key —
   all its DB access runs under the caller's JWT and RLS. Nothing in this project ships with
   `verify_jwt = false`: the eight cut `quant-*` / `remora-*` functions did, while each built
   a `SUPABASE_SERVICE_ROLE_KEY` client internally, meaning any unauthenticated caller could
   drive RLS-bypassing writes.
8. **Run the acceptance bar** (below) against the real project.

## Known permanent losses — state plainly, do not paper over

Every published essay body; all `content_json`/`layout_config` documents; the whole
`essay_revisions` history; all `fsli_sections` narrative; every `books_uploads` row; every
`finance_models` row; every storage object in all four buckets;
`finance_modules.framing_content` for all 49 modules and `thesis` for 11 of them; the
`finance_sections` row with slug `finance-in-motion` (production-only — a migration UPDATEs it
but none inserts it, so `/finance/finance-in-motion` renders without its DB row until
re-added); and anything authored via the admin UI at any point.

What survived is what lived in migration files: 8 sections, 1 category, 24 `fsli_pages`, 4
`finance_sections`, 2 `finance_settings`, 49 `finance_modules`, 105 essay draft stubs, plus 1
published placeholder essay written for the rebuild. 194 rows.

## Acceptance bar — not done until every one passes, each with evidence

Items marked **[local ✓]** already pass against the dry-run database. Re-run them against the
real project rather than assuming they carry over.

- **[local ✓]** Anonymous read of a published essay succeeds.
- **[local ✓]** Anonymous read of a draft essay fails.
- **[local ✓]** Anonymous write to any table fails.
- **[local ✓ except login]** Admin login works; admin create, update and delete round-trip and
  persist. The round-trip is verified; login needs step 6.
- **[local ✓]** A non-admin authenticated user is blocked from every admin route and every
  admin table write.
- **[✓]** `tsc --noEmit` passes.
- **[✓ build only]** Production build succeeds, **and** the Vercel deployment serves the live
  domain — the second half is blocked on owner action 2.
- **[✓]** Every route in `src/App.tsx` either loads clean or no longer exists. 66 route
  declarations, all elements resolving.
- **[local ✓]** Zero tables with RLS disabled. Supabase advisors clean, or each remaining
  notice explained — advisors need the real project.

Work in small commits with conventional messages. If something fails twice, change approach
rather than retrying a third time the same way. Report decisions taken and what happened, not
proposals and previews.
