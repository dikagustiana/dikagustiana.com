BEGIN;

-- 1. Add lesson_type enum
DO $$ BEGIN
  CREATE TYPE public.lesson_type_enum AS ENUM (
    'concept',        -- Explanatory essay (default)
    'framework',      -- Structured decision framework
    'case-study',     -- Applied case analysis
    'exercise',       -- Practice problem or walkthrough
    'model-walkthrough' -- Step-by-step model build (Planning/Analytics)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add lesson_type to essays (nullable, defaults to 'concept')
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS lesson_type public.lesson_type_enum DEFAULT 'concept';

-- 3. Add module_meta JSONB to finance_modules for pillar-specific config
-- Schema: { "variant": "standard"|"board"|"planning"|"analytics",
--           "icon"?: string, "color_accent"?: string }
ALTER TABLE public.finance_modules
  ADD COLUMN IF NOT EXISTS module_meta jsonb DEFAULT '{}';

-- 4. Seed module_meta variants for each track
UPDATE public.finance_modules SET module_meta = '{"variant":"standard"}'
  WHERE track_slug = 'fundamentals' AND (module_meta IS NULL OR module_meta = '{}');

UPDATE public.finance_modules SET module_meta = '{"variant":"board"}'
  WHERE track_slug = 'strategic-finance' AND (module_meta IS NULL OR module_meta = '{}');

UPDATE public.finance_modules SET module_meta = '{"variant":"planning"}'
  WHERE track_slug = 'planning' AND (module_meta IS NULL OR module_meta = '{}');

UPDATE public.finance_modules SET module_meta = '{"variant":"analytics"}'
  WHERE track_slug = 'analytics' AND (module_meta IS NULL OR module_meta = '{}');

COMMIT;
