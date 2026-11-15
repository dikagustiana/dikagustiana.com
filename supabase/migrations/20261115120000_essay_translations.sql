-- Essay translations: an optional Indonesian version of an essay.
-- (docs/prd/essay-language/01-DATA.md)
--
-- WHY A TABLE, NOT COLUMNS ON essays. The Brief is a column (brief_json)
-- because saving a Brief is publishing it. A translation is not: it has a
-- draft life of its own, often while the English essay is already live. RLS
-- works per row, not per column, so a draft stored on a published essays row
-- would be readable by anyone through the REST API. Its own table carries its
-- own `published` and its own policies.
--
-- One row per essay per locale. Only 'id' is allowed today; the column exists
-- so a third language would be a CHECK change, not a redesign.
--
-- What is NOT copied here: references, images, genre, placement, dates,
-- author. Those belong to the essay and are read from essays in either
-- language. `presentation` carries only the translatable keys: deck,
-- key_takeaways, hero_caption, revision_note.
--
-- No HTML mirror, for the Brief's reason (20260803090000): HTML is derived at
-- read time, so there is no second representation to diverge.
--
-- Nothing here generates text. Every translation is written by the owner.

DO $pre$ BEGIN
  IF to_regclass('public.essay_translations') IS NOT NULL THEN
    RAISE EXCEPTION 'essay_translations already exists';
  END IF;
END $pre$;

CREATE TABLE public.essay_translations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id      uuid NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  locale        text NOT NULL CHECK (locale IN ('id')),
  title         text NOT NULL,
  snippet       text,
  content_json  jsonb,
  brief_json    jsonb,
  presentation  jsonb,
  read_time     text,
  published     boolean NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT essay_translations_essay_locale_key UNIQUE (essay_id, locale)
);

COMMENT ON TABLE public.essay_translations IS
  'Optional translation of an essay, one row per locale. Written by the owner; never machine-generated. Readable by anon only when both it and its essay are published.';

CREATE TRIGGER update_essay_translations_updated_at
  BEFORE UPDATE ON public.essay_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --- RLS ---------------------------------------------------------------------
-- Same shape as the essays policies (baseline_cms), admin check inlined over
-- user_roles. A translation is public only while its essay is: unpublishing
-- the English essay hides its translation too.
ALTER TABLE public.essay_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "essay_translations_select_anon_published"
  ON public.essay_translations FOR SELECT TO anon
  USING (
    published = true
    AND EXISTS (SELECT 1 FROM public.essays e WHERE e.id = essay_id AND e.published = true)
  );

CREATE POLICY "essay_translations_select_authenticated"
  ON public.essay_translations FOR SELECT TO authenticated
  USING (
    (
      published = true
      AND EXISTS (SELECT 1 FROM public.essays e WHERE e.id = essay_id AND e.published = true)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "essay_translations_insert_admin"
  ON public.essay_translations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "essay_translations_update_admin"
  ON public.essay_translations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "essay_translations_delete_admin"
  ON public.essay_translations FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

GRANT SELECT ON public.essay_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.essay_translations TO authenticated;

-- --- Revisions -----------------------------------------------------------------
-- Translation revisions share essay_revisions and its content_json column,
-- namespaced by change_type exactly as the Brief's are. Every reader already
-- filters by change_type (src/lib/revisions.ts changeTypesForBody), so these
-- kinds are invisible to the long-body and Brief recovery probes by
-- construction. A `locale` column would not be: every existing query that does
-- not filter on it would start picking up Indonesian rows.
ALTER TABLE public.essay_revisions DROP CONSTRAINT essay_revisions_change_type_check;
ALTER TABLE public.essay_revisions ADD CONSTRAINT essay_revisions_change_type_check
  CHECK (change_type = ANY (ARRAY[
    'create'::text, 'autosave'::text, 'manual_save'::text,
    'publish'::text, 'unpublish'::text, 'rollback'::text, 'migration'::text,
    'brief_autosave'::text, 'brief_manual_save'::text,
    'id_autosave'::text, 'id_manual_save'::text, 'id_publish'::text,
    'id_unpublish'::text, 'id_rollback'::text,
    'id_brief_autosave'::text, 'id_brief_manual_save'::text
  ]));
