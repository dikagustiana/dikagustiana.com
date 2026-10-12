-- =============================================================================
-- Link PHE FY2024's statement rows to the line-item pages whose essays cover
-- them (owner brief of 12 Oct 2026, Groups A and B). Each essay's coverage is
-- its own opening paragraph and `also_covers`:
--
--   01 deferred tax assets:   deferred tax liabilities, income tax expense
--   05 corporate taxes:       the payable lines, current and non-current
--   12 oil and gas:           exploration expenses, DD&A
--   13 right-of-use assets:   lease liabilities, current and non-current
--   14..30                    their own lines and the lines they name
--
-- The remeasurement of the employee benefit liability (pl_oci 230) goes to
-- the employee benefits essay (18), which claims it; the OCI essay (24) says
-- "the Employee Benefits essay teaches it". A heading is linked only when
-- every row under it goes to the same page. Left unlinked: Due to the
-- Government (essay 11 does not claim it in its opening), long term
-- receivables (essay 10: "reported separately"), mixed headings, subtotals,
-- totals and every cash flow line.
--
-- Only fsli_slug changes, and only on rows where it is still NULL. The
-- period is published; fs_row_period_is_draft lets an update that changes
-- nothing but fsli_slug through, because no tie-out rule reads it (the
-- figures, parents and keys do not move). Every target page exists before
-- this runs (20261012100000; the foreign key enforces it).
--
-- The last statement checks the outcome and raises unless all 57 rows carry
-- the slug listed here, so a partial run cannot pass.
--
-- DOWN:
--   UPDATE public.fs_line l SET fsli_slug = NULL
--     FROM public.fs_period p
--    WHERE p.id = l.period_id AND p.company_id = 'phe' AND p.period_key = 'fy2024'
--      AND (l.statement, l.sort_order) IN (<the 57 pairs below>);
-- =============================================================================

WITH links (statement, sort_order, fsli_slug) AS (
  VALUES
    ('sofp', 130, 'other-taxes-receivable-current'),
    ('sofp', 220, 'intangible-assets-net'),
    ('sofp', 270, 'other-taxes-receivable-current'),
    ('sofp', 370, 'trade-payables'),
    ('sofp', 380, 'trade-payables'),
    ('sofp', 390, 'trade-payables'),
    ('sofp', 410, 'corporate-dividend-taxes-receivable-current'),
    ('sofp', 420, 'other-taxes-receivable-current'),
    ('sofp', 430, 'trade-payables'),
    ('sofp', 440, 'trade-payables'),
    ('sofp', 450, 'trade-payables'),
    ('sofp', 460, 'accrued-expenses'),
    ('sofp', 470, 'employee-benefits-liabilities-non-current'),
    ('sofp', 480, 'long-term-bank-loans-non-current'),
    ('sofp', 500, 'deferred-revenue-current'),
    ('sofp', 510, 'long-term-bank-loans-non-current'),
    ('sofp', 520, 'right-of-use-assets-net'),
    ('sofp', 530, 'long-term-bank-loans-non-current'),
    ('sofp', 540, 'trade-payables'),
    ('sofp', 580, 'long-term-bank-loans-non-current'),
    ('sofp', 590, 'long-term-bank-loans-non-current'),
    ('sofp', 600, 'deferred-revenue-current'),
    ('sofp', 610, 'deferred-tax-assets'),
    ('sofp', 620, 'corporate-dividend-taxes-receivable-current'),
    ('sofp', 630, 'decommissioning-site-restoration-provision'),
    ('sofp', 640, 'employee-benefits-liabilities-non-current'),
    ('sofp', 650, 'right-of-use-assets-net'),
    ('sofp', 660, 'decommissioning-site-restoration-provision'),
    ('sofp', 710, 'share-capital'),
    ('sofp', 720, 'share-capital'),
    ('sofp', 730, 'share-capital'),
    ('sofp', 740, 'share-capital'),
    ('sofp', 750, 'share-capital'),
    ('sofp', 760, 'retained-earnings'),
    ('sofp', 770, 'retained-earnings'),
    ('sofp', 780, 'retained-earnings'),
    ('sofp', 790, 'other-comprehensive-income'),
    ('sofp', 810, 'non-controlling-interest'),
    ('pl_oci', 10, 'revenues'),
    ('pl_oci', 30, 'oil-gas-properties-net'),
    ('pl_oci', 40, 'production-expenses'),
    ('pl_oci', 50, 'oil-gas-properties-net'),
    ('pl_oci', 60, 'production-expenses'),
    ('pl_oci', 70, 'production-expenses'),
    ('pl_oci', 100, 'impairment-non-financial-assets'),
    ('pl_oci', 110, 'finance-cost'),
    ('pl_oci', 120, 'finance-cost'),
    ('pl_oci', 130, 'foreign-exchange-loss-net'),
    ('pl_oci', 140, 'production-expenses'),
    ('pl_oci', 160, 'deferred-tax-assets'),
    ('pl_oci', 180, 'other-comprehensive-income'),
    ('pl_oci', 190, 'other-comprehensive-income'),
    ('pl_oci', 200, 'other-comprehensive-income'),
    ('pl_oci', 210, 'other-comprehensive-income'),
    ('pl_oci', 230, 'employee-benefits-liabilities-non-current'),
    ('pl_oci', 270, 'non-controlling-interest'),
    ('pl_oci', 310, 'non-controlling-interest')
)
UPDATE public.fs_line l
   SET fsli_slug = links.fsli_slug
  FROM links, public.fs_period p
 WHERE p.id = l.period_id
   AND p.company_id = 'phe'
   AND p.period_key = 'fy2024'
   AND l.statement = links.statement
   AND l.sort_order = links.sort_order
   AND l.fsli_slug IS NULL;

DO $check$
DECLARE
  n integer;
BEGIN
  WITH links (statement, sort_order, fsli_slug) AS (
    VALUES
    ('sofp', 130, 'other-taxes-receivable-current'),
    ('sofp', 220, 'intangible-assets-net'),
    ('sofp', 270, 'other-taxes-receivable-current'),
    ('sofp', 370, 'trade-payables'),
    ('sofp', 380, 'trade-payables'),
    ('sofp', 390, 'trade-payables'),
    ('sofp', 410, 'corporate-dividend-taxes-receivable-current'),
    ('sofp', 420, 'other-taxes-receivable-current'),
    ('sofp', 430, 'trade-payables'),
    ('sofp', 440, 'trade-payables'),
    ('sofp', 450, 'trade-payables'),
    ('sofp', 460, 'accrued-expenses'),
    ('sofp', 470, 'employee-benefits-liabilities-non-current'),
    ('sofp', 480, 'long-term-bank-loans-non-current'),
    ('sofp', 500, 'deferred-revenue-current'),
    ('sofp', 510, 'long-term-bank-loans-non-current'),
    ('sofp', 520, 'right-of-use-assets-net'),
    ('sofp', 530, 'long-term-bank-loans-non-current'),
    ('sofp', 540, 'trade-payables'),
    ('sofp', 580, 'long-term-bank-loans-non-current'),
    ('sofp', 590, 'long-term-bank-loans-non-current'),
    ('sofp', 600, 'deferred-revenue-current'),
    ('sofp', 610, 'deferred-tax-assets'),
    ('sofp', 620, 'corporate-dividend-taxes-receivable-current'),
    ('sofp', 630, 'decommissioning-site-restoration-provision'),
    ('sofp', 640, 'employee-benefits-liabilities-non-current'),
    ('sofp', 650, 'right-of-use-assets-net'),
    ('sofp', 660, 'decommissioning-site-restoration-provision'),
    ('sofp', 710, 'share-capital'),
    ('sofp', 720, 'share-capital'),
    ('sofp', 730, 'share-capital'),
    ('sofp', 740, 'share-capital'),
    ('sofp', 750, 'share-capital'),
    ('sofp', 760, 'retained-earnings'),
    ('sofp', 770, 'retained-earnings'),
    ('sofp', 780, 'retained-earnings'),
    ('sofp', 790, 'other-comprehensive-income'),
    ('sofp', 810, 'non-controlling-interest'),
    ('pl_oci', 10, 'revenues'),
    ('pl_oci', 30, 'oil-gas-properties-net'),
    ('pl_oci', 40, 'production-expenses'),
    ('pl_oci', 50, 'oil-gas-properties-net'),
    ('pl_oci', 60, 'production-expenses'),
    ('pl_oci', 70, 'production-expenses'),
    ('pl_oci', 100, 'impairment-non-financial-assets'),
    ('pl_oci', 110, 'finance-cost'),
    ('pl_oci', 120, 'finance-cost'),
    ('pl_oci', 130, 'foreign-exchange-loss-net'),
    ('pl_oci', 140, 'production-expenses'),
    ('pl_oci', 160, 'deferred-tax-assets'),
    ('pl_oci', 180, 'other-comprehensive-income'),
    ('pl_oci', 190, 'other-comprehensive-income'),
    ('pl_oci', 200, 'other-comprehensive-income'),
    ('pl_oci', 210, 'other-comprehensive-income'),
    ('pl_oci', 230, 'employee-benefits-liabilities-non-current'),
    ('pl_oci', 270, 'non-controlling-interest'),
    ('pl_oci', 310, 'non-controlling-interest')
  )
  SELECT count(*) INTO n
    FROM links
    JOIN public.fs_line l ON l.statement = links.statement AND l.sort_order = links.sort_order
    JOIN public.fs_period p ON p.id = l.period_id AND p.company_id = 'phe' AND p.period_key = 'fy2024'
   WHERE l.fsli_slug = links.fsli_slug;
  IF n <> 57 THEN
    RAISE EXCEPTION 'expected 57 linked rows, found %', n;
  END IF;
END
$check$;
