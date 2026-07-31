# Archived migrations (pre-rebuild)

These 43 files are the migration history of the **deleted** Supabase project
`rhwzvgklasvitocbbhvi`, kept as the record of how that schema came to look the
way it did. They are **not** applied to the current project and must never be
replayed: the rebuild ships a single clean baseline instead
(`../20260731*_baseline_schema.sql`).

Read them for intent and for the two failures the baseline deliberately avoids:

- `20260622135932_*.sql` revoked `EXECUTE` on `public.has_role()` from `anon`
  and `authenticated` while dozens of RLS policies still called it. Postgres
  requires the *calling* role to hold EXECUTE on a function used in a policy
  expression, so this denied reads across the public site.
  `20260627190000_restore_has_role_execute_for_policies.sql` repaired it.
- `20260301073018_*.sql` replaced the published-gated `essays` SELECT policy
  with `USING (true)`, exposing every draft through PostgREST.
  `20260627190100_restore_essays_published_gating.sql` repaired it.

The baseline avoids both by inlining the `user_roles` EXISTS check into every
policy — no policy depends on a function grant — and by splitting the `essays`
SELECT policy so the anonymous path is `published = true` and never references
`has_role` at all.

Naming: these files use Lovable's UUID suffixes. The convention going forward
is `YYYYMMDDHHMMSS_description.sql`.
