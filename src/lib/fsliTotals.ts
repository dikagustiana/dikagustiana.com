// Subtotals for the FSLI statement table.
//
// The seed holds a few sub-lines under their parent (third-party and
// related-party receivables sit under "Trade receivables, net"). Summing every
// row double-counts them, so a row flagged `is_component` is shown, indented,
// but left out of every subtotal. The flag is a nullable column added by
// 20261009090000_fsli_component_flag.sql; a row without it counts as a line
// item, which is how the page behaved before the column existed.

export interface FsliAmountRow {
  category: string | null;
  dec_2024: string | null;
  dec_2023: string | null;
  is_component?: boolean | null;
}

export type FsliYear = 'dec_2024' | 'dec_2023';

export function parseFsliAmount(value: string | null): number {
  if (!value) return 0;
  return parseFloat(value.replace(/,/g, '')) || 0;
}

export function sumLineItems(rows: readonly FsliAmountRow[], year: FsliYear): number {
  return rows
    .filter((row) => row.is_component !== true)
    .reduce((sum, row) => sum + parseFsliAmount(row[year]), 0);
}
