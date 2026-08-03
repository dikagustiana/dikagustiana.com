-- The Brief companion: a second, optional body on an essay.
-- (Mirror of the migration applied live via apply_migration on 2026-08-03.)
--
-- One column, jsonb, canonical TipTap JSON — and deliberately NO HTML mirror.
-- The long body's `content` (HTML) column is legacy: it predates content_json
-- and exists for rows written before the backfill. No Brief row predates
-- anything, so a second representation would only double the divergence
-- surface (the content/content_json split this project has already been
-- burned by). HTML for rendering is derived at read time.
--
-- NULL = no Brief. The public toggle appears only when a Brief exists;
-- nothing gates publishing on it.
ALTER TABLE public.essays ADD COLUMN brief_json jsonb;

COMMENT ON COLUMN public.essays.brief_json IS
  'Optional Brief companion body (TipTap JSON, restricted schema: paragraphs, bold, italic, links). Written by the owner after the long essay is published; never machine-generated. NULL = no Brief.';

-- Brief revisions live in the SAME essay_revisions table, in the SAME
-- content_json column, distinguished by change_type. The two namespaces:
--   long body:  create / autosave / manual_save / publish / unpublish /
--               rollback / migration
--   brief:      brief_autosave / brief_manual_save
-- Readers MUST filter by kind: a long-body recovery probe that picked up a
-- brief backup would offer to replace a 26,000-character essay with its
-- 600-word Brief. The app-side filters live in src/lib/revisions.ts.
ALTER TABLE public.essay_revisions DROP CONSTRAINT essay_revisions_change_type_check;
ALTER TABLE public.essay_revisions ADD CONSTRAINT essay_revisions_change_type_check
  CHECK (change_type = ANY (ARRAY[
    'create'::text, 'autosave'::text, 'manual_save'::text,
    'publish'::text, 'unpublish'::text, 'rollback'::text, 'migration'::text,
    'brief_autosave'::text, 'brief_manual_save'::text
  ]));

-- RLS: no new table, no new policy needed. brief_json inherits essays'
-- policies — anon SELECT only when published = true (the public toggle needs
-- exactly that), INSERT/UPDATE/DELETE admin-only. essay_revisions stays
-- entirely admin-only, brief revisions included.
