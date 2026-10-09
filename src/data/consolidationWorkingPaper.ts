// Illustrative consolidation working paper for /accounting/consolidated-reporting.
//
// Round numbers in one currency unit, four entities (a parent and three
// subsidiaries), not a company's accounts. The elimination column is signed:
// a negative number lowers the combined balance, a positive number raises it.
//
// What the eliminations do, and why the sheet still balances:
//   1. Intragroup balances come out of both sides. 113,000 of related-party
//      receivables (62,000 trade, 40,000 loans, 11,000 other) is matched by
//      113,000 of payables and borrowings (62,000 trade payables, 40,000
//      short-term borrowings, 11,000 other payables).
//   2. The 250,000 investment in subsidiaries is set against the subsidiaries'
//      share capital (170,000) and their pre-acquisition retained earnings
//      (86,000) = 256,000 of net assets at the acquisition date.
//   3. Goodwill is the balancing figure of step 2, with NCI measured at its
//      acquisition-date fair value: 250,000 + 91,000 - 256,000 = 85,000.
// Not allocated here: NCI's share of post-acquisition earnings.
//
// tests/unit/consolidationWorkingPaper.test.ts holds every one of those
// statements to the numbers below.

export interface WorkingPaperRow {
  label: string;
  isHeader?: boolean;
  isSubtotal?: boolean;
  indent?: number;
  values?: (number | null)[];
  combined?: number | null;
  elimination?: number | null;
  consolidated?: number | null;
}

export const ENTITY_NAMES = ['Dummy C', 'Dummy D', 'Dummy E', 'Dummy F'] as const;

export const WORKING_PAPER_ROWS: WorkingPaperRow[] = [
  { label: 'ASSET', isHeader: true },
  { label: 'CURRENT ASSET', isHeader: true },
  { label: 'Cash and cash equivalents', values: [125000, 45000, 32000, 18000], combined: 220000, elimination: 0, consolidated: 220000, indent: 1 },
  { label: 'Trade Receivables — Third Parties', values: [89000, 23000, 15000, 8000], combined: 135000, elimination: 0, consolidated: 135000, indent: 1 },
  { label: 'Trade Receivables — Related Parties', values: [45000, 12000, 0, 5000], combined: 62000, elimination: -62000, consolidated: 0, indent: 1 },
  { label: 'Unbilled — Third Parties', values: [34000, 8000, 6000, 0], combined: 48000, elimination: 0, consolidated: 48000, indent: 1 },
  { label: 'Current portion of Lease receivables', values: [0, 0, 4500, 0], combined: 4500, elimination: 0, consolidated: 4500, indent: 1 },
  { label: 'Employee Receivables', values: [2300, 800, 400, 200], combined: 3700, elimination: 0, consolidated: 3700, indent: 1 },
  { label: 'Loan Receivable — Third Parties', values: [15000, 0, 0, 0], combined: 15000, elimination: 0, consolidated: 15000, indent: 1 },
  { label: 'Loan Receivable — Related Parties', values: [30000, 10000, 0, 0], combined: 40000, elimination: -40000, consolidated: 0, indent: 1 },
  { label: 'Other Receivable — Third Parties', values: [5600, 1200, 900, 300], combined: 8000, elimination: 0, consolidated: 8000, indent: 1 },
  { label: 'Other Receivable — Related Parties', values: [8000, 0, 3000, 0], combined: 11000, elimination: -11000, consolidated: 0, indent: 1 },
  { label: 'Inventories', values: [67000, 22000, 18000, 9000], combined: 116000, elimination: 0, consolidated: 116000, indent: 1 },
  { label: 'Prepaid Tax', values: [12000, 4000, 2500, 1500], combined: 20000, elimination: 0, consolidated: 20000, indent: 1 },
  { label: 'Prepayment and Advances', values: [9800, 3200, 1800, 600], combined: 15400, elimination: 0, consolidated: 15400, indent: 1 },
  { label: 'Restricted Cash and Time Deposits', values: [0, 0, 0, 5000], combined: 5000, elimination: 0, consolidated: 5000, indent: 1 },
  { label: 'Other Current Assets', values: [3400, 1100, 700, 200], combined: 5400, elimination: 0, consolidated: 5400, indent: 1 },
  { label: 'TOTAL CURRENT ASSETS', values: [446100, 130300, 84800, 47800], combined: 709000, elimination: -113000, consolidated: 596000, isSubtotal: true },
  { label: 'NON-CURRENT ASSET', isHeader: true },
  { label: 'Investment in Subsidiaries', values: [250000, 0, 0, 0], combined: 250000, elimination: -250000, consolidated: 0, indent: 1 },
  { label: 'Deemed Investment', values: [0, 0, 0, 0], combined: 0, elimination: 0, consolidated: 0, indent: 1 },
  { label: 'Fixed Assets', values: [380000, 120000, 95000, 45000], combined: 640000, elimination: 0, consolidated: 640000, indent: 1 },
  { label: 'Intangible Assets', values: [25000, 5000, 3000, 0], combined: 33000, elimination: 0, consolidated: 33000, indent: 1 },
  { label: 'Right of Use of Asset', values: [18000, 6000, 4500, 2000], combined: 30500, elimination: 0, consolidated: 30500, indent: 1 },
  { label: 'Goodwill', values: [0, 0, 0, 0], combined: 0, elimination: 85000, consolidated: 85000, indent: 1 },
  { label: 'Shareholder Receivable', values: [0, 0, 0, 0], combined: 0, elimination: 0, consolidated: 0, indent: 1 },
  { label: 'Other Non-Current Assets', values: [7500, 2200, 1800, 500], combined: 12000, elimination: 0, consolidated: 12000, indent: 1 },
  { label: 'TOTAL NON-CURRENT ASSETS', values: [680500, 133200, 104300, 47500], combined: 965500, elimination: -165000, consolidated: 800500, isSubtotal: true },
  { label: 'TOTAL ASSETS', values: [1126600, 263500, 189100, 95300], combined: 1674500, elimination: -278000, consolidated: 1396500, isSubtotal: true },
  { label: 'LIABILITIES', isHeader: true },
  { label: 'CURRENT LIABILITIES', isHeader: true },
  { label: 'Trade Payables — Third Parties', values: [60000, 10000, 5000, 3000], combined: 78000, elimination: 0, consolidated: 78000, indent: 1 },
  { label: 'Trade Payables — Related Parties', values: [30000, 14000, 12000, 6000], combined: 62000, elimination: -62000, consolidated: 0, indent: 1 },
  { label: 'Accrued Expenses and Other Payables', values: [15000, 4500, 3200, 1800], combined: 24500, elimination: -11000, consolidated: 13500, indent: 1 },
  { label: 'Taxes Payable', values: [9000, 3000, 2000, 1000], combined: 15000, elimination: 0, consolidated: 15000, indent: 1 },
  { label: 'Short-term Borrowings', values: [50000, 15000, 10000, 5000], combined: 80000, elimination: -40000, consolidated: 40000, indent: 1 },
  { label: 'Current portion of Long-term Debt', values: [20000, 8000, 5000, 3000], combined: 36000, elimination: 0, consolidated: 36000, indent: 1 },
  { label: 'TOTAL CURRENT LIABILITIES', values: [184000, 54500, 37200, 19800], combined: 295500, elimination: -113000, consolidated: 182500, isSubtotal: true },
  { label: 'NON-CURRENT LIABILITIES', isHeader: true },
  { label: 'Long-term Borrowings', values: [200000, 60000, 45000, 20000], combined: 325000, elimination: 0, consolidated: 325000, indent: 1 },
  { label: 'Lease Liabilities', values: [15000, 5000, 3500, 1500], combined: 25000, elimination: 0, consolidated: 25000, indent: 1 },
  { label: 'Employee Benefits Obligation', values: [18000, 6000, 4000, 2000], combined: 30000, elimination: 0, consolidated: 30000, indent: 1 },
  { label: 'Deferred Tax Liabilities', values: [8000, 2500, 1800, 800], combined: 13100, elimination: 0, consolidated: 13100, indent: 1 },
  { label: 'TOTAL NON-CURRENT LIABILITIES', values: [241000, 73500, 54300, 24300], combined: 393100, elimination: 0, consolidated: 393100, isSubtotal: true },
  { label: 'TOTAL LIABILITIES', values: [425000, 128000, 91500, 44100], combined: 688600, elimination: -113000, consolidated: 575600, isSubtotal: true },
  { label: 'EQUITY', isHeader: true },
  { label: 'Share Capital', values: [400000, 80000, 60000, 30000], combined: 570000, elimination: -170000, consolidated: 400000, indent: 1 },
  { label: 'Retained Earnings', values: [250000, 45000, 30000, 18000], combined: 343000, elimination: -86000, consolidated: 257000, indent: 1 },
  { label: 'Current Year Income', values: [48600, 10500, 7600, 3200], combined: 69900, elimination: 0, consolidated: 69900, indent: 1 },
  { label: 'ESOP Reserve', values: [3000, 0, 0, 0], combined: 3000, elimination: 0, consolidated: 3000, indent: 1 },
  { label: 'OCI', values: [0, 0, 0, 0], combined: 0, elimination: 0, consolidated: 0, indent: 1 },
  { label: 'Non-Controlling Interest', values: [null, null, null, null], combined: null, elimination: 91000, consolidated: 91000, indent: 1 },
  { label: 'TOTAL EQUITY', values: [701600, 135500, 97600, 51200], combined: 985900, elimination: -165000, consolidated: 820900, isSubtotal: true },
  { label: 'TOTAL LIABILITIES AND EQUITY', values: [1126600, 263500, 189100, 95300], combined: 1674500, elimination: -278000, consolidated: 1396500, isSubtotal: true },
];
