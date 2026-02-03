-- Create sections table for voice/role management
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  voice_role TEXT NOT NULL CHECK (voice_role IN ('manager', 'economist', 'educator', 'coach', 'hybrid')),
  manifesto TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table for content organization
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section_id, slug)
);

-- Add new columns to essays table
ALTER TABLE public.essays 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voice_role TEXT,
  ADD COLUMN IF NOT EXISTS prerequisites TEXT[],
  ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[];

-- Enable RLS on sections
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Sections are publicly readable
CREATE POLICY "Sections are publicly readable"
ON public.sections
FOR SELECT
USING (true);

-- Admins can modify sections
CREATE POLICY "Admins can modify sections"
ON public.sections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories are publicly readable
CREATE POLICY "Categories are publicly readable"
ON public.categories
FOR SELECT
USING (true);

-- Admins can modify categories
CREATE POLICY "Admins can modify categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at triggers
CREATE TRIGGER update_sections_updated_at
BEFORE UPDATE ON public.sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial sections data
INSERT INTO public.sections (slug, name, voice_role, manifesto, sort_order) VALUES
('finance', 'Finance', 'manager', 'Finance exists to support decisions—not to produce reports.', 1),
('accounting', 'Accounting', 'manager', 'Accounting describes economic reality. Your job is to describe it accurately.', 2),
('green-transition', 'Green Transition', 'economist', 'The green transition is an economic problem—not just an environmental one.', 3),
('next-big-thing', 'The Next Big Thing', 'economist', 'Rigorous speculation about structural economic change.', 4),
('books', 'Books', 'educator', 'Books are tools. Use them or do not pick them up.', 5),
('ielts', 'IELTS', 'coach', 'A score is the only measure. Everything else is preparation.', 6);