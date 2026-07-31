-- The placeholder fundamentals lessons seeded earlier (20260219_004) reference
-- the modules replaced below. Remove those lessons first so the FK on
-- essays.module_id does not block the curriculum rebuild. (Authoritative
-- lessons are managed via the admin UI.)
DELETE FROM essays
WHERE module_id IN (SELECT id FROM finance_modules WHERE track_slug = 'fundamentals');

-- Delete existing fundamentals modules and re-insert with updated curriculum
DELETE FROM finance_modules WHERE track_slug = 'fundamentals';

INSERT INTO finance_modules (track_slug, slug, sort_order, title, thesis) VALUES
('fundamentals', 'purpose-of-financial-management', 1, 'The Purpose of Financial Management', 'Why finance exists in an organization — and whose interests it serves.'),
('fundamentals', 'business-tax-financial-environment', 2, 'The Business, Tax, and Financial Environment', 'Legal forms, tax logic, and the flow of funds that shape every financial decision.'),
('fundamentals', 'time-value-of-money', 3, 'Time Value of Money', 'A dollar today is worth more than a dollar tomorrow — and everything follows from this.'),
('fundamentals', 'valuation-of-securities', 4, 'Valuation of Securities and Instruments', 'The logic of pricing bonds, preferred stock, and common equity.'),
('fundamentals', 'firm-valuation', 5, 'Firm Valuation: DCF and Relative Methods', 'How to value an entire business using discounted cash flows and market multiples.'),
('fundamentals', 'risk-return-portfolio-theory', 6, 'Risk, Return, and Portfolio Theory', 'How diversification works, and what it means to price risk in a portfolio.'),
('fundamentals', 'capm-factor-models', 7, 'The CAPM, Factor Models, and the Price of Risk', 'From beta to cost of equity — how markets translate risk into required returns.'),
('fundamentals', 'financial-statement-construction', 8, 'Financial Statement Construction and Quality Analysis', 'How to read what financial statements say — and detect when they mislead.'),
('fundamentals', 'financial-statement-analysis', 9, 'Financial Statement Analysis: Ratios, Profitability, and Risk Signals', 'Diagnostic tools for measuring financial health, profitability, and distress signals.'),
('fundamentals', 'cash-flow-analysis', 10, 'Cash Flow Analysis and Financial Forecasting', 'How cash moves through a business — and how to project it forward.'),
('fundamentals', 'working-capital-management', 11, 'Working Capital Management', 'The mechanics of receivables, payables, and inventory as capital decisions.'),
('fundamentals', 'capital-budgeting', 12, 'Capital Budgeting: Principles and Decision Rules', 'How firms decide which investments to make — and which to reject.'),
('fundamentals', 'real-options', 13, 'Real Options and Strategic Investment Flexibility', 'When the right to wait, expand, or exit is worth more than the base case.'),
('fundamentals', 'cost-of-capital', 14, 'Cost of Capital and Hurdle Rates', 'Building the discount rate that separates value creation from value destruction.'),
('fundamentals', 'capital-structure', 15, 'Capital Structure: Theory and the Optimal Debt Mix', 'Why the debt-equity mix matters — from Modigliani-Miller to real-world trade-offs.'),
('fundamentals', 'financial-contracting', 16, 'Financial Contracting and Security Design', 'Why debt, equity, and hybrids exist — and what contracting problems each solves.'),
('fundamentals', 'debt-as-control', 17, 'Debt as a Control Instrument and Governance Mechanism', 'How leverage disciplines managers and reallocates control rights when performance declines.'),
('fundamentals', 'dividend-policy', 18, 'Dividend Policy: Theory and Evidence', 'What finance theory says about returning cash — and what firms actually do.'),
('fundamentals', 'capital-markets', 19, 'Capital Markets, Instruments, and Market Efficiency', 'How capital markets work, how securities are issued, and how prices reflect information.'),
('fundamentals', 'international-capital-markets', 20, 'International Capital Markets and Cross-Border Finance', 'Financing across borders — instruments, country risk, and emerging market constraints.');