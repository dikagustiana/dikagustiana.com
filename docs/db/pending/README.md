# Pending baseline + seed SQL — DRAFT, DO NOT APPLY AS-IS

These four files are the authored-but-**unverified-clean** rebuild SQL. They were written
against the scope decision in `../../DECISIONS.md` (14 tables kept, 26 cut) and then put
through four adversarial review lenses each. **The reviews found blockers.** Nothing here has
ever been executed — no Supabase project existed to execute it against (see
`../../SESSION_LOG.md`, the free-project-limit block).

Apply order matters and is **not** the filename order:

    01_foundation.sql   enums, has_role/handle_new_user/update_updated_at_column,
                        user_roles, profiles, 3 storage buckets + policies
    03_finance.sql      finance_sections, finance_modules, finance_models,
                        finance_settings, fsli_pages, fsli_sections
    02_cms.sql          sections, categories, essays, admin_audit_log,
                        council_sessions, books_uploads
    04_seed.sql         data only, 194 rows

`03_finance` must precede `02_cms`: `essays.module_id` carries a foreign key to
`finance_modules(id)`. The numbering reflects authoring order, not dependency order.

`*.notes.json` holds each author's column list, policy list, decisions and self-reported
risks. `schema_verifier_defects.json` and `seed_verifier_defects.json` hold the full review
output — read those before touching the SQL.

## Blockers to fix before the first apply

1. **`essays.category_id` is `NOT NULL` with no `DEFAULT`.** Two reviewers independently rated
   this a blocker. The live schema had a column default; dropping it flips the generated
   `essays.Insert.category_id` from optional to required and breaks at least three insert
   paths that structurally cannot supply one — the Next Big Thing admin "Add Essay", the
   legacy Writer Editor "Save Draft" on a new essay, and the repo's own live RLS test
   (`tests/live/adminGating.spec.ts`) which asserts an admin insert of
   `{section, slug, title, published}` succeeds. Either restore a default pointing at the
   `finance-general` category or fix those insert paths first. Do not just relax the
   constraint: `docs/DECISIONS.md` records that `NOT NULL` + `RESTRICT` is what guarantees no
   orphan essays.

2. **The published placeholder essay in `04_seed.sql` overclaims.** The honesty lens found it
   states the curriculum "outline is intact" (the migration's own loss list contradicts
   that), attributes 49 modules to three tracks that hold 29, says the outline "is what you
   see below" when nothing renders below the body, and asserts a loss date the rebuild does
   not establish. Rewrite it to claim only what is true, or drop it and satisfy the
   anonymous-read acceptance check with an essay published through the admin UI instead.

3. **`GRANT EXECUTE ON has_role() TO anon`** turns `user_roles` into a public read oracle over
   PostgREST, defeating that table's only SELECT policy. The grant was carried forward for
   compatibility with the historical repair, but every policy in this baseline already inlines
   the `EXISTS (SELECT 1 FROM user_roles ...)` check and needs no grant. Grant to
   `authenticated` only, or drop the grant entirely.

4. **The three `user_roles` write policies are non-functional** — a targeted admin `UPDATE` or
   `DELETE` affects zero rows and still reports success, while the only `DELETE` that works is
   the unqualified one. Re-derive them.

5. **`04_seed.sql` seeds `finance-general` with a generated UUID** instead of the archive's
   pinned `0f111111-1111-4111-8111-111111111111`, which breaks `supabase/seed.sql` and the
   `supabase db reset` path the live e2e suite depends on. Pin it.

6. **Module `sort_order` is assumed unique per track.** All 105 essay `module_id` lookups are
   scalar subqueries on `(track_slug, sort_order)`; if a track ever holds two modules at the
   same `sort_order` the replay aborts. Add the unique constraint that makes the assumption
   true.

7. **`admin_audit_log`'s append-only guarantee does not hold.** It rests on a grant model that
   is a no-op on managed Supabase, so the "second, independent barrier" the file claims is not
   there.

Also worth noting from the reviews: the inline `EXISTS` subquery does not by itself deliver the
initplan optimisation the author claimed, so the performance rationale in the comments
overstates the benefit (correctness is unaffected).

## Once the blockers are fixed

Apply each file with the `apply_migration` MCP tool — never `supabase db push`, `db reset`, or
any CLI migration command — then move the files to `supabase/migrations/` under the
`YYYYMMDDHHMMSS_description.sql` convention, verify `rls_enabled` is true for all 14 tables,
run `get_advisors` for both `security` and `performance`, and regenerate
`src/integrations/supabase/types.ts` (replace, do not merge).
