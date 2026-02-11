-- Add canonical content and constrained layout config to essays
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS layout_config JSONB;

-- Optional supporting indexes for JSONB querying/diagnostics
CREATE INDEX IF NOT EXISTS idx_essays_content_json_gin
  ON public.essays
  USING GIN (content_json)
  WHERE content_json IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_essays_layout_config_gin
  ON public.essays
  USING GIN (layout_config)
  WHERE layout_config IS NOT NULL;

-- Revision history table
CREATE TABLE IF NOT EXISTS public.essay_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'autosave', 'manual_save', 'publish', 'unpublish', 'rollback', 'migration')),
  title TEXT,
  snippet TEXT,
  content_json JSONB,
  layout_config JSONB,
  status public.content_status_enum,
  voice_role TEXT,
  changed_by UUID,
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (essay_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_essay_revisions_essay_created_at
  ON public.essay_revisions (essay_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_essay_revisions_essay_revision_no
  ON public.essay_revisions (essay_id, revision_no DESC);

-- Enable RLS and restrict to admins (aligns with existing essay admin model)
ALTER TABLE public.essay_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read essay revisions" ON public.essay_revisions;
CREATE POLICY "Admins can read essay revisions"
ON public.essay_revisions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert essay revisions" ON public.essay_revisions;
CREATE POLICY "Admins can insert essay revisions"
ON public.essay_revisions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update essay revisions" ON public.essay_revisions;
CREATE POLICY "Admins can update essay revisions"
ON public.essay_revisions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete essay revisions" ON public.essay_revisions;
CREATE POLICY "Admins can delete essay revisions"
ON public.essay_revisions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
