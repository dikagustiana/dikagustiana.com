-- Create finance_sections table for DB-backed domain entry points.
-- Replaces hardcoded domain arrays in FinanceLanding and FinanceLifecyclePage.
CREATE TABLE IF NOT EXISTS public.finance_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance sections are publicly readable"
  ON public.finance_sections FOR SELECT USING (true);

CREATE POLICY "Admins can modify finance sections"
  ON public.finance_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_finance_sections_updated_at
  BEFORE UPDATE ON public.finance_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 4 finance domains
INSERT INTO public.finance_sections (slug, title, description, icon, sort_order) VALUES
  ('fundamentals', 'Fundamentals', 'The 12 foundational ideas that everything else builds on.', 'Landmark', 1),
  ('strategic-finance', 'Strategic Finance', 'Where finance meets strategy. Capital allocation, investment decisions, and long-term value creation.', 'Target', 2),
  ('planning-forecasting', 'Planning & Forecasting', 'Translating strategy into numbers. Assumptions, scenarios, and action triggers.', 'BarChart3', 3),
  ('financial-analytics', 'Financial Analytics', 'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.', 'TrendingUp', 4)
ON CONFLICT (slug) DO NOTHING;

-- Seed additional finance_settings for the finance landing tagline
INSERT INTO public.finance_settings (key, value)
VALUES ('finance_tagline', 'Finance exists to support decisions — not to produce reports.')
ON CONFLICT (key) DO NOTHING;
