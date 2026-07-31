# Handoff prompt — dikagustiana.com Supabase rebuild, phase 2

Copy everything below the line into a fresh Claude Code session (any account, as long as it
can reach the repo, a Supabase account, and Vercel).

---

## Mandate

Finish the greenfield Supabase rebuild of **`github.com/dikagustiana/dikagustiana.com`**.

Phase 1 is done and already merged to `main`. It restored the application source, cut the
out-of-scope modules, archived the old migrations, and drafted the baseline schema and seed
SQL. **No database work has been applied** — the Supabase project does not exist yet.

Your job is phase 2: create the database, fix and apply the drafted SQL, wire the app to it,
and get the live site working. You own the decisions. Log each significant one in
`docs/DECISIONS.md` and keep `docs/SESSION_LOG.md` current (append-only, single next action at
the very top). Don't stop to ask for approval at each step; escalate only for something
irreversible that loses data, or spend beyond the free tier.

## The repository

- **Repo:** `https://github.com/dikagustiana/dikagustiana.com`
- **Work on `main`** unless the account's workflow requires a feature branch. Phase 1 was
  developed on `claude/dikagustiana-supabase-rebuild-ioiyd1` and merged; that branch can be
  deleted.
- **`archive/pre-rebuild-history`** — the 7-month git history of the app (Lovable scaffold
  2025-12-23 through the PR #34 merge 2026-07-26), recovered out of a tracked zip. This is
  where anything cut in phase 1 can be retrieved from. Do not delete this branch.
- Read these first, they are the state of the world:
  `docs/SESSION_LOG.md`, `docs/DECISIONS.md`, `docs/db/pending/README.md`.

Stack: Vite 5 + React 18 + TS 5.8, Tailwind 3 + shadcn/ui, React Router 6, TanStack Query 5,
TipTap 3, Recharts, Zod, DOMPurify, KaTeX, `@supabase/supabase-js` ^2.89. Deployed on Vercel.
Package manager is **npm** — `bun.lock`/`bun.lockb` were removed after verifying the
production bundle hash matched an `npm ci` + `vite build` exactly. Scripts: `npm run build`,
`npm run typecheck`, `npm run test:unit`, `npm run lint`.

## Hard rules

1. **All schema changes go through the `apply_migration` MCP tool.** Never `supabase db push`,
   `supabase db reset`, or any CLI migration command — no exceptions, including "just to test".
   Note that `docs/db/import.sql`'s own header recommends `db push`; ignore it.
2. **RLS enabled on every table, deny-by-default, no table without an explicit policy.**
3. Never print secrets into the chat — names only.
4. Do not touch the Supabase project `ascbthsgborseynmmthm` (`dikagustiana-prod`). That is a
   different application (a personal-OS app with an `os_*` schema) and it is live.
5. Don't delete `supabase/migrations/_archive/` — it is the record of why the schema looks the
   way it does, including two failures described below.

## What phase 1 established (do not redo this work)

- **`src/` was never in the repository.** 284 application files existed only inside a tracked
  `dika-s-digital-studio.zip`. They are now committed. Both zips are untracked and `*.zip` is
  gitignored.
- **The old Supabase project `rhwzvgklasvitocbbhvi` is deleted, not paused.** It cannot be
  restored or dumped. Across the entire archived git history it is the only Supabase ref that
  ever appears, so the two paused 2025 projects never hosted this site. There is no
  `legacy-dump.sql` and there never can be.
- **There is no published content anywhere in the repo.** The archived migrations contain 105
  essay *draft stubs* — title, slug, module, ordering, `published=false`, no body. All real
  prose lived only in the deleted database. Everything authored through the CMS is gone.
- **Scope was cut from ~40 tables to 14** and from 13 edge functions to 1. Cut: the
  personal-finance tracker, quant, remora, five placeholder admin pages, AdminHealth, and the
  dead `content_blocks` inline-editing surface. Reasoning is in `docs/DECISIONS.md`; recover
  from `archive/pre-rebuild-history` if any of it is wanted back.
- **The 14 kept tables:** `user_roles`, `profiles`, `sections`, `categories`, `essays`,
  `admin_audit_log`, `council_sessions`, `books_uploads`, `finance_sections`,
  `finance_modules`, `finance_models`, `finance_settings`, `fsli_pages`, `fsli_sections`.
  Kept storage buckets: `essay-images`, `books`, `finance-models` (the `embeds` bucket was cut).
  Kept enums: `app_role`, `voice_role_enum`, `content_status_enum`, `lesson_type_enum`,
  `model_depth`. Kept functions: `has_role`, `handle_new_user`, `update_updated_at_column`,
  `validate_essay_tone_fields`.
- **`docs/db/import.sql` is stale — do not use it as the baseline.** It concatenates only the
  first 38 of the repo's 43 migrations and omits the security hardening, `admin_audit_log`,
  `council_sessions`, and *both* P0 auth-gating repairs. `docs/DB_READINESS.md` is stale for
  the same reason (it still says "38 migrations").
- Verified green on merged main: `tsc --noEmit`, `vite build`, 138 unit tests.

## The two historical failures the baseline must not reintroduce

Both are documented in `supabase/migrations/_archive/README.md`. Understand them before you
apply anything.

1. `EXECUTE` on `public.has_role()` was revoked from `anon` and `authenticated` while dozens of
   RLS policies still called it. Postgres requires the **calling** role to hold EXECUTE on a
   function used in a policy expression — `SECURITY DEFINER` changes the body's privileges, not
   the caller's right to invoke. The public site went down with "permission denied for function
   has_role". The drafted baseline avoids this by **inlining** the role check into every policy:
   `EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND
   ur.role = 'admin')`. No policy depends on a function grant.
2. The `essays` SELECT policy was set to `USING (true)`, leaking every draft through PostgREST.
   The fix is split policies: the `anon` policy is `USING (published = true)` and references no
   function at all; a separate `authenticated` policy allows published rows OR admin.

## PENDING WORK — this is your task list

### 1. Unblock and create the Supabase project

`create_project` currently fails with
`BadRequestException: ... reached their maximum limits for the number of active free projects
... (2 project limit)`. The account holds three projects:

| ref | name | state | what it is |
|---|---|---|---|
| `ascbthsgborseynmmthm` | dikagustiana-prod | ACTIVE | **different app, do not touch** |
| `fqayxopcfxlkuftglqbl` | dikagustiana's Project | paused (Sep 2025) | never hosted this site |
| `llqehykfmbgjnbwbijfs` | dikagustiana-main | paused (Nov 2025) | never hosted this site |

The owner has **already approved deleting both paused 2025 projects**. The Supabase MCP exposes
no `delete_project` tool, so this must be done by the owner at
`https://supabase.com/dashboard`, or by you if your session has a tool that can. Paused
projects cannot be inspected or dumped first — deletion is blind and irreversible, which is why
it was approved explicitly.

Then create: **name `dikagustiana-com`, region `ap-southeast-1`** (Singapore, closest to
Jakarta), **org `rwgsxtztlyoiinhbbleh`**, free tier. Report the ref, region and tier.

### 2. Fix the drafted SQL, then apply it

`docs/db/pending/` holds four SQL files (2,476 lines) plus each author's notes and the full
adversarial review output. **It has never been executed.**

**Apply order is `01` → `03` → `02` → `04`, NOT filename order** — `essays.module_id` carries a
foreign key to `finance_modules`, so the finance tables must exist before the CMS tables.

```
01_foundation.sql   enums, has_role / handle_new_user / update_updated_at_column,
                    user_roles, profiles, 3 storage buckets + policies
03_finance.sql      finance_sections, finance_modules, finance_models,
                    finance_settings, fsli_pages, fsli_sections
02_cms.sql          sections, categories, essays, admin_audit_log,
                    council_sessions, books_uploads
04_seed.sql         data only, 194 rows
```

Four adversarial review lenses ran over each file (type-match against
`src/integrations/supabase/types.ts`, real `src/` query compatibility, an RLS attack pass, and
Postgres executability). **They found seven defects, two rated blocker.** Full detail with
suggested fixes is in `docs/db/pending/README.md`; the raw findings are in
`schema_verifier_defects.json` and `seed_verifier_defects.json`. Summary:

1. **BLOCKER — `essays.category_id` is `NOT NULL` with no `DEFAULT`.** The live schema had a
   column default. Dropping it flips the generated `essays.Insert.category_id` from optional to
   required and breaks at least three insert paths that structurally cannot supply one: the Next
   Big Thing admin "Add Essay", the legacy Writer Editor "Save Draft" on a new essay, and the
   repo's own `tests/live/adminGating.spec.ts`, which asserts that an admin insert of
   `{section, slug, title, published}` succeeds. Do **not** simply relax the constraint —
   `docs/DECISIONS.md` records that `NOT NULL` + FK `RESTRICT` is what guarantees no orphan
   essays. Either restore a default pointing at the `finance-general` category, or fix the
   insert paths.
2. **BLOCKER — the single published placeholder essay in `04_seed.sql` overclaims.** It tells
   visitors the curriculum "outline is intact" (the migration's own loss list contradicts that),
   attributes 49 modules to three tracks that hold 29, says the outline "is what you see below"
   when nothing renders below the body, and asserts a data-loss date the rebuild does not
   establish. Rewrite it to claim only what is true, or drop it and satisfy the anonymous-read
   acceptance check with an essay published through the admin UI instead. It exists only so that
   check has a subject — no migration anywhere contains a published essay.
3. `GRANT EXECUTE ON has_role() TO anon` turns `user_roles` into a public read oracle over
   PostgREST, defeating that table's only SELECT policy. Every policy already inlines the role
   check, so grant to `authenticated` only, or drop the grant.
4. The three `user_roles` write policies are non-functional — a targeted admin `UPDATE` or
   `DELETE` affects zero rows and still reports success, while the only working `DELETE` is the
   unqualified one. Re-derive them.
5. `04_seed.sql` seeds the `finance-general` category with a generated UUID instead of the
   archive's pinned `0f111111-1111-4111-8111-111111111111`, which breaks `supabase/seed.sql` and
   the `supabase db reset` path the live e2e suite depends on. Pin it.
6. All 105 essay `module_id` lookups are scalar subqueries on `(track_slug, sort_order)`; if a
   track ever holds two modules at the same `sort_order` the replay aborts. Add the unique
   constraint that makes the assumption true.
7. `admin_audit_log`'s append-only guarantee rests on a grant model that is a no-op on managed
   Supabase, so the "second, independent barrier" the file claims does not exist.

Also noted: the inline `EXISTS` subquery does not by itself deliver the initplan optimisation the
author's comments claim. Correctness is unaffected; the performance rationale is overstated.

After applying, move the files into `supabase/migrations/` under the
`YYYYMMDDHHMMSS_description.sql` convention (abandon the old Lovable UUID naming), then verify
`rls_enabled` is true for all 14 tables and run `get_advisors` for both `security` and
`performance`.

**What `04_seed.sql` reseeds** (194 rows, fully idempotent, every FK by subquery, no literal
UUIDs, no `auth.users` dependency): 8 `sections`, 24 `fsli_pages`, 4 `finance_sections`, 2
`finance_settings`, 49 `finance_modules`, 105 `essays` draft stubs, 1 `categories` row, 1
published placeholder essay. The interesting reconstruction: the three archived essay-seed
migrations hardcode `module_id` UUIDs for 29 modules that no migration ever creates (they
existed only in production), so a verbatim replay fails the FK — but the module titles are in
the SQL comments and the slug prefix encodes the mapping (`sf-07-03` = strategic-finance module
07, essay 03), making the whole curriculum outline deterministically recoverable. Of those 29
modules, 18 got their slug/title/thesis from the authored `20260218_002` seed; the other 11 have
a derived slug and a NULL thesis rather than an invented one. Keep it that way.

**Known permanent losses to state plainly, not paper over:** every published essay body, all
`content_json`/`layout_config` documents, the whole `essay_revisions` history, all
`fsli_sections` narrative, every `books_uploads` row, every `finance_models` row, every storage
object in all four buckets, `finance_modules.framing_content` for all 49 modules, the
`finance_sections` row with slug `finance-in-motion` (production-only — a migration UPDATEs it
but none inserts it, so `/finance/finance-in-motion` renders without its DB row until re-added),
and anything authored via the admin UI at any point.

### 3. Wire the app to the new project

- Regenerate `src/integrations/supabase/types.ts` from the new schema — **replace, do not
  merge**. It is marked auto-generated. The current file is the last known shape of the *old*
  live schema and is knowingly stale in two places.
- `supabase/config.toml` — `project_id` is currently the literal string `"PENDING"`. Set it to
  the new ref.
- Local `.env` — `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `.env.example` also
  lists `VITE_SUPABASE_PROJECT_ID`, which nothing in the code reads; leave or drop it.
  `src/integrations/supabase/client.ts` reads exactly the two vars above and nothing else.
- Bootstrap the owner's admin access and report exactly what you did so they can log in. The
  mechanism: admin is resolved client-side by a direct `user_roles` query in
  `src/contexts/AuthContext.tsx:23-36` (`.eq('user_id', uid).eq('role','admin').maybeSingle()`).
  The frontend never calls `supabase.rpc()`. The owner's email is **`dika.irawan@samb.co.id`**.
  Signup is plain email+password at `/auth`; no migration can seed a user, so the row in
  `user_roles` has to be inserted after the account exists.

### 4. Vercel

**This is a blocker you will likely hit.** `www.dikagustiana.com` is served by Vercel, but the
Vercel account reachable from the phase-1 session (`team_qkOkuTIM75I336YmxaGlDwWZ`,
"dikagirawan-4804's projects") has **zero projects** — the account that owns the deployment was
not reachable. Find the project by matching the `dikagustiana.com` domain rather than assuming
an id. If you cannot reach it either, the owner must set the two `VITE_SUPABASE_*` env vars by
hand and redeploy.

Important context: the **currently deployed bundle has no Supabase URL compiled into it at all**
(its hash matches an env-less local build), so the live site has been broken at boot
independently of the database deletion. Fixing the env vars is what makes it work again, and it
requires a rebuild — Vite inlines `import.meta.env` at build time.

### 5. Edge function

`council-review` is the only function left (the AI "Writing Council" for essay drafting, the
owner's most recent feature, from PR #34). Deploy it with **`verify_jwt = true`** — the platform
gate plus its own server-side admin re-check against `user_roles`
(`supabase/functions/council-review/index.ts:100-112`) are both deliberate. It needs the secret
**`LOVABLE_API_KEY`** (it calls `https://ai.gateway.lovable.dev`, default model
`google/gemini-2.5-flash`) plus the runtime-injected `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_ANON_KEY`. It never uses a service-role key — all its DB
access runs under the caller's JWT and RLS.

The Supabase MCP has **no tool for setting function secrets**, so `LOVABLE_API_KEY` must be set
by the owner in the dashboard. Without it, `/admin/council` loads and lists sessions but a
council run returns an error. Say so plainly rather than leaving it looking broken.

For context on why nothing else survived: in the old config all eight `quant-*` and `remora-*`
functions ran `verify_jwt = false` while each constructed a `SUPABASE_SERVICE_ROLE_KEY` client
internally, meaning any unauthenticated caller could drive RLS-bypassing writes. Nothing in this
project should ship with `verify_jwt = false`.

### 6. `docs/SCHEMA_PLAN.md` was never written

The mandate calls for it: tables, columns, keys, indexes, RLS posture, enums, functions
including `has_role`, triggers, storage buckets and their policies, and the role model, plus the
list of old objects deliberately not carried forward with reasons. The raw material is already
in `docs/db/pending/*.notes.json` (each author's column list, policy list, decisions, risks) —
write the document from the schema you actually applied, not from the drafts.

## Acceptance bar — not done until every one passes, each with evidence

- Anonymous read of a published essay succeeds.
- Anonymous read of a draft essay fails.
- Anonymous write to any table fails.
- Admin login works; admin create, update and delete round-trip and persist.
- A non-admin authenticated user is blocked from every admin route and every admin table write.
- `tsc --noEmit` passes.
- Production build succeeds, and the Vercel deployment serves the live domain.
- Every route in `src/App.tsx` either loads clean or no longer exists. No route left broken.
  There are 66 route declarations after the phase-1 cuts (was 77).
- Zero tables with RLS disabled. Supabase advisors clean, or each remaining notice explained.

Work in small commits with conventional messages. If something fails twice, change approach
rather than retrying a third time the same way. Report decisions taken and what happened, not
proposals and previews.
