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

## `02_tracker_entry_acceptance.sql`, `03_fs_acceptance.sql`, `04_fs_publish_gate.sql`

Per-feature checks, run after the baseline and that feature's migrations (each file's
header names them). Unlike `01`, `ON_ERROR_STOP` is on and every check raises on
failure, so a clean run prints only `PASS` lines and ends with "all checks passed".
Everything they write is rolled back.

`03` covers the `fs_*` statement tables (Plan 1.1): the CHECKs and keys of §A5, anon and
signed-in reads of published periods only, the admin's writes limited to drafts, and the
publish gate held twice (`fs_period.status` neither granted nor reachable through the
UPDATE policy). Each RLS rule it tests was also loosened once in a copy of the migration
to confirm the script fails.

`04` covers the publish gate (Plan 1.7) on the PHE FY2024 load while it is a draft:
`fs_tieout()` equals the checker's stored run on all 125 rules both run, descriptions
included; nine one-change mutations (a figure, a declared printed difference, a SoCE
cell, a parent link, a missing key) each fail exactly the rules they break; a failing
gate records its run and leaves the period a draft; anon and a signed-in non-admin are
refused; an admin publishes, after which the lines take no writes and anon reads the
statements with a latest run of 125 passes. The row trigger (20261011200000) closes a
published period's rows to the owner too, still lets a line-item link change and the
period's own delete cascade. Its first check runs read-only on production too. `03`
turns that trigger off inside its own transaction so each RLS layer still answers for
itself.

The race the trigger closes (an admin's edit landing just after a publish that never saw
it) needs two sessions, so it is not in a script. Run by hand on 11 October 2026: a
publish holding the period made a concurrent edit wait and then refused it; an edit
holding the period made the publish wait, and the publish then counted the edit (2
failures) and left the period a draft. With the trigger off, the same first order
published the period with the edited figure in it.

## The defect running it caught that reading did not

`REVOKE EXECUTE ON FUNCTION public.has_role(...) FROM PUBLIC` — the obvious fix for the
reviewed defect "has_role is granted to anon and is therefore a public admin oracle" —
**does not work on Supabase.** `CREATE FUNCTION` grants EXECUTE to `PUBLIC`, but
`ALTER DEFAULT PRIVILEGES` *additionally* grants it to `anon` by name. Revoking from
PUBLIC leaves the named grant untouched, and `SET ROLE anon; SELECT public.has_role(...)`
still returned `true`.

The fix is `FROM PUBLIC, anon`. The same trap applies to every table: a privilege on a
managed Supabase project is never absent by default, only ever explicitly taken away.
