import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ──────────────────────────────────────────────
// IT OWNER: Replace with your actual API endpoint
const WORKING_PAPER_API_URL = 'YOUR_API_ENDPOINT_HERE';
// ──────────────────────────────────────────────

type RowKind = 'header' | 'total' | 'item' | 'placeholder';

interface RowDef {
  key: string;
  label: string;
  kind: RowKind;
  indent?: boolean;
}

const ENTITY_COLS = ['dummy_c', 'dummy_d', 'dummy_e', 'dummy_f', 'dummy_a', 'dummy_g'] as const;
const ENTITY_LABELS = ['Dummy C', 'Dummy D', 'Dummy E', 'Dummy F', 'Dummy A', 'Dummy G'];
const ALL_COLS = [...ENTITY_COLS, 'combined', 'eliminations', 'consolidated'] as const;

const ROW_STRUCTURE: RowDef[] = [
  { key: 'asset', label: 'ASSET', kind: 'header' },
  { key: 'current_asset', label: 'CURRENT ASSET', kind: 'header' },
  { key: 'cash_equivalents', label: 'Cash and cash equivalents', kind: 'item' },
  { key: 'trade_recv_3p', label: 'Trade Receivables — Third Parties', kind: 'item' },
  { key: 'trade_recv_rp', label: 'Trade Receivables — Related Parties', kind: 'item' },
  { key: 'unbilled_3p', label: 'Unbilled — Third Parties', kind: 'item' },
  { key: 'lease_recv_current', label: 'Current portion of Lease receivables', kind: 'item' },
  { key: 'employee_recv', label: 'Employee Receivables', kind: 'item' },
  { key: 'loan_recv_3p', label: 'Loan Receivable — Third Parties', kind: 'item' },
  { key: 'loan_recv_rp', label: 'Loan Receivable — Related Parties', kind: 'item' },
  { key: 'other_recv_3p', label: 'Other Receivable — Third Parties', kind: 'item' },
  { key: 'other_recv_rp', label: 'Other Receivable — Related Parties', kind: 'item' },
  { key: 'inventories', label: 'Inventories', kind: 'item' },
  { key: 'prepaid_tax', label: 'Prepaid Tax', kind: 'item' },
  { key: 'prepayment_advances', label: 'Prepayment and Advances', kind: 'item' },
  { key: 'restricted_cash', label: 'Restricted Cash and Time Deposits', kind: 'item' },
  { key: 'other_current_assets', label: 'Other Current Assets', kind: 'item' },
  { key: 'total_current_assets', label: 'TOTAL CURRENT ASSETS', kind: 'total' },

  { key: 'non_current_asset', label: 'NON-CURRENT ASSET', kind: 'header' },
  { key: 'investment_subs', label: 'Investment in Subsidiaries', kind: 'item' },
  { key: 'deemed_investment', label: 'Deemed Investment', kind: 'item' },
  { key: 'fixed_assets', label: 'Fixed Assets', kind: 'item' },
  { key: 'intangible_assets', label: 'Intangible Assets', kind: 'item' },
  { key: 'rou_asset', label: 'Right of Use of Asset', kind: 'item' },
  { key: 'shareholder_recv', label: 'Shareholder Receivable', kind: 'item' },
  { key: 'other_nca', label: 'Other Non-Current Assets', kind: 'item' },
  { key: 'total_nca', label: 'TOTAL NON-CURRENT ASSETS', kind: 'total' },
  { key: 'total_assets', label: 'TOTAL ASSETS', kind: 'total' },

  { key: 'liabilities', label: 'LIABILITIES', kind: 'header' },
  { key: 'current_liabilities', label: 'CURRENT LIABILITIES', kind: 'header' },
  { key: 'cl_placeholder_1', label: 'To be defined', kind: 'placeholder' },
  { key: 'cl_placeholder_2', label: 'To be defined', kind: 'placeholder' },
  { key: 'cl_placeholder_3', label: 'To be defined', kind: 'placeholder' },
  { key: 'total_cl', label: 'TOTAL CURRENT LIABILITIES', kind: 'total' },

  { key: 'non_current_liabilities', label: 'NON-CURRENT LIABILITIES', kind: 'header' },
  { key: 'ncl_placeholder_1', label: 'To be defined', kind: 'placeholder' },
  { key: 'ncl_placeholder_2', label: 'To be defined', kind: 'placeholder' },
  { key: 'ncl_placeholder_3', label: 'To be defined', kind: 'placeholder' },
  { key: 'total_ncl', label: 'TOTAL NON-CURRENT LIABILITIES', kind: 'total' },
  { key: 'total_liabilities', label: 'TOTAL LIABILITIES', kind: 'total' },

  { key: 'equity', label: 'EQUITY', kind: 'header' },
  { key: 'share_capital', label: 'Share Capital', kind: 'item' },
  { key: 'retained_earnings', label: 'Retained Earnings', kind: 'item' },
  { key: 'current_income', label: 'Current Income', kind: 'item' },
  { key: 'esop_reserve', label: 'ESOP Reserve', kind: 'item' },
  { key: 'oci', label: 'OCI', kind: 'item' },
  { key: 'nci', label: 'Non-Controlling Interest', kind: 'item' },
  { key: 'total_equity', label: 'TOTAL EQUITY', kind: 'total' },
  { key: 'total_le', label: 'TOTAL LIABILITIES AND EQUITY', kind: 'total' },
];

function formatValue(val: number | null | undefined): string {
  if (val === null || val === undefined || val === 0) return '—';
  const abs = Math.abs(val);
  const formatted = new Intl.NumberFormat('id-ID').format(abs);
  return val < 0 ? `(${formatted})` : formatted;
}

type ApiData = Record<string, Record<string, number | null>>;

interface WorkingPaperTableProps {
  apiUrl?: string;
  rowStructure?: RowDef[];
}

export function WorkingPaperTable({
  apiUrl = WORKING_PAPER_API_URL,
  rowStructure = ROW_STRUCTURE,
}: WorkingPaperTableProps) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (apiUrl === 'YOUR_API_ENDPOINT_HERE') {
      // No real endpoint configured — show empty state
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(false);
    fetch(apiUrl)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((json: ApiData) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [apiUrl]);

  const colBg = (col: string) => {
    if (col === 'consolidated') return 'bg-accent/[0.07]';
    if (col === 'eliminations') return 'bg-blue-50/60';
    if (col === 'combined') return 'bg-amber-50/50';
    return '';
  };

  const groupBorder = (col: string) => {
    if (col === 'dummy_c' || col === 'combined' || col === 'eliminations' || col === 'consolidated')
      return 'border-l-2 border-border';
    return '';
  };

  return (
    <div className="relative w-full overflow-x-auto border border-border rounded-sm">
      <table className="w-full text-xs border-collapse min-w-[1200px]">
        {/* Column Group Headers */}
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground w-[220px] min-w-[220px]" rowSpan={2}>
              Account
            </th>
            <th colSpan={6} className="px-2 py-1.5 text-center font-semibold text-foreground border-l-2 border-border text-[11px] uppercase tracking-wider">
              Individual Entities
            </th>
            <th colSpan={1} className="px-2 py-1.5 text-center font-semibold text-foreground border-l-2 border-border bg-amber-50/50 text-[11px] uppercase tracking-wider">
              Combined
            </th>
            <th colSpan={1} className="px-2 py-1.5 text-center font-semibold text-foreground border-l-2 border-border bg-blue-50/60 text-[11px] uppercase tracking-wider">
              Eliminations
            </th>
            <th colSpan={1} className="px-2 py-1.5 text-center font-semibold text-foreground border-l-2 border-border bg-accent/[0.07] text-[11px] uppercase tracking-wider">
              Consolidated
            </th>
          </tr>
          <tr className="border-b border-border bg-muted/30">
            {ENTITY_LABELS.map((label, i) => (
              <th
                key={label}
                className={`px-2 py-1.5 text-right font-medium text-muted-foreground text-[11px] ${i === 0 ? 'border-l-2 border-border' : ''}`}
              >
                {label}
              </th>
            ))}
            <th className="px-2 py-1.5 text-right font-medium text-muted-foreground text-[11px] border-l-2 border-border bg-amber-50/50">
              Combined
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-muted-foreground text-[11px] border-l-2 border-border bg-blue-50/60">
              Eliminations
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-muted-foreground text-[11px] border-l-2 border-border bg-accent/[0.07]">
              Consolidated
            </th>
          </tr>
        </thead>

        <tbody>
          {rowStructure.map((row, rowIdx) => {
            const isHeader = row.kind === 'header';
            const isTotal = row.kind === 'total';
            const isPlaceholder = row.kind === 'placeholder';
            const isEven = rowIdx % 2 === 0;

            if (isHeader) {
              return (
                <tr key={row.key} className="bg-muted/50 border-t border-border">
                  <td
                    colSpan={ALL_COLS.length + 1}
                    className="sticky left-0 z-10 bg-muted/50 px-3 py-2 font-bold text-foreground text-[11px] uppercase tracking-wider"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={row.key}
                className={`border-b border-border/50 ${isTotal ? 'bg-muted/30 border-t border-border' : isEven ? 'bg-background' : 'bg-muted/10'}`}
              >
                <td
                  className={`sticky left-0 z-10 px-3 py-1.5 text-left whitespace-nowrap ${
                    isTotal
                      ? 'font-bold text-foreground bg-muted/30'
                      : isPlaceholder
                      ? 'text-muted-foreground/50 italic bg-inherit'
                      : 'text-foreground bg-inherit'
                  } ${isEven && !isTotal ? 'bg-background' : !isTotal ? 'bg-muted/10' : ''}`}
                >
                  {row.label}
                </td>
                {ALL_COLS.map((col) => (
                  <td
                    key={col}
                    className={`px-2 py-1.5 text-right tabular-nums font-mono text-[11px] ${colBg(col)} ${groupBorder(col)} ${
                      isTotal ? 'font-bold text-foreground' : 'text-foreground/80'
                    }`}
                  >
                    {loading ? (
                      <Skeleton className="h-3 w-14 ml-auto" />
                    ) : error ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : data ? (
                      formatValue(data[row.key]?.[col])
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {error && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Data unavailable. Please try again.
        </div>
      )}
    </div>
  );
}
