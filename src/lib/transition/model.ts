/**
 * The transition data layer on the client: the rows its public views return
 * (migration 20261024120000_transition_data_layer) and the pure functions that
 * turn them into something a chart can draw. Nothing here touches the network;
 * src/hooks/queries/useTransition.ts does.
 *
 * Every value a chart draws keeps its trail (source URL, code, vintage, the
 * date it was pulled), so the chart can say where each number came from and
 * the CSV a reader downloads carries the same columns.
 */

import type { TrackerEntry, TrackerSector } from '@/lib/tracker';

export type ChainLink = 'policy' | 'infrastructure' | 'finance' | 'transition' | 'carbon_price' | 'macro';
export type ChartType = 'line' | 'bar' | 'stacked_bar' | 'step' | 'dot_whisker' | 'timeline';
export type Frequency = 'A' | 'Q' | 'M' | 'event';

/** The sequencing thesis, in order; macro is context, shown last. */
export const CHAIN_ORDER: ChainLink[] = ['policy', 'infrastructure', 'finance', 'transition', 'carbon_price', 'macro'];

/** v_chain */
export interface ChainRow {
  chain_link: ChainLink;
  title: string;
  question: string;
  status_text: string | null;
  sort_order: number;
}

/** v_chart_catalog: one row per published chart and series. */
export interface ChartCatalogRow {
  chart_slug: string;
  title: string;
  subtitle: string | null;
  chain_link: ChainLink;
  chart_type: ChartType;
  annotation_sectors: TrackerSector[];
  chart_sort: number;
  chart_updated_at: string;
  series_id: string | null;
  label: string | null;
  role: 'primary' | 'context' | null;
  members: string[] | null;
  series_sort: number | null;
  unit: string | null;
  frequency: Frequency | null;
  is_projection: boolean | null;
  series_title: string | null;
  source_code: string | null;
  source_name: string | null;
}

/** v_chart_data and v_series_history share these columns. */
export interface ObservationRow {
  series_id: string;
  member: string;
  period_start: string;
  period_label: string | null;
  value: number | string;
  unit: string;
  is_projection: boolean;
  vintage: string;
  retrieved_at: string;
  source_url: string;
  source_code: string | null;
  source_locator: string | null;
}

export interface ChartDataRow extends ObservationRow {
  chart_slug: string;
  label: string;
  role: 'primary' | 'context';
  series_sort: number;
}

export interface HistoryRow extends ObservationRow {
  vintage_date: string;
  published_at: string;
}

/** v_series_status */
export interface SeriesStatusRow {
  series_id: string;
  title_en: string;
  title_id: string;
  unit: string;
  frequency: Frequency;
  chain_link: ChainLink;
  ingest: 'api' | 'manual';
  is_projection: boolean;
  definition_note: string;
  source_code: string;
  series_url: string;
  review_due: string | null;
  source_id: string;
  source_name: string;
  source_homepage: string;
  source_license: string;
  n_values: number | null;
  first_period: string | null;
  last_period: string | null;
  last_retrieved_at: string | null;
  latest_vintage: string | null;
  last_check_at: string | null;
  last_check_rules: number | null;
  last_check_failed: number | null;
  last_check_warned: number | null;
}

export interface Point {
  /** ISO date, the first day of the period. */
  x: string;
  label: string;
  value: number;
  isProjection: boolean;
  vintage: string;
  retrievedAt: string;
  sourceUrl: string;
  sourceCode: string | null;
  sourceLocator: string | null;
}

export interface Line {
  /** Stable identity: series id plus member. Colour follows it, never rank. */
  key: string;
  seriesId: string;
  member: string;
  /** What the legend and tooltip say. */
  name: string;
  role: 'primary' | 'context';
  unit: string;
  points: Point[];
}

export interface Annotation {
  id: string;
  /** End of the entry's quarter (PRD, Hubungan: "Kuartal dipetakan ke tanggal akhir kuartal"). */
  x: string;
  quarter: string;
  sector: TrackerSector;
  finding: string;
}

export interface ChartModel {
  slug: string;
  title: string;
  subtitle: string | null;
  chainLink: ChainLink;
  chartType: ChartType;
  annotationSectors: TrackerSector[];
  sort: number;
  seriesIds: string[];
  lines: Line[];
  /** One unit for the whole chart: the design rule is one axis. */
  unit: string | null;
}

/** A chart's own page. */
export const chartPath = (slug: string) => `/green-transition/tracker/chart/${slug}`;

/** Categorical order, validated light on #fafafa (adjacent CVD ΔE ≥ 9.1, normal ≥ 19.6). */
export const SERIES_COLORS = ['#0070c0', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

export function toNumber(v: number | string): number {
  return typeof v === 'number' ? v : Number(v);
}

/** The catalog rows of one chart into its definition, with no data yet. */
export function chartsFromCatalog(rows: ChartCatalogRow[]): ChartModel[] {
  const bySlug = new Map<string, ChartModel>();
  for (const r of rows) {
    let c = bySlug.get(r.chart_slug);
    if (!c) {
      c = {
        slug: r.chart_slug,
        title: r.title,
        subtitle: r.subtitle,
        chainLink: r.chain_link,
        chartType: r.chart_type,
        annotationSectors: r.annotation_sectors ?? [],
        sort: r.chart_sort,
        seriesIds: [],
        lines: [],
        unit: null,
      };
      bySlug.set(r.chart_slug, c);
    }
    if (r.series_id && !c.seriesIds.includes(r.series_id)) {
      c.seriesIds.push(r.series_id);
      c.unit = c.unit ?? r.unit;
    }
  }
  return [...bySlug.values()].sort(
    (a, b) => CHAIN_ORDER.indexOf(a.chainLink) - CHAIN_ORDER.indexOf(b.chainLink) || a.sort - b.sort || a.slug.localeCompare(b.slug),
  );
}

function pointOf(r: ObservationRow): Point {
  return {
    x: r.period_start,
    label: r.period_label ?? r.period_start,
    value: toNumber(r.value),
    isProjection: r.is_projection,
    vintage: r.vintage,
    retrievedAt: r.retrieved_at,
    sourceUrl: r.source_url,
    sourceCode: r.source_code,
    sourceLocator: r.source_locator,
  };
}

/**
 * The lines of one chart. Members keep the order the chart definition gives
 * them (`memberOrder`), so a member's colour slot never moves when another
 * member has no data.
 */
export function linesFor(
  rows: Array<ObservationRow & { label?: string; role?: 'primary' | 'context'; series_sort?: number }>,
  memberOrder: Record<string, string[] | null> = {},
): Line[] {
  const byKey = new Map<string, Line & { sort: number }>();
  for (const r of rows) {
    const key = `${r.series_id}::${r.member}`;
    let line = byKey.get(key);
    if (!line) {
      const order = memberOrder[r.series_id];
      const memberRank = order ? Math.max(order.indexOf(r.member), 0) : 0;
      line = {
        key,
        seriesId: r.series_id,
        member: r.member,
        name: r.member || r.label || r.series_id,
        role: r.role ?? 'primary',
        unit: r.unit,
        points: [],
        sort: (r.series_sort ?? 0) * 1000 + memberRank,
      };
      byKey.set(key, line);
    }
    line.points.push(pointOf(r));
  }
  return [...byKey.values()]
    .sort((a, b) => a.sort - b.sort || a.key.localeCompare(b.key))
    .map(({ sort: _sort, ...line }) => {
      line.points.sort((p, q) => p.x.localeCompare(q.x));
      return line;
    });
}

/** Fill a chart's lines from v_chart_data rows. */
export function withData(chart: ChartModel, rows: ChartDataRow[], memberOrder: Record<string, string[] | null> = {}): ChartModel {
  return { ...chart, lines: linesFor(rows.filter((r) => r.chart_slug === chart.slug), memberOrder) };
}

/**
 * What a series looked like as of one vintage: for each member and period,
 * the newest vintage published on or before it. `asOf` null is today.
 */
export function asOfVintage(rows: HistoryRow[], asOf: string | null): HistoryRow[] {
  const best = new Map<string, HistoryRow>();
  for (const r of rows) {
    if (asOf && r.vintage_date > asOf) continue;
    const k = `${r.series_id}::${r.member}::${r.period_start}`;
    const cur = best.get(k);
    if (!cur || r.vintage_date > cur.vintage_date || (r.vintage_date === cur.vintage_date && r.published_at > cur.published_at)) {
      best.set(k, r);
    }
  }
  return [...best.values()];
}

/** Vintages of the history, newest first, with what each one changed. */
export function revisions(rows: HistoryRow[]): Array<{ vintage: string; vintageDate: string; rows: number; publishedAt: string }> {
  const by = new Map<string, { vintage: string; vintageDate: string; rows: number; publishedAt: string }>();
  for (const r of rows) {
    const v = by.get(r.vintage) ?? { vintage: r.vintage, vintageDate: r.vintage_date, rows: 0, publishedAt: r.published_at };
    v.rows += 1;
    if (r.published_at < v.publishedAt) v.publishedAt = r.published_at;
    by.set(r.vintage, v);
  }
  return [...by.values()].sort((a, b) => b.vintageDate.localeCompare(a.vintageDate));
}

/** The last day of a quarter such as '2025Q2'. */
export function quarterEnd(quarter: string): string | null {
  const m = /^(\d{4})Q([1-4])$/.exec(quarter);
  if (!m) return null;
  const end = ['03-31', '06-30', '09-30', '12-31'][Number(m[2]) - 1];
  return `${m[1]}-${end}`;
}

/** Verified, published register rows of the chart's sectors, as markers. */
export function annotationsFor(entries: TrackerEntry[], sectors: TrackerSector[]): Annotation[] {
  const want = new Set(sectors);
  return entries
    .filter((e) => e.published && e.verification === 'verified' && want.has(e.sector))
    .flatMap((e) => {
      const x = quarterEnd(e.quarter);
      return x ? [{ id: e.id, x, quarter: e.quarter, sector: e.sector, finding: e.finding }] : [];
    })
    .sort((a, b) => a.x.localeCompare(b.x) || a.sector.localeCompare(b.sector));
}

/** Keep the points from `from` (ISO date) on; null keeps everything. */
export function clipLines(lines: Line[], from: string | null): Line[] {
  if (!from) return lines;
  return lines.map((l) => ({ ...l, points: l.points.filter((p) => p.x >= from) }));
}

export type Range = 'all' | '10y' | '5y';

export function rangeStart(range: Range, lines: Line[]): string | null {
  if (range === 'all') return null;
  const last = lines.flatMap((l) => l.points.map((p) => p.x)).sort().at(-1);
  if (!last) return null;
  const years = range === '10y' ? 10 : 5;
  return `${Number(last.slice(0, 4)) - years}${last.slice(4)}`;
}

/** The chart's distinct sources: vintages, codes and the latest pull. */
export function trailOf(lines: Line[]): {
  vintages: string[];
  codes: string[];
  urls: string[];
  lastRetrieved: string | null;
  locators: string[];
} {
  const vintages = new Set<string>();
  const codes = new Set<string>();
  const urls = new Set<string>();
  const locators = new Set<string>();
  let last: string | null = null;
  for (const l of lines) {
    for (const p of l.points) {
      vintages.add(p.vintage);
      if (p.sourceCode) codes.add(p.sourceCode.split(':')[0]);
      urls.add(p.sourceUrl);
      if (p.sourceLocator) locators.add(p.sourceLocator);
      if (!last || p.retrievedAt > last) last = p.retrievedAt;
    }
  }
  return {
    vintages: [...vintages].sort().reverse(),
    codes: [...codes].sort(),
    urls: [...urls].sort(),
    lastRetrieved: last,
    locators: [...locators].sort(),
  };
}

function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_COLUMNS = [
  'series_id', 'member', 'period_start', 'period_label', 'value', 'unit', 'is_projection',
  'vintage', 'retrieved_at', 'source_url', 'source_code', 'source_locator',
] as const;

/** Every value the chart draws, with its trail: the reader's CSV. */
export function toCsv(lines: Line[]): string {
  const out = [CSV_COLUMNS.join(',')];
  for (const l of lines) {
    for (const p of l.points) {
      out.push(
        [l.seriesId, l.member, p.x, p.label, p.value, l.unit, p.isProjection, p.vintage, p.retrievedAt, p.sourceUrl, p.sourceCode, p.sourceLocator]
          .map(csvCell)
          .join(','),
      );
    }
  }
  return out.join('\n') + '\n';
}

/** How a value reads in a tooltip, a table or a label. */
export function formatValue(value: number, unit: string | null): string {
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : abs >= 10 ? 1 : 2;
  const n = value.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  if (!unit) return n;
  if (unit === '%' || unit.startsWith('% ')) return `${n}%`;
  return `${n} ${unit}`;
}

/**
 * Whether a series' trail says its data may be stale (PRD: "Kegagalan yang
 * terlihat"). An API series is checked weekly, so a last good gate run older
 * than 14 days means the job has been failing. A manual series is stale once
 * its review date has passed.
 */
export function isStale(status: Pick<SeriesStatusRow, 'ingest' | 'last_check_at' | 'review_due'>, now: Date = new Date()): boolean {
  if (status.ingest === 'manual') {
    return !!status.review_due && status.review_due < now.toISOString().slice(0, 10);
  }
  if (!status.last_check_at) return true;
  return now.getTime() - new Date(status.last_check_at).getTime() > 14 * 86_400_000;
}
