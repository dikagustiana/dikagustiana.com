-- =============================================================================
-- Toolkits (docs/prd/finance-restructure/README.md §1 E, §4 "Toolkits").
--
-- /finance/toolkits lists the working files behind the essays: one card per
-- published toolkit, its latest version to download, older versions under
-- "Previous versions". The admin uploads from /admin/toolkits.
--
--   public.toolkits          one row per template: title, purpose, the
--                            Finance module it comes from, draft/published,
--                            and the two attestations the publish needs.
--   public.toolkit_versions  one row per uploaded file. The file is in R2,
--                            dg-books-public, at toolkits/<slug>/<version>/
--                            <filename>, signed by the toolkit-file edge
--                            function. A version is never updated or
--                            deleted, so a key once published is never
--                            overwritten and a v1 link still opens v1 after
--                            v2 is published.
--
-- The publish gate (mirrors books_access_shape): a published toolkit carries
-- both attestations as JSON true. Written as containment, `checks @> {...}`,
-- rather than the PRD's `(checks->>'k')::boolean AND ...`: with a key missing
-- that expression is null, and a CHECK passes on null (supabase/tests/
-- toolkits.sql has the case). Containment is never null, and the string
-- "true" is not true. A version can be added only under a published toolkit,
-- so the gate holds for every file a reader can reach.
--
-- module_id references public.finance_modules(id) (uuid), the table the
-- module pages read (FinanceModulePage.tsx): essay_structure, which the PRD
-- names, is a view of essays, not of modules, and cannot be referenced.
--
-- Admin checks are inlined EXISTS over public.user_roles, never has_role(), as
-- in 20261024100000_books_shelves.sql.
--
-- Apply on its own through the Supabase MCP apply_migration (never
-- `supabase db push`). Test: supabase/tests/toolkits.sql (one transaction,
-- rolled back). Rollback: supabase/rollback/20261024170100_toolkits_down.sql.
-- =============================================================================

CREATE TABLE public.toolkits (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        NOT NULL UNIQUE CONSTRAINT toolkits_slug_shape CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80),
  title       text        NOT NULL CONSTRAINT toolkits_title_present CHECK (length(btrim(title)) > 0),
  purpose     text        NOT NULL CONSTRAINT toolkits_purpose_one_line CHECK (length(btrim(purpose)) > 0 AND length(purpose) <= 140),
  module_id   uuid        NOT NULL REFERENCES public.finance_modules(id) ON DELETE RESTRICT,
  format      text        NOT NULL DEFAULT 'xlsx' CONSTRAINT toolkits_format_known CHECK (format IN ('xlsx')),
  status      text        NOT NULL DEFAULT 'draft' CONSTRAINT toolkits_status_known CHECK (status IN ('draft', 'published')),
  checks      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_by  uuid        DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT toolkits_publish_checks CHECK (
    status = 'draft'
    OR checks @> '{"no_client_data": true, "verified_model": true}'::jsonb
  )
);
COMMENT ON TABLE public.toolkits IS
  'Downloadable templates (/finance/toolkits). Published only with checks.no_client_data and checks.verified_model both true.';
COMMENT ON COLUMN public.toolkits.checks IS
  '{"no_client_data": true, "verified_model": true}: the two attestations the admin form asks for at publish.';

CREATE TRIGGER update_toolkits_updated_at
  BEFORE UPDATE ON public.toolkits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_toolkits_module ON public.toolkits (module_id) WHERE status = 'published';

CREATE TABLE public.toolkit_versions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  toolkit_id    uuid        NOT NULL REFERENCES public.toolkits(id) ON DELETE RESTRICT,
  version       text        NOT NULL CONSTRAINT toolkit_versions_version_shape CHECK (version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  changelog     text,
  file_key      text        NOT NULL UNIQUE CONSTRAINT toolkit_versions_key_shape CHECK (file_key ~ '^toolkits/[a-z0-9]+(-[a-z0-9]+)*/[0-9]+\.[0-9]+(\.[0-9]+)?/[A-Za-z0-9_.-]{1,120}\.xlsx$'),
  size_bytes    integer     NOT NULL CONSTRAINT toolkit_versions_size CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  sha256        text        NOT NULL CONSTRAINT toolkit_versions_sha256_shape CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  published_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT toolkit_versions_toolkit_version_key UNIQUE (toolkit_id, version)
);
COMMENT ON TABLE public.toolkit_versions IS
  'One row per uploaded toolkit file. Insert-only: a new version is a new row and a new R2 key.';

CREATE INDEX idx_toolkit_versions_latest ON public.toolkit_versions (toolkit_id, published_at DESC);

-- -----------------------------------------------------------------------------
-- Guards
-- -----------------------------------------------------------------------------

-- A version goes under a published toolkit (so both attestations are true), at
-- the key its toolkit's slug and its own version name; once written it stays.
CREATE FUNCTION public.toolkit_versions_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
DECLARE
  parent public.toolkits%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      CONSTRAINT = 'toolkit_versions_insert_only',
      MESSAGE = 'a toolkit version is never changed or deleted; publish a new version instead';
  END IF;
  SELECT * INTO parent FROM public.toolkits WHERE id = new.toolkit_id;
  IF parent.status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      CONSTRAINT = 'toolkit_versions_parent_published',
      MESSAGE = 'a version is added only to a published toolkit (both checks true)';
  END IF;
  IF left(new.file_key, length('toolkits/' || parent.slug || '/' || new.version || '/'))
     IS DISTINCT FROM 'toolkits/' || parent.slug || '/' || new.version || '/' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      CONSTRAINT = 'toolkit_versions_key_matches',
      MESSAGE = format('file_key must start with toolkits/%s/%s/', parent.slug, new.version);
  END IF;
  RETURN new;
END
$fn$;

CREATE TRIGGER toolkit_versions_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.toolkit_versions
  FOR EACH ROW EXECUTE FUNCTION public.toolkit_versions_guard();

-- A toolkit's slug names its keys; it cannot move once a version exists.
CREATE FUNCTION public.toolkits_slug_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  IF new.slug IS DISTINCT FROM old.slug
     AND EXISTS (SELECT 1 FROM public.toolkit_versions v WHERE v.toolkit_id = old.id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      CONSTRAINT = 'toolkits_slug_fixed',
      MESSAGE = 'a toolkit with a published version keeps its slug';
  END IF;
  RETURN new;
END
$fn$;

CREATE TRIGGER toolkits_slug_guard
  BEFORE UPDATE OF slug ON public.toolkits
  FOR EACH ROW EXECUTE FUNCTION public.toolkits_slug_guard();

ALTER TABLE public.toolkit_versions ENABLE ALWAYS TRIGGER toolkit_versions_guard;
ALTER TABLE public.toolkits ENABLE ALWAYS TRIGGER toolkits_slug_guard;

REVOKE ALL ON FUNCTION public.toolkit_versions_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toolkits_slug_guard() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Row security: anon reads published only; the admin reads and writes all
-- -----------------------------------------------------------------------------

ALTER TABLE public.toolkits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolkit_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.toolkits, public.toolkit_versions FROM anon, authenticated;
GRANT SELECT ON public.toolkits, public.toolkit_versions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.toolkits TO authenticated;
GRANT SELECT, INSERT ON public.toolkit_versions TO authenticated;

CREATE POLICY toolkits_select_anon
  ON public.toolkits FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY toolkits_select_authenticated
  ON public.toolkits FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY toolkits_write_admin
  ON public.toolkits FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY toolkit_versions_select_anon
  ON public.toolkit_versions FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.toolkits t WHERE t.id = toolkit_id AND t.status = 'published'));

CREATE POLICY toolkit_versions_select_authenticated
  ON public.toolkit_versions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.toolkits t WHERE t.id = toolkit_id AND t.status = 'published')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY toolkit_versions_insert_admin
  ON public.toolkit_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));
