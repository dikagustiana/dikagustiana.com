# Local dry-run harness for the baseline

Applies the whole baseline to a throwaway local Postgres and runs the RLS acceptance
checks against it, so the SQL is proven executable and the policies are proven correct
*before* anything is applied to a real Supabase project.

This is plain `psql` against a scratch cluster. It is **not** `supabase db push` or
`supabase db reset` — those remain prohibited (see `docs/DECISIONS.md`). Nothing here
touches a Supabase project.

## Why it exists

The drafted SQL had never been executed. Four adversarial review lenses found seven
defects by reading it; running it found an eighth that reading had missed (see below).
A schema this size should not meet a real database for the first time in production.

## Running it

Postgres 16 client + server binaries are required. `initdb` refuses to run as root,
so the cluster runs as the `postgres` system user.

```sh
export PGDATA=/tmp/pgd PGHOST=/tmp/pgs
rm -rf $PGDATA $PGHOST && mkdir -p $PGDATA $PGHOST && chown -R postgres $PGDATA $PGHOST
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $PGDATA -U postgres --auth=trust"
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $PGDATA -o '-k $PGHOST -c listen_addresses=' -l /tmp/pg.log start"

psql -h $PGHOST -U postgres -c 'CREATE DATABASE dry'
psql -h $PGHOST -U postgres -d dry -v ON_ERROR_STOP=1 -f docs/db/verify/00_supabase_harness.sql

# Filename order IS dependency order now -- the files were renamed for exactly
# this reason (essays.module_id has an FK to finance_modules, so finance must
# precede CMS). No special ordering knowledge required.
for f in supabase/migrations/*.sql; do
  psql -h $PGHOST -U postgres -d dry -v ON_ERROR_STOP=1 -f "$f"
done

psql -h $PGHOST -U postgres -d dry -f docs/db/verify/01_rls_acceptance.sql
```

## `00_supabase_harness.sql`

Recreates only the parts of a Supabase project the baseline actually touches: the
`anon` / `authenticated` / `service_role` roles, `auth.users`, `auth.uid()` reading the
`request.jwt.claims` GUC, and `storage.buckets` / `storage.objects` with RLS on.

The load-bearing line is the last one:

```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
```

That is what managed Supabase ships, and it is the reason a bare `GRANT SELECT ... TO
anon` restricts nothing: every new table and function is *born* with ALL granted to
anon and authenticated, and `GRANT` is additive. Without replaying it here the harness
would be more permissive than production in appearance and more restrictive in effect,
and would have passed the exact checks that matter.

## `01_rls_acceptance.sql`

Impersonates each role with `SET ROLE` + `set_config('request.jwt.claims', ...)` and
exercises the acceptance bar: anonymous read of a published essay, anonymous read of a
draft, anonymous write to every table, the admin create/update/delete round-trip, the
non-admin block, audit-log append-only, the self-grant guard, and the
`(track_slug, sort_order)` uniqueness the 105 essay module lookups depend on.

Read the output rather than trusting an exit code — `ON_ERROR_STOP` is off on purpose,
because most assertions here *expect* an `ERROR:` line. Each check names what it expects.

## The defect running it caught that reading did not

`REVOKE EXECUTE ON FUNCTION public.has_role(...) FROM PUBLIC` — the obvious fix for the
reviewed defect "has_role is granted to anon and is therefore a public admin oracle" —
**does not work on Supabase.** `CREATE FUNCTION` grants EXECUTE to `PUBLIC`, but
`ALTER DEFAULT PRIVILEGES` *additionally* grants it to `anon` by name. Revoking from
PUBLIC leaves the named grant untouched, and `SET ROLE anon; SELECT public.has_role(...)`
still returned `true`.

The fix is `FROM PUBLIC, anon`. The same trap applies to every table: a privilege on a
managed Supabase project is never absent by default, only ever explicitly taken away.
