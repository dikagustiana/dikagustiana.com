-- ============================================================================
-- BASELINE MIGRATION -- FOUNDATION LAYER (part 1 of the clean rebuild)
-- dikagustiana.com / fresh Supabase Postgres 17 project.
--
-- FINAL STATE ONLY. The 43 historical migrations are not replayed.
-- This file owns: kept enums, shared functions, public.user_roles,
-- public.profiles, the auth.users signup trigger, and the three kept storage
-- buckets. Content tables (essays, fsli_*, books_uploads, finance_*,
-- council_sessions, admin_audit_log) are authored in later parts.
--
-- THE TWO HISTORICAL FAILURES THIS FILE IS DESIGNED NOT TO REINTRODUCE
--
-- (a) 20260622135932 ran
--       REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)
--         FROM anon, authenticated, PUBLIC;
--     while live RLS policies still called has_role() in the anon/authenticated
--     context. Postgres checks EXECUTE against the CALLING role for any
--     function used in a policy expression -- SECURITY DEFINER changes the
--     privileges the function BODY runs with, not the caller's right to invoke
--     it. Every gated query started failing with "permission denied for
--     function has_role" and the public site went down until 20260627190000
--     re-granted EXECUTE.
--     GUARD: has_role() is created and granted to `authenticated` (types.ts
--     declares it, edge functions and future SQL may call it) but NOT to anon,
--     and no policy in this baseline depends on it except the single INSERT
--     policy on public.user_roles itself, where inlining is impossible -- see
--     the recursion note in section 3.
--     Every other admin check is INLINED as
--       EXISTS (SELECT 1 FROM public.user_roles ur
--                WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin')
--     so a future grant change cannot take the site down again.
--
-- (b) 20260301073018 replaced the published-gated essays SELECT policy with
--     USING (true), leaking every draft row through PostgREST. The repair
--     (20260627190100) split it by role so the anon path never references
--     has_role(). essays itself lives in a later part of the baseline; the
--     role-split, has_role-free anon-read pattern is established here.
--
-- Cross-cutting conventions used throughout:
--   * ENABLE ROW LEVEL SECURITY on every table, with explicit policies only
--     (deny by default -- no table ships policy-less).
--   * auth.uid() is always wrapped as (SELECT auth.uid()) so the planner
--     hoists it into an InitPlan and evaluates it once per statement instead
--     of once per row (house style, cf. sibling migration 20260728155549).
--   * Read and write policies are split, never FOR ALL, and every policy names
--     its roles with TO anon / TO authenticated.
-- ============================================================================


-- ============================================================================
-- 1. ENUMS (kept set only)
-- ----------------------------------------------------------------------------
-- Value lists taken verbatim from src/integrations/supabase/types.ts Enums
-- (lines 1829-1851 / 1977-2001) and cross-checked against the migrations that
-- created them. The cut modules' enums (account_type, transaction_type) are
-- deliberately absent.
-- ============================================================================

-- 20251223113138
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 20260204074340 (created unqualified there, landed in public)
CREATE TYPE public.voice_role_enum AS ENUM (
  'manager',
  'economist',
  'educator',
  'coach',
  'hybrid'
);

-- 20260204074340
CREATE TYPE public.content_status_enum AS ENUM (
  'draft',
  'tone_pending',
  'published',
  'archived'
);

-- 20260219_001
CREATE TYPE public.lesson_type_enum AS ENUM (
  'concept',            -- explanatory essay (default)
  'framework',          -- structured decision framework
  'case-study',         -- applied case analysis
  'exercise',           -- practice problem or walkthrough
  'model-walkthrough'   -- step-by-step model build
);

-- 20260301075250
CREATE TYPE public.model_depth AS ENUM (
  'foundation',
  'executive',
  'institutional'
);


-- ============================================================================
-- 2. SHARED FUNCTIONS (table-independent ones)
-- ----------------------------------------------------------------------------
-- public.has_role() is defined in section 3 instead of here, immediately after
-- public.user_roles exists: it is LANGUAGE sql, and Postgres parses and
-- validates a SQL function body at CREATE time, so it cannot be created before
-- the table it reads. handle_new_user() is plpgsql (body not validated at
-- CREATE time) and may safely forward-reference public.profiles.
--
-- Both original functions set search_path = public; that hardening is kept.
-- update_updated_at_column() was NOT SECURITY DEFINER originally and stays
-- that way -- it only touches the NEW record.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ON CONFLICT DO NOTHING is an addition to the 20251223113138 original.
  -- A raised exception here aborts the whole auth.users INSERT, i.e. signup
  -- fails outright; making the trigger idempotent removes that failure mode
  -- (re-seeded fixtures, retried signups, a pre-existing profile row).
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

-- Keep the 20260622135932 hardening for THIS function: unlike a function used
-- in an RLS policy expression, EXECUTE on a trigger function is checked when
-- the trigger is CREATED, not when it fires. Revoking here therefore cannot
-- break signup the way the has_role revoke broke reads (failure (a)).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Signup trigger: seeds public.profiles from auth.users. EXECUTE is intentionally revoked from anon/authenticated -- trigger EXECUTE is checked at CREATE TRIGGER time, not at fire time.';


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS
  'BEFORE UPDATE trigger helper: stamps updated_at = now(). Not SECURITY DEFINER (matches the original) -- it only mutates the NEW record.';


-- ============================================================================
-- 3. public.user_roles
-- ----------------------------------------------------------------------------
-- Columns verified against types.ts:1795-1815 (Row/Insert/Update):
--   id uuid (Insert optional -> default), user_id uuid (Insert required),
--   role app_role (Insert optional -> default), created_at timestamptz
--   (Insert optional -> default). Relationships: [] because the only FK
--   targets auth.users, which is outside the exposed schema.
-- ============================================================================

CREATE TABLE public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL DEFAULT 'user',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- No separate index on user_id: the UNIQUE (user_id, role) constraint's btree
-- already has user_id as its leading column, which serves the
-- .eq('user_id', uid) lookup that runs on every page load.

-- ----------------------------------------------------------------------------
-- has_role(): defined here because its SQL body reads user_roles.
--
-- It is SECURITY DEFINER so its body runs as the table owner and BYPASSES RLS
-- on user_roles. That property is what makes it usable inside user_roles' own
-- policies without tripping "infinite recursion detected in policy for
-- relation user_roles".
--
-- EXECUTE is granted to `authenticated` ONLY (plus service_role). It is NOT
-- granted to anon, and the implicit PUBLIC grant that CREATE FUNCTION hands out
-- is revoked explicitly.
--
-- Why not anon (this reverses the draft, which granted to anon "for symmetry
-- with the historical repair"): every function in the `public` schema is
-- exposed by PostgREST as POST /rest/v1/rpc/<name>. Granting EXECUTE to anon
-- therefore publishes has_role() as an anonymous oracle over user_roles --
-- anyone could ask "is <uuid> an admin?" and get a truthful answer, which is
-- exactly what the user_roles SELECT policy (own rows only) exists to prevent.
-- The grant would have defeated that table's only read policy from outside it.
--
-- Why this does NOT reintroduce failure (a): failure (a) was a policy calling
-- has_role() in a role that lacked EXECUTE. No policy in this baseline is
-- evaluated as anon and calls has_role() -- the anon policies are bare column
-- tests (essays: published = true) or USING (true), and every admin check
-- outside user_roles is an inlined EXISTS. The only has_role() callers are the
-- user_roles write policies below, which are TO authenticated, and authenticated
-- keeps the grant. Revoking from anon removes an oracle; it breaks nothing.
--
-- The residual, accepted exposure: an authenticated non-admin can still call
-- rpc/has_role with someone else's uuid and learn whether that account is an
-- admin. That is the price of the grant the user_roles write policies need, it
-- requires already knowing a user's uuid, and it leaks one boolean. It is
-- strictly smaller than the anonymous version.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Revoke BEFORE granting, and revoke from anon BY NAME -- not just from PUBLIC.
-- Two separate grants have to be removed here and PUBLIC only covers one:
--   1. CREATE FUNCTION grants EXECUTE to PUBLIC implicitly.
--   2. Supabase ships
--        ALTER DEFAULT PRIVILEGES IN SCHEMA public
--          GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
--      which grants EXECUTE to anon *explicitly, by name*, at CREATE time.
-- Revoking only from PUBLIC leaves grant 2 in place and anon keeps EXECUTE, so
-- rpc/has_role stays an anonymous "is <uuid> an admin?" oracle. Verified against
-- a local Postgres 16 with Supabase's default privileges replayed: with
-- FROM PUBLIC alone, `SET ROLE anon; SELECT public.has_role(<admin uuid>,
-- 'admin')` still returned true. Naming anon closes it.
-- This is the same trap as the table grants further down: on managed Supabase a
-- privilege is never absent by default, only ever explicitly taken away.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'DO NOT REVOKE EXECUTE FROM authenticated. Postgres checks EXECUTE against the CALLING role for functions used in RLS policy expressions; SECURITY DEFINER does not exempt the caller. Revoking it (migration 20260622135932) broke every gated read and took the public site down until 20260627190000 restored the grant. In this schema only the user_roles write policies call it -- every other admin check inlines the user_roles EXISTS -- so a revoke would break role writes, not reads. Deliberately NOT granted to anon: PostgREST exposes every public function as /rpc/, and an anon grant would turn this into a public "is <uuid> an admin?" oracle that defeats the own-rows-only SELECT policy on user_roles.';

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- READ: a signed-in user sees only their own role rows.
-- Required by src/contexts/AuthContext.tsx:23-36 and
-- supabase/functions/council-review/index.ts:100-106, both of which run
-- .select('role').eq('user_id', uid).eq('role','admin').maybeSingle() as the
-- authenticated role. Deliberately has_role()-free: the admin probe that gates
-- the entire admin UI must never depend on a function grant. A non-admin
-- matches zero rows, so maybeSingle() returns null rather than an error --
-- which is exactly what AuthContext and adminGating.spec.ts:25-34 expect.
CREATE POLICY "user_roles_select_own"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- NOTE -- there is deliberately NO "admins can read all roles" SELECT policy.
-- Permissive policies for the same command are ORed into a single expression
-- and Postgres does not promise to short-circuit it, so a second SELECT policy
-- of the form USING (public.has_role(...)) would make the combined expression
--   user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin')
-- and would drag the has_role EXECUTE grant straight back into AuthContext's
-- hot path -- the exact query that failure (a) took down. Keeping the only
-- SELECT policy on this table has_role()-free means a future grant change can
-- at worst break role WRITES; it can never break sign-in or the public site.
-- Consequence: enumerating other users' roles is a service_role / SQL-editor
-- operation, not a PostgREST one.

-- ----------------------------------------------------------------------------
-- WRITE: INSERT only, admin only.
--
-- This is the ONLY policy in the baseline that calls has_role(). It is off the
-- public read path, and the call is unavoidable here: inlining
--   EXISTS (SELECT 1 FROM public.user_roles ...)
-- into a policy ON public.user_roles raises
--   ERROR: infinite recursion detected in policy for relation "user_roles"
-- has_role() is SECURITY DEFINER, so its body bypasses RLS and breaks the
-- cycle. See the COMMENT ON FUNCTION above: the authenticated EXECUTE grant
-- must survive.
--
-- WHY THERE IS NO UPDATE AND NO DELETE POLICY (re-derived; the draft had both
-- and neither worked). Postgres applies a table's SELECT policies to the rows
-- an UPDATE or DELETE READS, not just its UPDATE/DELETE policy. The only SELECT
-- policy here is the own-row one, so:
--   * a targeted admin `UPDATE ... WHERE user_id = <someone else>` matched zero
--     rows and returned success -- a silent no-op, the worst possible shape for
--     a privilege operation;
--   * the only DELETE that ever worked was the UNQUALIFIED one, and because the
--     visible row set is the caller's own rows, `DELETE FROM user_roles` run by
--     an admin deleted the admin's OWN role and nothing else. A footgun that
--     locks the owner out of their own site.
-- Shipping policies that report success while doing nothing is worse than not
-- having them, so they are gone. Role revocation and role edits are service_role
-- / SQL-editor operations (both bypass RLS), which is what they already were in
-- practice: `grep -rn "from('user_roles')" src/` hits only AuthContext's own-row
-- read. Nothing in the app administers roles.
--
-- The rejected alternative, recorded so it is not "fixed" later by accident:
-- adding a `USING (public.has_role((SELECT auth.uid()),'admin'))` SELECT policy
-- would make targeted UPDATE/DELETE work, but permissive SELECT policies are
-- ORed, so AuthContext's sign-in probe would start evaluating
--   user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin')
-- and a future revoke of that EXECUTE grant would take sign-in -- and with it
-- the public site -- down. That is failure (a), exactly. If a role-admin UI is
-- ever wanted, expose it through a SECURITY DEFINER RPC that does its own admin
-- check; do not touch the SELECT policy on this table.
-- ----------------------------------------------------------------------------
CREATE POLICY "user_roles_insert_admin"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

-- INSERT caveat: over PostgREST this works with the default
-- `Prefer: return=minimal`. An admin who chains `.select()` onto the insert asks
-- PostgREST to read the new row back, which the own-rows-only SELECT policy
-- refuses for another user's row -- the INSERT commits, the response errors.
-- Insert without .select(), or grant roles from the SQL editor.

-- ----------------------------------------------------------------------------
-- PRIVILEGE-ESCALATION GUARD (defense in depth).
-- RESTRICTIVE policies are ANDed with the permissive set, so no authenticated
-- session can create a role row for ITSELF no matter how the permissive admin
-- check above is later edited. A non-admin is already blocked by the permissive
-- policy; this makes self-granting structurally impossible rather than merely
-- unauthorised.
-- NULL-safe by construction: if auth.uid() were NULL the comparison yields
-- NULL, which RLS treats as false -- it fails closed.
-- Consequence: role rows for one's own account must be written by service_role
-- or in SQL (both bypass RLS). See the bootstrap note below.
-- There is no matching RESTRICTIVE UPDATE policy because there is no permissive
-- UPDATE policy for it to narrow -- UPDATE is denied outright by RLS default.
-- ----------------------------------------------------------------------------
CREATE POLICY "user_roles_no_self_grant_insert"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id <> (SELECT auth.uid()));

-- ----------------------------------------------------------------------------
-- BOOTSTRAP NOTE: with the policies above, no client-side role can mint the
-- FIRST admin -- an admin is required to grant admin, and self-grants are
-- blocked outright. That is intentional. The first admin row must be inserted
-- out of band, by a caller that bypasses RLS:
--   * supabase/seed.sql does this for the e2e fixtures (runs as superuser
--     during `supabase db reset`), and
--   * production bootstrap is a one-off service_role / SQL-editor INSERT:
--       INSERT INTO public.user_roles (user_id, role)
--       VALUES ('<auth.users.id>', 'admin');
-- ----------------------------------------------------------------------------

-- Table privileges.
--
-- READ THIS BEFORE EDITING: on managed Supabase a bare GRANT list is NOT a
-- restriction. The platform ships
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES
--     TO postgres, anon, authenticated, service_role;
-- so every table created by a migration is born with ALL privileges already
-- granted to anon and authenticated. GRANT is additive and cannot take that
-- away. Listing "GRANT SELECT ... TO anon" therefore documents an intention
-- while changing nothing -- anon still holds INSERT/UPDATE/DELETE underneath.
-- Only an explicit REVOKE makes the privilege layer a real second barrier
-- behind RLS. Every table in this baseline is revoked first, then granted.
--
-- anon keeps SELECT on purpose: it has NO policy on this table, so an anon
-- read returns zero rows, AND any policy elsewhere that inlines the
-- user_roles EXISTS check evaluates to false for anon instead of erroring with
-- "permission denied for table user_roles". A privilege-layer revoke of SELECT
-- would recreate failure (a) one layer down -- do not add one.
-- authenticated needs SELECT for the same reason in reverse: the inlined
-- EXISTS pattern used by the storage policies (and by the content tables in
-- later parts of the baseline) reads this table as the calling role.
-- authenticated gets INSERT and NOT update/delete, matching the policy set:
-- there is no UPDATE or DELETE policy on this table, so the privilege would be
-- unusable anyway -- and revoking it means a future permissive policy added by
-- mistake still cannot write without someone also re-granting.
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT                 ON public.user_roles TO anon;
GRANT SELECT, INSERT         ON public.user_roles TO authenticated;
GRANT ALL                    ON public.user_roles TO service_role;

COMMENT ON TABLE public.user_roles IS
  'Role assignments. Read: own rows only, via a policy that never calls has_role() (protects the sign-in path). Write: admin only, and never for one''s own user_id (RESTRICTIVE self-grant block). First admin must be seeded via service_role/SQL.';


-- ============================================================================
-- 4. public.profiles + the auth.users signup trigger
-- ----------------------------------------------------------------------------
-- Columns verified against types.ts:985-1011. The app never reads this table
-- (grep from('profiles') in src/ returns zero hits) but it is kept because
-- tests/live/realAuth.spec.ts:51 asserts a signed-in client can select its own
-- profile row, and supabase/seed.sql relies on the trigger to create rows.
-- ============================================================================

CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text,
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- PERMISSIVE, deliberately. Migration 20260203043313 recreated this policy
-- AS RESTRICTIVE and left no permissive SELECT policy behind. Restrictive
-- policies only narrow an existing permissive grant -- they never grant -- so
-- that combination returns zero rows to everybody, silently. Not reproduced.
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- No DELETE policy and no anon policy of any kind: rows are removed by the
-- ON DELETE CASCADE from auth.users, and anonymous visitors get nothing.

-- REVOKE first -- see the note on Supabase default privileges above. Without it
-- anon would silently retain the ALL grant the platform hands to every new
-- table, and "no anon grant at all" would be a claim rather than a fact.
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL                    ON public.profiles TO service_role;

-- The signup trigger writes through handle_new_user(), which is SECURITY
-- DEFINER and owned by the migration role -- a table owner bypasses RLS, so
-- the insert is not blocked by profiles_insert_own (auth.uid() is NULL during
-- the gotrue signup transaction).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 5. STORAGE BUCKETS (kept set only: essay-images, books, finance-models)
-- ----------------------------------------------------------------------------
-- The 'embeds' bucket from 20251223120457 is cut along with the embeds module.
--
-- storage.objects already has RLS enabled in a fresh Supabase project and is
-- owned by supabase_storage_admin, so no ALTER TABLE ... ENABLE ROW LEVEL
-- SECURITY is issued (and none is needed); policies are added directly.
--
-- Every admin check below is the INLINED user_roles EXISTS form, never
-- has_role(). 20260211100001 already moved the essay-images policies to this
-- form ("avoids issues with custom function calls in storage policies") and it
-- is the form that survives function-grant changes -- see failure (a).
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('essay-images',   'essay-images',   true),
  ('books',          'books',          true),
  ('finance-models', 'finance-models', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- READ: public. Restores the public-read policies that 20260622135932 replaced
-- with an admin-only listing policy. All three buckets are public = true, so
-- object names in them are not a confidentiality boundary; keeping SELECT open
-- is what makes getPublicUrl()-served assets work for anonymous visitors
-- (src/pages/BookReader.tsx:19, and the essay-images / finance-models URLs
-- persisted in content rows) regardless of storage-api routing details.
-- Trade-off accepted: an anonymous caller can enumerate object names in these
-- three already-public buckets.
CREATE POLICY "public_buckets_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('essay-images', 'books', 'finance-models'));

-- WRITE: admin only.
-- Observed upload paths: essay-images from src/domains/writing/WriterStudio.tsx:215,
-- src/components/editorial/ImageUploader.tsx:122 and
-- src/components/editorial/FigureUploader.tsx:153 (all upsert:false);
-- finance-models from src/components/finance-in-action/ModelAdminPanel.tsx:46
-- with upsert:true -- which re-uploads over an existing object and therefore
-- needs the UPDATE policy as well as INSERT. books is read-only from the app.
CREATE POLICY "public_buckets_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('essay-images', 'books', 'finance-models')
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'admin'
    )
  );

CREATE POLICY "public_buckets_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('essay-images', 'books', 'finance-models')
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id IN ('essay-images', 'books', 'finance-models')
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'admin'
    )
  );

CREATE POLICY "public_buckets_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('essay-images', 'books', 'finance-models')
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'admin'
    )
  );

-- END OF FOUNDATION LAYER