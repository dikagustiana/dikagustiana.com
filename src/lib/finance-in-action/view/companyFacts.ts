/**
 * The company bar's facts in one sentence (sheet-first PRD R1.3): how many
 * filings the model reads, the quarters it covers, the quarter its full
 * statements run to, and the currency it is reported in. Every part is read
 * from the package: the filings are the distinct documents its sourced cells
 * name, the quarters run from the first reported quarter to the latest one,
 * and the currency is the revenue row's own.
 */
import type { ModelPackage } from '../contract/types';
import { COPY } from '../copy';
import { quarterPeriods } from '../model/periods';
import { periodLabel } from '../registry';
import { parseMoney } from '../unitEconomics';

export interface CompanyFacts {
  filings: number;
  from: string;
  to: string;
  fullTo: string;
  /** In words, or null when the revenue row's unit names no known currency. */
  currency: string | null;
}

export function companyFacts(pkg: ModelPackage): CompanyFacts {
  const documents = new Set<string>();
  for (const sheet of pkg.sheets) for (const row of sheet.rows) for (const cell of row.cells) if (cell.kind === 'sourced' && cell.source) documents.add(cell.source.document);
  const reported = quarterPeriods(pkg).filter((p) => !p.forecast);
  const revenue = pkg.unitEconomics.lines.find((l) => l.role === 'revenue');
  const [sheetId, rowId] = revenue?.rowRef.split('!') ?? [];
  const unit = pkg.sheets.find((s) => s.id === sheetId?.toLowerCase())?.rows.find((r) => r.id === rowId)?.unit ?? '';
  const money = parseMoney(unit);
  return {
    filings: documents.size,
    from: reported[0]?.label ?? periodLabel(pkg, pkg.meta.asOf.latestQuarter) ?? '',
    to: periodLabel(pkg, pkg.meta.asOf.latestQuarter) ?? '',
    fullTo: periodLabel(pkg, pkg.meta.asOf.fullStatementsTo) ?? '',
    currency: money ? COPY.currencyWords[money.currency] ?? money.currency : null,
  };
}

export const companyFactsText = (f: CompanyFacts): string => COPY.companyFacts(f.filings, f.from, f.to, f.fullTo, f.currency);
