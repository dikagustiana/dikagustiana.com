-- =============================================================================
-- BASELINE SECTION: FINANCE CURRICULUM (public content)
--   public.finance_sections   -- the 4 tracks
--   public.finance_modules    -- modules within a track
--   public.finance_models     -- "Finance in Action" downloadable models
--   public.finance_settings   -- key/value config for the finance landing page
--   public.fsli_pages         -- FSLI reference pages
--   public.fsli_sections      -- editable content sections of an FSLI page
--
-- The personal-finance TRACKER (finance_accounts / finance_transactions /
-- finance_budgets / finance_categories / finance_net_worth_history) and the
-- superseded finance_fundamentals table are deliberately NOT part of this
-- rebuild. finance_fundamentals was folded into finance_modules by
-- 20260218_001 and dropped by 20260218_003; essays.module_id is the successor
-- to the dropped essays.fundamental_id.
--
-- Assumes already created earlier in the baseline: public.app_role,
-- public.model_depth, public.user_roles, public.has_role(uuid, app_role),
-- public.update_updated_at_column().
--
-- RLS DESIGN NOTE (guards historical failure (a)) -----------------------------
-- Every admin-write policy below INLINES the role lookup:
--     EXISTS (SELECT 1 FROM public.user_roles ur
--             WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin')
-- rather than calling public.has_role(). Postgres evaluates a policy
-- expression with the CALLING role's privileges -- SECURITY DEFINER changes
-- the privileges of the function BODY, not the caller's right to invoke the
-- function. 20260622135932 revoked EXECUTE on has_role() from anon and
-- authenticated while dozens of policies still called it, which turned every
-- gated read into "permission denied for function has_role" and took the
-- public site down (repaired by 20260627190000). Inlining the EXISTS makes
-- these policies structurally immune to that class of failure: no policy here
-- depends on any function grant. user_roles is readable by anon/authenticated
-- at the table level, so the sub-select never needs elevated privileges.
--
-- auth.uid() is wrapped as (SELECT auth.uid()) throughout -- the initplan
-- pattern. Postgres hoists the scalar sub-select out of the per-row filter, so
-- it is evaluated once per statement instead of once per row. Verified on PG16:
-- the whole EXISTS collapses to an InitPlan under EXPLAIN of an admin UPDATE.
--
-- DEPENDENCY, and the one way this pattern can still be broken: a sub-select
-- inside a policy is subject to the TARGET table's own RLS. public.user_roles
-- must therefore keep a SELECT policy that lets a caller read their own rows --
-- the original is 20251223113138's
--     "Users can view their own roles" FOR SELECT USING (auth.uid() = user_id)
-- -- and authenticated must hold table-level SELECT on user_roles. If that
-- policy is dropped or narrowed to admins only, every EXISTS below silently
-- evaluates FALSE and admins lose all write access. (Confirmed by testing: with
-- RLS on user_roles and no readable SELECT policy, admin INSERTs fail with
-- "new row violates row-level security policy".)
-- =============================================================================


-- =============================================================================
-- 1. public.finance_sections -- the 4 finance tracks
-- Consumers: src/hooks/queries/useFinance.ts:23-58 (select * order sort_order;
--   select * eq slug single; update {title, description, sort_order} by id),
--   src/pages/FinanceLanding.tsx (id, slug, sort_order, title, description),
--   FinanceTrackIndex.tsx (title, description), FinanceWorkspace.tsx
--   (id, slug, title, description -- admin editor).
-- =============================================================================

CREATE TABLE public.finance_sections (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text        NOT NULL UNIQUE,
  title       text        NOT NULL,
  description text,
  icon        text,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_finance_sections_updated_at
  BEFORE UPDATE ON public.finance_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_sections ENABLE ROW LEVEL SECURITY;

-- Table-level grants are stated explicitly rather than relying on Supabase's
-- ALTER DEFAULT PRIVILEGES: a missing grant is the other way a public page
-- dies with "permission denied", and RLS -- not the grant -- is what gates rows.
-- REVOKE before GRANT. On managed Supabase, ALTER DEFAULT PRIVILEGES has already
-- granted ALL on this table to anon and authenticated, and GRANT is additive --
-- so the grant list below only becomes a real restriction after the revoke.
-- Without it, "anon holds SELECT only" is an intention, not a fact.
REVOKE ALL ON public.finance_sections FROM anon, authenticated;
GRANT SELECT                         ON public.finance_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_sections TO authenticated;
GRANT ALL                            ON public.finance_sections TO service_role;

CREATE POLICY "Anon can read finance sections"
  ON public.finance_sections FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can read finance sections"
  ON public.finance_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert finance sections"
  ON public.finance_sections FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can update finance sections"
  ON public.finance_sections FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can delete finance sections"
  ON public.finance_sections FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

-- FINAL slug set. 20260218_001 renamed planning-forecasting -> planning and
-- financial-analytics -> analytics to match the /finance/:track routes; the
-- old slugs must never reappear because finance_modules.track_slug and
-- essays.finance_section both key off these values.
-- Descriptions/icons are the post-20260220_001 production values.
INSERT INTO public.finance_sections (slug, title, description, icon, sort_order) VALUES
  ('fundamentals',      'Fundamentals',
   'The 12 foundational ideas that everything else builds on.', 'Landmark',   1),
  ('strategic-finance', 'Strategic Finance',
   'Where finance meets strategy. Capital allocation, investment decisions, and long-term value creation.', 'Target', 2),
  ('planning',          'Planning & Forecasting',
   'Translating strategy into numbers. Assumptions, scenarios, and action triggers.', 'BarChart3', 3),
  ('analytics',         'Financial Analytics',
   'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.', 'TrendingUp', 4);


-- =============================================================================
-- 2. public.finance_modules -- modules inside a track
-- Consumers: src/hooks/queries/useFinance.ts (select * eq track_slug order
--   sort_order; select id, slug eq track_slug; select * order track_slug,
--   sort_order; select * eq slug single), useFinanceTrackEssays.ts (select id
--   eq track_slug), FinanceTrackIndex.tsx (slug, title, thesis, sort_order),
--   FinanceModulePage.tsx (title, thesis, sort_order, framing_content,
--   module_meta->>variant), FinanceWorkspace.tsx (group by track_slug; admin
--   update {title, thesis, sort_order, framing_content} by id),
--   FinanceModelDetail.tsx (resolves finance_models.module_references -> id).
-- =============================================================================

CREATE TABLE public.finance_modules (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- ON UPDATE CASCADE: the track slugs have been renamed once already
  -- (planning-forecasting -> planning); a future rename must propagate instead
  -- of orphaning every module. ON DELETE RESTRICT: the 4 tracks are fixed
  -- navigation entry points, so deleting one out from under its modules is a
  -- mistake to block loudly, not to cascade silently into content loss.
  track_slug      text        NOT NULL REFERENCES public.finance_sections (slug)
                                ON UPDATE CASCADE ON DELETE RESTRICT,
  slug            text        NOT NULL UNIQUE,
  title           text        NOT NULL,
  thesis          text,
  sort_order      integer     NOT NULL DEFAULT 0,
  framing_content text,
  -- {"variant":"standard"|"board"|"planning"|"analytics", "icon"?, "color_accent"?}
  -- Nullable with a '{}' default, matching types.ts (module_meta: Json | null).
  module_meta     jsonb       DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- (track_slug, sort_order) is UNIQUE, and this is a correctness constraint,
  -- not a nicety. Every one of the 105 essay stubs in 04_seed.sql resolves its
  -- module_id with a SCALAR subquery of the form
  --   (SELECT id FROM public.finance_modules
  --     WHERE track_slug = 'strategic-finance' AND sort_order = 7)
  -- decoded from the essay's slug prefix (sf-07-03 = strategic-finance module
  -- 07, essay 03). A scalar subquery that returns two rows does not pick one --
  -- it raises "more than one row returned by a subquery used as an expression"
  -- and aborts the entire seed transaction. The seed's own assertion block
  -- checks that no stub ended up with a NULL module_id, but nothing there can
  -- catch a duplicate before it throws. This constraint is what makes the
  -- assumption those 105 subqueries rest on actually true, and it keeps it true
  -- for anything added later through the admin UI.
  -- Verified against the seed data before adding: all 49 modules are unique on
  -- (track_slug, sort_order), numbered contiguously 1..N within each of the four
  -- tracks (fundamentals 1-20, strategic-finance 1-13, planning 1-7,
  -- analytics 1-9), so no existing row violates it.
  -- Its backing index also serves the (track_slug, sort_order) listing reads, so
  -- the separate idx_finance_modules_track_order it replaces is not recreated --
  -- that would be a second index on the same leading columns for no read gain.
  CONSTRAINT finance_modules_track_slug_sort_order_key UNIQUE (track_slug, sort_order)
);

CREATE TRIGGER update_finance_modules_updated_at
  BEFORE UPDATE ON public.finance_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_modules ENABLE ROW LEVEL SECURITY;

-- REVOKE first -- see the note on Supabase default privileges above.
REVOKE ALL ON public.finance_modules FROM anon, authenticated;
GRANT SELECT                         ON public.finance_modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_modules TO authenticated;
GRANT ALL                            ON public.finance_modules TO service_role;

CREATE POLICY "Anon can read finance modules"
  ON public.finance_modules FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can read finance modules"
  ON public.finance_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert finance modules"
  ON public.finance_modules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can update finance modules"
  ON public.finance_modules FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can delete finance modules"
  ON public.finance_modules FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));


-- =============================================================================
-- 3. public.finance_models -- "Finance in Action" model library
-- Consumers: src/hooks/queries/useFinanceModels.ts (select * eq is_published
--   order sort_order; select * eq slug single; update arbitrary columns by id),
--   FinanceInActionIndex.tsx (number, name, description, depth, is_flagship,
--   excel_file_url, slug), FinanceModelDetail.tsx (+ last_updated,
--   documentation.{objective,mechanics,inputs,outputs,decision,limitations},
--   module_references, version), components/finance-in-action/ModelAdminPanel.tsx
--   (writes depth, is_flagship, module_references, documentation, and after an
--   xlsx upload: excel_file_url, version, last_updated).
-- =============================================================================

CREATE TABLE public.finance_models (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug              text        NOT NULL UNIQUE,
  number            text        NOT NULL,
  name              text        NOT NULL,
  description       text,
  depth             public.model_depth NOT NULL DEFAULT 'foundation',
  version           text        NOT NULL DEFAULT 'v1.0',
  last_updated      date        NOT NULL DEFAULT CURRENT_DATE,
  documentation     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- uuid[] of finance_modules.id. Postgres cannot enforce a FK from an array
  -- element, so ModelAdminPanel/FinanceModelDetail resolve these against the
  -- module list client-side; a stale id renders as nothing rather than erroring.
  module_references uuid[]      NOT NULL DEFAULT '{}'::uuid[],
  excel_file_url    text,
  is_flagship       boolean     NOT NULL DEFAULT false,
  is_published      boolean     NOT NULL DEFAULT true,
  sort_order        integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_models_published_order
  ON public.finance_models (is_published, sort_order);

CREATE TRIGGER update_finance_models_updated_at
  BEFORE UPDATE ON public.finance_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_models ENABLE ROW LEVEL SECURITY;

-- REVOKE first -- see the note on Supabase default privileges above.
REVOKE ALL ON public.finance_models FROM anon, authenticated;
GRANT SELECT                         ON public.finance_models TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_models TO authenticated;
GRANT ALL                            ON public.finance_models TO service_role;

-- Published gating, same lesson as historical failure (b) on essays: the
-- original policy was USING (true), which exposed unpublished drafts through
-- PostgREST even though the app filters .eq('is_published', true). The anon
-- policy is a bare column test and never references has_role.
CREATE POLICY "Anon can read published finance models"
  ON public.finance_models FOR SELECT TO anon
  USING (is_published = true);

-- Authenticated: published models plus, for admins, unpublished ones -- the
-- admin detail page (useFinanceModelBySlug) does not filter is_published.
CREATE POLICY "Authenticated can read published or admin-all finance models"
  ON public.finance_models FOR SELECT TO authenticated
  USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admins can insert finance models"
  ON public.finance_models FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can update finance models"
  ON public.finance_models FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can delete finance models"
  ON public.finance_models FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

-- DEPENDENCY (not created here -- storage belongs to the storage section of the
-- baseline): ModelAdminPanel uploads xlsx to the public 'finance-models'
-- bucket and stores the resulting public URL in excel_file_url. That bucket
-- and its storage.objects policies must exist or model uploads/downloads fail.


-- =============================================================================
-- 4. public.finance_settings -- key/value config for the finance landing page
-- Consumers: src/hooks/queries/useFinance.ts (select *; select value eq key
--   'featured_finance_essay_id' single; update {value} by key),
--   FinanceLanding.tsx (renders the tagline + featured essay for ANONYMOUS
--   visitors), FinanceWorkspace.tsx (admin edits both keys).
-- =============================================================================

CREATE TABLE public.finance_settings (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key        text        NOT NULL UNIQUE,
  value      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_finance_settings_updated_at
  BEFORE UPDATE ON public.finance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

-- REVOKE first -- see the note on Supabase default privileges above.
REVOKE ALL ON public.finance_settings FROM anon, authenticated;
GRANT SELECT                         ON public.finance_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_settings TO authenticated;
GRANT ALL                            ON public.finance_settings TO service_role;

CREATE POLICY "Anon can read finance settings"
  ON public.finance_settings FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can read finance settings"
  ON public.finance_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert finance settings"
  ON public.finance_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can update finance settings"
  ON public.finance_settings FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can delete finance settings"
  ON public.finance_settings FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

-- Both keys MUST be seeded: useUpdateFinanceSetting issues a bare UPDATE ...
-- WHERE key = $1 (never an upsert), so a missing row makes the admin editor
-- silently save nothing.
-- featured_finance_essay_id stays NULL on a fresh database -- it stores an
-- essays.id and every essay UUID is regenerated by the rebuild, so any carried
-- value would point at a row that does not exist.
INSERT INTO public.finance_settings (key, value) VALUES
  ('featured_finance_essay_id', NULL),
  ('finance_tagline', 'Finance exists to support decisions — not to produce reports.');


-- =============================================================================
-- 5. public.fsli_pages -- financial-statement line-item reference pages
-- Consumers: src/hooks/queries/useFsliPages.ts (select * order sort_order;
--   select * eq slug single), FsliList.tsx (title, subtitle, notes_ref,
--   dec_2024, dec_2023, category, sort_order), FsliDetail.tsx (via useFsliPage),
--   useUnifiedContent.ts (select id, title, subtitle, slug, category,
--   updated_at, created_at order updated_at; count exact; delete by id).
-- essays.fsli_slug (added by 20260211100000) is a plain-text back-reference to
-- fsli_pages.slug and is intentionally NOT a foreign key -- it lives on the
-- essays table, authored elsewhere in the baseline.
-- =============================================================================

CREATE TABLE public.fsli_pages (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug       text        NOT NULL UNIQUE,
  title      text        NOT NULL,
  subtitle   text,
  notes_ref  text,
  -- dec_2024/dec_2023 are TEXT on purpose: they hold pre-formatted, comma-
  -- grouped figures ('2,614,318') that FsliList parses only for its subtotals.
  dec_2024   text,
  dec_2023   text,
  category   text        DEFAULT 'current_assets',
  sort_order integer     DEFAULT 0,          -- nullable, per types.ts
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_fsli_pages_updated_at
  BEFORE UPDATE ON public.fsli_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.fsli_pages ENABLE ROW LEVEL SECURITY;

-- REVOKE first -- see the note on Supabase default privileges above.
REVOKE ALL ON public.fsli_pages FROM anon, authenticated;
GRANT SELECT                         ON public.fsli_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fsli_pages TO authenticated;
GRANT ALL                            ON public.fsli_pages TO service_role;

CREATE POLICY "Anon can read FSLI pages"
  ON public.fsli_pages FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can read FSLI pages"
  ON public.fsli_pages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert FSLI pages"
  ON public.fsli_pages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can update FSLI pages"
  ON public.fsli_pages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can delete FSLI pages"
  ON public.fsli_pages FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));


-- =============================================================================
-- 6. public.fsli_sections -- editable prose blocks of an FSLI page
-- Consumers: src/hooks/queries/useFsliPages.ts (select * eq page_slug order
--   sort_order), src/components/fsli/FsliSection.tsx and FsliContentSection.tsx
--   (select content eq page_slug eq section_key maybeSingle; upsert
--   {page_slug, section_key, content} onConflict 'page_slug,section_key').
-- The upsert is why admins need BOTH an INSERT and an UPDATE policy: PostgREST
-- upsert compiles to INSERT ... ON CONFLICT DO UPDATE and is refused unless
-- both apply. It also requires the UNIQUE (page_slug, section_key) constraint
-- below to name as its conflict target.
-- =============================================================================

CREATE TABLE public.fsli_sections (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- FK on the slug, not an id: the app addresses sections by page slug from the
  -- route. ON DELETE CASCADE because useUnifiedContent deletes fsli_pages rows
  -- directly -- without CASCADE that delete would fail on this constraint, and
  -- surviving rows would be unreachable orphans. ON UPDATE CASCADE keeps
  -- sections attached through a page re-slug.
  page_slug   text        NOT NULL REFERENCES public.fsli_pages (slug)
                            ON UPDATE CASCADE ON DELETE CASCADE,
  section_key text        NOT NULL,
  content     text        NOT NULL DEFAULT '',
  sort_order  integer     DEFAULT 0,        -- nullable, per types.ts
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fsli_sections_page_slug_section_key_key UNIQUE (page_slug, section_key)
);

CREATE TRIGGER update_fsli_sections_updated_at
  BEFORE UPDATE ON public.fsli_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.fsli_sections ENABLE ROW LEVEL SECURITY;

-- REVOKE first -- see the note on Supabase default privileges above.
REVOKE ALL ON public.fsli_sections FROM anon, authenticated;
GRANT SELECT                         ON public.fsli_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fsli_sections TO authenticated;
GRANT ALL                            ON public.fsli_sections TO service_role;

CREATE POLICY "Anon can read FSLI sections"
  ON public.fsli_sections FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can read FSLI sections"
  ON public.fsli_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert FSLI sections"
  ON public.fsli_sections FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can update FSLI sections"
  ON public.fsli_sections FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can delete FSLI sections"
  ON public.fsli_sections FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));