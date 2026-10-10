/**
 * The working paper's builder (PRD site sweep 2026-10, R4.1–R4.2): reads the owner's dummy PSAK 338
 * workbook with exceljs and returns the published JSON. No file I/O here: the CLI (build-workbook.ts)
 * reads and writes.
 *
 * Sanitising is D9 and R4.2 only: hidden sheets and sheets without a value are left out (and must be
 * exactly the three D9 names), defined names are dropped. No value is altered: a cell's value is Excel's
 * cached value as exceljs reads it, a date written as ISO 8601, an error as its code.
 *
 * Deterministic: every object is built in a fixed key order, styles are numbered in the order they are
 * first met, and nothing reads the clock, the time zone or the locale.
 */
import ExcelJS from 'exceljs';
import type { Cell, Workbook, Worksheet } from 'exceljs';
import type { PublishedWorkbook, WorkbookCell, WorkbookColumn, WorkbookRow, WorkbookSheet, WorkbookStyle } from '../../src/lib/workbook/types.ts';

export const SOURCE_PATH = 'docs/consolidation/source/pt-dummy-psak-338.xlsx';
export const OUTPUT_PATH = 'public/consolidation/pt-dummy-psak-338.workbook.json';
const GENERATOR = 'scripts/consolidation/build-workbook.ts';

/** D9: the sheets the owner left out. The rule (hidden, or no cell with a value) must drop exactly these. */
export const D9_EXCLUDED = ['Face Report', 'WP Consol', 'Adjustment Consolaa'];

/** R4.7: a single file stays at or under 4 MB before gzip; above that the output is split per sheet. */
export const MAX_BYTES = 4_000_000;

/* ── Loading ── */

export interface Loaded {
  workbook: Workbook;
}

export async function loadSource(bytes: Buffer): Promise<Loaded> {
  const workbook = new ExcelJS.Workbook();
  // exceljs expands every defined name into a matrix of the cells it covers, and this file's 73k legacy
  // names (Lotus-era `\0`, `\a`, …, most of them #REF!) exhaust the heap. R4.2 drops them anyway, so they
  // are discarded as exceljs hands them to the workbook.
  Object.defineProperty(workbook.definedNames, 'model', { get: () => [], set: () => {} });
  await workbook.xlsx.load(bytes);
  return { workbook };
}

/* ── Font colour (D10) ── */

/** Excel's default indexed palette (ECMA-376 Part 1, §18.8.27). */
const INDEXED = [
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080',
  '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF',
  '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
  '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696',
  '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333',
];

/** The colours D10 keeps: Excel's Red and Blue, however the file encodes them. */
const KEPT: Record<string, 'red' | 'blue'> = { FF0000: 'red', '0000FF': 'blue' };

interface FontColor {
  argb?: string;
  indexed?: number;
  theme?: number;
  tint?: number;
}

/** The theme's colours in the order a `theme` attribute counts them: lt1, dk1, lt2, dk2, accent1–6, hlink, folHlink. */
export function themeColors(themeXml: string | undefined): string[] {
  const byName: Record<string, string> = {};
  const scheme = /<a:clrScheme\b[^>]*>([\s\S]*?)<\/a:clrScheme>/.exec(themeXml ?? '')?.[1] ?? '';
  for (const m of scheme.matchAll(/<a:(\w+)>\s*<a:(?:srgbClr val|sysClr [^>]*?lastClr)="([0-9A-Fa-f]{6})"/g)) byName[m[1]] = m[2].toUpperCase();
  return ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map((n) => byName[n]);
}

/** Excel's tint: lightness scaled toward black (tint < 0) or white (tint > 0) in HSL. */
function applyTint(hex: string, tint: number): string {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  const hue = (p: number, q: number, t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const rgb = s === 0 ? [l, l, l] : [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)];
  return rgb.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** The colour as six hex digits, from argb, the indexed palette or the theme (with its tint); null when unknown. */
export function resolveColor(color: FontColor | undefined, theme: string[]): string | null {
  if (!color) return null;
  let hex: string | undefined;
  if (color.argb) hex = color.argb.slice(-6).toUpperCase();
  else if (color.indexed !== undefined) hex = INDEXED[color.indexed];
  else if (color.theme !== undefined) hex = theme[color.theme];
  if (!hex) return null;
  return color.tint ? applyTint(hex, color.tint) : hex;
}

/* ── Addresses ── */

function colName(n: number): string {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

function colNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return n;
}

function decode(address: string): { row: number; col: number } {
  const m = /^\$?([A-Z]+)\$?(\d+)$/.exec(address);
  if (!m) throw new Error(`build-workbook: not an A1 address: ${address}`);
  return { row: Number(m[2]), col: colNumber(m[1]) };
}

/* ── Cells ── */

type Encoded = Pick<WorkbookCell, 'v' | 't'>;

/** A cached value as the JSON carries it. Throws on a shape the workbook is not known to hold. */
export function encodeValue(raw: unknown): Encoded {
  if (raw === null || raw === undefined) return {};
  if (raw instanceof Date) return { v: raw.toISOString(), t: 'd' };
  if (typeof raw === 'number' || typeof raw === 'string' || typeof raw === 'boolean') return { v: raw };
  if (typeof raw === 'object') {
    if ('error' in raw) return { v: String(raw.error), t: 'e' };
    if ('richText' in raw) return { v: (raw.richText as { text: string }[]).map((r) => r.text).join('') };
    if ('text' in raw) return { v: String(raw.text) };
  }
  throw new Error(`build-workbook: unexpected cell value ${JSON.stringify(raw)}`);
}

/** Excel's cached value of a cell. `cell.result`, not `cell.value.result`: exceljs drops a falsy result (0, FALSE, "") from the latter. */
export function cachedValue(cell: Cell): unknown {
  return cell.type === ExcelJS.ValueType.Formula ? cell.result : cell.value;
}

function cellStyle(cell: Cell, color: 'red' | 'blue' | undefined, borderOnly: boolean): WorkbookStyle {
  const style: WorkbookStyle = {};
  if (!borderOnly) {
    if (cell.numFmt && cell.numFmt !== 'General') style.numFmt = cell.numFmt;
    if (cell.font?.bold) style.bold = true;
    if (color) style.color = color;
    const a = cell.alignment;
    if (a) {
      const align: NonNullable<WorkbookStyle['align']> = {};
      if (a.horizontal && a.horizontal !== 'general') align.horizontal = a.horizontal;
      if (a.vertical && a.vertical !== 'bottom') align.vertical = a.vertical;
      if (a.indent) align.indent = a.indent;
      if (a.wrapText) align.wrap = true;
      if (Object.keys(align).length) style.align = align;
    }
  }
  const top = cell.border?.top?.style, bottom = cell.border?.bottom?.style;
  if (top || bottom) {
    style.border = {};
    if (top) style.border.top = top;
    if (bottom) style.border.bottom = bottom;
  }
  return style;
}

/* ── Build ── */

export interface SourceMeta {
  sha256: string;
  bytes: number;
}

interface SheetProfile {
  order: number;
  name: string;
  state: string;
  cells: number;
  formulas: number;
  errors: number;
  excluded: 'hidden' | 'empty' | null;
}

export interface Built {
  /** The published JSON, serialised. */
  json: string;
  book: PublishedWorkbook;
}

export function buildWorkbook({ workbook }: Loaded, meta: SourceMeta): Built {
  const theme = themeColors((workbook as unknown as { _themes?: Record<string, string> })._themes?.theme1);
  const styles: WorkbookStyle[] = [];
  const styleIndex = new Map<string, number>();
  const styleOf = (style: WorkbookStyle): number | undefined => {
    const key = JSON.stringify(style);
    if (key === '{}') return undefined;
    let i = styleIndex.get(key);
    if (i === undefined) {
      i = styles.length;
      styles.push(style);
      styleIndex.set(key, i);
    }
    return i;
  };

  const profile: SheetProfile[] = [];
  let red = 0, blue = 0;
  const sheets: WorkbookSheet[] = [];

  workbook.worksheets.forEach((ws: Worksheet, i: number) => {
    const order = i + 1;
    const p: SheetProfile = { order, name: ws.name, state: ws.state, cells: 0, formulas: 0, errors: 0, excluded: null };
    profile.push(p);
    let cells: WorkbookCell[] = [];
    let sheetRed = 0, sheetBlue = 0;

    ws.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.type === ExcelJS.ValueType.Merge) return;
        const formula = cell.type === ExcelJS.ValueType.Formula ? cell.formula.replace(/^=/, '') : undefined;
        const value = encodeValue(cachedValue(cell));
        if (value.v === undefined && formula === undefined) {
          // A blank cell is kept for its top or bottom rule (the line under a subtotal that runs across blank
          // columns), and only inside the cells with a value: see the bounding box below.
          const s = styleOf(cellStyle(cell, undefined, true));
          if (s !== undefined) cells.push({ a: cell.address, s });
          return;
        }
        p.cells++;
        if (formula !== undefined) p.formulas++;
        if (value.t === 'e') p.errors++;
        const hex = resolveColor(cell.font?.color as FontColor | undefined, theme);
        const color = hex ? KEPT[hex] : undefined;
        if (color === 'red') sheetRed++;
        if (color === 'blue') sheetBlue++;
        const out: WorkbookCell = { a: cell.address, ...value };
        if (formula !== undefined) out.f = formula;
        const s = styleOf(cellStyle(cell, color, false));
        if (s !== undefined) out.s = s;
        cells.push(out);
      });
    });

    if (ws.state !== 'visible') p.excluded = 'hidden';
    else if (p.cells === 0) p.excluded = 'empty';
    if (p.excluded) return;
    red += sheetRed;
    blue += sheetBlue;

    const merges = (ws.model.merges as string[]).slice().sort((x, y) => {
      const a = decode(x.split(':')[0]), b = decode(y.split(':')[0]);
      return a.row - b.row || a.col - b.col;
    });
    let top = Infinity, left = Infinity, bottom = 0, right = 0;
    const extend = (address: string) => {
      const { row, col } = decode(address);
      top = Math.min(top, row);
      left = Math.min(left, col);
      bottom = Math.max(bottom, row);
      right = Math.max(right, col);
    };
    const hasValue = (c: WorkbookCell) => c.v !== undefined || c.f !== undefined;
    for (const c of cells) if (hasValue(c)) extend(c.a);
    for (const m of merges) m.split(':').forEach(extend);
    cells = cells.filter((c) => {
      if (hasValue(c)) return true;
      const { row, col } = decode(c.a);
      return row >= top && row <= bottom && col >= left && col <= right;
    });

    const columns: WorkbookColumn[] = [];
    for (let c = 1; c <= right; c++) {
      const col = ws.columns?.[c - 1];
      if (!col) continue;
      const entry: WorkbookColumn = { col: colName(c) };
      if (col.width !== undefined) entry.width = col.width;
      if (col.hidden) entry.hidden = true;
      if (entry.width !== undefined || entry.hidden) columns.push(entry);
    }
    const rows: WorkbookRow[] = [];
    for (let r = 1; r <= bottom; r++) {
      const row = ws.findRow(r);
      if (!row) continue;
      const entry: WorkbookRow = { row: r };
      if (row.height !== undefined) entry.height = row.height;
      if (row.hidden) entry.hidden = true;
      if (entry.height !== undefined || entry.hidden) rows.push(entry);
    }
    const view = ws.views?.[0] as { state?: string; xSplit?: number; ySplit?: number } | undefined;

    sheets.push({
      name: ws.name,
      order,
      hidden: false,
      dimension: `${colName(left)}${top}:${colName(right)}${bottom}`,
      defaultColWidth: ws.properties.defaultColWidth ?? null,
      defaultRowHeight: ws.properties.defaultRowHeight ?? null,
      columns,
      rows,
      merges,
      freeze: view?.state === 'frozen' ? { rows: view.ySplit ?? 0, cols: view.xSplit ?? 0 } : null,
      cells,
    });
  });

  const dropped = profile.filter((p) => p.excluded).map((p) => p.name);
  if (dropped.length !== D9_EXCLUDED.length || !D9_EXCLUDED.every((name) => dropped.includes(name))) {
    throw new Error(`build-workbook: the sanitising rule drops [${dropped.join(', ')}], D9 names [${D9_EXCLUDED.join(', ')}]. A new decision is needed before publishing.`);
  }

  const published = profile.filter((p) => !p.excluded);
  const sum = (key: 'cells' | 'formulas' | 'errors') => published.reduce((n, p) => n + p[key], 0);
  const book: PublishedWorkbook = {
    format: 'workbook-json/1',
    source: { path: SOURCE_PATH, sha256: meta.sha256, bytes: meta.bytes },
    generator: GENERATOR,
    sourceSheets: profile.length,
    excluded: profile.filter((p) => p.excluded).map((p) => ({ name: p.name, order: p.order, reason: p.excluded! })),
    counts: {
      sheets: sheets.length,
      cells: sum('cells'),
      formulas: sum('formulas'),
      errors: sum('errors'),
      red,
      blue,
    },
    styles,
    sheets,
  };
  const json = serialise(book);
  if (Buffer.byteLength(json) > MAX_BYTES) {
    throw new Error(`build-workbook: ${Buffer.byteLength(json)} bytes is over ${MAX_BYTES}; split it per sheet (R4.7) before publishing.`);
  }
  return { json, book };
}

/** One style or cell per line, so a change in the workbook is a readable diff. Valid JSON; parses back to `book`. */
export function serialise(book: PublishedWorkbook): string {
  const { styles, sheets, ...head } = book;
  const lines = [JSON.stringify(head, null, 1).replace(/\n}$/, ',\n"styles": ['), styles.map((s) => JSON.stringify(s)).join(',\n'), '],', '"sheets": ['];
  sheets.forEach((sheet, i) => {
    const { cells, ...rest } = sheet;
    lines.push(`${JSON.stringify(rest).replace(/}$/, ',"cells":[')}`, cells.map((c) => JSON.stringify(c)).join(',\n'), i < sheets.length - 1 ? ']},' : ']}');
  });
  lines.push(']}', '');
  return lines.join('\n');
}
