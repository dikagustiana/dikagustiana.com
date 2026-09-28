# WO-R05 Part 4: the rebuild migration — NOT APPLIED

**Nothing in this folder has run on any Supabase project.** It is the SQL for gates G1
and G2 of WO-R05 (every write that touches a published essay rebuilds the site), staged
here when PR #37 merged on the owner's instruction before those gates were approved.
The live project (`asypkbkiebjvvpimewfp`) has no `ops` schema, no `pg_net`, no `pg_cron`,
and no `vercel_deploy_hook_url` secret (read 2026-09-28).

When the owner approves G1 and G2, each file runs through `apply_migration` only, and its
mirror lands in `supabase/migrations/` under the version the database assigns. This
folder then goes.

| File | Gate | sha256 |
|---|---|---|
| `g1_enable_pg_net_and_pg_cron.sql` | G1, `apply_migration` name `enable_pg_net_and_pg_cron` | `9595dd2839e53761ffa7dfc6daaad618209c2615ffefe334c86716975f4263a5` |
| `g2_site_rebuild_on_published_writes.sql` | G2, `apply_migration` name `site_rebuild_on_published_writes` | `a893e6ad495ef82f5964be20f9760c602639ce879da7b26d8832404748cdd623` |
| `rehearsal_stubs.sql` | local stand-ins for `net`, `cron`, `vault`, the three roles and a cut-down `essays` | — |
| `rehearsal_tests.sql` | the 10 local checks | — |

Both gate files are byte-identical to what was printed at the gate (2026-09-28). Changing
either one means printing it again and asking again.

The deploy hook's URL is not here and must never be. The owner stores it in Vault
personally (G3). The SQL reads it by name at firing time.

## Rehearsing locally

A throwaway Postgres 16, never a Supabase project. `initdb` refuses to run as root, so
the cluster runs as the `postgres` system user. The stubs stand in for G1, so G1 is not
run locally.

```sh
D=/var/lib/postgresql/wo-r05-test B=/usr/lib/postgresql/16/bin
su postgres -s /bin/bash -c "$B/initdb -D $D -A trust -U postgres > /dev/null && \
  $B/pg_ctl -D $D -o '-p 55432 -k /var/lib/postgresql -c listen_addresses=' -l $D.log start"
P="psql -h /var/lib/postgresql -p 55432 -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$P -f docs/db/pending/wo-r05-rebuild/rehearsal_stubs.sql
$P -f docs/db/pending/wo-r05-rebuild/g2_site_rebuild_on_published_writes.sql
$P -f docs/db/pending/wo-r05-rebuild/rehearsal_tests.sql

su postgres -s /bin/bash -c "$B/pg_ctl -D $D stop -m fast" && rm -rf $D $D.log
```

Every check in `rehearsal_tests.sql` runs inside `begin … rollback`, except 9 and 10,
which only read. Run 2026-09-28: 10 of 10 as expected.

1. A no-op update of a published essay stamps `requested_at`, and the stamp rolls back
   with the transaction.
2. The same update on an unpublished essay does not stamp.
3. A save made as `authenticated`, the role the owner's saves use, stamps too, though
   EXECUTE on the trigger's function is revoked from it.
4. Inserting a published essay, unpublishing, and deleting a published essay all stamp.
   Inserting a draft does not.
5. With no secret, a firing records `no_secret` and queues nothing.
6. A request younger than 90 seconds does not fire.
7. With a local, fake secret, a firing queues exactly one request. A second run queues
   nothing new, and once a response exists the next run records `201`.
8. With the state table gone, the trigger only warns, and the save goes through.
9. `anon` and `authenticated` have no EXECUTE, schema USAGE or table SELECT; RLS is on.
10. `cron.job` holds `fire-site-rebuild`, `*/2 * * * *`.

The brief's four live tests (1, 2, 5 and 6) run again on the live project after G2, each
inside `begin … rollback`.
