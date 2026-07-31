# SCHEMA PLAN — dikagustiana.com

The database of record for the site after the greenfield rebuild: 14 tables, 5 enums,
4 functions, 12 triggers, 3 storage buckets, 2 application roles.

**This document is written from the schema as applied, not from the drafts.** Every
table, column, constraint, index, policy and trigger below was read back out of a live
Postgres 16 that had `supabase/migrations/*.sql` applied to it in filename order
(see `docs/db/verify/`). Where it disagrees with a draft comment or with
`docs/db/pending/*.notes.json`, this document is right and those are stale.

Companion documents: `docs/DECISIONS.md` (why), `docs/SESSION_LOG.md` (when),
`supabase/migrations/_archive/README.md` (the two historical failures the design guards
against).

---

## 1. Design rules

These hold everywhere and are the things to preserve when extending the schema.

1. **RLS is on for every table, and every table has at least one explicit policy.**
   Deny-by-default. No table ships policy-less — a table with RLS enabled and no policy
   returns zero rows to everyone, silently, which is a bug that looks like data loss.
2. **Read and write policies are split per verb**, never `FOR ALL`, and every policy
   names its roles with `TO anon` / `TO authenticated`. An untargeted policy applies to
   both and is nearly always wider than intended.
3. **The admin check is inlined, not a function call:**
   ```sql
   EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin')
   ```
   The single exception is `user_roles`' own INSERT policy, where inlining would recurse
   — see §5. This is the direct guard against historical failure (a): Postgres checks
   `EXECUTE` against the **calling** role for a function used in a policy expression, and
   `SECURITY DEFINER` changes the privileges the function *body* runs with, not the
   caller's right to invoke it. A policy that reads the table directly cannot be broken
   by a future grant change.
4. **No anon policy references a function or another table.** Anonymous read paths are
   bare column tests (`published = true`, `is_published = true`, `deleted_at IS NULL`) or
   `USING (true)` on genuinely public reference data. This is the guard against
   historical failure (b), and it means the public site cannot be taken down by anything
   that happens to `has_role()` or `user_roles`.
5. **`auth.uid()` is always written `(SELECT auth.uid())`.** House style, carried from
   the archive. Note the honest version of the rationale: this lets the planner hoist the
   call into an InitPlan, but the surrounding `EXISTS` subquery is *not* thereby collapsed
   to a one-time initplan in general — the draft comments overstated this. Correctness is
   unaffected either way; treat it as convention, not as a measured optimisation.
6. **Privileges are revoked before they are granted.** On managed Supabase this is not
   optional pedantry. The platform ships
   ```sql
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     GRANT ALL ON TABLES    TO postgres, anon, authenticated, service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
   ```
   so every new table and function is *born* with ALL privileges granted to `anon` and
   `authenticated`, and `GRANT` is additive — it cannot subtract. A bare grant list
   therefore documents an intention while changing nothing. Only an explicit `REVOKE`
   makes the privilege layer a real second barrier behind RLS. **A privilege on this
   platform is never absent by default, only ever explicitly taken away.**

---

## 2. Role model

| role | who | how it is established |
|---|---|---|
| `anon` | any visitor, signed out | Supabase's anonymous PostgREST role |
| `authenticated` | any signed-in account | Supabase issues it on a valid JWT |
| admin | an `authenticated` user with a row in `user_roles` | `user_roles(user_id, role='admin')` |
| `service_role` | migrations, SQL editor, out-of-band ops | bypasses RLS entirely |

Admin is **not** a JWT claim and **not** a Postgres role — it is a row. It is resolved
client-side by a direct query in `src/contexts/AuthContext.tsx:23-36`:

```ts
.from('user_roles').select('role')
.eq('user_id', uid).eq('role', 'admin').maybeSingle()
```

A non-admin matches zero rows, so `maybeSingle()` returns `null` rather than erroring —
which is what both `AuthContext` and `tests/live/adminGating.spec.ts` expect. The
frontend never calls `supabase.rpc()`.

The same check is repeated server-side in `supabase/functions/council-review/index.ts:100-112`,
against the caller's own JWT. The `RequireAdmin` route guard is a UX affordance, not a
security boundary; RLS and that server-side re-check are the boundary.

### Bootstrapping the first admin

No client-side role can mint the first admin: granting admin requires being admin, and
the `user_roles_no_self_grant_insert` RESTRICTIVE policy blocks self-grants outright.
That is deliberate. The first admin row is written out of band, by a caller that
bypasses RLS:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = '<owner email>';
```

`supabase/seed.sql` does the equivalent for the e2e fixtures during `supabase db reset`.

---

## 3. Enums

| enum | values | used by |
|---|---|---|
| `app_role` | `admin`, `user` | `user_roles.role` |
| `content_status_enum` | `draft`, `tone_pending`, `published`, `archived` | `essays.status` |
| `lesson_type_enum` | `concept`, `framework`, `case-study`, `exercise`, `model-walkthrough` | `essays.lesson_type` |
| `model_depth` | `foundation`, `executive`, `institutional` | `finance_models.depth` |
| `voice_role_enum` | `manager`, `economist`, `educator`, `coach`, `hybrid` | **nothing** |

`voice_role_enum` is created but no column uses it. Both voice columns
(`sections.voice_role`, `essays.voice_role`) are `text`, because the live columns were
`text` and `types.ts` types them as `string`. Converting them would change the generated
TypeScript, which is out of scope for a like-for-like rebuild. `sections.voice_role`
carries a `CHECK` constraint over the same five values instead. The enum is kept because
`types.ts` declares it and dropping it is a breaking change for no gain.

---

## 4. Functions and triggers

| function | lang | SECURITY DEFINER | search_path | EXECUTE granted to |
|---|---|---|---|---|
| `has_role(uuid, app_role)` | sql | **yes** | `public` | `authenticated`, `service_role` |
| `handle_new_user()` | plpgsql | **yes** | `public` | `service_role` only |
| `update_updated_at_column()` | plpgsql | no | `public` | trigger-only |
| `validate_essay_tone_fields()` | plpgsql | no | `public, pg_temp` | trigger-only |

**`has_role()`** is `SECURITY DEFINER` so its body bypasses RLS on `user_roles`. That is
what makes it usable inside `user_roles`' own policy without tripping *"infinite
recursion detected in policy for relation user_roles"*. It is the only function any
policy in this schema calls, and only from that one policy.

It is **not granted to `anon`**, and the revoke must name `anon` explicitly:

```sql
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
```

`REVOKE ... FROM PUBLIC` alone is insufficient — `CREATE FUNCTION` grants to `PUBLIC`,
but `ALTER DEFAULT PRIVILEGES` *additionally* grants to `anon` by name, and revoking one
leaves the other. Verified: with `FROM PUBLIC` alone, `SET ROLE anon; SELECT
public.has_role(<uuid>, 'admin')` still returned `true`. PostgREST exposes every function
in `public` at `/rest/v1/rpc/<name>`, so an anon grant would publish a public
*"is `<uuid>` an admin?"* oracle that defeats the own-rows-only SELECT policy on
`user_roles` from outside it.

Residual, accepted: an authenticated non-admin can still ask that question about an
account whose uuid they already know. That is the cost of the grant the `user_roles`
INSERT policy needs; it leaks one boolean and is strictly smaller than the anon version.

**`handle_new_user()`** seeds `public.profiles` from `auth.users` on signup, with
`ON CONFLICT (user_id) DO NOTHING` — an exception in this trigger would abort the whole
`auth.users` INSERT, i.e. signup would fail outright. `EXECUTE` is revoked from
`anon`/`authenticated` and that is safe here, unlike for `has_role()`: EXECUTE on a
trigger function is checked at `CREATE TRIGGER` time, not when the trigger fires.

**`validate_essay_tone_fields()`** rejects publishing an essay whose `voice_role` names a
role with an empty tone JSONB, stamps `voice_validated_at`, and promotes `draft` →
`tone_pending` once tone fields are filled. It is a trigger rather than a `CHECK` because
it also mutates `NEW`. It has no RPC surface — a `RETURNS trigger` function cannot be
invoked from SQL or PostgREST.

### Triggers

- `on_auth_user_created` — `AFTER INSERT ON auth.users` → `handle_new_user()`
- `validate_essay_tone_fields_trigger` — `BEFORE INSERT OR UPDATE ON essays`
- `update_<table>_updated_at` — `BEFORE UPDATE` → `update_updated_at_column()`, on all
  10 tables carrying an `updated_at`: `categories`, `essays`, `finance_models`,
  `finance_modules`, `finance_sections`, `finance_settings`, `fsli_pages`,
  `fsli_sections`, `profiles`, `sections`.

`admin_audit_log`, `books_uploads` and `council_sessions` have no `updated_at` and no
such trigger — the first is append-only by design, the other two are stamped once.

---

## 5. Tables

RLS posture at a glance. "admin" means the inlined `user_roles` EXISTS check.

| table | anon read | authenticated read | insert | update | delete |
|---|---|---|---|---|---|
| `sections` | all | all | admin | admin | admin |
| `categories` | all | all | admin | admin | admin |
| `essays` | `published = true` | published **or** admin | admin | admin | admin |
| `admin_audit_log` | **none** | admin | admin, self-attributed | **none** | **none** |
| `council_sessions` | **none** | admin | admin, self-attributed | admin | admin |
| `books_uploads` | `deleted_at IS NULL` | live **or** admin | admin | admin | admin |
| `finance_sections` | all | all | admin | admin | admin |
| `finance_modules` | all | all | admin | admin | admin |
| `finance_models` | `is_published = true` | published **or** admin | admin | admin | admin |
| `finance_settings` | all | all | admin | admin | admin |
| `fsli_pages` | all | all | admin | admin | admin |
| `fsli_sections` | all | all | admin | admin | admin |
| `profiles` | **none** | own row | own row | own row | **none** |
| `user_roles` | **none** | own rows | admin, never self | **none** | **none** |

Note what is *absent*: there is no anon write policy anywhere, and `anon` additionally
holds no `INSERT`/`UPDATE`/`DELETE` privilege on any of the 14 tables. Anonymous writes
fail at the privilege layer before RLS is even consulted.

### 5.1 `essays` — the acceptance-critical table

Two things about this table are load-bearing.

**The anon SELECT policy is `USING (published = true)` and references nothing else.** No
function, no other table. This is the policy historical failure (b) broke by setting it
to `USING (true)`, leaking every draft through PostgREST. Because `published` is nullable,
note that `published = true` correctly excludes both `false` and `NULL` — fail-closed by
construction. Authenticated read is a separate policy (`published = true OR <admin
EXISTS>`), so the anon path never touches `user_roles`.

**`category_id` is `NOT NULL` *with* a `DEFAULT`:**

```sql
category_id uuid NOT NULL DEFAULT '0f111111-1111-4111-8111-111111111111'::uuid
```

The default is not decoration. `NOT NULL` alone flips the generated
`essays.Insert.category_id` from optional to required and breaks four insert paths that
structurally cannot supply one:

- `src/components/next-big-thing/EssayDialog.tsx:137` — the admin "Add Essay" dialog has
  no category field at all
- `src/components/writer/WriterEditor.tsx:346` — *"Attach category_id if set"*, omitted
  entirely on a new draft with no category chosen
- `supabase/seed.sql:63` — the e2e fixture essay
- `tests/live/adminGating.spec.ts:48` — asserts an admin insert of
  `{section, slug, title, published}` **succeeds**

Relaxing to nullable was rejected: `docs/DECISIONS.md` records `NOT NULL` + FK `RESTRICT`
as the no-orphan-essays guarantee, and Writer Studio validates category on every save on
top of it. The default keeps the guarantee *and* the insert paths — an uncategorised
essay lands in `finance` / `finance-general` rather than nowhere.

That UUID is pinned, by `04_seed.sql`, to the value the archive used
(`20260219_004`). It is the one hardcoded id in the seed, and it is load-bearing in three
places: this default, `supabase/seed.sql`, and agreement with the archive. The seed's own
assertion block fails the transaction if the category does not carry it.

**Constraint names are load-bearing** — PostgREST resolves embeds through them:
`categories!essays_category_id_fkey` (`useWriterEssay.ts:11`) and
`sections!categories_section_id_fkey` (`GreenTransitionPhase.tsx:142`). Renaming a
constraint breaks those queries at runtime, not at build time.

### 5.2 `user_roles` — read path immunity, and why writes are narrow

The **only** SELECT policy is `USING (user_id = (SELECT auth.uid()))`, and it is
deliberately `has_role()`-free. The admin probe that gates the entire admin UI runs on
every page load; it must never depend on a function grant.

There is deliberately **no** "admins can read all roles" SELECT policy. Permissive
policies for the same command are ORed into one expression, so adding it would make the
combined predicate `user_id = (SELECT auth.uid()) OR public.has_role(...)` and drag the
`has_role` EXECUTE grant straight back into sign-in's hot path — the exact query failure
(a) took down. Consequence: enumerating other users' roles is a `service_role` / SQL
editor operation, not a PostgREST one.

**Writes are INSERT-only, and this was re-derived from a broken draft.** The draft shipped
admin `UPDATE` and `DELETE` policies; neither worked. Postgres applies a table's SELECT
policies to the rows an `UPDATE`/`DELETE` *reads*, so with only the own-row SELECT policy:

- a targeted `UPDATE ... WHERE user_id = <someone else>` matched zero rows and **returned
  success** — a silent no-op, the worst possible shape for a privilege operation;
- the only `DELETE` that worked was the *unqualified* one, and since the visible row set
  is the caller's own rows, `DELETE FROM user_roles` run by an admin deleted **the admin's
  own role** and nothing else — a footgun that locks the owner out of their own site.

Both were removed. Role revocation is a `service_role` / SQL operation, which is what it
already was in practice: `grep -rn "from('user_roles')" src/` hits only `AuthContext`'s
own-row read. Nothing in the app administers roles.

What remains and is verified working: an admin can INSERT a role row for **another** user.
Over PostgREST that requires the default `Prefer: return=minimal` — chaining `.select()`
asks PostgREST to read the new row back, which the own-rows-only policy refuses.

`user_roles_no_self_grant_insert` is RESTRICTIVE, so it ANDs with the permissive set: no
authenticated session can create a role row for itself no matter how the permissive admin
check is later edited. NULL-safe by construction — a NULL `auth.uid()` yields NULL, which
RLS treats as false.

### 5.3 `admin_audit_log` — append-only on two layers

No `UPDATE` policy, no `DELETE` policy, **and** `authenticated` holds only `SELECT` and
`INSERT` at the privilege layer. An audit trail an admin can rewrite is not an audit
trail.

The second layer only exists because the grant block `REVOKE`s first. This was defect 7
of the review: the draft claimed the grant list was "a second, independent barrier" while
Supabase's default privileges had already granted ALL, leaving RLS as the sole barrier.
Verified after the fix: `has_table_privilege('authenticated', 'admin_audit_log', 'UPDATE')`
is `false`, and an admin's `UPDATE admin_audit_log` fails with *permission denied*.

The INSERT policy also requires `user_id = (SELECT auth.uid())`, so a log entry cannot be
forged onto another user.

### 5.4 `finance_modules` — `UNIQUE (track_slug, sort_order)`

This is a correctness constraint, not a nicety. All 105 essay stubs in `04_seed.sql`
resolve `module_id` with a **scalar subquery** on `(track_slug, sort_order)`, decoded from
the slug prefix (`sf-07-03` = strategic-finance module 07, essay 03). A scalar subquery
that returns two rows does not pick one — it raises *"more than one row returned by a
subquery used as an expression"* and aborts the entire seed. The constraint makes the
assumption those 105 lookups rest on actually true, and keeps it true for modules added
later through the admin UI.

Its backing index also serves the `(track_slug, sort_order)` listing reads, so the
separate `idx_finance_modules_track_order` it replaced was not recreated.

### 5.5 Column reference

Read back from the applied schema. 14 tables, 151 columns.

#### `admin_audit_log` (12 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `user_id` | uuid | yes | — |
| `user_email` | text | yes | — |
| `action` | text | **no** | — |
| `table_name` | text | **no** | — |
| `record_id` | text | yes | — |
| `record_title` | text | yes | — |
| `record_slug` | text | yes | — |
| `record_section` | text | yes | — |
| `changes` | jsonb | yes | — |
| `metadata` | jsonb | yes | — |
| `created_at` | timestamptz | **no** | `now()` |

#### `books_uploads` (13 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `category` | text | **no** | — |
| `filepath` | text | **no** | — |
| `filename` | text | **no** | — |
| `mime_type` | text | yes | — |
| `size_bytes` | integer | yes | — |
| `title` | text | yes | — |
| `author` | text | yes | — |
| `year` | integer | yes | — |
| `cover_path` | text | yes | — |
| `uploaded_by` | uuid | yes | — |
| `uploaded_at` | timestamptz | **no** | `now()` |
| `deleted_at` | timestamptz | yes | — |

#### `categories` (8 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `section_id` | uuid | **no** | — |
| `slug` | text | **no** | — |
| `name` | text | **no** | — |
| `parent_id` | uuid | yes | — |
| `sort_order` | integer | yes | 0 |
| `created_at` | timestamptz | **no** | `now()` |
| `updated_at` | timestamptz | **no** | `now()` |

#### `council_sessions` (10 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `post_id` | uuid | yes | — |
| `mode` | text | **no** | — |
| `input_snapshot` | text | **no** | — |
| `advisors_config` | jsonb | **no** | — |
| `advisor_responses` | jsonb | **no** | — |
| `peer_reviews` | jsonb | **no** | — |
| `verdict` | jsonb | **no** | — |
| `created_at` | timestamptz | **no** | `now()` |
| `created_by` | uuid | **no** | auth.uid() |

#### `essays` (32 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `section` | text | **no** | — |
| `phase` | text | yes | — |
| `slug` | text | **no** | — |
| `title` | text | **no** | — |
| `snippet` | text | yes | — |
| `author` | text | yes | 'Dika Gustiana'::text |
| `date` | text | yes | — |
| `read_time` | text | yes | — |
| `thumbnail_url` | text | yes | — |
| `content` | text | yes | — |
| `published` | boolean | yes | false |
| `status` | content_status_enum | yes | 'draft'::content_status_enum |
| `sort_order` | integer | yes | 0 |
| `is_selected` | boolean | **no** | false |
| `category_id` | uuid | **no** | '0f111111-1111-4111-8111-111111111111'::uuid |
| `module_id` | uuid | yes | — |
| `voice_role` | text | yes | — |
| `prerequisites` | text[] | yes | — |
| `learning_outcomes` | text[] | yes | — |
| `manager_fields` | jsonb | yes | — |
| `economist_fields` | jsonb | yes | — |
| `educator_fields` | jsonb | yes | — |
| `coach_fields` | jsonb | yes | — |
| `voice_validated_at` | timestamptz | yes | — |
| `finance_section` | text | yes | — |
| `finance_order` | integer | yes | — |
| `lesson_type` | lesson_type_enum | yes | 'concept'::lesson_type_enum |
| `fsli_slug` | text | yes | — |
| `topic` | text | yes | — |
| `created_at` | timestamptz | **no** | `now()` |
| `updated_at` | timestamptz | **no** | `now()` |

#### `finance_models` (16 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `slug` | text | **no** | — |
| `number` | text | **no** | — |
| `name` | text | **no** | — |
| `description` | text | yes | — |
| `depth` | model_depth | **no** | 'foundation'::model_depth |
| `version` | text | **no** | 'v1.0'::text |
| `last_updated` | date | **no** | CURRENT_DATE |
| `documentation` | jsonb | **no** | '{}'::jsonb |
| `module_references` | uuid[] | **no** | '{}'::uuid[] |
| `excel_file_url` | text | yes | — |
| `is_flagship` | boolean | **no** | false |
| `is_published` | boolean | **no** | true |
| `sort_order` | integer | **no** | 0 |
| `created_at` | timestamptz | **no** | `now()` |
| `updated_at` | timestamptz | **no** | `now()` |

#### `finance_modules` (10 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `track_slug` | text | **no** | — |
| `slug` | text | **no** | — |
| `title` | text | **no** | — |
| `thesis` | text | yes | — |
| `sort_order` | integer | **no** | 0 |
| `framing_content` | text | yes | — |
| `module_meta` | jsonb | yes | '{}'::jsonb |
| `created_at` | timestamptz | **no** | `now()` |
| `updated_at` | timestamptz | **no** | `now()` |

#### `finance_sections` (8 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `slug` | text | **no** | — |
| `title` | text | **no** | — |
| `description` | text | yes | — |
| `icon` | text | yes | — |
| `sort_order` | integer | **no** | 0 |
| `created_at` | timestamptz | **no** | `now()` |
| `updated_at` | timestamptz | **no** | `now()` |

#### `finance_settings` (5 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `key` | text | **no** | — |
| `value` | text | yes | — |
| `created_at` | timestamptz | **no** | `now()` |
| `updated_at` | timestamptz | **no** | `now()` |

#### `fsli_pages` (11 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `slug` | text | **no** | — |
| `title` | text | **no** | — |
| `subtitle` | text | yes | — |
| `notes_ref` | text | yes | — |
| `dec_2024` | text | yes | — |
| `dec_2023` | text | yes | — |
| `category` | text | yes | 'current_assets'::text |
| `sort_order` | integer | yes | 0 |
| `created_at` | timestamptz | **no** | `now()` |
| `updated_at` | timestamptz | **no** | `now()` |

#### `fsli_sections` (7 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `page_slug` | text | **no** | — |
| `section_key` | text | **no** | — |
| `content` | text | **no** | ''::text |
| `sort_order` | integer | yes | 0 |
| `created_at` | timestamptz | **no** | `now()` |
| `updated_at` | timestamptz | **no** | `now()` |

#### `profiles` (6 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `user_id` | uuid | **no** | — |
| `email` | text | yes | — |
| `display_name` | text | yes | — |
| `created_at` | timestamptz | **no** | `now()` |
| `updated_at` | timestamptz | **no** | `now()` |

#### `sections` (9 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `slug` | text | **no** | — |
| `name` | text | **no** | — |
| `voice_role` | text | **no** | — |
| `manifesto` | text | yes | — |
| `is_active` | boolean | yes | true |
| `sort_order` | integer | yes | 0 |
| `created_at` | timestamptz | **no** | `now()` |
| `updated_at` | timestamptz | **no** | `now()` |

#### `user_roles` (4 columns)

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | **no** | `gen_random_uuid()` |
| `user_id` | uuid | **no** | — |
| `role` | app_role | **no** | 'user'::app_role |
| `created_at` | timestamptz | **no** | `now()` |

---

## 6. Indexes

Beyond primary keys and unique constraints, chosen against observed query patterns in
`src/`:

| table | index | serves |
|---|---|---|
| `sections` | `idx_sections_active_sort` | `useSections`: `.eq('is_active',true).order('sort_order')` |
| `categories` | `idx_categories_section_sort` | `useCategories`: `.eq('section_id').order('sort_order')` |
| `categories` | `idx_categories_slug` | `useCategoryBySlug`, no section filter |
| `categories` | `idx_categories_parent_id` (partial) | backs the self-FK `ON DELETE SET NULL` scan |
| `essays` | `essays_slug_unique` | global slug uniqueness + every by-slug lookup |
| `essays` | `idx_essays_section_published_sort` | `useEssays` |
| `essays` | `idx_essays_section_created` | `EditorialFeed`, `useRelatedEssays` |
| `essays` | `idx_essays_category_id` | `.in('category_id',…)` **and** the FK `RESTRICT` check on category delete |
| `essays` | `idx_essays_updated_at` | `useAdminEssays` default sort |
| `essays` | `idx_essays_selected_published` (partial) | homepage `useSelectedEssays` |
| `essays` | `idx_essays_module_published`, `idx_essays_finance_section_published`, `idx_essays_fsli_slug`, `idx_essays_topic` (all partial) | carried from the archive |
| `finance_models` | `idx_finance_models_published_order` | `.eq('is_published',true).order('sort_order')` |
| `books_uploads` | `idx_books_uploads_category_uploaded` (partial, live rows) | `useBooks` |
| `council_sessions` | `idx_council_sessions_post_id`, `idx_council_sessions_created_at` | per-essay history, global timeline |
| `admin_audit_log` | `idx_admin_audit_log_created_at` | `useAuditLog`: `order created_at desc limit 500` |
| `admin_audit_log` | `idx_admin_audit_log_user_id`, `idx_admin_audit_log_table_record` | filtering |

`user_roles` gets **no** separate index on `user_id`: the `UNIQUE (user_id, role)` btree
already leads with `user_id`, which serves the `.eq('user_id', uid)` lookup that runs on
every page load.

`idx_essays_slug` from the archive is intentionally not recreated — `essays_slug_unique`
is an identical `(slug)` btree, and a second index on the same column is write cost for
no read benefit.

---

## 7. Referential integrity

| constraint | behaviour | why |
|---|---|---|
| `essays.category_id` → `categories` | `RESTRICT` | no orphan essays (`docs/DECISIONS.md`) |
| `essays.module_id` → `finance_modules` | `RESTRICT` | the archive's `20260220_001` had to delete dependent essays first and accepted the block as correct |
| `categories.section_id` → `sections` | `CASCADE` | a section's categories have no meaning without it |
| `categories.parent_id` → `categories` | `SET NULL` | flatten rather than cascade-delete a subtree |
| `finance_modules.track_slug` → `finance_sections.slug` | `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | the tracks were renamed once already (`planning-forecasting` → `planning`); a rename must propagate, a delete must be blocked loudly |
| `fsli_sections.page_slug` → `fsli_pages.slug` | `ON UPDATE CASCADE`, `ON DELETE CASCADE` | `useUnifiedContent` deletes `fsli_pages` rows directly; without CASCADE that delete fails |
| `council_sessions.post_id` → `essays` | `SET NULL` | deleting an essay must not be blocked by its advisory history |
| `user_roles.user_id`, `profiles.user_id` → `auth.users` | `CASCADE` | account deletion cleans up |
| `admin_audit_log.user_id` → `auth.users` | `SET NULL` | the log outlives the account |

Two FKs point at a **slug**, not an id (`finance_modules.track_slug`,
`fsli_sections.page_slug`): the app addresses both by slug from the route, and both
carry `ON UPDATE CASCADE` so a re-slug propagates.

`essays.fsli_slug` is a plain-text back-reference to `fsli_pages.slug` and is
intentionally **not** a foreign key — it is an optional cross-link, and a dangling one
should render as nothing rather than block a page delete.

`finance_models.module_references` is `uuid[]`. Postgres cannot enforce a FK from an array
element, so it is resolved client-side; a stale id renders as nothing.

---

## 8. Storage

Three public buckets: `essay-images`, `books`, `finance-models`. The `embeds` bucket was
cut with the embeds module.

`storage.objects` already has RLS enabled in a fresh project and is owned by
`supabase_storage_admin`, so policies are added directly and no `ALTER TABLE … ENABLE ROW
LEVEL SECURITY` is issued.

| policy | verb | roles | predicate |
|---|---|---|---|
| `public_buckets_read` | SELECT | `anon`, `authenticated` | `bucket_id IN (…)` |
| `public_buckets_admin_insert` | INSERT | `authenticated` | bucket + inlined admin EXISTS |
| `public_buckets_admin_update` | UPDATE | `authenticated` | bucket + inlined admin EXISTS |
| `public_buckets_admin_delete` | DELETE | `authenticated` | bucket + inlined admin EXISTS |

The admin checks are the inlined `user_roles` form, never `has_role()` — the archive had
already moved essay-image policies to this form ("avoids issues with custom function calls
in storage policies") and it is the form that survives grant changes.

`UPDATE` is needed as well as `INSERT` because `ModelAdminPanel.tsx:46` uploads with
`upsert: true`, which re-uploads over an existing object.

Read is public because all three buckets are `public = true`, so object names are not a
confidentiality boundary, and open SELECT is what makes `getPublicUrl()`-served assets
work for anonymous visitors. **Accepted trade-off:** an anonymous caller can enumerate
object names in these three already-public buckets.

---

## 9. Not carried forward

### Tables (26 cut, 40 → 14)

| cut | why |
|---|---|
| `finance_accounts`, `finance_transactions`, `finance_budgets`, `finance_categories`, `finance_net_worth_history` | the personal-finance tracker — private tooling, not part of the public site |
| the `quant_*` tables | cut with the quant module |
| the `remora_*` tables | cut with the remora module |
| `content_blocks` | the inline-editing surface was dead code |
| `essay_revisions` | revision history; the data is gone and nothing in `src/` reads it |
| `finance_fundamentals` | folded into `finance_modules` by `20260218_001`, dropped by `20260218_003`; `essays.module_id` is the successor to the dropped `essays.fundamental_id` |

Full reasoning in `docs/DECISIONS.md`. Anything wanted back is recoverable from the
`archive/pre-rebuild-history` branch.

### Columns deliberately absent from `essays`

- `fundamental_id` — dropped by `20260218_003`; `types.ts` is stale
- `content_json`, `layout_config` — migration `20260212090000` was authored locally and
  never applied live; `grep -rn "content_json\|layout_config" src/` returns zero hits.
  The editor's `contentJson` is a parsed in-memory TipTap doc derived from the `content`
  text column, not a DB field.
- `tags`, `meta_description`, `deck`, `body`, `published_at` — on the TypeScript
  interface but never DB columns. `deck` is a UI label persisted into `snippet`.
  `docs/DECISIONS.md` records `tags`/`meta_description` as removed precisely because no
  such columns exist.
- the original `UNIQUE (section, phase, slug)` — `essays_slug_unique UNIQUE (slug)` is
  strictly stronger, and the composite enforced nothing whenever `phase IS NULL` (NULLs
  compare distinct in a unique index)

### Edge functions (13 → 1)

Only `council-review` survives, deployed with `verify_jwt = true`.

In the old config all eight `quant-*` and `remora-*` functions ran `verify_jwt = false`
while each constructed a `SUPABASE_SERVICE_ROLE_KEY` client internally — meaning any
unauthenticated caller could drive RLS-bypassing writes. **Nothing in this project ships
with `verify_jwt = false`.** `council-review` never uses a service-role key: all its DB
access runs under the caller's JWT and RLS.

### Storage

The `embeds` bucket, cut with its module.

---

## 10. Known permanent losses

Stated plainly because the schema cannot recover them and no future reader should mistake
an empty table for a broken one:

- every published essay body (`essays.content`) and its `snippet` / `date` / `read_time` /
  `thumbnail_url` / `economist_fields`
- all `content_json` / `layout_config` documents, and the entire `essay_revisions` history
- all `fsli_sections` narrative — the 24 page headers survive, the commentary under them
  does not
- every `books_uploads` row
- every `finance_models` row (the table was created empty and populated only through the
  admin UI)
- every storage object in all four buckets
- `finance_modules.framing_content` for all 49 modules, and `thesis` for 11 of them
- the `finance_sections` row with slug `finance-in-motion` — `20260227153508` *updates* it
  but no migration ever *inserts* it, so it existed in production only. Its slug, icon and
  sort_order are unknown, so it is deliberately not invented. `/finance/finance-in-motion`
  renders without its DB row until the owner re-adds it.
- `finance_settings.featured_finance_essay_id` — pointed at an essay UUID that no longer
  exists; seeded `NULL`. The row must exist because the admin UI `UPDATE`s it rather than
  upserting.
- anything authored through the admin UI at any point

What survived is what lived in migration files: 8 sections, 1 category, 24 `fsli_pages`,
4 `finance_sections`, 2 `finance_settings`, 49 `finance_modules`, 105 essay draft stubs,
plus 1 published placeholder essay written for the rebuild. 194 rows.
