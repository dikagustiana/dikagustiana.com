# Live (DB-backed) E2E Testing

The default suite (`npm run test:e2e`) runs against a **fully mocked** Supabase and
needs no backend. This document covers the **live** suite (`npm run test:e2e:live`),
which exercises real auth, RLS/role gating, CRUD, and edge functions against an
actual database.

> ⚠️ Use a **local** or **staging** Supabase only. Never point these at production —
> the suite creates and deletes rows and signs users in.

## What the live suite verifies

| Spec | Proves |
|------|--------|
| `tests/live/realAuth.spec.ts` | signup, login, session read, logout, bad-password rejection, JWT reaches PostgREST |
| `tests/live/adminGating.spec.ts` | admin fixture resolves `role=admin`; ordinary user does not; essay insert allowed for admin, blocked by RLS for ordinary user |
| `tests/live/crudFinance.spec.ts` | full create/read/update/delete lifecycle for `finance_accounts` + `finance_transactions`, persisted under RLS |
| `tests/live/edgeFunctions.spec.ts` | `remora-health` returns a structured report; authenticated invoke carries the user JWT (opt-in via `E2E_EDGE=1`) |

Seed fixtures (`supabase/seed.sql`):
- `admin@dika.test` / `Admin123!` — has `user_roles.role = 'admin'`
- `user@dika.test` / `User1234!` — ordinary user

## Option A — Local Supabase (needs Docker image egress)

```bash
./scripts/setup-test-db.sh        # supabase start + db reset (migrations + seed)
```
Then export the env it prints and run:
```bash
export E2E_LIVE=1
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_ANON_KEY="<anon from `supabase status`>"
export SUPABASE_SERVICE_ROLE_KEY="<service_role from `supabase status`>"
npm run test:e2e:live
```

> **If `supabase start` cannot pull images** (`403 Forbidden` from
> `*.cloudfront.net`), the environment's network policy is blocking the Docker
> image CDN. Allowlist egress to: `public.ecr.aws`, its layer CDN
> (`*.cloudfront.net`), and the ECR S3 blob hosts — or use Option B. On Claude
> Code on the web, set this when creating the environment
> (https://code.claude.com/docs/en/claude-code-on-the-web).

## Option B — Hosted staging project (no Docker)

1. Create a **separate staging** Supabase project (not production).
2. Push schema + seed to it:
   ```bash
   npx supabase link --project-ref <STAGING_REF>
   npx supabase db push                 # applies supabase/migrations/*
   # apply the seed once:
   psql "<STAGING_DB_URL>" -f supabase/seed.sql
   ```
3. Run the suite:
   ```bash
   export E2E_LIVE=1
   export SUPABASE_URL="https://<STAGING_REF>.supabase.co"
   export SUPABASE_ANON_KEY="<staging anon key>"
   export SUPABASE_SERVICE_ROLE_KEY="<staging service_role key>"
   npm run test:e2e:live
   ```
   Requires HTTPS egress to `*.supabase.co`.

### Edge functions (optional)
```bash
# Local: serve in another terminal
npx supabase functions serve
# Staging: npx supabase functions deploy
export E2E_EDGE=1
npm run test:e2e:live
```

## Verifying the schema applied
After `db reset` / `db push`:
```bash
npx supabase status                       # all services healthy
# Studio (local): http://127.0.0.1:54323  -> check tables under "public"
```
