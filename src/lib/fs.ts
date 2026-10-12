/**
 * The audited financial statements viewer (PRD §A7): the shapes of the fs_*
 * rows the page reads, and the few rules for printing them.
 *
 * Figures are shown as the issuer printed them. A stored negative prints in
 * parentheses, a stored zero prints as "-" (the extraction stores the FS's "-"
 * as 0), and a blank cell stays blank. Nothing is summed here: every subtotal
 * and total on the page is the printed one, and the tie-out badge reports the
 * checks that proved them.
 */

export type FsStatement = 'sofp' | 'pl_oci' | 'cf';
export type FsTab = FsStatement | 'soce';
export type FsLineType = 'header' | 'item' | 'subtotal' | 'total';

export interface FsCompany {
  id: string;
  legal_name: string;
  short_name: string;
}

export interface FsPeriod {
  id: string;
  company_id: string;
  period_key: string;
  period_end: string;
  comparative_end: string;
  currency: string;
  unit: string;
  auditor: string | null;
  auditor_report_no: string | null;
  auditor_opinion: string | null;
  source_file: string;
  status: 'draft' | 'published';
  fs_company: FsCompany;
}

export interface FsLine {
  id: string;
  period_id: string;
  statement: FsStatement;
  parent_id: string | null;
  sort_order: number;
  line_type: FsLineType;
  indent: number;
  label_id: string;
  label_en: string;
  notes_ref: string | null;
  value_cy: number | null;
  value_py: number | null;
  source_page: number;
  line_key: string | null;
  fsli_slug: string | null;
  printed_diff_cy: number | null;
  printed_diff_py: number | null;
  printed_diff_note: string | null;
}

export interface FsCheck {
  rule_id: string;
  statement: string | null;
  description: string;
  expected: number | null;
  actual: number | null;
  diff: number | null;
  passed: boolean;
  run_at: string;
}

/** The four tabs, in the order the FS prints the statements (PRD §A7). */
export const FS_TABS: ReadonlyArray<{
  key: FsTab;
  tab: string;
  titleId: string;
  titleEn: string;
  pointInTime: boolean;
  shown: boolean;
}> = [
  {
    key: 'sofp',
    tab: 'Posisi Keuangan',
    titleId: 'Laporan Posisi Keuangan Konsolidasian',
    titleEn: 'Consolidated Statement of Financial Position',
    pointInTime: true,
    shown: true,
  },
  {
    key: 'pl_oci',
    tab: 'Laba Rugi & OCI',
    titleId: 'Laporan Laba Rugi dan Penghasilan Komprehensif Lain Konsolidasian',
    titleEn: 'Consolidated Statement of Profit or Loss and Other Comprehensive Income',
    pointInTime: false,
    shown: true,
  },
  // Loaded and checked (the cross-statement rules read them), not yet shown:
  // owner decision D1, with the empty-state copy of discovery §19 item 4.
  {
    key: 'soce',
    tab: 'Perubahan Ekuitas',
    titleId: 'Laporan Perubahan Ekuitas Konsolidasian',
    titleEn: 'Consolidated Statement of Changes in Equity',
    pointInTime: false,
    shown: false,
  },
  {
    key: 'cf',
    tab: 'Arus Kas',
    titleId: 'Laporan Arus Kas Konsolidasian',
    titleEn: 'Consolidated Statement of Cash Flows',
    pointInTime: false,
    shown: false,
  },
];

export const NOT_SHOWN_YET = 'Not yet shown on this page.';

export function isFsTab(value: string | null): value is FsTab {
  return FS_TABS.some((t) => t.key === value);
}

const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });

/** A figure as the FS prints it: (1,234) for a negative, "-" for nil, blank for a blank cell. */
export function formatFigure(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const n = Number(value);
  if (n === 0) return '-';
  return n < 0 ? `(${NUMBER.format(-n)})` : NUMBER.format(n);
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The parts of a stored ISO date, read from the string so no time zone can move the day. */
function dateParts(iso: string): { y: string; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return { y, m: Number(m) - 1, d: Number(d) };
}

/** "31 Dec 2024": a column heading. */
export function shortDate(iso: string): string {
  const { y, m, d } = dateParts(iso);
  return `${d} ${MONTHS_SHORT[m]} ${y}`;
}

/** The FS's own date line under a statement title, in both languages. */
export function periodLine(iso: string, pointInTime: boolean): { id: string; en: string } {
  const { y, m, d } = dateParts(iso);
  return pointInTime
    ? { id: `Tanggal ${d} ${MONTHS_ID[m]} ${y}`, en: `As of ${MONTHS_EN[m]} ${d}, ${y}` }
    : {
        id: `Untuk Tahun yang Berakhir pada Tanggal ${d} ${MONTHS_ID[m]} ${y}`,
        en: `For the Year Ended ${MONTHS_EN[m]} ${d}, ${y}`,
      };
}

const UNIT: Record<string, { id: string; en: string }> = {
  units: { id: '', en: '' },
  thousands: { id: 'ribuan ', en: 'thousands of ' },
  millions: { id: 'jutaan ', en: 'millions of ' },
  billions: { id: 'miliaran ', en: 'billions of ' },
};
const CURRENCY: Record<string, { id: string; en: string }> = {
  USD: { id: 'dolar Amerika Serikat', en: 'United States dollars' },
  IDR: { id: 'rupiah', en: 'Indonesian rupiah' },
};

/** "Expressed in thousands of United States dollars, unless otherwise stated", and the Indonesian. */
export function unitLine(unit: string, currency: string): { id: string; en: string } {
  const u = UNIT[unit] ?? { id: `${unit} `, en: `${unit} of ` };
  const c = CURRENCY[currency] ?? { id: currency, en: currency };
  return {
    id: `Disajikan dalam ${u.id}${c.id}, kecuali dinyatakan lain`,
    en: `Expressed in ${u.en}${c.en}, unless otherwise stated`,
  };
}

/** The latest run of checks: the rows sharing the most recent run_at. */
export function latestRun(checks: readonly FsCheck[]): FsCheck[] {
  let latest = '';
  for (const c of checks) if (c.run_at > latest) latest = c.run_at;
  return checks.filter((c) => c.run_at === latest);
}

export interface TieOut {
  rules: number;
  failed: number;
  declared: number;
  runAt: string | null;
}

export function tieOut(run: readonly FsCheck[]): TieOut {
  return {
    rules: run.length,
    failed: run.filter((c) => !c.passed).length,
    declared: run.filter((c) => c.rule_id.startsWith('DECLARED:')).length,
    runAt: run[0]?.run_at ?? null,
  };
}

/** "p.11–17": the pages the checked rows were read from. */
export function pageRange(pages: readonly number[]): string {
  if (pages.length === 0) return '';
  const lo = Math.min(...pages);
  const hi = Math.max(...pages);
  return lo === hi ? `p.${lo}` : `p.${lo}–${hi}`;
}

/** Rows whose label (either language) or note reference contains the search. */
export function matchesSearch(line: Pick<FsLine, 'label_id' | 'label_en' | 'notes_ref'>, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [line.label_id, line.label_en, line.notes_ref ?? ''].some((s) => s.toLowerCase().includes(q));
}

/**
 * A line-item page's rows in a statement: the row linked to it and, when that
 * row is a heading, the rows the FS prints indented under it (the heading
 * "Piutang usaha, neto" carries no figure of its own; its two parties do).
 */
export function rowsForSlug(lines: readonly FsLine[], slug: string): FsLine[] {
  // Every row linked to the page, not the first one found: one essay can
  // cover several lines (deferred tax assets and liabilities and the tax
  // charge), in more than one statement. They come in the viewer's order,
  // statement by statement, each heading with the rows printed under it.
  const order = (l: FsLine) => FS_TABS.findIndex((t) => t.key === l.statement);
  const sorted = [...lines].sort((a, b) => order(a) - order(b) || a.sort_order - b.sort_order);
  const out: FsLine[] = [];
  const seen = new Set<string>();
  const add = (l: FsLine) => {
    const key = `${l.statement}:${l.sort_order}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(l);
  };
  sorted.forEach((row, i) => {
    if (row.fsli_slug !== slug) return;
    add(row);
    if (row.line_type !== 'header') return;
    for (const l of sorted.slice(i + 1)) {
      if (l.statement !== row.statement || l.indent <= row.indent) break;
      add(l);
    }
  });
  return out;
}

/** The id a statement row carries on the page, so a line-item page can link to it. */
export function rowAnchor(line: Pick<FsLine, 'statement' | 'sort_order'>): string {
  return `row-${line.statement}-${line.sort_order}`;
}
