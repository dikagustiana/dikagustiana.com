-- Add fsli_slug column for linking essays to FSLI pages
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS fsli_slug TEXT;
CREATE INDEX IF NOT EXISTS idx_essays_fsli_slug ON public.essays(fsli_slug) WHERE fsli_slug IS NOT NULL;

-- Add topic column for sub-topic linking (finance analytics, consolidation topics, etc.)
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS topic TEXT;
CREATE INDEX IF NOT EXISTS idx_essays_topic ON public.essays(topic) WHERE topic IS NOT NULL;
