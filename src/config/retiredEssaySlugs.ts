/**
 * Accounting essays replaced by a newer version and archived (the import of
 * 12 Oct 2026). Each was public at /essays/<slug>, which forwarded to its line
 * item's page; archived, the row is no longer readable and that address would
 * 404. The line-item page itself never moved, so each old address goes there.
 *
 * Two of the slugs carry a `-superseded` suffix: those rows were renamed on
 * 11 Oct 2026 so the new versions could take their original slugs, which
 * therefore still resolve on their own.
 */
export const RETIRED_ESSAY_REDIRECTS: Readonly<Record<string, string>> = {
  'deferred-tax-assets-four-ways-the-line-can-fall': '/accounting/fsli/deferred-tax-assets',
  'inventories-net-upstream-materials-and-spares-superseded': '/accounting/fsli/inventories-net',
  'fixed-assets-boundary-with-oil-and-gas-properties': '/accounting/fsli/fixed-assets-net',
  'long-term-investments-splitting-a-fall': '/accounting/fsli/long-term-investments',
  'corporate-dividend-taxes-receivable-refund-claims-and-disputes': '/accounting/fsli/corporate-dividend-taxes-receivable-current',
  'advances-and-prepayments-destination-decides': '/accounting/fsli/advances-prepayments-current',
  'investment-property-classification-models-transfers': '/accounting/fsli/investment-properties',
  'cash-and-cash-equivalents-reading-a-fall': '/accounting/fsli/cash-and-cash-equivalents',
  'restricted-cash-abandonment-fund-and-debt-reserve': '/accounting/fsli/restricted-cash',
  'trade-receivables-upstream-expected-credit-losses': '/accounting/fsli/trade-receivables-net',
  'due-from-government-underlift-vat-and-other-receivables': '/accounting/fsli/due-from-government',
  'oil-gas-properties-capitalised-cost-and-reserves-superseded': '/accounting/fsli/oil-gas-properties-net',
  'right-of-use-assets-reading-a-fall': '/accounting/fsli/right-of-use-assets-net',
};
