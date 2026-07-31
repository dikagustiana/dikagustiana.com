-- =============================================================================
-- 20260731235900_seed_surviving_content.sql
--
-- DATA-ONLY reseed of the content that survived the loss of Supabase project
-- `rhwzvgklasvitocbbhvi`. Runs against the fresh baseline schema (tables,
-- enums, RLS already in place). Contains NO DDL.
--
-- Reconstructed entirely from supabase/migrations/_archive/. Nothing here was
-- invented: every title, slug, thesis, figure and manifesto is copied from a
-- committed migration, and where the archive holds no value the column is left
-- NULL rather than filled with a guess.
--
-- ---------------------------------------------------------------------------
-- WHAT IS RESEEDED                                              rows
-- ---------------------------------------------------------------------------
--   sections                                                       8
--     from 20260204074340 (upsert supersedes the 6 rows of 20260203162402)
--   categories                                                      1
--     'General' / finance-general — the NOT NULL category_id parent for every
--     finance essay below (20260219_004)
--   fsli_pages                                                     24
--     from 20251223120457, verbatim; never updated or deleted afterwards
--   finance_sections                                                4
--     resolved end state of 20260214113534 + 20260218_001 (slug renames)
--     + 20260220_001 STEP 1 (description/icon rewrite for planning, analytics)
--   finance_settings                                                2
--     finance_tagline (20260214120000); featured_finance_essay_id = NULL
--   finance_modules                                                49
--     fundamentals 20 (20260301070510, verbatim — that migration deleted every
--       earlier fundamentals module, so its 20 rows are the final state and the
--       12 rows migrated from finance_fundamentals plus the 14 in 20260218_002
--       are superseded)
--     strategic-finance 13, planning 7, analytics 9 — reconstructed from the
--       "-- Module NN:" comments of 20260301073238 / 073420 / 073540, with
--       slug/title/thesis taken from 20260218_002 wherever a module there
--       corresponds (18 of the 29). The other 11 carry a slug derived
--       mechanically from the comment label and thesis = NULL.
--     module_meta follows 20260219_001 / 20260220_001 (board / planning /
--       analytics per track; fundamentals keeps '{}' because 20260301070510
--       re-inserted those rows after 20260219_001 had already run).
--   essays — draft stubs                                          105
--     55 strategic-finance (sf-NN-MM), 25 planning (pf-NN-MM),
--     25 analytics (fa-NN-MM) from 20260301073238 / 073420 / 073540.
--     Titles verbatim. The originals hardcoded module_id UUIDs that no
--     migration ever created (those modules existed only in production), so a
--     literal replay fails the FK. module_id is resolved here by subquery on
--     track_slug + sort_order, decoded from the slug prefix. No literal UUIDs.
--     The 68 fundamentals lesson stubs of 20260219_004 are NOT reseeded —
--     20260301070510 deleted them.
--   essays — published                                              1
--     'site-rebuild-note', an honest placeholder (see below). Not from the
--     archive: no migration anywhere contains a published essay or any essay
--     body. It exists so the acceptance bar "anonymous visitor can read a
--     published essay and cannot read a draft" is testable, and it is a
--     single-row DELETE from the admin UI.
--                                                             ---------
--   TOTAL rows written                                            194
--
-- ---------------------------------------------------------------------------
-- WHAT WAS LOST AND IS NOT RECOVERABLE FROM MIGRATIONS
-- ---------------------------------------------------------------------------
--   * Every published essay body. essays.content (canonical TipTap JSON) and
--     essays.snippet / date / read_time / thumbnail_url / economist_fields for
--     all real prose. No migration ever carried an essay body. The 105 stubs
--     below are titles and ordering only.
--   * All content_json / layout_config documents, and the entire
--     essay_revisions history.
--   * fsli_sections — all editable narrative for the 24 FSLI pages. The page
--     headers survive (fsli_pages); the commentary under them does not.
--   * books_uploads — every row, and every object in the `books`, `embeds`,
--     `essay-images` and `finance-models` storage buckets. Storage is not
--     reachable from a data migration; those files are gone with the project.
--   * finance_models — every row (the table was created empty by 20260301075250
--     and populated only through the admin UI).
--   * finance_modules.framing_content for all 49 modules, and the thesis for
--     the 11 non-fundamentals modules with no authored source in the archive.
--   * The finance_sections row with slug 'finance-in-motion'. 20260227153508
--     UPDATEs it (title 'Capital Allocation', a 15-capital-conditions
--     description) but NO migration ever inserts it — it was created in
--     production only. Its slug, icon and sort_order are unknown, so it is
--     deliberately NOT recreated here. /finance/finance-in-motion will render
--     without its DB row until the owner re-adds it.
--   * finance_settings.featured_finance_essay_id — pointed at an essay UUID
--     that no longer exists. Seeded NULL (the row must exist: the admin UI
--     UPDATEs it, it does not upsert).
--   * Any category or essay authored through the admin UI after 2026-07-04
--     (the last archived migration). Nothing after that date left a trace in
--     version control.
--
-- ---------------------------------------------------------------------------
-- IDEMPOTENCY — every INSERT names a real unique constraint
-- ---------------------------------------------------------------------------
--   sections          ON CONFLICT (slug)             -> sections_slug_key
--                     DO UPDATE: 20260204074340 was itself an upsert whose
--                     purpose was to force these 8 rows to these values.
--   categories        ON CONFLICT (section_id, slug) -> categories_section_id_slug_key
--   fsli_pages        ON CONFLICT (slug)             -> fsli_pages_slug_key
--   finance_sections  ON CONFLICT (slug)             -> finance_sections_slug_key
--                     DO UPDATE: this is a resolved end state; converging is
--                     the point.
--   finance_settings  ON CONFLICT (key)              -> finance_settings_key_key
--                     DO NOTHING — DO UPDATE would reset a
--                     featured_finance_essay_id the owner had since set.
--   finance_modules   ON CONFLICT (slug)             -> finance_modules_slug_key
--   essays            ON CONFLICT (slug)             -> essays_slug_unique
--                     (unique index, 20260215_001 step 5 / 20260310000954)
--                     DO NOTHING — must never clobber prose written later.
--   The originals that were NOT idempotent and are fixed here: the
--   finance_categories seed (20251225064909), the finance_sections seed
--   (20260214113534), and all three essay INSERTs (20260301073238 / 073420 /
--   073540), none of which had an ON CONFLICT clause.
--
-- Nothing here references auth.users, user_roles, profiles, created_by,
-- uploaded_by or changed_by: no migration can seed a user. Everything runs in
-- one transaction, so a partial failure leaves no half-seeded curriculum.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. sections — 8 rows
--    Verbatim VALUES from 20260204074340, including the doubled apostrophe in
--    the 'tools' manifesto.
-- =============================================================================

INSERT INTO public.sections (slug, name, voice_role, manifesto, sort_order) VALUES
  ('finance', 'Finance', 'manager', 'Finance exists to support decisions—not to produce reports.', 1),
  ('accounting', 'Accounting', 'manager', 'Accounting describes economic reality. Your job is to describe it accurately.', 2),
  ('green-transition', 'Green Transition', 'economist', 'The green transition is an economic problem—not just an environmental one.', 3),
  ('next-big-thing', 'The Next Big Thing', 'economist', 'Rigorous speculation about structural economic change.', 4),
  ('books', 'Books', 'educator', 'Books are tools. Use them or do not pick them up.', 5),
  ('ielts', 'IELTS', 'coach', 'A score is the only measure. Everything else is preparation.', 6),
  ('tools', 'Tools', 'manager', 'Tools exist to support decisions. If a tool doesn''t inform a decision, it''s entertainment.', 7),
  ('critical-thinking', 'Critical Thinking', 'economist', 'Critical thinking is pattern recognition applied to claims. It is trainable.', 8)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  voice_role = EXCLUDED.voice_role,
  manifesto = EXCLUDED.manifesto,
  sort_order = EXCLUDED.sort_order;

-- =============================================================================
-- 2. categories — 1 row
--    essays.category_id is NOT NULL (20260215_001) and none of the archived
--    finance essay INSERTs supply it; 20260219_004 solved that with a fixed
--    UUID '0f111111-1111-4111-8111-111111111111' plus a column-level DEFAULT.
--
--    We deliberately do NOT reuse either. section_id is resolved from
--    sections.slug and every essay below resolves category_id by subquery, so
--    this seed (a) carries no literal UUID, (b) does not depend on a DDL-level
--    DEFAULT the fresh baseline may not have shipped, and (c) still works if
--    the row already exists under a different id — e.g. created by the admin
--    UI before this ran.
-- =============================================================================

INSERT INTO public.categories (name, slug, section_id, sort_order)
SELECT 'General', 'finance-general', s.id, 0
FROM public.sections s
WHERE s.slug = 'finance'
ON CONFLICT (section_id, slug) DO NOTHING;

-- =============================================================================
-- 3. fsli_pages — 24 rows
--    Verbatim from 20251223120457 (Indonesian subtitle, notes_ref, and the
--    dec_2024 / dec_2023 figure strings). DO NOTHING: the figures are editable
--    from the admin UI and must not be reset by a re-run.
-- =============================================================================

INSERT INTO public.fsli_pages (slug, title, subtitle, notes_ref, dec_2024, dec_2023, category, sort_order) VALUES
('cash-and-cash-equivalents', 'Cash and cash equivalents', 'Kas dan setara kas', '3i.6', '2,614,318', '5,018,739', 'current_assets', 1),
('restricted-cash', 'Restricted cash', 'Kas yang dibatasi penggunaannya', '3i.7', '154,217', '133,537', 'current_assets', 2),
('trade-receivables-net', 'Trade receivables, net', 'Piutang usaha, neto', '3b,4dc', '2,203,018', '2,063,070', 'current_assets', 3),
('third-parties', 'Third parties', 'Piutang ketiga', '3b.5', '520,885', '715,327', 'current_assets', 4),
('related-parties', 'Related parties', 'Piutang bermiutah', '3g.9', '823,348', '801,429', 'current_assets', 5),
('other-receivables-net', 'Other receivables, net', 'Piutang lain-lain, neto', '3h,10,14d', '28,830', '28,217', 'current_assets', 6),
('due-from-government', 'Due from the Government', 'Piutang dari Pemerintah', '3h,10', '85,053', '94,887', 'current_assets', 7),
('inventories-net', 'Inventories, net', 'Persediaan, neto', '3j,11', '809,397', '658,712', 'current_assets', 8),
('corporate-dividend-taxes-receivable-current', 'Corporate and dividend taxes receivable - current portion', 'Piutang pajak penghasilan dan dividen taxes', '3c,43a', '300,738', '275,812', 'current_assets', 9),
('advances-prepayments-current', 'Advances and prepayments - current portion', 'Uang muka dan biaya dibayar di muka', '3c,43a', '20,268', '12,503', 'current_assets', 10),
('other-current-assets', 'Other current assets', 'Aset lancar lainnya', '3h,15', '179,426', '177,429', 'current_assets', 11),
('other-non-current-assets', 'Other non-current assets', 'Aset tidak lancar lainnya', '14a', '60,913', '210,253', 'non_current_assets', 12),
('restricted-cash-non-current', 'Restricted cash - non-current portion', 'Kas yang dibatasi penggunaannya', '3i,7', '1,890,493', '1,700,675', 'non_current_assets', 13),
('trade-receivables-net-non-current', 'Trade receivables, net - non-current portion', 'Piutang usaha, neto', '3i,12', '544,278', '522,121', 'non_current_assets', 14),
('fixed-assets-net', 'Fixed assets, net', 'Aset tetap, neto', '3d,13', '71,814', '73,800', 'non_current_assets', 15),
('investment-properties', 'Investment properties', 'Properti investasi', '3c,43a', '5,149', '3,301', 'non_current_assets', 16),
('deferred-tax-assets', 'Deferred tax assets', 'Aset pajak tangguhan', '10', '53,721', '95,263', 'non_current_assets', 17),
('long-term-investments', 'Long-term investments', 'Investasi jangka panjang', '', '1,109,172', '1,602,821', 'non_current_assets', 18),
('advances-prepayments-non-current', 'Advances and prepayments - non-current portion', 'Uang muka dan biaya dibayar di muka', '3h,15', '50', '2,242', 'non_current_assets', 19),
('corporate-dividend-taxes-receivable-non-current', 'Corporate and dividend taxes receivable - non-current portion', 'Piutang pajak penghasilan dan dividen taxes', '3c,43a', '262,713', '213,492', 'non_current_assets', 20),
('other-non-current-receivables', 'Other non-current receivables', 'Piutang tidak lancar lainnya', '3c,43a', '3,106', '3,460', 'non_current_assets', 21),
('oil-gas-properties-net', 'Oil and gas properties, net', 'Aset hak dan gas bumi, neto', '3m,17', '17,905,149', '16,130,200', 'non_current_assets', 22),
('right-of-use-assets-net', 'Right of use assets, net', 'Aset hak guna, neto', '3n,18', '123,977', '203,379', 'non_current_assets', 23),
('other-non-current-assets-final', 'Other non-current assets', 'Aset tidak lancar lainnya', '15b', '533,865', '455,380', 'non_current_assets', 24)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 4. finance_sections — 4 rows, resolved end state
--
--    Layer 1  20260214113534 seeded 4 rows (no ON CONFLICT). Titles survive for
--             all 4; descriptions survive for fundamentals + strategic-finance.
--    Layer 1b 20260214120000 re-seeded the same 4 slugs ON CONFLICT DO NOTHING,
--             so its descriptions were discarded at that point.
--    Layer 2  20260218_001 renamed planning-forecasting -> planning and
--             financial-analytics -> analytics.
--    Layer 3  20260220_001 STEP 1 rewrote description + icon for planning and
--             analytics — which is how 20260214120000's text for those two
--             finally landed.
--
--    Emitted directly at the end state; no insert-then-update sequence.
--    NOT emitted: slug 'finance-in-motion' (see header — production-only row).
-- =============================================================================

INSERT INTO public.finance_sections (slug, title, description, icon, sort_order) VALUES
  ('fundamentals', 'Fundamentals',
   'Core concepts every finance professional must master.',
   'Landmark', 1),
  ('strategic-finance', 'Strategic Finance',
   'Capital allocation, M&A, and value creation.',
   'Target', 2),
  ('planning', 'Planning & Forecasting',
   'Translating strategy into numbers. Assumptions, scenarios, and action triggers.',
   'BarChart3', 3),
  ('analytics', 'Financial Analytics',
   'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.',
   'TrendingUp', 4)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- =============================================================================
-- 5. finance_settings — 2 rows
--    Both rows must EXIST even when empty: the admin UI UPDATEs by key, it
--    does not upsert (src/hooks/queries/useFinance.ts useUpdateFinanceSetting).
--    featured_finance_essay_id is NULL on purpose — in production it held an
--    essay UUID that no longer exists.
-- =============================================================================

INSERT INTO public.finance_settings (key, value) VALUES
  ('finance_tagline', 'Finance exists to support decisions — not to produce reports.'),
  ('featured_finance_essay_id', NULL)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 6. finance_modules — 49 rows across 4 tracks
--    track_slug is a FK to finance_sections.slug, so section 4 must precede it.
-- =============================================================================

-- ---- fundamentals: 20 rows ---------------------------------------------------
-- Verbatim from 20260301070510. module_meta is left at '{}': 20260219_001 set
-- '{"variant":"standard"}' on the fundamentals modules that existed on
-- 2026-02-19, but 20260301070510 later DELETEd all of them and re-inserted
-- these 20 without module_meta, so production held '{}' here. '{}' renders the
-- standard module header anyway (FinanceModulePage falls back to 'standard').

INSERT INTO public.finance_modules (track_slug, slug, sort_order, title, thesis, module_meta) VALUES
('fundamentals', 'purpose-of-financial-management', 1, 'The Purpose of Financial Management', 'Why finance exists in an organization — and whose interests it serves.', '{}'::jsonb),
('fundamentals', 'business-tax-financial-environment', 2, 'The Business, Tax, and Financial Environment', 'Legal forms, tax logic, and the flow of funds that shape every financial decision.', '{}'::jsonb),
('fundamentals', 'time-value-of-money', 3, 'Time Value of Money', 'A dollar today is worth more than a dollar tomorrow — and everything follows from this.', '{}'::jsonb),
('fundamentals', 'valuation-of-securities', 4, 'Valuation of Securities and Instruments', 'The logic of pricing bonds, preferred stock, and common equity.', '{}'::jsonb),
('fundamentals', 'firm-valuation', 5, 'Firm Valuation: DCF and Relative Methods', 'How to value an entire business using discounted cash flows and market multiples.', '{}'::jsonb),
('fundamentals', 'risk-return-portfolio-theory', 6, 'Risk, Return, and Portfolio Theory', 'How diversification works, and what it means to price risk in a portfolio.', '{}'::jsonb),
('fundamentals', 'capm-factor-models', 7, 'The CAPM, Factor Models, and the Price of Risk', 'From beta to cost of equity — how markets translate risk into required returns.', '{}'::jsonb),
('fundamentals', 'financial-statement-construction', 8, 'Financial Statement Construction and Quality Analysis', 'How to read what financial statements say — and detect when they mislead.', '{}'::jsonb),
('fundamentals', 'financial-statement-analysis', 9, 'Financial Statement Analysis: Ratios, Profitability, and Risk Signals', 'Diagnostic tools for measuring financial health, profitability, and distress signals.', '{}'::jsonb),
('fundamentals', 'cash-flow-analysis', 10, 'Cash Flow Analysis and Financial Forecasting', 'How cash moves through a business — and how to project it forward.', '{}'::jsonb),
('fundamentals', 'working-capital-management', 11, 'Working Capital Management', 'The mechanics of receivables, payables, and inventory as capital decisions.', '{}'::jsonb),
('fundamentals', 'capital-budgeting', 12, 'Capital Budgeting: Principles and Decision Rules', 'How firms decide which investments to make — and which to reject.', '{}'::jsonb),
('fundamentals', 'real-options', 13, 'Real Options and Strategic Investment Flexibility', 'When the right to wait, expand, or exit is worth more than the base case.', '{}'::jsonb),
('fundamentals', 'cost-of-capital', 14, 'Cost of Capital and Hurdle Rates', 'Building the discount rate that separates value creation from value destruction.', '{}'::jsonb),
('fundamentals', 'capital-structure', 15, 'Capital Structure: Theory and the Optimal Debt Mix', 'Why the debt-equity mix matters — from Modigliani-Miller to real-world trade-offs.', '{}'::jsonb),
('fundamentals', 'financial-contracting', 16, 'Financial Contracting and Security Design', 'Why debt, equity, and hybrids exist — and what contracting problems each solves.', '{}'::jsonb),
('fundamentals', 'debt-as-control', 17, 'Debt as a Control Instrument and Governance Mechanism', 'How leverage disciplines managers and reallocates control rights when performance declines.', '{}'::jsonb),
('fundamentals', 'dividend-policy', 18, 'Dividend Policy: Theory and Evidence', 'What finance theory says about returning cash — and what firms actually do.', '{}'::jsonb),
('fundamentals', 'capital-markets', 19, 'Capital Markets, Instruments, and Market Efficiency', 'How capital markets work, how securities are issued, and how prices reflect information.', '{}'::jsonb),
('fundamentals', 'international-capital-markets', 20, 'International Capital Markets and Cross-Border Finance', 'Financing across borders — instruments, country risk, and emerging market constraints.', '{}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ---- strategic-finance: 13 rows ----------------------------------------------
-- sort_order = the module number in the "-- Module NN:" comments of
-- 20260301073238. [AUTHORED] = slug/title/thesis lifted from 20260218_002
-- because that module clearly corresponds. [DERIVED] = no counterpart in
-- 20260218_002; title is the comment label, slug is that label lowercased with
-- non-alphanumerics collapsed to '-', and thesis is NULL rather than invented.

INSERT INTO public.finance_modules (track_slug, slug, sort_order, title, thesis, module_meta) VALUES
-- 01 "Corporate Governance and Agency Theory"  [DERIVED]
('strategic-finance', 'corporate-governance-and-agency-theory', 1,
 'Corporate Governance and Agency Theory',
 NULL, '{"variant":"board"}'::jsonb),
-- 02 "Capital Allocation Strategy"  [AUTHORED <- capital-allocation-strategy]
('strategic-finance', 'capital-allocation-strategy', 2,
 'Capital Allocation Strategy',
 'Given finite resources, where should the firm invest to maximize long-term value?', '{"variant":"board"}'::jsonb),
-- 03 "M&A"  [AUTHORED <- ma-value-creation]
('strategic-finance', 'ma-value-creation', 3,
 'M&A Value Creation and Destruction',
 'How do you distinguish acquisitions that create value from those that only transfer it?', '{"variant":"board"}'::jsonb),
-- 04 "Corporate Restructuring"  [AUTHORED <- corporate-restructuring-logic]
('strategic-finance', 'corporate-restructuring-logic', 4,
 'Corporate Restructuring Logic',
 'When does breaking a company apart create more value than keeping it together?', '{"variant":"board"}'::jsonb),
-- 05 "Strategic Capital Structure"  [AUTHORED <- strategic-capital-structure]
('strategic-finance', 'strategic-capital-structure', 5,
 'Strategic Capital Structure',
 'How should the firm''s financing mix evolve as its strategy evolves?', '{"variant":"board"}'::jsonb),
-- 06 "Interest Rate Risk"  [DERIVED]
('strategic-finance', 'interest-rate-risk', 6,
 'Interest Rate Risk',
 NULL, '{"variant":"board"}'::jsonb),
-- 07 "Credit Risk"  [DERIVED]
('strategic-finance', 'credit-risk', 7,
 'Credit Risk',
 NULL, '{"variant":"board"}'::jsonb),
-- 08 "FX Risk"  [DERIVED]
('strategic-finance', 'fx-risk', 8,
 'FX Risk',
 NULL, '{"variant":"board"}'::jsonb),
-- 09 "Derivatives"  [DERIVED]
('strategic-finance', 'derivatives', 9,
 'Derivatives',
 NULL, '{"variant":"board"}'::jsonb),
-- 10 "Shareholder Signaling"  [AUTHORED <- shareholder-signaling-payout]
('strategic-finance', 'shareholder-signaling-payout', 10,
 'Shareholder Signaling and Payout Design',
 'How do capital return decisions communicate management''s view of the firm''s future?', '{"variant":"board"}'::jsonb),
-- 11 "Long-Term Value Architecture"  [AUTHORED <- long-term-value-architecture]
('strategic-finance', 'long-term-value-architecture', 11,
 'Long-Term Value Architecture',
 'How do you design a firm''s financial architecture for sustainable value creation over decades?', '{"variant":"board"}'::jsonb),
-- 12 "ESG"  [DERIVED]
('strategic-finance', 'esg', 12,
 'ESG',
 NULL, '{"variant":"board"}'::jsonb),
-- 13 "Political Economy"  [DERIVED]
('strategic-finance', 'political-economy', 13,
 'Political Economy',
 NULL, '{"variant":"board"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ---- planning: 7 rows --------------------------------------------------------
-- sort_order = module number from the comments of 20260301073420. Note the
-- 20260218_002 sort_orders differ (it had 6 planning modules); the comment
-- numbering wins, because essays.module_id below is resolved on it.

INSERT INTO public.finance_modules (track_slug, slug, sort_order, title, thesis, module_meta) VALUES
-- 01 "Budget Architecture"  [AUTHORED <- budget-architecture]
('planning', 'budget-architecture', 1,
 'Budget Architecture',
 'Structure matters more than numbers in budget design.', '{"variant":"planning"}'::jsonb),
-- 02 "Rolling Forecast"  [AUTHORED <- rolling-forecast-systems]
('planning', 'rolling-forecast-systems', 2,
 'Rolling Forecast Systems',
 'Rolling forecasts and annual budgets solve different problems.', '{"variant":"planning"}'::jsonb),
-- 03 "Scenario Planning"  [AUTHORED <- scenario-sensitivity-modeling]
('planning', 'scenario-sensitivity-modeling', 3,
 'Scenario and Sensitivity Modeling',
 'Scenario modeling is not optimism/pessimism — it is different futures.', '{"variant":"planning"}'::jsonb),
-- 04 "Treasury Architecture"  [DERIVED]
('planning', 'treasury-architecture', 4,
 'Treasury Architecture',
 NULL, '{"variant":"planning"}'::jsonb),
-- 05 "Cash Runway"  [AUTHORED <- cash-runway-liquidity]
('planning', 'cash-runway-liquidity', 5,
 'Cash Runway and Liquidity Planning',
 'The 13-week cash flow is the most important model in a crisis.', '{"variant":"planning"}'::jsonb),
-- 06 "Working Capital"  [AUTHORED <- working-capital-optimization]
('planning', 'working-capital-optimization', 6,
 'Working Capital Optimization',
 'Working capital optimization is a source of internal financing.', '{"variant":"planning"}'::jsonb),
-- 07 "Capital Needs"  [AUTHORED <- growth-financing-planning]
--    Weakest of the 18 matches: matched on content, not label. The three
--    essays under it are a bottoms-up funding-needs model, equity dilution
--    modelling, and the investor-ready package — i.e. financing growth. It is
--    also the only unmatched authored planning module left once Treasury
--    Architecture (cash pooling / short-term funding / counterparty risk) is
--    excluded as plainly not it.
('planning', 'growth-financing-planning', 7,
 'Growth Financing Planning',
 'The sustainable growth rate is your company''s speed limit.', '{"variant":"planning"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ---- analytics: 9 rows -------------------------------------------------------
-- sort_order from the comments of 20260301073540. The first three are labelled
-- QM1 / QM2 / QM3 (quantitative-methods prerequisites) rather than 01/02/03 —
-- they are sort_order 1 / 2 / 3, confirmed by the hardcoded module UUIDs in
-- that file grouping the fa-01-*, fa-02-* and fa-03-* essays under them.

INSERT INTO public.finance_modules (track_slug, slug, sort_order, title, thesis, module_meta) VALUES
-- QM1 "Linear Algebra"  [DERIVED]
('analytics', 'linear-algebra', 1,
 'Linear Algebra',
 NULL, '{"variant":"analytics"}'::jsonb),
-- QM2 "Calculus"  [DERIVED]
('analytics', 'calculus', 2,
 'Calculus',
 NULL, '{"variant":"analytics"}'::jsonb),
-- QM3 "Probability"  [DERIVED]
('analytics', 'probability', 3,
 'Probability',
 NULL, '{"variant":"analytics"}'::jsonb),
-- 04 "Ratio Architecture"  [AUTHORED <- ratio-architecture]
('analytics', 'ratio-architecture', 4,
 'Ratio Architecture',
 'Designing a measurement system, not a checklist.', '{"variant":"analytics"}'::jsonb),
-- 05 "Unit Economics"  [AUTHORED <- unit-economics-contribution]
('analytics', 'unit-economics-contribution', 5,
 'Unit Economics and Contribution Margin',
 'Not all revenue is equal.', '{"variant":"analytics"}'::jsonb),
-- 06 "Variance Decomposition"  [AUTHORED <- variance-decomposition]
('analytics', 'variance-decomposition', 6,
 'Variance Decomposition',
 'Variance analysis is storytelling, not arithmetic.', '{"variant":"analytics"}'::jsonb),
-- 07 "Driver-Based Forecasting"  [AUTHORED <- driver-based-forecasting]
('analytics', 'driver-based-forecasting', 7,
 'Driver-Based Forecasting',
 'Operational inputs beat financial extrapolation.', '{"variant":"analytics"}'::jsonb),
-- 08 "Sensitivity Analysis"  [AUTHORED <- sensitivity-decision-modeling]
('analytics', 'sensitivity-decision-modeling', 8,
 'Sensitivity Analysis and Decision Modeling',
 'Sensitivity analysis as decision support, not model decoration.', '{"variant":"analytics"}'::jsonb),
-- 09 "Performance Dashboards"  [AUTHORED <- performance-dashboards]
('analytics', 'performance-dashboards', 9,
 'Performance Dashboards and Reporting',
 'What to show, what to hide, and why.', '{"variant":"analytics"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 7. essays — 105 draft stubs
--
--    Titles copied verbatim (they are long and several carry doubled
--    apostrophes). section='finance', finance_order, published=false,
--    status='draft', author='Dika Gustiana' preserved from the originals.
--
--    module_id: the originals hardcoded UUIDs for modules that no migration
--    creates. Resolved here by subquery on track_slug + sort_order, where
--    sort_order is decoded from the slug prefix (sf-07-03 = strategic-finance
--    module 07, essay 03). That mapping was verified mechanically against the
--    archive: within each file every distinct slug prefix maps to exactly one
--    hardcoded UUID and no UUID spans two prefixes, each module's row count
--    equals the count declared in its comment, and finance_order is a
--    contiguous 1..n run per module.
--
--    category_id: resolved by subquery to finance-general. NOT inherited from
--    a column DEFAULT and never a literal UUID.
--
--    finance_section and sort_order are left NULL exactly as the originals left
--    them — the curriculum views key on module_id, not finance_section.
-- =============================================================================

-- ---- strategic-finance -------------------------------------------
INSERT INTO public.essays
  (section, slug, title, module_id, category_id, finance_order, published, status, author)
SELECT
  'finance', v.slug, v.title,
  (SELECT m.id FROM public.finance_modules m
    WHERE m.track_slug = 'strategic-finance' AND m.sort_order = v.module_no),
  (SELECT c.id FROM public.categories c JOIN public.sections s ON s.id = c.section_id
    WHERE s.slug = 'finance' AND c.slug = 'finance-general'),
  v.finance_order, false, 'draft'::public.content_status_enum, 'Dika Gustiana'
FROM (VALUES
  -- Module 01: Corporate Governance and Agency Theory
  (1::int, 'sf-01-01', 'The Principal-Agent Problem as the Central Problem of Corporate Finance: How the Separation of Ownership and Control Creates Costs That Capital Structure and Governance Mechanisms Exist to Manage', 1::int),
  (1, 'sf-01-02', 'Board Architecture and CFO Accountability: Independence, Audit Committee Design, and the Governance Structures That Actually Constrain Executive Behavior', 2),
  (1, 'sf-01-03', 'Ownership Concentration and Governance Quality in Emerging Market Business Groups: Why Blockholder Monitoring and Tunneling Coexist in the Same Institutional Structure', 3),
  (1, 'sf-01-04', 'Stakeholder Capitalism vs. Shareholder Primacy: The Empirical Record, the Contractual Argument, and Why the Debate Matters for Capital Allocation Doctrine', 4),
  -- Module 02: Capital Allocation Strategy
  (2, 'sf-02-01', 'ROIC as the Master Capital Allocation Metric: Why Return on Invested Capital Above the Cost of Capital Is the Necessary and Sufficient Condition for Value Creation', 1),
  (2, 'sf-02-02', 'The Capital Allocation Hierarchy: How Boards and CFOs Should Prioritize Between Organic Investment, M&A, Debt Reduction, and Shareholder Returns Across the Business Cycle', 2),
  (2, 'sf-02-03', 'Portfolio Capital Allocation in Multi-Business Firms: BCG Matrix, McKinsey GE Framework, and Why Internal Capital Markets Systematically Misallocate Relative to External Markets', 3),
  (2, 'sf-02-04', 'The Capital Budget as a Governance Document: How the Annual Investment Approval Process Either Enforces or Undermines the Strategic Capital Allocation Framework', 4),
  (2, 'sf-02-05', 'Communicating Capital Allocation Doctrine to Boards and Investors: The Investor Letter, the Capital Markets Day, and the Metrics That Build Long-Term Institutional Credibility', 5),
  -- Module 03: M&A
  (3, 'sf-03-01', 'Synergy Valuation Methodology: How to Decompose Revenue, Cost, and Financial Synergies into Present Value Without Replicating the Optimism Bias That Destroys M&A Value', 1),
  (3, 'sf-03-02', 'Deal Structure and Consideration Design: When to Use Cash vs. Stock, How Earnouts Solve Valuation Disagreements, and the Tax Implications of Each Structure', 2),
  (3, 'sf-03-03', 'Accretion/Dilution Analysis as a Flawed Primary Decision Framework: Why EPS Accretion Is a Necessary but Insufficient Condition for Value Creation', 3),
  (3, 'sf-03-04', 'Post-Merger Integration Failure: The Organizational, Cultural, and Financial Mechanisms Through Which 60–70% of Acquisitions Destroy Shareholder Value', 4),
  (3, 'sf-03-05', 'LBO Architecture and Return Attribution: How Leverage, Multiple Expansion, and Operational Improvement Each Contribute to Private Equity Returns', 5),
  -- Module 04: Corporate Restructuring
  (4, 'sf-04-01', 'Spin-Off, Carve-Out, and Split-Off: The Valuation Logic for Separation Transactions and When Sum-of-Parts Exceeds Conglomerate Value', 1),
  (4, 'sf-04-02', 'Balance Sheet Restructuring as Strategic Finance: How Recapitalizations, Debt-for-Equity Swaps, and Liability Management Operations Change the Risk Profile of the Firm', 2),
  (4, 'sf-04-03', 'Distress-Driven Restructuring: The Decision Tree from Covenant Breach to Out-of-Court Workout to Chapter 11, and How Each Path Allocates Value Across Claimants', 3),
  (4, 'sf-04-04', 'Divestitures as Capital Reallocation: How Asset Sales, Sale-Leasebacks, and Portfolio Simplification Programs Release Trapped Value and Fund Core Investment', 4),
  -- Module 05: Strategic Capital Structure
  (5, 'sf-05-01', 'The Operating Income Approach to Optimal Leverage: How to Use Cash Flow Stress Tests to Find the Debt Level a Business Can Sustain Across the Cycle Without Covenant Breach', 1),
  (5, 'sf-05-02', 'Financing Instrument Selection Under Information Asymmetry: Why the Pecking Order Reflects a Rational Response to Adverse Selection Rather Than Simple Preference', 2),
  (5, 'sf-05-03', 'Credit Rating Management as a Capital Structure Objective: How CFOs Engineer Leverage, Coverage, and Liquidity to Target and Defend Specific Rating Levels', 3),
  (5, 'sf-05-04', 'Capital Structure Across the Business Cycle: When to Lever Up, When to Deleverage, and How to Use the Cycle to Refinance at Lower Rates Before Others Do', 4),
  (5, 'sf-05-05', 'Convertible Bonds, Hybrid Instruments, and the Strategic Use of Ambiguous Securities: How Instruments at the Debt-Equity Boundary Solve Specific Contracting and Signaling Problems', 5),
  -- Module 06: Interest Rate Risk
  (6, 'sf-06-01', 'Duration, Convexity, and the Interest Rate Sensitivity of Debt Portfolios: How Small Rate Movements Translate Into Large Market Value Changes for Long-Duration Liabilities', 1),
  (6, 'sf-06-02', 'Fixed vs. Floating Debt Strategy Under Different Rate Environments: When to Lock In Rates, When to Stay Variable, and How the Choice Interacts With Asset Duration', 2),
  (6, 'sf-06-03', 'Interest Rate Swap Architecture: How Plain Vanilla, Basis, and Cross-Currency Swaps Are Used to Engineer the Desired Rate Exposure Without Altering Debt Principal', 3),
  (6, 'sf-06-04', 'Refinancing Risk and Debt Maturity Management: How Laddering, Bullet Avoidance, and Covenant-Aware Refinancing Protect Against Liquidity Events', 4),
  -- Module 07: Credit Risk
  (7, 'sf-07-01', 'Credit Rating Agency Methodology: How S&P, Moody''s, and Fitch Convert Financial Ratios into Letter Ratings, and Why the Same EBITDA Can Support Different Ratings in Different Industries', 1),
  (7, 'sf-07-02', 'Covenant Architecture and Control Rights Transfer: How Maintenance Covenants, Incurrence Covenants, and Cross-Default Provisions Reallocate Decision Authority from Management to Creditors', 2),
  (7, 'sf-07-03', 'Distress Prediction Frameworks: Altman Z-Score, Ohlson O-Score, and the Financial Ratios That Signal Distress 12–24 Months Before Default', 3),
  (7, 'sf-07-04', 'Out-of-Court Restructuring vs. Formal Insolvency: The Economics of Consent Solicitations, Exchange Offers, and Pre-Packaged Plans — and Who Bears the Cost of Each Process', 4),
  (7, 'sf-07-05', 'Lender Negotiation in Distress: The Information Asymmetry Between Debtor and Creditor, Holdout Problems, and How CFOs Manage the Stakeholder Map in Financial Distress', 5),
  -- Module 08: FX Risk
  (8, 'sf-08-01', 'Transaction, Translation, and Economic FX Exposure: Why the Third Is the Most Important and the Most Difficult to Hedge, and How Multinationals Systematically Underestimate It', 1),
  (8, 'sf-08-02', 'FX Hedging Instruments: Forwards, Futures, Options, and Cross-Currency Swaps — Construction, Cost, and the Conditions Under Which Each Is Preferred', 2),
  (8, 'sf-08-03', 'Natural Hedging and Operational FX Management: How Revenue Currency Matching, Local Funding, and Supply Chain Design Reduce FX Exposure Before Financial Instruments Are Required', 3),
  (8, 'sf-08-04', 'IFRS 9 Hedge Accounting and Its CFO Implications: Qualifying Hedges, Effectiveness Testing, and How Accounting Treatment Affects the Incentive to Hedge', 4),
  -- Module 09: Derivatives
  (9, 'sf-09-01', 'Options Pricing Logic: How Black-Scholes Translates Volatility, Time, and the Risk-Free Rate into a Premium — and Why Understanding the Greeks Matters for Corporate Hedging Decisions', 1),
  (9, 'sf-09-02', 'Corporate Commodity Hedging Strategy: When to Hedge Commodity Input Prices, How Much to Hedge, Over What Horizon, and How to Communicate the Hedging Policy to Investors', 2),
  (9, 'sf-09-03', 'Credit Default Swaps as Capital Structure Instruments: How CDS Spreads Price Default Risk and Why They Matter for Treasury Risk Monitoring', 3),
  (9, 'sf-09-04', 'When Not to Hedge: The Cases Where Hedging Destroys Value — Speculative Positions, Benchmark Confusion, and the Risk of Replacing Operational Risk with Counterparty Risk', 4),
  -- Module 10: Shareholder Signaling
  (10, 'sf-10-01', 'The Dividend vs. Buyback Decision: How Tax Position, Signaling Intent, Flexibility Requirements, and Investor Base Composition Should Drive the Payout Instrument Choice', 1),
  (10, 'sf-10-02', 'Buyback Mechanics: Open Market Repurchases, Fixed-Price Tenders, Accelerated Share Repurchases, and How Each Is Perceived by the Market', 2),
  (10, 'sf-10-03', 'Payout Policy Across the Capital Allocation Hierarchy: How CFOs Should Frame the Decision to Return Capital vs. Reinvest — and Why Most Payout Announcements Are Made at the Wrong Point in the Cycle', 3),
  (10, 'sf-10-04', 'Information Content of Payout Decisions: How Initiating, Increasing, Cutting, or Suspending Dividends Signals Management''s Private Information About Future Earnings Quality', 4),
  (10, 'sf-10-05', 'Activist Shareholder Engagement and Payout Pressure: The Playbook, the Counter-Arguments, and How CFOs Construct a Capital Return Narrative That Preempts Activism', 5),
  -- Module 11: Long-Term Value Architecture
  (11, 'sf-11-01', 'ROIC Decomposition: How Splitting Return on Invested Capital Into Margin and Asset Turnover Reveals Whether Value Creation Is Driven by Pricing Power or Capital Efficiency', 1),
  (11, 'sf-11-02', 'Economic Value Added as a Management Incentive System: EVA Construction, Capital Charge Design, and the Conditions Under Which EVA Compensation Actually Aligns Management With Shareholders', 2),
  (11, 'sf-11-03', 'Value Driver Trees and Strategic Operating Decisions: How to Connect Revenue Growth, Operating Margin, Capital Intensity, and Cost of Capital Into a Single Coherent Value Map for the Board', 3),
  (11, 'sf-11-04', 'Intrinsic Value vs. Market Value: Why They Diverge, How to Identify When the Gap Is Large Enough to Act On, and What the CFO Can Do to Close It', 4),
  -- Module 12: ESG
  (12, 'sf-12-01', 'Green Bond and Sustainability-Linked Bond Mechanics: How Instrument Design, Use-of-Proceeds Requirements, and KPI Linkage Affect Pricing Relative to Vanilla Debt', 1),
  (12, 'sf-12-02', 'Climate-Adjusted Cost of Capital: The Theoretical Framework for Incorporating Physical Risk and Transition Risk Into Discount Rates, and Why Current Market Practice Underestimates Both', 2),
  (12, 'sf-12-03', 'TCFD Disclosure and the Board''s Financial Obligations: How Climate Risk Scenario Analysis Translates Into Balance Sheet Stress, Capex Reallocation, and Stranded Asset Provisions', 3),
  -- Module 13: Political Economy
  (13, 'sf-13-01', 'Legal System Quality and the Cost of Capital: How Investor Protection, Contract Enforcement, and Property Rights Are Priced Into Required Returns in Emerging Markets', 1),
  (13, 'sf-13-02', 'State-Owned Enterprise Governance and Capital Allocation Distortions: How Political Objectives, Implicit Guarantees, and Soft Budget Constraints Distort Investment Decisions in SOE-Adjacent Industries', 2),
  (13, 'sf-13-03', 'Conglomerate Finance in Indonesian Business Groups: How Cross-Subsidiary Guarantee Structures, Internal Capital Markets, and Group-Level Treasury Create Risk Exposures That External Investors Consistently Misprice', 3)
) AS v(module_no, slug, title, finance_order)
ON CONFLICT (slug) DO NOTHING;

-- ---- planning ----------------------------------------------------
INSERT INTO public.essays
  (section, slug, title, module_id, category_id, finance_order, published, status, author)
SELECT
  'finance', v.slug, v.title,
  (SELECT m.id FROM public.finance_modules m
    WHERE m.track_slug = 'planning' AND m.sort_order = v.module_no),
  (SELECT c.id FROM public.categories c JOIN public.sections s ON s.id = c.section_id
    WHERE s.slug = 'finance' AND c.slug = 'finance-general'),
  v.finance_order, false, 'draft'::public.content_status_enum, 'Dika Gustiana'
FROM (VALUES
  -- Module 01: Budget Architecture
  (1::int, 'pf-01-01', 'Zero-Based vs. Incremental Budgeting: Why the Choice Is Not About Methodology but About What Management Culture the Budget Process Is Designed to Produce', 1::int),
  (1, 'pf-01-02', 'Three-Statement Budget Integration: How Plug Variables, Circular References, and Cash Sweep Mechanics Work in an Institutionally Robust Integrated Financial Model', 2),
  (1, 'pf-01-03', 'Budget Governance and the CFO''s Role in Preventing Budget Gaming: Sandbagging, Padding, and the Information Asymmetry Between Business Units and the Center', 3),
  (1, 'pf-01-04', 'Connecting Budget Architecture to Strategic Capital Allocation: How the Annual Budget Must Be Derived From the Capital Allocation Framework, Not Constructed Independently of It', 4),
  -- Module 02: Rolling Forecast
  (2, 'pf-02-01', 'Rolling Forecast vs. Annual Budget: Why Separating the Forecast Function From the Target-Setting Function Eliminates Forecast Bias Without Eliminating Accountability', 1),
  (2, 'pf-02-02', 'Reforecast Cadence Design: How to Choose Between Monthly, Quarterly, and Event-Triggered Reforecasting Based on Business Cycle Volatility and Decision-Making Speed', 2),
  (2, 'pf-02-03', 'Building a Forecast Culture: How CFOs Eliminate Anchoring Bias, Recency Bias, and Sandbagging From the Forecast Process Without Destroying the Forecasters'' Willingness to Commit', 3),
  -- Module 03: Scenario Planning
  (3, 'pf-03-01', 'Macro Scenario Construction for CFOs: How to Build Economically Consistent Base, Upside, and Downside Scenarios That Are Useful for Decision-Making Rather Than Just Risk Disclosure', 1),
  (3, 'pf-03-02', 'Reverse Stress Testing: Starting From the Breaking Point — How to Identify the Scenario in Which the Business Model Fails and Work Backward to Understand Its Proximity', 2),
  (3, 'pf-03-03', 'Covenant Stress Testing and Headroom Management: How to Model Financial Covenant Compliance Under Adverse Scenarios and Determine the Liquidity Buffer Required to Avoid Breach', 3),
  (3, 'pf-03-04', 'Communicating Scenarios to Boards and Lenders: How to Present Uncertainty Without Creating Panic, and How to Use Scenarios to Drive Capital Allocation Decisions Rather Than Justify Inaction', 4),
  -- Module 04: Treasury Architecture
  (4, 'pf-04-01', 'Cash Pooling Structures for Multinational Groups: Notional vs. Physical Pooling, In-House Banking, and the Legal, Tax, and Regulatory Constraints That Determine Which Structure Is Feasible', 1),
  (4, 'pf-04-02', 'Short-Term Funding Markets and Corporate Liquidity Infrastructure: Commercial Paper, Money Market Facilities, and How Treasury Constructs the Funding Stack That Buffers Against Operational Cash Volatility', 2),
  (4, 'pf-04-03', 'Counterparty Risk in Treasury Operations: How to Design Bank Relationship Limits, Collateral Requirements, and Settlement Protocols That Prevent Treasury From Becoming a Source of Concentration Risk', 3),
  -- Module 05: Cash Runway
  (5, 'pf-05-01', 'The 13-Week Cash Flow Model: Construction, Driver Assumptions, and How Weekly Liquidity Visibility Changes the Quality of Board-Level Decisions in Stressed Environments', 1),
  (5, 'pf-05-02', 'Minimum Cash Balance Policy: How to Determine the Structural Liquidity Floor Below Which Operating Risk Materializes, and How That Floor Changes Across Business Cycle Phases', 2),
  (5, 'pf-05-03', 'Early Warning Indicators for Liquidity Deterioration: The Financial Ratios, Operating Metrics, and Covenant Headroom Thresholds That Precede Distress by Six to Twelve Months', 3),
  (5, 'pf-05-04', 'Cash Crisis Protocol: The Decision Tree from First Liquidity Warning to Emergency Capital Raise, and How CFOs Sequence Actions to Preserve Maximum Stakeholder Value', 4),
  -- Module 06: Working Capital
  (6, 'pf-06-01', 'Receivables Management and Working Capital Financing: Invoice Factoring, Receivables Securitization, Dynamic Discounting, and How Each Trades Yield Against Balance Sheet Risk', 1),
  (6, 'pf-06-02', 'Payables Extension as a Financing Strategy: Supply Chain Finance, Reverse Factoring, and the Ethical and Reputational Constraints That Limit How Far Payables Stretching Can Go', 2),
  (6, 'pf-06-03', 'Inventory Optimization and Cash Conversion: How Demand Variability, Lead Time Reduction, and Safety Stock Calculations Translate Into Working Capital Release and Free Cash Flow Generation', 3),
  (6, 'pf-06-04', 'Working Capital in M&A Due Diligence: How Normalized Working Capital Peg Calculations, Seasonality Adjustments, and Working Capital Quality Analysis Determine the True Cash Price of an Acquisition', 4),
  -- Module 07: Capital Needs
  (7, 'pf-07-01', 'Modeling Capital Requirements From Growth Assumptions: How to Build a Bottoms-Up Funding Needs Model That Connects Revenue Growth, Operating Investment, and Working Capital Absorption Into a Funding Requirement', 1),
  (7, 'pf-07-02', 'Equity Dilution Modeling: How to Calculate Pre-Money Valuation, Dilution Impact, Ownership Waterfall, and Anti-Dilution Mechanics for Funding Round Negotiations', 2),
  (7, 'pf-07-03', 'The Investor-Ready Financial Package: How CFOs Structure Financial Projections, Sensitivity Analysis, and Covenant Headroom Documentation to Reduce Information Asymmetry With Lenders and Investors', 3)
) AS v(module_no, slug, title, finance_order)
ON CONFLICT (slug) DO NOTHING;

-- ---- analytics ---------------------------------------------------
INSERT INTO public.essays
  (section, slug, title, module_id, category_id, finance_order, published, status, author)
SELECT
  'finance', v.slug, v.title,
  (SELECT m.id FROM public.finance_modules m
    WHERE m.track_slug = 'analytics' AND m.sort_order = v.module_no),
  (SELECT c.id FROM public.categories c JOIN public.sections s ON s.id = c.section_id
    WHERE s.slug = 'finance' AND c.slug = 'finance-general'),
  v.finance_order, false, 'draft'::public.content_status_enum, 'Dika Gustiana'
FROM (VALUES
  -- QM1: Linear Algebra
  (1::int, 'fa-01-01', 'Matrix Operations as Financial Infrastructure: How Covariance Matrices, Factor Loading Matrices, and OLS in Matrix Form Underlie Every Multi-Asset Risk and Regression Calculation in Finance', 1::int),
  (1, 'fa-01-02', 'Eigenvalue Decomposition in Portfolio Analysis: How Principal Component Analysis Identifies the Dominant Sources of Portfolio Variance That Simple Correlation Analysis Misses', 2),
  -- QM2: Calculus
  (2, 'fa-02-01', 'Optimization as Capital Decision Logic: How First-Order Conditions, Lagrange Multipliers, and the KKT Conditions Formalize the CFO''s Resource Allocation Problem', 1),
  (2, 'fa-02-02', 'Convexity in Financial Decision Problems: Why Convex Objective Functions Are Desirable, How Concavity Produces Risk Aversion, and What Both Imply for Capital Allocation Under Uncertainty', 2),
  -- QM3: Probability
  (3, 'fa-03-01', 'Probability Distributions in Finance: How Normal, Lognormal, and Fat-Tailed Distributions Model Different Financial Phenomena, and Why Choosing the Wrong Distribution Produces Systematically Wrong Risk Estimates', 1),
  (3, 'fa-03-02', 'Regression Analysis for Financial Inference: OLS Assumptions, Diagnostic Testing, and How Violations of Gauss-Markov Conditions Produce Unreliable Beta, Cost of Capital, and Driver Estimates', 2),
  (3, 'fa-03-03', 'Stochastic Processes and Option Pricing Foundations: Brownian Motion, Geometric Brownian Motion, and the Mathematical Bridge from Asset Price Dynamics to the Black-Scholes Formula', 3),
  -- Module 04: Ratio Architecture
  (4, 'fa-04-01', 'DuPont as a Strategic Management System: How Decomposing ROE Into Profit Margin, Asset Turnover, and Financial Leverage Connects Accounting Output to Operating Strategy', 1),
  (4, 'fa-04-02', 'Ratio Benchmarking Methodology: How to Select Comparable Firms, Adjust for Accounting Differences, and Interpret Cross-Sectional Ratio Dispersion Without False Precision', 2),
  (4, 'fa-04-03', 'Detecting Financial Deterioration Before Default: The Sequence of Ratio Degradation — From Profitability to Coverage to Liquidity to Solvency — and the Time Lags Between Each', 3),
  -- Module 05: Unit Economics
  (5, 'fa-05-01', 'Contribution Margin Architecture Across Business Models: How Unit Economics Differ Structurally Between Asset-Heavy Industrial Firms, Platform Businesses, and Subscription Models', 1),
  (5, 'fa-05-02', 'Customer Lifetime Value and Customer Acquisition Cost: The Unit Economic Foundation for Growth Investment Decisions, and Why LTV/CAC Ratios Without Cohort-Level Data Are Almost Always Wrong', 2),
  (5, 'fa-05-03', 'Operating Leverage Quantification: How Fixed vs. Variable Cost Structure Translates Into Earnings Volatility, and Why High Operating Leverage Changes the Optimal Capital Structure', 3),
  -- Module 06: Variance Decomposition
  (6, 'fa-06-01', 'Price-Volume-Mix Variance Decomposition: The Mathematical Structure of Three-Way Attribution and Why the Cross-Term Assignment Convention Has Managerial Implications', 1),
  (6, 'fa-06-02', 'Bridge Analysis Construction for Board Reporting: How to Build a Waterfall Chart That Moves From Prior Period to Current Period Performance With Each Bridge Column Representing a Single Clean Cause', 2),
  (6, 'fa-06-03', 'Root Cause Isolation vs. Symptom Identification: How to Distinguish First-Order Variance Drivers From Second-Order Effects, and Why Most Variance Commentaries Stop Too Early', 3),
  -- Module 07: Driver-Based Forecasting
  (7, 'fa-07-01', 'Driver Tree Construction: How to Map a Business Model''s Value Creation Logic Into a Hierarchical Set of Quantifiable Drivers That Connect KPIs to Financial Line Items', 1),
  (7, 'fa-07-02', 'Driver Sensitivity Ranking: How Partial Derivative Analysis Identifies the Two or Three Drivers That Explain 80% of Forecast Variance, and Why Everything Else Is Noise', 2),
  (7, 'fa-07-03', 'Updating Forecasts From Driver Signals: How to Build a Forecast Update Protocol That Moves From Operational Leading Indicators to Financial Reforecast Without Waiting for Month-End Close', 3),
  -- Module 08: Sensitivity Analysis
  (8, 'fa-08-01', 'Tornado Chart Construction and Interpretation: How One-Way Sensitivity Analysis Ranks Assumption Risk and Why the Visual Presentation of Sensitivity Changes What Decisions Get Made', 1),
  (8, 'fa-08-02', 'Monte Carlo Simulation for Capital Decisions: How to Define Probability Distributions for Key Assumptions, Run Correlated Simulations, and Interpret the Output Distribution Without Overstating Precision', 2),
  (8, 'fa-08-03', 'Decision Tree Analysis Under Sequential Uncertainty: How to Structure Staged Investment Decisions, Assign Probabilities to Branch Nodes, and Calculate Expected Value Including the Option to Stop', 3),
  -- Module 09: Performance Dashboards
  (9, 'fa-09-01', 'KPI Selection as a Governance Decision: How to Choose the Minimum Set of Metrics That Gives the Board Sufficient Information to Monitor Strategy Without Creating Reporting Theater', 1),
  (9, 'fa-09-02', 'Financial Reporting for Different Audiences: How the Same Underlying Financial Data Must Be Structured Differently for the Board, the CFO''s Management Pack, the Lender Compliance Report, and the Investor Presentation', 2),
  (9, 'fa-09-03', 'Leading vs. Lagging Indicators in Performance Architecture: Why Dashboards Anchored to Lagging Accounting Metrics Systematically Fail to Alert Management Early Enough to Change Outcomes', 3)
) AS v(module_no, slug, title, finance_order)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 8. essays — 1 published placeholder
--
--    Not reconstructed: no migration in the archive contains a published essay
--    or any essay body, so there is nothing to restore. This row exists for two
--    reasons and states both of them in its own text:
--      (a) the rebuild's acceptance bar requires that an anonymous visitor can
--          read a published essay while drafts stay invisible, which needs at
--          least one published row to test against;
--      (b) a visitor arriving at a suddenly-empty site deserves an explanation.
--
--    It deliberately contains no finance analysis, no opinion, and nothing that
--    reads as the owner's authored writing — only facts about the rebuild.
--
--    Column choice: the app renders essays.content (TipTap JSON stored as text,
--    parsed by src/lib/tiptap/serialize.ts and rendered by ArticleBody).
--    src/pages/FinanceEssayPage.tsx reads essay.content; content_json is not
--    referenced anywhere in src/ — grep confirms zero uses. So content is
--    populated and content_json is left NULL.
--
--    voice_role is left NULL on purpose. The archived
--    validate_essay_tone_fields() trigger RAISEs on publish when voice_role
--    names a role whose *_fields JSONB is empty; with voice_role NULL no branch
--    fires and the insert publishes cleanly whether or not the baseline kept
--    that trigger.
--
--    module_id is NULL: this is a site notice, not a lesson, and attaching it
--    to a curriculum module would list it as that module's lesson 01.01.
--    It is still fully readable, because FinanceEssayPage looks essays up by
--    slug alone — /finance/fundamentals/purpose-of-financial-management/
--    site-rebuild-note renders it with correct breadcrumbs and back-link.
--
--    Deleting it is a single row DELETE from Admin -> Content (no revisions, no
--    FK dependents, and featured_finance_essay_id does not point at it).
-- =============================================================================

INSERT INTO public.essays
  (section, slug, title, category_id, snippet, content,
   author, date, read_time, published, status)
SELECT
  'finance',
  'site-rebuild-note',
  $ttl$Site Rebuild Note: What Was Lost on 2026-07-31, and What Survived$ttl$,
  (SELECT c.id FROM public.categories c JOIN public.sections s ON s.id = c.section_id
    WHERE s.slug = 'finance' AND c.slug = 'finance-general'),
  $snip$The database behind this site was rebuilt on 2026-07-31. Essays written through the CMS before that date were lost. The curriculum outline survived in version control and is being rewritten.$snip$,
  $tiptap${"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The database behind this site was rebuilt from scratch on 31 July 2026. The Supabase project that had been running it was deleted. Every essay written through this site's CMS was stored only in that database, so those essay bodies are gone. They were not in version control and there is no backup to restore them from."}]},{"type":"paragraph","content":[{"type":"text","text":"What survived is the structure, because the structure lived in migration files: the section taxonomy, the 24 FSLI reference pages, the four finance tracks, and the full curriculum outline of 49 modules and 105 lesson titles across Strategic Finance, Planning & Forecasting, and Financial Analytics. That outline is intact. It is what you see below."}]},{"type":"paragraph","content":[{"type":"text","text":"The lessons themselves are being rewritten. Each one is an unpublished draft until it is finished, so for now the curriculum shows its titles and not much else."}]},{"type":"paragraph","content":[{"type":"text","text":"This note is a placeholder. It will be deleted once the essays are back."}]}]}$tiptap$,
  'Dika Gustiana',
  '2026-07-31',
  '1 min read',
  true,
  'published'::public.content_status_enum
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 9. Post-seed assertions
--    These run inside the same transaction, so a failed reconstruction aborts
--    the whole seed rather than leaving half a curriculum behind. Counts are
--    written as ">=" where later admin-authored rows could legitimately raise
--    them, and as exact equality only for the closed sets this file owns.
-- =============================================================================

DO $assert$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM public.sections;
  IF n < 8 THEN RAISE EXCEPTION 'seed: expected >= 8 sections, found %', n; END IF;

  SELECT count(*) INTO n FROM public.categories c
    JOIN public.sections s ON s.id = c.section_id
    WHERE s.slug = 'finance' AND c.slug = 'finance-general';
  IF n <> 1 THEN RAISE EXCEPTION 'seed: finance-general category missing (found %)', n; END IF;

  SELECT count(*) INTO n FROM public.fsli_pages;
  IF n < 24 THEN RAISE EXCEPTION 'seed: expected >= 24 fsli_pages, found %', n; END IF;

  SELECT count(*) INTO n FROM public.finance_sections
    WHERE slug IN ('fundamentals', 'strategic-finance', 'planning', 'analytics');
  IF n <> 4 THEN RAISE EXCEPTION 'seed: expected 4 finance_sections, found %', n; END IF;

  SELECT count(*) INTO n FROM public.finance_settings
    WHERE key IN ('finance_tagline', 'featured_finance_essay_id');
  IF n <> 2 THEN RAISE EXCEPTION 'seed: expected 2 finance_settings, found %', n; END IF;

  SELECT count(*) INTO n FROM public.finance_modules WHERE track_slug = 'fundamentals';
  IF n < 20 THEN RAISE EXCEPTION 'seed: expected >= 20 fundamentals modules, found %', n; END IF;
  SELECT count(*) INTO n FROM public.finance_modules WHERE track_slug = 'strategic-finance';
  IF n < 13 THEN RAISE EXCEPTION 'seed: expected >= 13 strategic-finance modules, found %', n; END IF;
  SELECT count(*) INTO n FROM public.finance_modules WHERE track_slug = 'planning';
  IF n < 7 THEN RAISE EXCEPTION 'seed: expected >= 7 planning modules, found %', n; END IF;
  SELECT count(*) INTO n FROM public.finance_modules WHERE track_slug = 'analytics';
  IF n < 9 THEN RAISE EXCEPTION 'seed: expected >= 9 analytics modules, found %', n; END IF;

  -- All 105 stubs present.
  SELECT count(*) INTO n FROM public.essays
    WHERE slug ~ '^(sf|pf|fa)-[0-9]{2}-[0-9]{2}$';
  IF n <> 105 THEN RAISE EXCEPTION 'seed: expected 105 curriculum stubs, found %', n; END IF;

  -- Module resolution actually resolved. A scalar subquery that matches nothing
  -- yields NULL silently, so this is the check that matters most.
  SELECT count(*) INTO n FROM public.essays
    WHERE slug ~ '^(sf|pf|fa)-[0-9]{2}-[0-9]{2}$' AND module_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'seed: % curriculum stubs have NULL module_id — module lookup failed', n;
  END IF;

  -- Each stub landed in the track its slug prefix names.
  SELECT count(*) INTO n
    FROM public.essays e
    JOIN public.finance_modules m ON m.id = e.module_id
   WHERE e.slug ~ '^(sf|pf|fa)-[0-9]{2}-[0-9]{2}$'
     AND m.track_slug <> CASE left(e.slug, 2)
                           WHEN 'sf' THEN 'strategic-finance'
                           WHEN 'pf' THEN 'planning'
                           ELSE 'analytics'
                         END;
  IF n > 0 THEN RAISE EXCEPTION 'seed: % stubs bound to the wrong track', n; END IF;

  -- ...and in the module its slug numbers.
  SELECT count(*) INTO n
    FROM public.essays e
    JOIN public.finance_modules m ON m.id = e.module_id
   WHERE e.slug ~ '^(sf|pf|fa)-[0-9]{2}-[0-9]{2}$'
     AND m.sort_order <> split_part(e.slug, '-', 2)::int;
  IF n > 0 THEN RAISE EXCEPTION 'seed: % stubs bound to the wrong module', n; END IF;

  -- Every stub is still a draft.
  SELECT count(*) INTO n FROM public.essays
    WHERE slug ~ '^(sf|pf|fa)-[0-9]{2}-[0-9]{2}$'
      AND (published IS DISTINCT FROM false OR status <> 'draft');
  IF n > 0 THEN RAISE EXCEPTION 'seed: % stubs are not drafts', n; END IF;

  -- The one published row exists and is published.
  SELECT count(*) INTO n FROM public.essays
    WHERE slug = 'site-rebuild-note' AND published IS TRUE AND status = 'published';
  IF n <> 1 THEN RAISE EXCEPTION 'seed: site-rebuild-note is not published (found %)', n; END IF;

  -- No essay left without a category.
  SELECT count(*) INTO n FROM public.essays WHERE category_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'seed: % essays have no category_id', n; END IF;
END
$assert$;

COMMIT;