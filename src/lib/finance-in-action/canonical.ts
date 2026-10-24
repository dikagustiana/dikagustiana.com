/**
 * Line identity across companies (docs/prd/2026-10-fia-fixes item 4). Each
 * package names its unit-economics lines in its own words: ADRO's mining cost
 * is `contractor`, PTBA's and ITMG's is `mining` plus `fuel`, INDY does not
 * split it out at all. Comparing on `line.id` therefore compared almost
 * nothing. Lines are compared on a canonical identity instead.
 *
 * A line's canonical identity is, in order: the package's own
 * `line.canonical` (an optional field for packages published from now on),
 * else the mapping below, which lists the published packages' actual ids,
 * else none. The published packages are immutable rows behind
 * fia.model_packages and are not re-released for this; the mapping is the
 * fix for them. tests/unit/fiaCanonical.test.ts holds every published line
 * and every listed row to it.
 *
 * Several lines may share one identity: they are summed (PTBA's mining
 * services and fuel are one "mining" line against ADRO's contractor-and-fuel).
 * A line mapped to `null` is listed on purpose and compares with nothing.
 *
 * The same table names the rows the value chain (item 3) and the cost flow
 * (item 5) read: the physical drivers and the lines of the income statement
 * below gross profit.
 */
import type { ModelPackage, UELine } from './contract/types';
import { splitRowRef } from './contract/types';
import { COMPARISON_CURRENCY, toUsd, type FxRate } from './fx';
import { parseMoney, perUnitInPackage, unitScale } from './unitEconomics';

export const CANONICAL = ['revenue', 'mining', 'processing', 'freight', 'royalty', 'da', 'other_cost', 'gross_profit', 'strip_ratio'] as const;
export type Canonical = (typeof CANONICAL)[number];

/** The lines of the grouped bar and the peer columns, in their order. */
export const COMPARED: Canonical[] = ['revenue', 'mining', 'freight', 'royalty', 'processing', 'da', 'other_cost', 'gross_profit', 'strip_ratio'];

export const CANONICAL_LABEL: Record<Canonical, string> = {
  revenue: 'Revenue',
  mining: 'Mining',
  processing: 'Processing',
  freight: 'Freight',
  royalty: 'Royalty',
  da: 'D&A',
  other_cost: 'Other cost of revenue',
  gross_profit: 'Gross profit',
  strip_ratio: 'Strip ratio',
};

/** Rows of the model sheet by what they are, for the value chain and the cost flow. */
export const ROW_ROLES = [
  'volume',
  'production',
  'ob_removed',
  'strip_ratio',
  'cost_per_bcm',
  'price',
  'royalty_rate',
  'rev_coal',
  'rev_services',
  'rev_other',
  'revenue_total',
  'cost_services',
  'cost_others',
  'gross_profit_total',
  // Below gross profit (the `pnl` role of the PRD).
  'opex',
  'other_net',
  'operating_income',
  'finance_income',
  'finance',
  'jv_share',
  'tax',
  'minority',
  'owners',
] as const;
export type RowRole = (typeof ROW_ROLES)[number];

interface CompanyMap {
  /** Every unit-economics line id of the published package. */
  lines: Record<string, Canonical | null>;
  /** Model-sheet row ids by role; several ids are summed. A role the company does not disclose is absent. */
  rows: Partial<Record<RowRole, string[]>>;
}

/** By sub-industry, then ticker: the published packages' own ids (PTBA-2026Q2-r1, ADRO-2026Q2-r1, ITMG-2026Q2-r1, INDY-2026Q2-r1). */
export const PUBLISHED_MAP: Record<string, Record<string, CompanyMap>> = {
  A121: {
    ADRO: {
      lines: {
        revenue: 'revenue',
        contractor: 'mining',
        freight: 'freight',
        royalty: 'royalty',
        processing: 'processing',
        da: 'da',
        other: 'other_cost',
        gross_profit: 'gross_profit',
      },
      rows: {
        volume: ['vol_sold'],
        production: ['production'],
        ob_removed: ['ob_removed'],
        strip_ratio: ['strip_ratio'],
        cost_per_bcm: ['cost_per_bcm'],
        price: ['price'],
        royalty_rate: ['royalty_rate'],
        rev_coal: ['rev_coal'],
        rev_services: ['rev_services'],
        rev_other: ['rev_other'],
        revenue_total: ['revenue'],
        cost_services: ['cor_services'],
        cost_others: ['cor_others'],
        gross_profit_total: ['gross_profit'],
        opex: ['opex'],
        other_net: ['other_net'],
        operating_income: ['operating_profit'],
        finance_income: ['fin_income'],
        finance: ['fin_cost'],
        jv_share: ['jv_share'],
        tax: ['tax'],
        minority: ['nci'],
        owners: ['owners_profit'],
      },
    },
    PTBA: {
      lines: {
        revenue: 'revenue',
        mining: 'mining',
        fuel: 'mining',
        transport: 'freight',
        royalty: 'royalty',
        da: 'da',
        labour: 'other_cost',
        other_production: 'other_cost',
        inventory: 'other_cost',
        others: 'other_cost',
        gross_profit: 'gross_profit',
        opex: null,
        operating_profit: null,
      },
      rows: {
        volume: ['vol_sold'],
        production: ['production'],
        ob_removed: ['ob_removed'],
        strip_ratio: ['strip_ratio'],
        cost_per_bcm: ['cost_per_bcm'],
        price: ['price_coal'],
        royalty_rate: ['royalty_rate'],
        rev_coal: ['rev_coal'],
        rev_other: ['rev_other'],
        revenue_total: ['revenue'],
        gross_profit_total: ['gross_profit'],
        opex: ['opex'],
        other_net: ['other_income'],
        operating_income: ['operating_profit'],
        finance_income: ['finance_income'],
        finance: ['finance_costs'],
        jv_share: ['share_jv'],
        tax: ['tax'],
        minority: ['nci'],
        owners: ['owners_profit'],
      },
    },
    ITMG: {
      lines: {
        revenue: 'revenue',
        mining: 'mining',
        fuel: 'mining',
        transport: 'freight',
        royalty: 'royalty',
        da: 'da',
        labour: 'other_cost',
        other_production: 'other_cost',
        inventory: 'other_cost',
        others: 'other_cost',
        gross_profit: 'gross_profit',
        opex: null,
        operating_profit: null,
      },
      rows: {
        volume: ['vol_sold'],
        production: ['production'],
        ob_removed: ['ob_removed'],
        strip_ratio: ['strip_ratio'],
        cost_per_bcm: ['cost_per_bcm'],
        price: ['price_coal'],
        royalty_rate: ['royalty_rate'],
        rev_coal: ['rev_coal'],
        rev_other: ['rev_other'],
        revenue_total: ['revenue'],
        gross_profit_total: ['gross_profit'],
        opex: ['opex'],
        other_net: ['other_income'],
        operating_income: ['operating_profit'],
        finance_income: ['finance_income'],
        finance: ['finance_costs'],
        tax: ['tax'],
        minority: ['nci'],
        owners: ['owners_profit'],
      },
    },
    INDY: {
      lines: {
        revenue: 'revenue',
        royalty: 'royalty',
        // Every Kideco cost but royalty, in one figure: no single line of another company is its like.
        other: null,
        gross_profit: 'gross_profit',
      },
      rows: {
        volume: ['kideco_vol'],
        production: ['kideco_prod'],
        ob_removed: ['kideco_ob'],
        strip_ratio: ['strip_ratio'],
        price: ['price'],
        royalty_rate: ['royalty_rate'],
        rev_coal: ['kideco_rev'],
        rev_other: ['rev_other_bus'],
        revenue_total: ['revenue'],
        cost_others: ['cogs_other_bus'],
        gross_profit_total: ['gross_profit'],
        opex: ['sga', 'amort_intang'],
        other_net: ['other_items'],
        finance_income: ['inv_income'],
        finance: ['fin_cost'],
        jv_share: ['assoc'],
        tax: ['final_tax', 'tax'],
        minority: ['nci'],
        owners: ['owners_profit'],
      },
    },
  },
};

const companyMap = (pkg: ModelPackage): CompanyMap | undefined => PUBLISHED_MAP[pkg.meta.subIndustry]?.[pkg.meta.ticker];

/** A line's canonical identity, or null when it has none. */
export function canonicalOf(pkg: ModelPackage, line: UELine): Canonical | null {
  if (line.canonical) return line.canonical;
  const mapped = companyMap(pkg)?.lines[line.id];
  return mapped ?? null;
}

/** True when the line is listed (as an identity or as deliberately none): the unit test holds every published line to it. */
export const isResolved = (pkg: ModelPackage, line: UELine): boolean => !!line.canonical || (companyMap(pkg)?.lines ?? {})[line.id] !== undefined;

/** The unit-economics lines that carry an identity, in package order. */
export const linesOf = (pkg: ModelPackage, c: Canonical): UELine[] => pkg.unitEconomics.lines.filter((l) => canonicalOf(pkg, l) === c);

/** The model-sheet row refs of a role ("model!vol_sold"); empty when the company does not disclose it. */
export function rowRefsOf(pkg: ModelPackage, role: RowRole): string[] {
  return (companyMap(pkg)?.rows[role] ?? []).map((id) => `model!${id}`);
}

/** The package's money currency ("US$", "Rp"), read from its revenue line's row. */
export function currencyOf(pkg: ModelPackage): string | null {
  const line = pkg.unitEconomics.lines.find((l) => l.role === 'revenue');
  const row = line ? rowOf(pkg, line.rowRef) : undefined;
  return row ? parseMoney(row.unit)?.currency ?? null : null;
}

function rowOf(pkg: ModelPackage, rowRef: string) {
  const r = splitRowRef(rowRef);
  return r ? pkg.sheets.find((s) => s.id === r.sheet)?.rows.find((x) => x.id === r.rowId) : undefined;
}

/** A stored row's value in a period, or null when the row or the cell is not there. */
export function storedValue(pkg: ModelPackage, rowRef: string, periodId: string): number | null {
  const pi = pkg.periods.findIndex((p) => p.id === periodId);
  const cell = pi < 0 ? undefined : rowOf(pkg, rowRef)?.cells[pi];
  return cell && cell.kind !== 'missing' && cell.value !== null ? cell.value : null;
}

/** The sum of a role's rows in a period, or null when any is missing. */
export function roleValue(pkg: ModelPackage, role: RowRole, periodId: string, read: (rowRef: string) => number | null = (r) => storedValue(pkg, r, periodId)): number | null {
  const refs = rowRefsOf(pkg, role);
  if (!refs.length) return null;
  let sum = 0;
  for (const ref of refs) {
    const v = read(ref);
    if (v === null) return null;
    sum += v;
  }
  return sum;
}

/**
 * A canonical line per unit of volume in the package's own currency (US$ or
 * Rp per tonne), worked from the stored rows; the strip ratio as stored. Null
 * when the company has no such line, or a figure is missing.
 */
export function perUnitOwn(pkg: ModelPackage, c: Canonical, periodId: string): number | null {
  if (c === 'strip_ratio') return roleValue(pkg, 'strip_ratio', periodId);
  const lines = linesOf(pkg, c);
  const denomRow = rowOf(pkg, pkg.unitEconomics.denominatorRowRef);
  const vol = storedValue(pkg, pkg.unitEconomics.denominatorRowRef, periodId);
  if (!lines.length || !denomRow || vol === null || vol === 0) return null;
  let sum = 0;
  for (const l of lines) {
    const row = rowOf(pkg, l.rowRef);
    const v = storedValue(pkg, l.rowRef, periodId);
    if (!row || v === null) return null;
    sum += (v / vol) * unitScale(row.unit, denomRow.unit).multiplier;
  }
  return sum;
}

export type NotComparable = 'no-line' | 'other-unit' | 'no-rate';

export interface Comparison {
  ok: boolean;
  reason?: NotComparable;
  /** The currency the second company's figure is drawn in: the first's own when they share one, else US dollars. */
  currency: string | null;
  /** Turns the second company's own figure into `currency`; identity when no conversion is needed. */
  convert: (value: number | null, periodId: string) => number | null;
}

const NOT = (reason: NotComparable): Comparison => ({ ok: false, reason, currency: null, convert: () => null });

/** How b's money figures stand beside a's: as they are when the two share a currency or b reports in US dollars, else converted. */
function conversion(a: ModelPackage, b: ModelPackage, rates: FxRate[]): Pick<Comparison, 'currency' | 'convert'> | null {
  const currency = currencyOf(b);
  if (!currency) return null;
  if (currency === currencyOf(a) || currency === COMPARISON_CURRENCY) return { currency, convert: (v) => v };
  return { currency: COMPARISON_CURRENCY, convert: (v, periodId) => toUsd(v, currency, periodId, rates) };
}

/**
 * Whether b's figure for a canonical line can stand beside a's (it replaces
 * sameBasis): both divide by the same unit and both carry the line. A
 * figure in another currency than a's is drawn in US dollars; `convert` turns
 * b's rupiah into them at the period's average rate (fx.ts), and returns null
 * without a rate.
 */
export function comparable(a: ModelPackage, b: ModelPackage, c: Canonical, rates: FxRate[]): Comparison {
  if (a.unitEconomics.unit !== b.unitEconomics.unit) return NOT('other-unit');
  const has = (p: ModelPackage) => (c === 'strip_ratio' ? rowRefsOf(p, 'strip_ratio').length > 0 : linesOf(p, c).length > 0);
  if (!has(a) || !has(b)) return NOT('no-line');
  if (c === 'strip_ratio') return { ok: true, currency: null, convert: (v) => v };
  const conv = conversion(a, b, rates);
  return conv ? { ok: true, ...conv } : NOT('other-unit');
}

/** A company's canonical line per unit in the comparison currency, or null (not comparable, missing, or no rate). */
export function comparedValue(pkg: ModelPackage, c: Canonical, periodId: string, rates: FxRate[], against: ModelPackage = pkg): number | null {
  const cmp = comparable(against, pkg, c, rates);
  if (!cmp.ok) return null;
  return cmp.convert(perUnitOwn(pkg, c, periodId), periodId);
}

/**
 * The peer's figure for one of the subject's lines, in `Comparison.currency`.
 * A package the mapping does not list (a preview fixture, a sub-industry not
 * yet mapped) is compared on the line id with another unlisted package of its
 * sub-industry, as before the mapping existed. Null: not comparable, missing,
 * or no rate.
 */
export function peerFigure(subject: ModelPackage, line: UELine, peer: ModelPackage, periodId: string, rates: FxRate[]): { value: number | null; currency: string | null } {
  const c = canonicalOf(subject, line);
  if (c) {
    const cmp = comparable(subject, peer, c, rates);
    return { value: cmp.ok ? cmp.convert(perUnitOwn(peer, c, periodId), periodId) : null, currency: cmp.currency };
  }
  const unlisted = !companyMap(subject) && !companyMap(peer);
  const conv = conversion(subject, peer, rates);
  if (!unlisted || !conv || subject.meta.subIndustry !== peer.meta.subIndustry || subject.unitEconomics.unit !== peer.unitEconomics.unit) return { value: null, currency: null };
  return { value: perUnitInPackage(peer, line.id, periodId, conv.convert), currency: conv.currency };
}

/** The groups of the grouped bar under the unit-economics table, in the PRD's order. */
export const BAR_GROUPS: Canonical[] = ['revenue', 'mining', 'freight', 'royalty', 'processing', 'da', 'gross_profit', 'strip_ratio'];

export interface BarCompany {
  ticker: string;
  self: boolean;
  /** The package's own currency, when it is not the comparison's. */
  converted: string | null;
}

export interface BarGroup {
  canonical: Canonical;
  label: string;
  /** "US$ per tonne", or "x" for the strip ratio. */
  unit: string;
  /** Costs are drawn as lengths and labelled in brackets. */
  reduces: boolean;
  /** One per company, in the companies' order; null leaves a gap, never a zero. */
  values: (number | null)[];
}

export interface GroupedBars {
  companies: BarCompany[];
  groups: BarGroup[];
}

const REDUCES = new Set<Canonical>(['mining', 'processing', 'freight', 'royalty', 'da', 'other_cost']);

/** A company's figure in US dollars per unit (the strip ratio as stored), or null. */
export function usdPerUnit(pkg: ModelPackage, c: Canonical, periodId: string, rates: FxRate[]): number | null {
  const own = perUnitOwn(pkg, c, periodId);
  if (c === 'strip_ratio' || own === null) return own;
  const currency = currencyOf(pkg);
  if (!currency) return null;
  return currency === COMPARISON_CURRENCY ? own : toUsd(own, currency, periodId, rates);
}

/**
 * The subject and the published companies of its sub-industry, side by side
 * per canonical line, in US dollars per unit (docs/prd/2026-10-fia-fixes item
 * 4). The companies are in ticker order, the same on every page of the
 * sub-industry; a group no company carries is left out, and a company without
 * the line is a gap. Null when fewer
 * than two companies can be drawn.
 */
export function groupedBars(subject: ModelPackage, published: ModelPackage[], periodId: string, rates: FxRate[]): GroupedBars | null {
  const all = [subject, ...published.filter((p) => p.meta.ticker !== subject.meta.ticker && p.meta.subIndustry === subject.meta.subIndustry && p.unitEconomics.unit === subject.unitEconomics.unit)];
  const pkgs = all.filter((p) => companyMap(p) || p.unitEconomics.lines.some((l) => l.canonical)).sort((a, b) => a.meta.ticker.localeCompare(b.meta.ticker));
  if (pkgs.length < 2 || !pkgs.includes(subject)) return null;
  const unit = subject.unitEconomics.unit;
  const groups: BarGroup[] = [];
  for (const c of BAR_GROUPS) {
    const values = pkgs.map((p) => usdPerUnit(p, c, periodId, rates));
    if (values.every((v) => v === null)) continue;
    groups.push({ canonical: c, label: CANONICAL_LABEL[c], unit: c === 'strip_ratio' ? 'x' : `${COMPARISON_CURRENCY} per ${unit}`, reduces: REDUCES.has(c), values });
  }
  if (!groups.length) return null;
  return {
    companies: pkgs.map((p) => {
      const currency = currencyOf(p);
      return { ticker: p.meta.ticker, self: p.meta.ticker === subject.meta.ticker, converted: currency && currency !== COMPARISON_CURRENCY ? currency : null };
    }),
    groups,
  };
}
