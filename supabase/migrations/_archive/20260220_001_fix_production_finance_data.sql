BEGIN;

-- STEP 1 — Fix finance_sections slugs if they are stale
UPDATE public.finance_sections
  SET slug = 'planning'
  WHERE slug = 'planning-forecasting';

UPDATE public.finance_sections
  SET slug = 'analytics'
  WHERE slug = 'financial-analytics';

UPDATE public.finance_sections
  SET description = 'Translating strategy into numbers. Assumptions, scenarios, and action triggers.',
      icon = 'BarChart3'
  WHERE slug = 'planning';

UPDATE public.finance_sections
  SET description = 'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.',
      icon = 'TrendingUp'
  WHERE slug = 'analytics';

-- STEP 2 — Create finance_modules table if it does not exist
CREATE TABLE IF NOT EXISTS public.finance_modules (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_slug      text        NOT NULL REFERENCES public.finance_sections (slug),
  slug            text        NOT NULL UNIQUE,
  title           text        NOT NULL,
  thesis          text,
  sort_order      integer     NOT NULL DEFAULT 0,
  framing_content text,
  module_meta     jsonb       DEFAULT '{}',
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.finance_modules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'finance_modules'
    AND policyname = 'Finance modules are publicly readable'
  ) THEN
    CREATE POLICY "Finance modules are publicly readable"
      ON public.finance_modules FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'finance_modules'
    AND policyname = 'Admins can modify finance modules'
  ) THEN
    CREATE POLICY "Admins can modify finance modules"
      ON public.finance_modules FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add module_id FK to essays if it does not exist
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.finance_modules (id);

-- STEP 3 — Add lesson_type enum and column if missing
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

ALTER TABLE public.finance_modules
  ADD COLUMN IF NOT EXISTS module_meta jsonb DEFAULT '{}';

-- STEP 4 — Seed all 32 finance modules (idempotent)
INSERT INTO public.finance_modules (track_slug, slug, title, thesis, sort_order, module_meta)
VALUES

  -- FUNDAMENTALS (14 modules)
  ('fundamentals', 'purpose-of-financial-management',
   'The Purpose of Financial Management',
   'Finance exists to increase the value of the firm, not to produce reports.',
   1, '{"variant":"standard"}'),

  ('fundamentals', 'business-tax-financial-environment',
   'The Business, Tax, and Financial Environment',
   'Every financial decision happens inside a system of legal forms, tax rules, and market structures.',
   2, '{"variant":"standard"}'),

  ('fundamentals', 'time-value-of-money',
   'Time Value of Money',
   'A dollar today is worth more than a dollar tomorrow — but by how much depends on the question.',
   3, '{"variant":"standard"}'),

  ('fundamentals', 'valuation-of-securities',
   'Valuation of Securities',
   'Valuation is not about finding the right number — it is about understanding what assumptions produce which prices.',
   4, '{"variant":"standard"}'),

  ('fundamentals', 'risk-and-return',
   'Risk and Return',
   'Risk is not volatility. Risk is the probability of permanent loss or failure to meet an obligation.',
   5, '{"variant":"standard"}'),

  ('fundamentals', 'financial-statement-analysis',
   'Financial Statement Analysis',
   'Financial statements are a structured narrative — read them as a system, not as line items.',
   6, '{"variant":"standard"}'),

  ('fundamentals', 'cash-flow-and-financial-planning',
   'Cash Flow Analysis and Financial Planning',
   'Profit is an opinion. Cash is a fact.',
   7, '{"variant":"standard"}'),

  ('fundamentals', 'working-capital-management',
   'Working Capital Management',
   'Working capital is the silent value driver that most managers ignore until it becomes a crisis.',
   8, '{"variant":"standard"}'),

  ('fundamentals', 'capital-budgeting',
   'Capital Budgeting',
   'Capital budgeting is the most consequential decision in finance — it determines what the firm becomes.',
   9, '{"variant":"standard"}'),

  ('fundamentals', 'cost-of-capital',
   'Cost of Capital and Required Returns',
   'The cost of capital is the hurdle rate that separates value-creating investments from value-destroying ones.',
   10, '{"variant":"standard"}'),

  ('fundamentals', 'capital-structure-and-leverage',
   'Capital Structure and Leverage',
   'How a firm finances itself changes its risk, its cost of capital, and the distribution of value.',
   11, '{"variant":"standard"}'),

  ('fundamentals', 'dividend-policy',
   'Dividend Policy',
   'Dividend policy is a signaling mechanism and a capital allocation decision.',
   12, '{"variant":"standard"}'),

  ('fundamentals', 'capital-markets-and-instruments',
   'Capital Markets and Financing Instruments',
   'Understanding how markets price and distribute capital is essential to making intelligent financing decisions.',
   13, '{"variant":"standard"}'),

  ('fundamentals', 'mergers-restructuring-international',
   'Mergers, Restructuring, and International Finance',
   'Where all fundamentals converge into high-stakes, irreversible decisions.',
   14, '{"variant":"standard"}'),

  -- STRATEGIC FINANCE (6 modules)
  ('strategic-finance', 'capital-allocation-strategy',
   'Capital Allocation Strategy',
   'Given finite resources, where should the firm invest to maximize long-term value?',
   1, '{"variant":"board"}'),

  ('strategic-finance', 'corporate-restructuring-logic',
   'Corporate Restructuring Logic',
   'When does breaking a company apart create more value than keeping it together?',
   2, '{"variant":"board"}'),

  ('strategic-finance', 'ma-value-creation',
   'M&A Value Creation and Destruction',
   'How do you distinguish acquisitions that create value from those that only transfer it?',
   3, '{"variant":"board"}'),

  ('strategic-finance', 'strategic-capital-structure',
   'Strategic Capital Structure',
   'How should the firm''s financing mix evolve as its strategy evolves?',
   4, '{"variant":"board"}'),

  ('strategic-finance', 'shareholder-signaling-payout',
   'Shareholder Signaling and Payout Design',
   'How do capital return decisions communicate management''s view of the firm''s future?',
   5, '{"variant":"board"}'),

  ('strategic-finance', 'long-term-value-architecture',
   'Long-Term Value Architecture',
   'How do you design a firm''s financial architecture for sustainable value creation over decades?',
   6, '{"variant":"board"}'),

  -- PLANNING (6 modules)
  ('planning', 'budget-architecture',
   'Budget Architecture',
   'Structure matters more than numbers in budget design.',
   1, '{"variant":"planning"}'),

  ('planning', 'rolling-forecast-systems',
   'Rolling Forecast Systems',
   'Rolling forecasts and annual budgets solve different problems.',
   2, '{"variant":"planning"}'),

  ('planning', 'scenario-sensitivity-modeling',
   'Scenario and Sensitivity Modeling',
   'Scenario modeling is not optimism/pessimism — it is different futures.',
   3, '{"variant":"planning"}'),

  ('planning', 'cash-runway-liquidity',
   'Cash Runway and Liquidity Planning',
   'The 13-week cash flow is the most important model in a crisis.',
   4, '{"variant":"planning"}'),

  ('planning', 'working-capital-optimization',
   'Working Capital Optimization',
   'Working capital optimization is a source of internal financing.',
   5, '{"variant":"planning"}'),

  ('planning', 'growth-financing-planning',
   'Growth Financing Planning',
   'The sustainable growth rate is your company''s speed limit.',
   6, '{"variant":"planning"}'),

  -- ANALYTICS (6 modules)
  ('analytics', 'ratio-architecture',
   'Ratio Architecture',
   'Designing a measurement system, not a checklist.',
   1, '{"variant":"analytics"}'),

  ('analytics', 'unit-economics-contribution',
   'Unit Economics and Contribution Margin',
   'Not all revenue is equal.',
   2, '{"variant":"analytics"}'),

  ('analytics', 'variance-decomposition',
   'Variance Decomposition',
   'Variance analysis is storytelling, not arithmetic.',
   3, '{"variant":"analytics"}'),

  ('analytics', 'driver-based-forecasting',
   'Driver-Based Forecasting',
   'Operational inputs beat financial extrapolation.',
   4, '{"variant":"analytics"}'),

  ('analytics', 'sensitivity-decision-modeling',
   'Sensitivity Analysis and Decision Modeling',
   'Sensitivity analysis as decision support, not model decoration.',
   5, '{"variant":"analytics"}'),

  ('analytics', 'performance-dashboards',
   'Performance Dashboards and Reporting',
   'What to show, what to hide, and why.',
   6, '{"variant":"analytics"}')

ON CONFLICT (slug) DO NOTHING;

COMMIT;
