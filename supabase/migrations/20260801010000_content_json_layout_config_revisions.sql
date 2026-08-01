-- =============================================================================
-- Safety nets for authoring: content_json, layout_config, essay_revisions.
--
-- Applied to asypkbkiebjvvpimewfp via apply_migration; this file is the repo
-- mirror. Motivation: there is no autosave, no revision history, and free tier
-- has no PITR — three missing nets at once. essay_revisions is the undo that
-- does not currently exist at any layer. Per docs/writing-layout-spec.md §2.
--
-- content_json becomes the canonical body format going forward; content (text,
-- HTML) is kept as the legacy render fallback and is NOT dropped. The backfill
-- of content_json from existing HTML is done at the app layer (it needs a DOM /
-- the editor schema to parse HTML into a TipTap doc) and is verified block-for-
-- block; this migration only adds the columns.
-- =============================================================================

-- 1. essays: canonical JSON body + constrained layout config. Both nullable;
--    a NULL content_json means "render from the legacy content text".
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS content_json  jsonb,
  ADD COLUMN IF NOT EXISTS layout_config jsonb;

COMMENT ON COLUMN public.essays.content_json IS
  'Canonical TipTap doc ({type:"doc", content:[...]}). Preferred over content (legacy HTML text) by the render + editor paths. NULL means fall back to content.';
COMMENT ON COLUMN public.essays.layout_config IS
  'Per-essay constrained module ordering/toggles (writing-layout-spec §2.1). NULL means section defaults apply in the app resolver.';

-- 2. essay_revisions: append-only-ish version history and rollback source.
--    Admin-only on every verb (transcripts embed unpublished draft bodies).
CREATE TABLE IF NOT EXISTS public.essay_revisions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id       uuid        NOT NULL REFERENCES public.essays (id) ON DELETE CASCADE,
  revision_no    integer     NOT NULL,
  -- create | autosave | manual_save | publish | unpublish | rollback | migration
  change_type    text        NOT NULL CHECK (change_type IN
                   ('create','autosave','manual_save','publish','unpublish','rollback','migration')),
  title          text,
  snippet        text,
  content_json   jsonb,
  layout_config  jsonb,
  status         public.content_status_enum,
  voice_role     text,
  changed_by     uuid        DEFAULT auth.uid(),
  change_summary text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT essay_revisions_essay_id_revision_no_key UNIQUE (essay_id, revision_no)
);

-- Recovery queries hit (essay_id, created_at desc) for "latest" and
-- (essay_id, revision_no desc) for the numbered history.
CREATE INDEX IF NOT EXISTS idx_essay_revisions_essay_created_at
  ON public.essay_revisions (essay_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_essay_revisions_essay_revision_no
  ON public.essay_revisions (essay_id, revision_no DESC);

ALTER TABLE public.essay_revisions ENABLE ROW LEVEL SECURITY;

-- Admin-only on every verb, inlined user_roles EXISTS (never has_role()).
CREATE POLICY "essay_revisions_select_admin"
  ON public.essay_revisions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

-- INSERT: admin, and only rows attributed to self (changed_by = caller), so a
-- revision cannot be forged onto another admin.
CREATE POLICY "essay_revisions_insert_admin"
  ON public.essay_revisions FOR INSERT TO authenticated
  WITH CHECK (
    changed_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "essay_revisions_update_admin"
  ON public.essay_revisions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "essay_revisions_delete_admin"
  ON public.essay_revisions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

-- Privileges: REVOKE first (Supabase default privileges grant ALL to anon and
-- authenticated on every new table; GRANT is additive and cannot subtract).
-- anon gets nothing — revisions are never public. authenticated gets the full
-- CRUD the admin policies gate.
REVOKE ALL ON public.essay_revisions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.essay_revisions TO authenticated;
GRANT ALL                            ON public.essay_revisions TO service_role;

COMMENT ON TABLE public.essay_revisions IS
  'Essay version history + rollback source. Admin-only on every verb; anon has no access. revision_no is unique per essay; the app assigns it monotonically.';
