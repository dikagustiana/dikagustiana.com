
-- 1. Create finance_modules table
CREATE TABLE IF NOT EXISTS public.finance_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_slug text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  thesis text,
  sort_order integer NOT NULL DEFAULT 0,
  framing_content text,
  module_meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance modules are publicly readable"
  ON public.finance_modules FOR SELECT USING (true);

CREATE POLICY "Admins can modify finance modules"
  ON public.finance_modules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_finance_modules_updated_at
  BEFORE UPDATE ON public.finance_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add module_id to essays (FK to finance_modules)
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.finance_modules(id);

-- 3. Add lesson_type enum + column
DO $$ BEGIN
  CREATE TYPE public.lesson_type_enum AS ENUM (
    'concept',
    'framework',
    'case-study',
    'exercise',
    'model-walkthrough'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS lesson_type public.lesson_type_enum DEFAULT 'concept';
