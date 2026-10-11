-- =============================================================================
-- tracker_entry: the Green Transition Tracker's sector register (PRD §B4,
-- Plan 2.2).
--
-- The tracker used to live in code (src/data/trackerIssues.ts). It moves to
-- the database the essays live in, one row per sector per quarter: a
-- one-sentence finding, a short detail, and the primary documents behind
-- both. The rows are seeded by 20261011100100_tracker_entry_seed.sql.
--
-- Rules the table holds itself to, so the page cannot be handed a row that
-- breaks them:
--   * sources is a non-empty array; every source has a title, an https url,
--     and a doc_no or an ISO date (PRD §B6, first bullet).
--   * an `unverifiable` entry can never be published (PRD §B4).
--   * one entry per sector per quarter.
--
-- RLS follows the essays pattern (20260731030000_baseline_cms.sql, §3): anon
-- reads published rows through a policy that references nothing else; an
-- admin reads everything; writes are admin-only, one policy per verb, with the
-- admin check inlined over user_roles rather than calling has_role().
--
-- DOWN:
--   DROP TABLE public.tracker_entry;
--   DROP FUNCTION public.tracker_sources_valid(jsonb);
--   DROP TYPE public.tracker_status;
--   DROP TYPE public.tracker_sector;
-- =============================================================================

CREATE TYPE public.tracker_sector AS ENUM (
  'geothermal', 'solar', 'pln_procurement', 'jetp', 'ojk_taxonomy', 'danantara', 'other'
);

CREATE TYPE public.tracker_status AS ENUM ('advanced', 'unchanged', 'regressed', 'mixed');

-- Whether a sources array meets PRD §B6. IMMUTABLE and free of table access,
-- so it can sit in a CHECK constraint. The CASE keeps jsonb_array_length away
-- from anything that is not an array.
CREATE FUNCTION public.tracker_sources_valid(s jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN s IS NULL OR jsonb_typeof(s) <> 'array' THEN false
    WHEN jsonb_array_length(s) = 0 THEN false
    ELSE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(s) AS e(src)
      WHERE jsonb_typeof(src) <> 'object'
         OR coalesce(btrim(src ->> 'title'), '') = ''
         OR coalesce(src ->> 'url', '') !~ '^https://'
         OR (coalesce(btrim(src ->> 'doc_no'), '') = ''
             AND coalesce(src ->> 'date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
    )
  END
$$;

CREATE TABLE public.tracker_entry (
  id           text PRIMARY KEY CHECK (id ~ '^[a-z_]+-[0-9]{4}q[1-4]$'),
  quarter      text NOT NULL CHECK (quarter ~ '^[0-9]{4}Q[1-4]$'),
  sector       public.tracker_sector NOT NULL,
  status       public.tracker_status NOT NULL,
  finding      text NOT NULL CHECK (btrim(finding) <> ''),
  detail       text NOT NULL CHECK (btrim(detail) <> ''),
  sources      jsonb NOT NULL CHECK (public.tracker_sources_valid(sources)),
  verification text NOT NULL CHECK (verification IN ('verified', 'unverifiable')),
  published    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tracker_entry_one_per_sector_quarter UNIQUE (quarter, sector),
  CONSTRAINT tracker_entry_published_is_verified CHECK (NOT published OR verification = 'verified')
);

COMMENT ON TABLE public.tracker_entry IS
  'Green Transition Tracker register: one sourced finding per sector per quarter (PRD §B4).';

CREATE TRIGGER update_tracker_entry_updated_at
  BEFORE UPDATE ON public.tracker_entry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --- RLS ---------------------------------------------------------------------

ALTER TABLE public.tracker_entry ENABLE ROW LEVEL SECURITY;

-- ANON READ: published rows only, referencing no function and no other table.
CREATE POLICY "tracker_entry_select_anon_published"
  ON public.tracker_entry FOR SELECT TO anon
  USING (published = true);

-- AUTHENTICATED READ: published rows for everyone signed in, everything for an
-- admin, so an admin sees the unpublished rows on the preview deployment.
CREATE POLICY "tracker_entry_select_authenticated"
  ON public.tracker_entry FOR SELECT TO authenticated
  USING (
    published = true
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "tracker_entry_insert_admin"
  ON public.tracker_entry FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "tracker_entry_update_admin"
  ON public.tracker_entry FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "tracker_entry_delete_admin"
  ON public.tracker_entry FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

-- --- Privileges --------------------------------------------------------------
-- Revoke first: Supabase's default privileges grant ALL on new public tables to
-- anon and authenticated, and a GRANT cannot take that away (baseline_cms §7).

REVOKE ALL ON public.tracker_entry FROM anon, authenticated;
GRANT SELECT                         ON public.tracker_entry TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracker_entry TO authenticated;
GRANT ALL                            ON public.tracker_entry TO service_role;
