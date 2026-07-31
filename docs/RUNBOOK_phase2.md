# Phase 2 runbook — everything left, in order

Phase 2 did all the work that does not require the Supabase project to exist. What
remains is blocked on three owner actions that no session can perform. This file is the
exact sequence to run once each unblocks, so the remaining work is mechanical.

---

## Owner action 1 — free a Supabase project slot (BLOCKS EVERYTHING)

`create_project` returns:

> `BadRequestException: The following organization members have reached their maximum
> limits for the number of active free projects … dikagustiana (2 project limit)`

The account holds three projects and the limit counts paused ones:

| ref | name | state | what it is |
|---|---|---|---|
| `ascbthsgborseynmmthm` | dikagustiana-prod | ACTIVE | **a different application — do not touch** |
| `fqayxopcfxlkuftglqbl` | dikagustiana's Project | paused, Sep 2025 | never hosted this site |
| `llqehykfmbgjnbwbijfs` | dikagustiana-main | paused, Nov 2025 | never hosted this site |

Delete **both paused 2025 projects** at <https://supabase.com/dashboard>. The owner has
already approved this. The Supabase MCP exposes no `delete_project` tool, so it cannot be
done from a session.

Evidence they are safe to delete: across the entire archived git history (Lovable
scaffold 2025-12-23 → PR #34 merge 2026-07-26) the only Supabase ref ever appearing in
`supabase/config.toml`, `client.ts`, or any file is `rhwzvgklasvitocbbhvi` — the deleted
project. Neither paused project ever hosted this site. Paused projects cannot be
inspected or dumped first, so the deletion is blind and irreversible, which is why it was
approved explicitly rather than assumed.

## Owner action 2 — Vercel (independent of the above)

`www.dikagustiana.com` is served by Vercel, but the only reachable Vercel account
(`team_qkOkuTIM75I336YmxaGlDwWZ`, "dikagirawan-4804's projects") has **zero projects** —
re-confirmed this session. The account that owns the deployment is not reachable from
here, so the project cannot be found by domain or by id.

Either connect that account to the session, or set these by hand in the Vercel project's
environment variables and redeploy:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**A redeploy is mandatory, not optional.** Vite inlines `import.meta.env` at build time,
so setting the variables without rebuilding changes nothing.

Note the currently deployed bundle contains **no Supabase URL at all** — its hash matches
an env-less local build. The live site has therefore been broken at boot independently of
the database deletion, and `createClient()` throws before React renders. Fixing these two
variables plus a rebuild is what makes the site work again.

## Owner action 3 — the edge function secret

Set `LOVABLE_API_KEY` in the new project's Edge Function secrets. The Supabase MCP has no
secret-setting tool. Without it, `/admin/council` loads and lists past sessions normally
but starting a council run returns an error — say so plainly rather than leaving it
looking broken.

`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_ANON_KEY` are injected by the
platform and need no action.

---

## Then, in this order

### 1. Create the project

```
create_project(name='dikagustiana-com', region='ap-southeast-1',
               organization_id='rwgsxtztlyoiinhbbleh')   # free tier
```

`ap-southeast-1` is Singapore, closest to Jakarta. Wait for `ACTIVE_HEALTHY` via
`get_project`. Report the ref, region and tier.

### 2. Apply the baseline

Four `apply_migration` calls, in filename order — the filenames now encode dependency
order, so no special knowledge is needed:

```
supabase/migrations/20260731010000_baseline_foundation.sql
supabase/migrations/20260731020000_baseline_finance.sql
supabase/migrations/20260731030000_baseline_cms.sql
supabase/migrations/20260731040000_seed_surviving_content.sql
```

Use the filename stem as the migration `name` so the remote history matches the repo.

**Never** `supabase db push`, `supabase db reset`, or any CLI migration command.

Expected end state, already verified against a local Postgres 16:

- 194 rows: 8 `sections`, 1 `categories`, 24 `fsli_pages`, 4 `finance_sections`,
  2 `finance_settings`, 49 `finance_modules`, 105 essay draft stubs, 1 published essay
- 14 tables, all with `rls_enabled = true`, none policy-less
- the seed's own assertion block passes (it aborts the transaction otherwise)

### 3. Verify

- `list_tables` → confirm `rls_enabled` on all 14
- `get_advisors(type='security')` and `get_advisors(type='performance')` → clean, or each
  remaining notice explained

### 4. Regenerate types

```
generate_typescript_types  →  src/integrations/supabase/types.ts   (REPLACE, do not merge)
```

This was attempted offline this session and could not be finished: the Supabase CLI's
`gen types` requires Docker, which is unavailable here. **The diff is already known**, so
this should be a clean swap:

- 25 table types disappear (`quant_*`, `remora_*`, the personal-finance tracker,
  `content_blocks`, `embeds`, `pages`, `category_cards`, `finance_fundamentals`).
  Verified: **no cut table is queried anywhere** in `src/` or `tests/`.
- `essays.fundamental_id` disappears. Verified: it appears **only inside `types.ts`
  itself**, nowhere in application code.
- Nothing new appears — `admin_audit_log` and `council_sessions` are already in the
  current file, so the `as unknown as` casts around them in `src/lib/auditLog.ts` and
  `src/hooks/queries/useAuditLog.ts` are now unnecessary. Harmless; tidy them or leave.

Then re-run `npm run typecheck`.

### 5. Wire the app

- `supabase/config.toml` — `project_id` is currently the literal string `"PENDING"`; set
  it to the new ref.
- `.env` (untracked, create it) — `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
  `src/integrations/supabase/client.ts` reads exactly those two and nothing else.
  `.env.example` also lists `VITE_SUPABASE_PROJECT_ID`, which no code reads.

### 6. Bootstrap the owner's admin access

Order matters — no migration can seed a user, so the account must exist first.

1. Owner signs up at `/auth` with **`dika.irawan@samb.co.id`** (plain email + password).
2. Then, via `execute_sql` (service_role bypasses RLS):

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'dika.irawan@samb.co.id'
ON CONFLICT (user_id, role) DO NOTHING;
```

This cannot be done from the client: granting admin requires being admin, and
`user_roles_no_self_grant_insert` blocks self-grants outright. That is deliberate — see
`docs/SCHEMA_PLAN.md` §2.

Admin is then resolved client-side by `src/contexts/AuthContext.tsx:23-36`. Report exactly
what was done so the owner knows how to log in.

### 7. Deploy the edge function

`council-review`, with **`verify_jwt = true`**. The platform gate plus the function's own
server-side admin re-check against `user_roles`
(`supabase/functions/council-review/index.ts:100-112`) are both deliberate. Files:
`index.ts`, `personas.ts`, `pipeline.ts`.

Nothing in this project ships with `verify_jwt = false` — the eight cut `quant-*` /
`remora-*` functions did, while each built a `SUPABASE_SERVICE_ROLE_KEY` client
internally, meaning any unauthenticated caller could drive RLS-bypassing writes.

### 8. Acceptance bar

| check | status now |
|---|---|
| anonymous read of a published essay succeeds | **verified locally**, re-run against the project |
| anonymous read of a draft essay fails | **verified locally** (0 of 105 visible) |
| anonymous write to any table fails | **verified locally** (denied at the privilege layer, before RLS) |
| admin login works; create/update/delete round-trip and persist | round-trip **verified locally**; login needs step 6 |
| non-admin blocked from admin routes and admin table writes | **verified locally** |
| `tsc --noEmit` passes | **passing** |
| production build succeeds | **passing** |
| Vercel serves the live domain | blocked on owner action 2 |
| every route in `src/App.tsx` loads or no longer exists | **66 routes, all elements resolve, build clean** |
| zero tables with RLS disabled; advisors clean | **14/14 RLS locally**; advisors need the project |

Re-run the local suite any time with `docs/db/verify/` — it applies the real migrations to
a throwaway Postgres and exercises the whole bar against real RLS in about ten seconds.
