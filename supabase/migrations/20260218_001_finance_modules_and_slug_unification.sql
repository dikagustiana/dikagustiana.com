-- =============================================================================
-- Migration: 20260218_001_finance_modules_and_slug_unification.sql
--
-- 1. Unify finance_sections slugs
--      planning-forecasting  →  planning
--      financial-analytics   →  analytics
-- 2. Sync essays.finance_section to new slugs (plain-text column, no FK cascade)
-- 3. Create finance_modules table (FK → finance_sections.slug)
-- 4. Apply RLS — same pattern as finance_sections / finance_fundamentals
-- 5. Add updated_at trigger using the project-wide helper
-- 6. Add module_id (nullable FK → finance_modules.id) to essays
-- 7. Migrate finance_fundamentals rows into finance_modules (track = 'fundamentals')
-- 8. Back-fill essays.module_id from essays.fundamental_id via slug match
--
-- NOTE: finance_fundamentals is NOT dropped here.
--       That happens in a subsequent cleanup migration.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Rename finance_sections slugs to match new route structure
-- -----------------------------------------------------------------------------

UPDATE public.finance_sections
  SET slug = 'planning'
  WHERE slug = 'planning-forecasting';

UPDATE public.finance_sections
  SET slug = 'analytics'
  WHERE slug = 'financial-analytics';

-- -----------------------------------------------------------------------------
-- 2. Sync essays.finance_section to new slugs
--    essays.finance_section is plain text — no FK cascade fires automatically.
-- -----------------------------------------------------------------------------

UPDATE public.essays
  SET finance_section = 'planning'
  WHERE finance_section = 'planning-forecasting';

UPDATE public.essays
  SET finance_section = 'analytics'
  WHERE finance_section = 'financial-analytics';

-- -----------------------------------------------------------------------------
-- 3. Create finance_modules table
--    track_slug FK keeps every module anchored to a valid finance_sections row.
--    finance_sections slugs have already been updated above, so 'fundamentals',
--    'strategic-finance', 'planning', and 'analytics' are all valid at this point.
-- -----------------------------------------------------------------------------

CREATE TABLE public.finance_modules (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_slug      text        NOT NULL REFERENCES public.finance_sections (slug),
  slug            text        NOT NULL UNIQUE,
  title           text        NOT NULL,
  thesis          text,
  sort_order      integer     NOT NULL DEFAULT 0,
  framing_content text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. Row-Level Security — mirrors finance_sections and finance_fundamentals
-- -----------------------------------------------------------------------------

ALTER TABLE public.finance_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance modules are publicly readable"
  ON public.finance_modules
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify finance modules"
  ON public.finance_modules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- -----------------------------------------------------------------------------
-- 5. updated_at trigger — reuses the project-wide helper function
-- -----------------------------------------------------------------------------

CREATE TRIGGER update_finance_modules_updated_at
  BEFORE UPDATE ON public.finance_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 6. Add module_id to essays (nullable; populated in step 8)
-- -----------------------------------------------------------------------------

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.finance_modules (id);

-- -----------------------------------------------------------------------------
-- 7. Migrate finance_fundamentals rows → finance_modules
--    All 12 rows belong to the 'fundamentals' track.
--    Columns map directly: slug, title, thesis, sort_order, framing_content.
-- -----------------------------------------------------------------------------

INSERT INTO public.finance_modules
  (track_slug, slug, title, thesis, sort_order, framing_content)
SELECT
  'fundamentals',
  slug,
  title,
  thesis,
  sort_order,
  framing_content
FROM public.finance_fundamentals;

-- -----------------------------------------------------------------------------
-- 8. Back-fill essays.module_id from essays.fundamental_id
--    Join through finance_fundamentals so the slug acts as the stable key,
--    guarding against any id mismatch between environments.
-- -----------------------------------------------------------------------------

UPDATE public.essays e
SET module_id = fm.id
FROM public.finance_modules fm
INNER JOIN public.finance_fundamentals ff ON fm.slug = ff.slug
WHERE e.fundamental_id = ff.id;

COMMIT;
