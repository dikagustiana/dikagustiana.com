/**
 * Currency conversion for cross-company comparisons (docs/prd/2026-10-fia-fixes
 * items 4 and 7). A company's own page keeps its own currency; wherever two
 * companies stand side by side (the unit-economics peer columns, the grouped
 * bar, the peer band) a rupiah figure is turned into US dollars at Bank
 * Indonesia's JISDOR rate for the same period.
 *
 * The rates are rows of fia.fx_rates
 * (supabase/migrations/20261024150000_fia_fx_rates.sql), each with its source
 * and the URL it was read from. A period without a rate converts to null,
 * never to zero and never to a neighbouring period's rate: the cell then says
 * it is not comparable.
 *
 * Basis: `average` for flows (the income statement, and so unit economics),
 * `closing` for balances.
 */
import { COPY } from './copy';
import { formatNumber } from './format';

export type FxBasis = 'average' | 'closing';

export interface FxRate {
  periodId: string;
  /** ISO code of the currency one unit of which `rate` prices: "USD". */
  from: string;
  /** ISO code the rate is stated in: "IDR". */
  to: string;
  /** Units of `to` per one unit of `from`: 16,500 IDR per USD. */
  rate: number;
  basis: FxBasis;
  source: string;
  sourceUrl: string;
}

/** The currency every comparison is drawn in. */
export const COMPARISON_CURRENCY = 'US$';

/** The site's currency words (unitEconomics.parseMoney) to ISO codes. */
const ISO: Record<string, string> = { Rp: 'IDR', IDR: 'IDR', US$: 'USD', USD: 'USD' };

export const isoOf = (currency: string): string | undefined => ISO[currency.trim()];

/** Which basis a row takes: balances at the closing rate, everything else at the average. */
export const basisFor = (kind: 'flow' | 'balance'): FxBasis => (kind === 'balance' ? 'closing' : 'average');

/** The rate that turns `from` into `to` in a period, or null. Either direction of a stored pair serves. */
export function rateBetween(rates: FxRate[], periodId: string, from: string, to: string, basis: FxBasis = 'average'): number | null {
  const f = isoOf(from) ?? from;
  const t = isoOf(to) ?? to;
  if (f === t) return 1;
  for (const r of rates) {
    if (r.periodId !== periodId || r.basis !== basis || !(r.rate > 0)) continue;
    // r: 1 r.from = r.rate r.to
    if (r.from === f && r.to === t) return r.rate;
    if (r.from === t && r.to === f) return 1 / r.rate;
  }
  return null;
}

/** The stored row behind a conversion into US dollars, for the caption. */
export function usdRateRow(rates: FxRate[], periodId: string, currency: string, basis: FxBasis = 'average'): FxRate | null {
  const c = isoOf(currency) ?? currency;
  return rates.find((r) => r.periodId === periodId && r.basis === basis && ((r.from === 'USD' && r.to === c) || (r.from === c && r.to === 'USD'))) ?? null;
}

/** A value in `currency` as US dollars in a period; null without a value or a rate. */
export function toUsd(value: number | null, currency: string, periodId: string, rates: FxRate[], basis: FxBasis = 'average'): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const k = rateBetween(rates, periodId, currency, 'USD', basis);
  return k === null ? null : value * k;
}

/** A database row of fia.fx_rates, as PostgREST returns it. */
interface FxRow {
  period_id: string;
  from_ccy: string;
  to_ccy: string;
  rate: number | string;
  basis: FxBasis;
  source: string;
  source_url: string;
}

export const FX_QUERY_KEY = ['finance-in-action', 'fx-rates'] as const;

export function fromRow(r: FxRow): FxRate {
  return { periodId: r.period_id, from: r.from_ccy, to: r.to_ccy, rate: Number(r.rate), basis: r.basis, source: r.source, sourceUrl: r.source_url };
}

/**
 * The rates, read as `anon` from the same schema as the packages. A failed
 * read is no rates at all: every converted figure then says it is not
 * comparable, and nothing is guessed.
 */
export async function fetchFxRates(
  url: string | undefined = import.meta.env.VITE_SUPABASE_URL,
  key: string | undefined = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
): Promise<FxRate[]> {
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/fx_rates?select=period_id,from_ccy,to_ccy,rate,basis,source,source_url`, {
      headers: { apikey: key, 'Accept-Profile': 'fia', Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as FxRow[];
    return Array.isArray(rows) ? rows.map(fromRow).filter((r) => r.rate > 0) : [];
  } catch {
    return [];
  }
}

/** The caption under a comparison: "PTBA converted at BI JISDOR FY 25 average 16,xxx IDR/USD.", or why it was not. */
export function fxCaption(ticker: string, currency: string, periodId: string, periodLabel: string, rates: FxRate[]): string {
  const r = usdRateRow(rates, periodId, currency);
  if (!r) return COPY.fxMissing(ticker, periodLabel);
  const perUsd = r.from === 'USD' ? r.rate : 1 / r.rate;
  return COPY.fxCaption(ticker, periodLabel, formatNumber(perUsd, 0));
}
