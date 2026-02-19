BEGIN;

-- =========================================================================
-- MODULE 01: purpose-of-financial-management (4 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'What Financial Management Actually Is',
    'what-financial-management-actually-is',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'purpose-of-financial-management'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Value Maximization vs Profit Maximization',
    'value-maximization-vs-profit-maximization',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'purpose-of-financial-management'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'The Agency Problem and Corporate Governance',
    'the-agency-problem-and-corporate-governance',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'purpose-of-financial-management'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'The Finance Function in an Organization',
    'the-finance-function-in-an-organization',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'purpose-of-financial-management'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 02: business-tax-financial-environment (4 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Legal Forms of Business Organization',
    'legal-forms-of-business-organization',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'business-tax-financial-environment'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'The Tax Environment for Financial Decisions',
    'the-tax-environment-for-financial-decisions',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'business-tax-financial-environment'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Financial Intermediaries and Markets',
    'financial-intermediaries-and-markets',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'business-tax-financial-environment'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'The Flow of Funds in an Economy',
    'the-flow-of-funds-in-an-economy',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'business-tax-financial-environment'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 03: time-value-of-money (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Why a Dollar Today Is Worth More',
    'why-a-dollar-today-is-worth-more',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'time-value-of-money'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Compounding and Discounting',
    'compounding-and-discounting',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'time-value-of-money'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Annuities, Perpetuities, and Uneven Streams',
    'annuities-perpetuities-and-uneven-streams',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'time-value-of-money'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Compounding Frequency and Effective Rates',
    'compounding-frequency-and-effective-rates',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'time-value-of-money'),
    'draft', false, 'exercise', 4, 4, 'Dika Gustiana'
  ),
  (
    'Loan Amortization',
    'loan-amortization',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'time-value-of-money'),
    'draft', false, 'exercise', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 04: valuation-of-securities (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'The Logic of Valuation',
    'the-logic-of-valuation',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'valuation-of-securities'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Bond Valuation and Yield',
    'bond-valuation-and-yield',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'valuation-of-securities'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Preferred Stock Valuation',
    'preferred-stock-valuation',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'valuation-of-securities'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Common Stock Valuation Models',
    'common-stock-valuation-models',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'valuation-of-securities'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  ),
  (
    'When Valuation Models Break Down',
    'when-valuation-models-break-down',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'valuation-of-securities'),
    'draft', false, 'framework', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 05: risk-and-return (4 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Defining Risk and Measuring It',
    'defining-risk-and-measuring-it',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'risk-and-return'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Portfolio Diversification',
    'portfolio-diversification',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'risk-and-return'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'The Capital Asset Pricing Model',
    'the-capital-asset-pricing-model',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'risk-and-return'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Efficient Markets and What They Mean for You',
    'efficient-markets-and-what-they-mean-for-you',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'risk-and-return'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 06: financial-statement-analysis (6 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Reading Financial Statements as a System',
    'reading-financial-statements-as-a-system',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Liquidity and Activity Ratios',
    'liquidity-and-activity-ratios',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Leverage and Coverage Ratios',
    'leverage-and-coverage-ratios',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Profitability Ratios and DuPont Decomposition',
    'profitability-ratios-and-dupont-decomposition',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  ),
  (
    'Trend Analysis and Common-Size Statements',
    'trend-analysis-and-common-size-statements',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'framework', 5, 5, 'Dika Gustiana'
  ),
  (
    'Statement Analysis in Practice',
    'statement-analysis-in-practice',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'case-study', 6, 6, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 07: cash-flow-and-financial-planning (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Sources and Uses of Funds',
    'sources-and-uses-of-funds',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cash-flow-and-financial-planning'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'The Statement of Cash Flows',
    'the-statement-of-cash-flows',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cash-flow-and-financial-planning'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Cash-Flow Forecasting',
    'cash-flow-forecasting',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cash-flow-and-financial-planning'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Pro Forma Financial Statements',
    'pro-forma-financial-statements',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cash-flow-and-financial-planning'),
    'draft', false, 'exercise', 4, 4, 'Dika Gustiana'
  ),
  (
    'Sustainable Growth Rate',
    'sustainable-growth-rate',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cash-flow-and-financial-planning'),
    'draft', false, 'framework', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 08: working-capital-management (6 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Working Capital as a Value Driver',
    'working-capital-as-a-value-driver',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Cash and Liquidity Management',
    'cash-and-liquidity-management',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Receivables and Credit Policy',
    'receivables-and-credit-policy',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Inventory Management and Control',
    'inventory-management-and-control',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  ),
  (
    'Short-Term Financing Sources',
    'short-term-financing-sources',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'concept', 5, 5, 'Dika Gustiana'
  ),
  (
    'The Working Capital Policy Decision',
    'the-working-capital-policy-decision',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'framework', 6, 6, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 09: capital-budgeting (6 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Why Capital Budgeting Is the Most Important Decision',
    'why-capital-budgeting-is-the-most-important-decision',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Estimating Incremental Cash Flows',
    'estimating-incremental-cash-flows',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'NPV, IRR, and Payback',
    'npv-irr-and-payback',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'When IRR and NPV Disagree',
    'when-irr-and-npv-disagree',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  ),
  (
    'Real Options in Capital Budgeting',
    'real-options-in-capital-budgeting',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'concept', 5, 5, 'Dika Gustiana'
  ),
  (
    'Capital Budgeting Under Uncertainty',
    'capital-budgeting-under-uncertainty',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'exercise', 6, 6, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 10: cost-of-capital (4 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'What Cost of Capital Means',
    'what-cost-of-capital-means',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cost-of-capital'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'The Weighted Average Cost of Capital',
    'the-weighted-average-cost-of-capital',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cost-of-capital'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Estimating the Cost of Equity',
    'estimating-the-cost-of-equity',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cost-of-capital'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Project-Specific Required Returns',
    'project-specific-required-returns',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cost-of-capital'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 11: capital-structure-and-leverage (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Operating Leverage',
    'operating-leverage',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-structure-and-leverage'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Financial Leverage',
    'financial-leverage',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-structure-and-leverage'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'The Modigliani-Miller Propositions',
    'the-modigliani-miller-propositions',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-structure-and-leverage'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Capital Structure in Practice',
    'capital-structure-in-practice',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-structure-and-leverage'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  ),
  (
    'Debt Capacity and Cash Flow Analysis',
    'debt-capacity-and-cash-flow-analysis',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-structure-and-leverage'),
    'draft', false, 'exercise', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 12: dividend-policy (4 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Does Dividend Policy Matter?',
    'does-dividend-policy-matter',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'dividend-policy'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Factors That Influence Payout',
    'factors-that-influence-payout',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'dividend-policy'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Stock Dividends, Splits, and Repurchases',
    'stock-dividends-splits-and-repurchases',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'dividend-policy'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Designing a Payout Policy',
    'designing-a-payout-policy',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'dividend-policy'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 13: capital-markets-and-instruments (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'How Capital Markets Work',
    'how-capital-markets-work',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-markets-and-instruments'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Equity Financing — IPOs and SEOs',
    'equity-financing-ipos-and-seos',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-markets-and-instruments'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Debt Instruments and Term Loans',
    'debt-instruments-and-term-loans',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-markets-and-instruments'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Leases, Convertibles, and Warrants',
    'leases-convertibles-and-warrants',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-markets-and-instruments'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  ),
  (
    'Choosing a Financing Instrument',
    'choosing-a-financing-instrument',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-markets-and-instruments'),
    'draft', false, 'framework', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 14: mergers-restructuring-international (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Sources of Value in M&A',
    'sources-of-value-in-ma',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'mergers-restructuring-international'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Acquisition Valuation and Deal Structure',
    'acquisition-valuation-and-deal-structure',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'mergers-restructuring-international'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Corporate Restructuring and Divestitures',
    'corporate-restructuring-and-divestitures',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'mergers-restructuring-international'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Exchange-Rate Risk and International Finance',
    'exchange-rate-risk-and-international-finance',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'mergers-restructuring-international'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  ),
  (
    'When All Fundamentals Converge',
    'when-all-fundamentals-converge',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'mergers-restructuring-international'),
    'draft', false, 'framework', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

COMMIT;
