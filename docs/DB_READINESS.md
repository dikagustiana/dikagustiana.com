# DB READINESS — run-ready package (Phase 4)

> **No changes in this branch were applied to any live database.** The live Supabase
> project is owned by the concurrent migration session. Everything here is staged for the
> DB owner to run **after** that session finishes, and after the two PRs are merged in
> order (migration PR first, then this upgrade PR).

## 1. Apply the schema (fresh / empty DB)

Two equivalent options:

**A. Supabase CLI (recommended — uses `supabase/migrations/` in order):**
```bash
supabase link --project-ref <PROJECT_REF>
supabase db push          # applies every migration in timestamp order
```

**B. One-shot combined import (convenience bundle):**
```bash
psql "<DATABASE_URL>" -f docs/db/import.sql
```
`docs/db/import.sql` is the 38 migrations concatenated in timestamp order (generated; do not
hand-edit — edit the migrations instead). Use only on a **fresh/empty** DB.

> ⚠️ The migration set is designed for an empty DB. The concurrent session is mid-migration on the
> live project (a module↔essay FK conflict was being resolved). **Reconcile their applied state with
> these migrations before pushing** — do not double-apply.

## 2. Storage buckets (must exist, all public-read / admin-write)

These are created by the migrations, but verify they exist:
- `essay-images`
- `embeds`
- `books`
- `finance-models`

## 3. Vercel environment variables (client build)

Set exactly these (values from the target Supabase project — the **publishable/anon** key, never the
service role):
```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_PROJECT_ID=<PROJECT_REF>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon / publishable key>
```
> Note: the committed `.env` currently points at project `rhwzvgklasvitocbbhvi`. Repoint it (or the
> Vercel env) to the intended project. The anon key is RLS-protected and safe to expose.

## 4. Edge function secrets (Supabase → Functions → Secrets)

- `LOVABLE_API_KEY` — required by `spending-insights`, `parse-bank-statement`, `parse-pdf-statement`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — required by the service-role functions
  (`quant-*`, `remora-*`, `detect-recurring`). Supabase injects these automatically in the functions
  runtime; verify they are present.
- `quant-data-fetch` calls Yahoo Finance (no key required).

Then deploy: `supabase functions deploy` (per function or all).

## 5. Grant the production admin

After `dika.g.irawan@gmail.com` has signed up once (so the `auth.users` row + profile exist):
```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'dika.g.irawan@gmail.com'
on conflict (user_id, role) do nothing;
```
(The test seed `supabase/seed.sql` provisions `admin@dika.test` for e2e only — do not use in prod.)

## 6. After applying — live verification (queued)

Run in order once the DB is ready:
```bash
npm ci
npm run lint && npx tsc -p tsconfig.app.json --noEmit
npm run test:unit                 # 144 tests, no backend needed
npm run test:e2e                  # mocked Playwright (needs: npx playwright install chromium)
npm run test:e2e:live             # real DB; see docs/e2e-live-testing.md
```
Then regenerate the stale client types:
```bash
supabase gen types typescript --project-id <PROJECT_REF> > src/integrations/supabase/types.ts
```
(`types.ts` is stale: it still shows `essays.fundamental_id`/`finance_fundamentals` (dropped) and a
nullable `category_id` (now NOT NULL).)

## 7. Optional schema add-ons (only if wanted)

Per-essay SEO meta (the essay `snippet`/deck already serves as the SEO description today):
```sql
alter table public.essays add column if not exists meta_description text;
alter table public.essays add column if not exists tags text[];
```
If applied, regenerate types and wire the fields back into Writer Studio's RightSidebar.
