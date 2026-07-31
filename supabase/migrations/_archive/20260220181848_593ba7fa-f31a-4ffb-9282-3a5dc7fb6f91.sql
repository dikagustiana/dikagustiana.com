-- Performance indexes for finance essay lookups at scale (100+ essays)

-- Index for module_id + published (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_essays_module_published
  ON public.essays (module_id, published)
  WHERE module_id IS NOT NULL;

-- Index for finance_section + published (track-level queries)
CREATE INDEX IF NOT EXISTS idx_essays_finance_section_published
  ON public.essays (finance_section, published)
  WHERE finance_section IS NOT NULL;

-- Index for slug lookups (essay page rendering)
CREATE INDEX IF NOT EXISTS idx_essays_slug
  ON public.essays (slug);

-- Index for module slug lookups
CREATE INDEX IF NOT EXISTS idx_finance_modules_slug
  ON public.finance_modules (slug);

-- Composite index for track-level module listing
CREATE INDEX IF NOT EXISTS idx_finance_modules_track_order
  ON public.finance_modules (track_slug, sort_order);