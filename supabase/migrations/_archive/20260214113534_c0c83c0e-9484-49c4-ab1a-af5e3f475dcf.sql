
-- Create finance_sections table for domain entry points on landing page
CREATE TABLE public.finance_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance sections are publicly readable"
  ON public.finance_sections FOR SELECT USING (true);

CREATE POLICY "Admins can modify finance sections"
  ON public.finance_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed four domain entry points
INSERT INTO public.finance_sections (slug, title, description, icon, sort_order) VALUES
  ('fundamentals', 'Fundamentals', 'Core concepts every finance professional must master.', 'Landmark', 1),
  ('strategic-finance', 'Strategic Finance', 'Capital allocation, M&A, and value creation.', 'Target', 2),
  ('planning-forecasting', 'Planning & Forecasting', 'Budgeting, forecasting, and scenario analysis.', 'BarChart3', 3),
  ('financial-analytics', 'Financial Analytics', 'Performance measurement and data-driven decisions.', 'TrendingUp', 4);
