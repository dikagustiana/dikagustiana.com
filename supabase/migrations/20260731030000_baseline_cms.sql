-- =============================================================================
-- BASELINE (fresh project): CMS content tables
--   public.sections, public.categories, public.essays,
--   public.admin_audit_log, public.council_sessions, public.books_uploads
--
-- Final state only. Prerequisites owned by another migration and assumed present:
--   enums   : public.app_role, public.content_status_enum, public.lesson_type_enum
--   function: public.has_role(uuid, app_role), public.update_updated_at_column()
--   tables  : public.user_roles, public.profiles
--   tables  : public.finance_modules (FK target for essays.module_id)
--
-- ---------------------------------------------------------------------------
-- GUARD AGAINST HISTORICAL FAILURE (a): has_role() EXECUTE was revoked from
-- anon/authenticated while RLS policies called it. PostgreSQL requires the
-- CALLING role to hold EXECUTE on any function used in a policy expression --
-- SECURITY DEFINER changes the privileges the function BODY runs with, not the
-- caller's right to invoke it. The revoke therefore turned every policy that
-- called has_role() into "permission denied for function has_role" and took the
-- public site down.
--
-- Fix applied here: no policy below references has_role(). Every admin check is
-- inlined as an EXISTS over public.user_roles. That makes the policies immune to
-- any future grant/revoke on has_role(). has_role() itself is still created and
-- still granted to anon/authenticated by the prerequisite migration so edge
-- functions, RPC callers and future SQL keep working -- but nothing in this file
-- depends on that grant.
--
-- Two prerequisites the inline pattern DOES depend on (see notes at the bottom):
--   1. authenticated must hold SELECT on public.user_roles.
--   2. user_roles RLS must let a user read their OWN rows
--      (policy: USING (auth.uid() = user_id)).
-- Both are satisfied by the user_roles baseline; they are restated as GRANTs
-- here where it is safe to do so.
--
-- GUARD AGAINST HISTORICAL FAILURE (b): the essays SELECT policy was once set to
-- USING (true), which leaked every draft/tone_pending/archived row (and the
-- voice/tone JSONB) through the public PostgREST endpoint. Below, anon gets a
-- SELECT policy of USING (published = true) that references NOTHING else -- no
-- function, no other table -- so anonymous read of a draft cannot regress no
-- matter what happens to has_role() or user_roles.
--
-- auth.uid() is always wrapped as (SELECT auth.uid()) so the planner treats it
-- as a one-time InitPlan instead of re-evaluating it per row (house style, cf.
-- migration 20260728155549 on the sibling project).
-- =============================================================================


-- =============================================================================
-- 1. public.sections
-- =============================================================================

CREATE TABLE public.sections (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  -- Deliberately text + CHECK, not voice_role_enum: the live column is text and
  -- types.ts types it as `string`. Changing it to the enum would change the
  -- generated TypeScript and is out of scope for a like-for-like baseline.
  voice_role  text        NOT NULL CHECK (voice_role IN ('manager', 'economist', 'educator', 'coach', 'hybrid')),
  manifesto   text,
  is_active   boolean     DEFAULT true,
  sort_order  integer     DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- useSections / useWriterSections: .eq('is_active', true).order('sort_order').
CREATE INDEX idx_sections_active_sort ON public.sections (is_active, sort_order);

CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON public.sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sections_select_anon"
  ON public.sections FOR SELECT TO anon
  USING (true);

CREATE POLICY "sections_select_authenticated"
  ON public.sections FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sections_insert_admin"
  ON public.sections FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "sections_update_admin"
  ON public.sections FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "sections_delete_admin"
  ON public.sections FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));


-- =============================================================================
-- 2. public.categories
--    Final constraint state per 20260215_001_enforce_category_hierarchy.sql:
--      - section_id NOT NULL (was nullable at creation; types.ts is stale here)
--      - categories_section_id_fkey -> sections(id) ON DELETE CASCADE
--      - UNIQUE (section_id, slug)  <- the "(section, slug)" uniqueness
--    The FK constraint NAME is load-bearing: PostgREST embeds resolve through it
--    (src/pages/GreenTransitionPhase.tsx:142 and
--     src/domains/writing/hooks/useWriterEssay.ts:11 both spell
--     `sections!categories_section_id_fkey`). Renaming it breaks those queries.
-- =============================================================================

CREATE TABLE public.categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid        NOT NULL,
  slug       text        NOT NULL,
  name       text        NOT NULL,
  parent_id  uuid,
  sort_order integer     DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_section_id_slug_key UNIQUE (section_id, slug),
  -- Hierarchy guard: a category can never be its own parent. Cheap insurance
  -- for anything that walks parent_id; no existing row can violate it.
  CONSTRAINT categories_parent_not_self CHECK (parent_id IS DISTINCT FROM id)
);

ALTER TABLE public.categories
  ADD CONSTRAINT categories_section_id_fkey
  FOREIGN KEY (section_id) REFERENCES public.sections (id) ON DELETE CASCADE;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.categories (id) ON DELETE SET NULL;

-- useCategories / useWriterCategories: .eq('section_id', ...).order('sort_order').
CREATE INDEX idx_categories_section_sort ON public.categories (section_id, sort_order);
-- useCategoryBySlug: .eq('slug', ...) without a section filter.
CREATE INDEX idx_categories_slug ON public.categories (slug);
-- Backs the self-FK's ON DELETE SET NULL scan.
CREATE INDEX idx_categories_parent_id ON public.categories (parent_id) WHERE parent_id IS NOT NULL;

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_anon"
  ON public.categories FOR SELECT TO anon
  USING (true);

CREATE POLICY "categories_select_authenticated"
  ON public.categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "categories_insert_admin"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "categories_update_admin"
  ON public.categories FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "categories_delete_admin"
  ON public.categories FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));


-- =============================================================================
-- 3. public.essays
--
-- Column set = union of every column any of the 61 from('essays') call sites in
-- src/ selects, filters, orders, inserts or updates, cross-checked against the
-- types.ts essays Row.
--
-- DELIBERATELY ABSENT:
--   * fundamental_id  -- dropped by 20260218_003; types.ts is stale.
--   * content_json, layout_config -- migration 20260212090000 was authored
--     locally and never applied live; `grep -rn "content_json|layout_config" src/`
--     returns ZERO hits, so per precedence rule 1 (actual usage wins) they do not
--     exist. The editor's `contentJson` in publishValidation.ts is a parsed
--     in-memory TipTap doc derived from the `content` text column, not a DB field.
--   * tags, meta_description, deck, body, published_at -- these appear on the
--     WritingEssay TypeScript interface but are NOT DB columns. `deck` is a UI
--     label that is persisted into `snippet` (WriterEditor.tsx:333) and into
--     economist_fields.deck; docs/DECISIONS.md records tags/meta_description as
--     removed precisely because no such columns exist.
--   * The original UNIQUE (section, phase, slug) constraint. essays_slug_unique
--     UNIQUE (slug) is strictly stronger, and the composite enforces nothing at
--     all whenever phase IS NULL (NULLs compare as distinct in a unique index).
--     Carrying it would cost write throughput for zero added guarantee, and the
--     app already treats slug as globally unique
--     ("Slug is globally unique -- no need to filter by section",
--      WriterEditor.tsx:167).
-- =============================================================================

CREATE TABLE public.essays (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Denormalised section slug cache. 20260215_001 deliberately kept it ("The
  -- section column becomes denormalized cache, derived from category.section_id")
  -- and src/ still filters on it heavily (EditorialFeed, useEssays,
  -- useFinanceSectionEssays, useAdminEssays, useUnifiedContent).
  section            text        NOT NULL,
  phase              text,
  slug               text        NOT NULL,
  title              text        NOT NULL,
  snippet            text,
  author             text        DEFAULT 'Dika Gustiana',
  -- `date` is TEXT, not DATE: the live column is text and types.ts types it as
  -- `string | null`. It is a display string, not a timestamp.
  date               text,
  read_time          text,
  thumbnail_url      text,
  content            text,

  -- published is the RLS gate. Nullable (matches types.ts `boolean | null`);
  -- `USING (published = true)` correctly excludes NULL as well as false, so a
  -- row with a NULL published is invisible to anon. Fail-closed by construction.
  published          boolean     DEFAULT false,
  status             public.content_status_enum DEFAULT 'draft',

  sort_order         integer     DEFAULT 0,
  is_selected        boolean     NOT NULL DEFAULT false,

  -- NOT NULL *with a DEFAULT*, restoring what the live schema actually had
  -- (20260219_004 pinned the 'finance-general' category to this UUID and then
  -- ran ALTER COLUMN category_id SET DEFAULT on exactly this value).
  --
  -- The default is load-bearing, not decoration. NOT NULL alone -- the shape the
  -- draft shipped -- flips the generated essays.Insert.category_id from optional
  -- to required and breaks every insert path that structurally cannot supply a
  -- category:
  --   * src/components/next-big-thing/EssayDialog.tsx:137 -- the admin "Add
  --     Essay" dialog; its payload has no category field at all.
  --   * src/components/writer/WriterEditor.tsx:346 -- "Attach category_id if
  --     set", i.e. omitted entirely on a new draft with no category chosen.
  --   * supabase/seed.sql:63 -- the e2e fixture essay.
  --   * tests/live/adminGating.spec.ts:48 -- asserts an admin insert of
  --     {section, slug, title, published} SUCCEEDS. With no default it fails,
  --     and the test that proves admin writes work would be testing the wrong
  --     thing.
  -- Relaxing the constraint to nullable was rejected instead: docs/DECISIONS.md
  -- records NOT NULL + FK RESTRICT as the "no orphan essays" guarantee, and the
  -- Writer Studio validates category on every save on top of it. The default
  -- keeps the guarantee and keeps the insert paths working -- an essay without
  -- an explicit category lands in finance/finance-general rather than nowhere.
  --
  -- The referenced row is seeded (pinned to this same UUID) by 04_seed.sql. A
  -- column default is not checked at DDL time, so ordering is fine; the FK is
  -- only evaluated when a row is actually inserted, which cannot happen before
  -- the seed in a fresh project.
  category_id        uuid        NOT NULL
                       DEFAULT '0f111111-1111-4111-8111-111111111111'::uuid,
  module_id          uuid,

  voice_role         text,
  prerequisites      text[],
  learning_outcomes  text[],

  manager_fields     jsonb,
  economist_fields   jsonb,
  educator_fields    jsonb,
  coach_fields       jsonb,
  voice_validated_at timestamptz,

  finance_section    text,
  finance_order      integer,
  lesson_type        public.lesson_type_enum DEFAULT 'concept',

  fsli_slug          text,
  topic              text,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Global slug uniqueness. Named exactly as 20260215_001 / 20260301115326 named
-- it; the editor's generateUniqueSlug() suffix loop exists to satisfy it.
CREATE UNIQUE INDEX essays_slug_unique ON public.essays (slug);

-- category_id: NOT NULL + ON DELETE RESTRICT. The app depends on both -- see
-- docs/DECISIONS.md "Writer Studio: category required on every save"
-- ("essays.category_id is NOT NULL with FK RESTRICT ... the 'no orphan essays'
-- guarantee"). Constraint NAME is load-bearing: useWriterEssay.ts:11 embeds via
-- `categories!essays_category_id_fkey`.
ALTER TABLE public.essays
  ADD CONSTRAINT essays_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories (id) ON DELETE RESTRICT;

-- module_id: nullable, ON DELETE RESTRICT.
--   Nullable because only finance essays carry a module
--   (resolvePlacementFields() nulls module_id for every other section).
--   RESTRICT because that is the behaviour the migration history actually
--   relied on: 20260220_001_fix_production_finance_data.sql had to DELETE the
--   dependent essays FIRST, with the comment "Remove those lessons first so the
--   FK on essays.module_id does not block the curriculum rebuild" -- i.e. the
--   author observed the FK blocking the delete and accepted it as correct.
--   RESTRICT is stated explicitly rather than left as the implicit NO ACTION so
--   the intent is readable, and it matches essays_category_id_fkey: content is
--   never silently orphaned by a parent delete.
ALTER TABLE public.essays
  ADD CONSTRAINT essays_module_id_fkey
  FOREIGN KEY (module_id) REFERENCES public.finance_modules (id) ON DELETE RESTRICT;

-- --- Indexes -----------------------------------------------------------------
-- Carried forward from 20260301070510:
--   module_id + published; finance_section + published.
CREATE INDEX idx_essays_module_published
  ON public.essays (module_id, published)
  WHERE module_id IS NOT NULL;

CREATE INDEX idx_essays_finance_section_published
  ON public.essays (finance_section, published)
  WHERE finance_section IS NOT NULL;

-- idx_essays_slug from 20260301070510 is INTENTIONALLY NOT recreated:
-- essays_slug_unique above is an identical (slug) b-tree that the planner uses
-- for every slug equality lookup. A second index on the same single column adds
-- write cost and zero read benefit. Drop this comment and add the index only if
-- something is found that genuinely needs a non-unique duplicate.

-- Carried forward from 20260211100000 (partial: most rows are NULL).
CREATE INDEX idx_essays_fsli_slug ON public.essays (fsli_slug) WHERE fsli_slug IS NOT NULL;
CREATE INDEX idx_essays_topic     ON public.essays (topic)     WHERE topic IS NOT NULL;

-- Added for observed query patterns:

-- useEssays(): .eq('section') [+ .eq('published')] .order('sort_order').
CREATE INDEX idx_essays_section_published_sort
  ON public.essays (section, published, sort_order);

-- EditorialFeed, useRelatedEssays, GreenTransitionPhase fallback,
-- DevelopmentFinancePhase: .eq('section') ... .order('created_at', desc).
CREATE INDEX idx_essays_section_created
  ON public.essays (section, created_at DESC);

-- useEssays .eq('category_id'), GreenTransitionPhase .in('category_id', ...),
-- and -- more importantly -- the ON DELETE RESTRICT check on
-- essays_category_id_fkey, which must scan essays for referencing rows on every
-- category delete. Without a category_id-leading index that is a seq scan.
CREATE INDEX idx_essays_category_id ON public.essays (category_id);

-- useAdminEssays and useUnifiedContent both list the whole table
-- .order('updated_at', desc) -- the admin content screen's default sort.
CREATE INDEX idx_essays_updated_at ON public.essays (updated_at DESC);

-- useSelectedEssays: .eq('is_selected', true).eq('published', true)
-- .order('created_at', desc).limit(8) -- homepage path, very selective.
CREATE INDEX idx_essays_selected_published
  ON public.essays (created_at DESC)
  WHERE is_selected = true AND published = true;

-- --- Triggers ----------------------------------------------------------------

-- Tone-field gate, from 20260204074340. Rejects a publish whose voice_role's
-- tone JSONB is missing/empty, stamps voice_validated_at, and promotes a draft
-- to tone_pending once its tone fields are filled. Kept as a trigger rather
-- than a CHECK because it also mutates NEW.
CREATE OR REPLACE FUNCTION public.validate_essay_tone_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only enforce for published status
  IF NEW.status = 'published' THEN
    IF NEW.voice_role = 'manager' AND (NEW.manager_fields IS NULL OR NEW.manager_fields = '{}'::jsonb) THEN
      RAISE EXCEPTION 'Manager articles require manager_fields to be published';
    END IF;

    IF NEW.voice_role = 'economist' AND (NEW.economist_fields IS NULL OR NEW.economist_fields = '{}'::jsonb) THEN
      RAISE EXCEPTION 'Economist essays require economist_fields to be published';
    END IF;

    IF NEW.voice_role = 'educator' AND (NEW.educator_fields IS NULL OR NEW.educator_fields = '{}'::jsonb) THEN
      RAISE EXCEPTION 'Educator entries require educator_fields to be published';
    END IF;

    IF NEW.voice_role = 'coach' AND (NEW.coach_fields IS NULL OR NEW.coach_fields = '{}'::jsonb) THEN
      RAISE EXCEPTION 'Coach lessons require coach_fields to be published';
    END IF;

    NEW.voice_validated_at = now();
  END IF;

  -- Auto-promote draft -> tone_pending once tone fields are filled.
  IF NEW.status = 'draft' THEN
    IF (NEW.voice_role = 'manager'   AND NEW.manager_fields   IS NOT NULL AND NEW.manager_fields   != '{}'::jsonb) OR
       (NEW.voice_role = 'economist' AND NEW.economist_fields IS NOT NULL AND NEW.economist_fields != '{}'::jsonb) OR
       (NEW.voice_role = 'educator'  AND NEW.educator_fields  IS NOT NULL AND NEW.educator_fields  != '{}'::jsonb) OR
       (NEW.voice_role = 'coach'     AND NEW.coach_fields     IS NOT NULL AND NEW.coach_fields     != '{}'::jsonb) OR
       (NEW.voice_role = 'hybrid') THEN
      NEW.status = 'tone_pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Deliberately NOT SECURITY DEFINER: it only reads and writes NEW, so it must
-- run with the caller's privileges. No EXECUTE grant is needed or wanted -- a
-- RETURNS trigger function cannot be invoked directly from SQL or PostgREST
-- ("trigger functions can only be called as triggers"), so there is no RPC
-- surface here to lock down.
CREATE TRIGGER validate_essay_tone_fields_trigger
  BEFORE INSERT OR UPDATE ON public.essays
  FOR EACH ROW EXECUTE FUNCTION public.validate_essay_tone_fields();

CREATE TRIGGER update_essays_updated_at
  BEFORE UPDATE ON public.essays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --- RLS: the acceptance-critical part ---------------------------------------

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

-- ANON READ. This is the policy that failure (b) broke by setting it to
-- USING (true). It references no function and no other table, so a draft can
-- never leak through PostgREST regardless of the state of has_role() or
-- user_roles. published IS NULL and published = false are both excluded.
CREATE POLICY "essays_select_anon_published"
  ON public.essays FOR SELECT TO anon
  USING (published = true);

-- AUTHENTICATED READ: published rows for everyone signed in, everything for an
-- admin. Admin check inlined over user_roles -- no has_role() call, so failure
-- (a) cannot recur here either.
CREATE POLICY "essays_select_authenticated"
  ON public.essays FOR SELECT TO authenticated
  USING (
    published = true
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

-- WRITES: admin only, split per verb. No anon write policy exists anywhere, so
-- anonymous INSERT/UPDATE/DELETE is denied by default. A signed-in non-admin
-- fails the EXISTS and is denied too.
CREATE POLICY "essays_insert_admin"
  ON public.essays FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "essays_update_admin"
  ON public.essays FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "essays_delete_admin"
  ON public.essays FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));


-- =============================================================================
-- 4. public.admin_audit_log  (from 20260622140914)
--    Consumers: src/lib/auditLog.ts:28-63 (insert), src/hooks/queries/useAuditLog.ts:41-67
--    (select * order created_at desc limit 500). Both go through an
--    `as unknown as` cast because the generated types predate the table -- so
--    the column names below must match the insert payload exactly.
--    Append-only, on TWO independent layers, by design -- an audit trail an
--    admin can rewrite is not an audit trail:
--      1. RLS: there is no UPDATE and no DELETE policy, so both are denied.
--      2. Privileges: authenticated holds only SELECT and INSERT.
--    Layer 2 only exists because the grant block at the bottom of this file
--    REVOKEs first. Supabase's ALTER DEFAULT PRIVILEGES grants ALL on every new
--    public table to anon and authenticated, and GRANT cannot subtract -- so
--    without that REVOKE this table would have been UPDATE-able and DELETE-able
--    at the privilege layer, leaving RLS as the sole barrier and the
--    "second, independent barrier" claim untrue. Do not remove the REVOKE.
-- =============================================================================

CREATE TABLE public.admin_audit_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
  user_email     text,
  action         text        NOT NULL,
  table_name     text        NOT NULL,
  -- record_id is TEXT, not uuid: the log is table-agnostic and must be able to
  -- record a non-uuid key. types.ts types it `string | null`.
  record_id      text,
  record_title   text,
  record_slug    text,
  record_section text,
  changes        jsonb,
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- useAuditLog's only server-side ordering: created_at DESC, limit 500.
CREATE INDEX idx_admin_audit_log_created_at    ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_user_id       ON public.admin_audit_log (user_id);
CREATE INDEX idx_admin_audit_log_table_record  ON public.admin_audit_log (table_name, record_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_log_select_admin"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

-- An admin may only write rows attributed to themselves, so the log cannot be
-- forged onto another user.
CREATE POLICY "admin_audit_log_insert_admin"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );


-- =============================================================================
-- 5. public.council_sessions  (from 20260704080000)
--    Consumers: src/hooks/queries/useCouncil.ts (select * order created_at desc
--    limit 20, optionally filtered by post_id / mode) and
--    supabase/functions/council-review/index.ts:182-194, which inserts WITHOUT
--    created_by and relies on the DEFAULT auth.uid(). That works because the
--    edge function builds its client with the publishable/anon key plus the
--    caller's Authorization header (index.ts:87-89), so auth.uid() resolves to
--    the signed-in admin and RLS is evaluated as that user.
--    Admin-only on every verb: transcripts embed unpublished draft content.
-- =============================================================================

CREATE TABLE public.council_sessions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid        REFERENCES public.essays (id) ON DELETE SET NULL,
  mode              text        NOT NULL CHECK (mode IN ('brainstorm', 'review')),
  input_snapshot    text        NOT NULL,
  advisors_config   jsonb       NOT NULL,
  advisor_responses jsonb       NOT NULL,
  peer_reviews      jsonb       NOT NULL,
  verdict           jsonb       NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  -- NOT NULL DEFAULT auth.uid(): the edge function never sends this column.
  created_by        uuid        NOT NULL DEFAULT auth.uid()
);

-- post_id ON DELETE SET NULL (not RESTRICT, unlike essays' own parents):
-- deleting an essay must not be blocked by its advisory history, and the
-- transcript still has standalone value via input_snapshot.

-- Per-essay history (newest first) and the global timeline.
CREATE INDEX idx_council_sessions_post_id
  ON public.council_sessions (post_id, created_at DESC);
CREATE INDEX idx_council_sessions_created_at
  ON public.council_sessions (created_at DESC);

ALTER TABLE public.council_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "council_sessions_select_admin"
  ON public.council_sessions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "council_sessions_insert_admin"
  ON public.council_sessions FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "council_sessions_update_admin"
  ON public.council_sessions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "council_sessions_delete_admin"
  ON public.council_sessions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));


-- =============================================================================
-- 6. public.books_uploads
--    Consumers: src/hooks/queries/useBooks.ts (select *, .eq('category'),
--    .order('uploaded_at', desc); select category; select * by id),
--    src/pages/BooksList.tsx, BookReader.tsx, BooksCategories.tsx,
--    BooksAcademia.tsx. All read-only -- src/ contains no insert/update/delete
--    against this table, so writes are admin-only purely as a guard.
--    Soft delete: no consumer filters deleted_at, so the RLS policies do it.
-- =============================================================================

CREATE TABLE public.books_uploads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text        NOT NULL,
  filepath    text        NOT NULL,
  filename    text        NOT NULL,
  mime_type   text,
  size_bytes  integer,
  title       text,
  author      text,
  year        integer,
  cover_path  text,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- useBooks: optional .eq('category') then .order('uploaded_at', desc), always
-- over live rows only (the RLS predicate adds deleted_at IS NULL).
CREATE INDEX idx_books_uploads_category_uploaded
  ON public.books_uploads (category, uploaded_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.books_uploads ENABLE ROW LEVEL SECURITY;

-- Public catalogue, minus soft-deleted rows. No has_role, no user_roles.
CREATE POLICY "books_uploads_select_anon"
  ON public.books_uploads FOR SELECT TO anon
  USING (deleted_at IS NULL);

CREATE POLICY "books_uploads_select_authenticated"
  ON public.books_uploads FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "books_uploads_insert_admin"
  ON public.books_uploads FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "books_uploads_update_admin"
  ON public.books_uploads FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "books_uploads_delete_admin"
  ON public.books_uploads FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));


-- =============================================================================
-- 7. Table privileges
--
-- RLS is only consulted AFTER the grant check: a table with perfect policies but
-- no GRANT returns "permission denied for table" from PostgREST.
--
-- The REVOKE line is what makes the grant list mean anything. Supabase ships
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES
--     TO postgres, anon, authenticated, service_role;
-- so every table above was born with ALL already granted to anon and
-- authenticated, and GRANT is additive -- it cannot take that away. The draft
-- claimed these grants were "a second, independent barrier behind the no-anon-
-- write-policy rule"; without the REVOKE that claim was false, because anon
-- still held INSERT/UPDATE/DELETE underneath (RLS was the ONLY barrier, and
-- admin_audit_log's append-only guarantee rested on the same illusion -- the
-- table was UPDATE-able and DELETE-able at the privilege layer despite the
-- deliberately absent policies). Revoking first makes the barrier real.
-- =============================================================================

REVOKE ALL ON
    public.sections,
    public.categories,
    public.essays,
    public.admin_audit_log,
    public.council_sessions,
    public.books_uploads
  FROM anon, authenticated;

GRANT SELECT                         ON public.sections        TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections        TO authenticated;
GRANT ALL                            ON public.sections        TO service_role;

GRANT SELECT                         ON public.categories      TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories      TO authenticated;
GRANT ALL                            ON public.categories      TO service_role;

GRANT SELECT                         ON public.essays          TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.essays          TO authenticated;
GRANT ALL                            ON public.essays          TO service_role;

-- Append-only: no UPDATE, no DELETE for authenticated, matching the absent
-- UPDATE/DELETE policies.
GRANT SELECT, INSERT                 ON public.admin_audit_log TO authenticated;
GRANT ALL                            ON public.admin_audit_log TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.council_sessions TO authenticated;
GRANT ALL                            ON public.council_sessions TO service_role;

GRANT SELECT                         ON public.books_uploads   TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books_uploads   TO authenticated;
GRANT ALL                            ON public.books_uploads   TO service_role;

-- Prerequisite for the inline admin checks above: the EXISTS subqueries run as
-- the calling role, so `authenticated` must hold SELECT on user_roles AND
-- user_roles' own RLS must let a user see their own rows. Restated here so this
-- file is not silently dependent on grant ordering.
--
-- This is a GRANT and deliberately NOT part of the REVOKE list above:
-- 01_foundation.sql owns user_roles' privilege set (anon keeps SELECT there on
-- purpose, so that a policy inlining the user_roles EXISTS evaluates to false
-- for anon instead of erroring with "permission denied for table user_roles").
-- Re-revoking it here would silently undo that.
GRANT SELECT ON public.user_roles TO authenticated;