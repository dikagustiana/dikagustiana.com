-- =============================================================================
-- Seed: 20260218_002_seed_finance_modules.sql
--
-- Inserts all curriculum modules for all 4 finance tracks:
--   fundamentals (14 modules)
--   strategic-finance (6 modules)
--   planning (6 modules)
--   analytics (6 modules)
--
-- Prerequisites:
--   20260218_001_finance_modules_and_slug_unification.sql must have run first
--   (creates the finance_modules table and unifies finance_sections slugs).
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING
-- framing_content is omitted here; populate via separate content migration.
-- =============================================================================

INSERT INTO public.finance_modules (track_slug, slug, title, thesis, sort_order)
VALUES

  -- -------------------------------------------------------------------------
  -- FUNDAMENTALS — 14 modules
  -- -------------------------------------------------------------------------

  (
    'fundamentals',
    'purpose-of-financial-management',
    'The Purpose of Financial Management',
    'Finance exists to increase the value of the firm, not to produce reports.',
    1
  ),
  (
    'fundamentals',
    'business-tax-financial-environment',
    'The Business, Tax, and Financial Environment',
    'Every financial decision happens inside a system of legal forms, tax rules, and market structures.',
    2
  ),
  (
    'fundamentals',
    'time-value-of-money',
    'Time Value of Money',
    'A dollar today is worth more than a dollar tomorrow — but by how much depends on the question.',
    3
  ),
  (
    'fundamentals',
    'valuation-of-securities',
    'Valuation of Securities',
    'Valuation is not about finding the right number — it is about understanding what assumptions produce which prices.',
    4
  ),
  (
    'fundamentals',
    'risk-and-return',
    'Risk and Return',
    'Risk is not volatility. Risk is the probability of permanent loss or failure to meet an obligation.',
    5
  ),
  (
    'fundamentals',
    'financial-statement-analysis',
    'Financial Statement Analysis',
    'Financial statements are a structured narrative — read them as a system, not as line items.',
    6
  ),
  (
    'fundamentals',
    'cash-flow-and-financial-planning',
    'Cash Flow Analysis and Financial Planning',
    'Profit is an opinion. Cash is a fact.',
    7
  ),
  (
    'fundamentals',
    'working-capital-management',
    'Working Capital Management',
    'Working capital is the silent value driver that most managers ignore until it becomes a crisis.',
    8
  ),
  (
    'fundamentals',
    'capital-budgeting',
    'Capital Budgeting',
    'Capital budgeting is the most consequential decision in finance — it determines what the firm becomes.',
    9
  ),
  (
    'fundamentals',
    'cost-of-capital',
    'Cost of Capital and Required Returns',
    'The cost of capital is the hurdle rate that separates value-creating investments from value-destroying ones.',
    10
  ),
  (
    'fundamentals',
    'capital-structure-and-leverage',
    'Capital Structure and Leverage',
    'How a firm finances itself changes its risk, its cost of capital, and the distribution of value.',
    11
  ),
  (
    'fundamentals',
    'dividend-policy',
    'Dividend Policy',
    'Dividend policy is a signaling mechanism and a capital allocation decision.',
    12
  ),
  (
    'fundamentals',
    'capital-markets-and-instruments',
    'Capital Markets and Financing Instruments',
    'Understanding how markets price and distribute capital is essential to making intelligent financing decisions.',
    13
  ),
  (
    'fundamentals',
    'mergers-restructuring-international',
    'Mergers, Restructuring, and International Finance',
    'Where all fundamentals converge into high-stakes, irreversible decisions.',
    14
  ),

  -- -------------------------------------------------------------------------
  -- STRATEGIC FINANCE — 6 modules
  -- -------------------------------------------------------------------------

  (
    'strategic-finance',
    'capital-allocation-strategy',
    'Capital Allocation Strategy',
    'Given finite resources, where should the firm invest to maximize long-term value?',
    1
  ),
  (
    'strategic-finance',
    'corporate-restructuring-logic',
    'Corporate Restructuring Logic',
    'When does breaking a company apart create more value than keeping it together?',
    2
  ),
  (
    'strategic-finance',
    'ma-value-creation',
    'M&A Value Creation and Destruction',
    'How do you distinguish acquisitions that create value from those that only transfer it?',
    3
  ),
  (
    'strategic-finance',
    'strategic-capital-structure',
    'Strategic Capital Structure',
    'How should the firm''s financing mix evolve as its strategy evolves?',
    4
  ),
  (
    'strategic-finance',
    'shareholder-signaling-payout',
    'Shareholder Signaling and Payout Design',
    'How do capital return decisions communicate management''s view of the firm''s future?',
    5
  ),
  (
    'strategic-finance',
    'long-term-value-architecture',
    'Long-Term Value Architecture',
    'How do you design a firm''s financial architecture for sustainable value creation over decades?',
    6
  ),

  -- -------------------------------------------------------------------------
  -- PLANNING (financial planning & forecasting) — 6 modules
  -- -------------------------------------------------------------------------

  (
    'planning',
    'budget-architecture',
    'Budget Architecture',
    'Structure matters more than numbers in budget design.',
    1
  ),
  (
    'planning',
    'rolling-forecast-systems',
    'Rolling Forecast Systems',
    'Rolling forecasts and annual budgets solve different problems.',
    2
  ),
  (
    'planning',
    'scenario-sensitivity-modeling',
    'Scenario and Sensitivity Modeling',
    'Scenario modeling is not optimism/pessimism — it is different futures.',
    3
  ),
  (
    'planning',
    'cash-runway-liquidity',
    'Cash Runway and Liquidity Planning',
    'The 13-week cash flow is the most important model in a crisis.',
    4
  ),
  (
    'planning',
    'working-capital-optimization',
    'Working Capital Optimization',
    'Working capital optimization is a source of internal financing.',
    5
  ),
  (
    'planning',
    'growth-financing-planning',
    'Growth Financing Planning',
    'The sustainable growth rate is your company''s speed limit.',
    6
  ),

  -- -------------------------------------------------------------------------
  -- ANALYTICS (financial analytics) — 6 modules
  -- -------------------------------------------------------------------------

  (
    'analytics',
    'ratio-architecture',
    'Ratio Architecture',
    'Designing a measurement system, not a checklist.',
    1
  ),
  (
    'analytics',
    'unit-economics-contribution',
    'Unit Economics and Contribution Margin',
    'Not all revenue is equal.',
    2
  ),
  (
    'analytics',
    'variance-decomposition',
    'Variance Decomposition',
    'Variance analysis is storytelling, not arithmetic.',
    3
  ),
  (
    'analytics',
    'driver-based-forecasting',
    'Driver-Based Forecasting',
    'Operational inputs beat financial extrapolation.',
    4
  ),
  (
    'analytics',
    'sensitivity-decision-modeling',
    'Sensitivity Analysis and Decision Modeling',
    'Sensitivity analysis as decision support, not model decoration.',
    5
  ),
  (
    'analytics',
    'performance-dashboards',
    'Performance Dashboards and Reporting',
    'What to show, what to hide, and why.',
    6
  )

ON CONFLICT (slug) DO NOTHING;
