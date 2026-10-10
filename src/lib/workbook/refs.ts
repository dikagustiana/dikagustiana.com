/**
 * The references in the working paper's formulas (PRD site sweep 2026-10, R4.4): which cells a formula
 * reads, so the viewer can outline a cell's precedents, list its dependents and jump across sheets.
 *
 * A scanner, not a formula parser: the viewer never recalculates. It skips string and error literals and
 * reads A1 references with or without `$` anchors, ranges, whole columns and rows, and the sheet before
 * `!`, quoted (`'SoCE Consol '!H52`, a doubled quote inside undone) or bare (`SOCE!H52`). That is all the
 * file's SUM, ROUND, IF, CONCATENATE, SUMIFS and SUBTOTAL calls need. Finance in Action's engine parser is
 * not reused: it throws on `#REF!`, does not read doubled quotes, and expands every range into its cells.
 *
 * The graph is built once per load. A formula's precedents stay ranges; only the dependents map expands
 * them, cell by cell, inside the used part of the sheet they read. That part reaches past the cells with a
 * value to every cell a formula names, so a jump to a precedent lands on it, filled or not.
 */
import { colIndex, colLetter } from '@/lib/finance-in-action/engine/address';
import type { PublishedWorkbook } from './types';

/** Excel's grid: the last row and column a reference can name. */
export const MAX_ROW = 1_048_576;
export const MAX_COL = 16_384;

/** A rectangle of cells, 1-based and inclusive. A single cell has top = bottom and left = right. */
export interface Area {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/** A reference as a formula writes it. */
export interface FormulaRef extends Area {
  /** The sheet named before "!", unquoted; null when the reference is to the formula's own sheet. */
  sheet: string | null;
  /** The reference without its sheet and `$` anchors, top-left first: `D9`, `G4:G658`, `A:C`, `3:5`. */
  ref: string;
  /** Where the reference, its sheet included, sits in the formula: `formula.slice(start, end)`. */
  start: number;
  end: number;
}

/* ── Addresses ── */

/** `D9` → { col: 4, row: 9 }; anchors allowed. Null when the text is not a cell on Excel's grid. */
export function decodeA1(a1: string): { col: number; row: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(a1);
  if (!m) return null;
  const col = colIndex(m[1].toUpperCase());
  const row = Number(m[2]);
  return col <= MAX_COL && row >= 1 && row <= MAX_ROW ? { col, row } : null;
}

export const encodeA1 = (col: number, row: number): string => `${colLetter(col)}${row}`;

/** A reference as Excel writes it on another sheet: quoted when the name needs it, `'` doubled inside. */
export function qualifiedRef(sheet: string, ref: string): string {
  const bare = /^[\p{L}_][\p{L}\p{N}_.]*$/u.test(sheet) && !decodeA1(sheet);
  return `${bare ? sheet : `'${sheet.replace(/'/g, "''")}'`}!${ref}`;
}

export const contains = (area: Area, col: number, row: number): boolean =>
  row >= area.top && row <= area.bottom && col >= area.left && col <= area.right;

/** The cells of an area, row by row, as A1 addresses; only those inside `within` when it is given. */
export function* cellsIn(area: Area, within?: Area): Generator<string> {
  const top = Math.max(area.top, within?.top ?? 1);
  const bottom = Math.min(area.bottom, within?.bottom ?? MAX_ROW);
  const left = Math.max(area.left, within?.left ?? 1);
  const right = Math.min(area.right, within?.right ?? MAX_COL);
  for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) yield encodeA1(col, row);
}

/* ── Scanning a formula ── */

/** A character that continues a name, a number or a reference: a reference cannot start right after one. */
const CONTINUES = /[\p{L}\p{N}_.$]/u;
const ERROR_LITERAL = /#(?:NULL!|DIV\/0!|VALUE!|REF!|NAME\?|NUM!|N\/A|GETTING_DATA|SPILL!|CALC!)/y;
const BARE_SHEET = /([\p{L}\p{N}_.]+)!/uy;
const CELLS = /\$?([A-Za-z]{1,3})\$?(\d{1,7})(?::\$?([A-Za-z]{1,3})\$?(\d{1,7}))?/y;
const COLUMNS = /\$?([A-Za-z]{1,3}):\$?([A-Za-z]{1,3})/y;
const ROWS = /\$?(\d{1,7}):\$?(\d{1,7})/y;

/** The index just past a quoted run that opens at `at`; a doubled quote inside does not close it. */
function skipQuoted(text: string, at: number, quote: string): number {
  let i = at + 1;
  while (i < text.length) {
    if (text[i] !== quote) i++;
    else if (text[i + 1] === quote) i += 2;
    else return i + 1;
  }
  return text.length;
}

function sticky(re: RegExp, text: string, at: number): RegExpExecArray | null {
  re.lastIndex = at;
  return re.exec(text);
}

/**
 * The reference at `at`, or null: an area on Excel's grid, not followed by a name or "(". Its text drops the
 * anchors and puts the top-left first, and keeps a range written as one (`SUM(N70:N70)`).
 */
function readArea(text: string, at: number): { area: Area; ref: string; end: number } | null {
  let found: { area: Area; ref: string } | null = null;
  let end = at;
  let m: RegExpExecArray | null;
  if ((m = sticky(CELLS, text, at))) {
    const a = decodeA1(`${m[1]}${m[2]}`);
    const b = m[3] ? decodeA1(`${m[3]}${m[4]}`) : a;
    if (a && b) {
      const area = { top: Math.min(a.row, b.row), left: Math.min(a.col, b.col), bottom: Math.max(a.row, b.row), right: Math.max(a.col, b.col) };
      const first = encodeA1(area.left, area.top);
      found = { area, ref: m[3] ? `${first}:${encodeA1(area.right, area.bottom)}` : first };
    }
    end = CELLS.lastIndex;
  } else if ((m = sticky(COLUMNS, text, at))) {
    const [a, b] = [colIndex(m[1].toUpperCase()), colIndex(m[2].toUpperCase())];
    const [left, right] = [Math.min(a, b), Math.max(a, b)];
    if (right <= MAX_COL) found = { area: { top: 1, left, bottom: MAX_ROW, right }, ref: `${colLetter(left)}:${colLetter(right)}` };
    end = COLUMNS.lastIndex;
  } else if ((m = sticky(ROWS, text, at))) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const [top, bottom] = [Math.min(a, b), Math.max(a, b)];
    if (top >= 1 && bottom <= MAX_ROW) found = { area: { top, left: 1, bottom, right: MAX_COL }, ref: `${top}:${bottom}` };
    end = ROWS.lastIndex;
  }
  if (!found || (end < text.length && (CONTINUES.test(text[end]) || text[end] === '(' || text[end] === '!'))) return null;
  return { ...found, end };
}

/**
 * The references a formula reads, in the order written. The formula is stored without its "=", but one
 * is allowed. A reference to a deleted cell (`'CF 2024'!#REF!`) names nothing and is left out.
 */
export function parseRefs(formula: string): FormulaRef[] {
  const refs: FormulaRef[] = [];
  const take = (sheet: string | null, start: number, at: number): number => {
    if (sticky(ERROR_LITERAL, formula, at)) return ERROR_LITERAL.lastIndex;
    const found = readArea(formula, at);
    if (!found) return at;
    refs.push({ sheet, ...found.area, ref: found.ref, start, end: found.end });
    return found.end;
  };
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '"') {
      i = skipQuoted(formula, i, '"');
    } else if (ch === "'") {
      const close = skipQuoted(formula, i, "'");
      i = formula[close] === '!' ? take(formula.slice(i + 1, close - 1).replace(/''/g, "'"), i, close + 1) : close;
    } else if (ch === '#') {
      i = sticky(ERROR_LITERAL, formula, i) ? ERROR_LITERAL.lastIndex : i + 1;
    } else if (i > 0 && CONTINUES.test(formula[i - 1])) {
      i++;
    } else {
      const bare = sticky(BARE_SHEET, formula, i);
      const next = bare ? take(bare[1], i, BARE_SHEET.lastIndex) : take(null, i, i);
      i = next > i ? next : i + 1;
    }
  }
  return refs;
}

/* ── The workbook's graph ── */

/** published: a sheet the viewer shows; excluded: one D9 left out, which the viewer says; unknown: no such sheet. */
export type SheetStatus = 'published' | 'excluded' | 'unknown';

/** What a formula reads: one range on one sheet, kept as a range. */
export interface Precedent extends Area {
  /** The sheet's name in the workbook (Excel matches names without regard to case); as written when no sheet has it. */
  sheet: string;
  status: SheetStatus;
  /** True when the formula reads its own sheet, named or not. */
  local: boolean;
  /** As in FormulaRef: `D9`, `G4:G658`. */
  ref: string;
}

/** A cell by its sheet and A1 address. */
export interface CellAt {
  sheet: string;
  a: string;
}

export interface RefGraph {
  /** Per sheet, per formula cell: the ranges its formula reads, in the order written, each once. */
  precedents: Map<string, Map<string, Precedent[]>>;
  /**
   * Per sheet, per cell: the formula cells that read it, on any sheet, in workbook order. A range counts
   * for every cell it covers inside its sheet's used part, filled or not.
   */
  dependents: Map<string, Map<string, CellAt[]>>;
  /**
   * Per published sheet, its used part: from A1 to the dimension's bottom-right, grown to take in the
   * top-left of every reference a formula makes to the sheet (a whole column's first cell, a whole row's).
   * The viewer lays the sheet out this far.
   */
  used: Map<string, Area>;
  /** A sheet named in a formula: its name in the workbook and whether the viewer has it. */
  resolveSheet(name: string): { name: string; status: SheetStatus };
}

/** Built once per load of the workbook JSON. */
export function buildRefGraph(book: PublishedWorkbook): RefGraph {
  const sheets = new Map<string, { name: string; status: SheetStatus }>();
  for (const s of book.sheets) sheets.set(s.name.toUpperCase(), { name: s.name, status: 'published' });
  for (const s of book.excluded) sheets.set(s.name.toUpperCase(), { name: s.name, status: 'excluded' });
  const resolveSheet = (name: string) => sheets.get(name.toUpperCase()) ?? { name, status: 'unknown' as const };

  const used = new Map<string, Area>();
  for (const s of book.sheets) {
    const end = decodeA1(s.dimension.split(':').pop() ?? '');
    if (end) used.set(s.name, { top: 1, left: 1, bottom: end.row, right: end.col });
  }

  const precedents = new Map<string, Map<string, Precedent[]>>();
  const dependents = new Map<string, Map<string, CellAt[]>>();
  for (const s of book.sheets) {
    precedents.set(s.name, new Map());
    dependents.set(s.name, new Map());
  }

  // Every formula read once: its precedents, and the used part of each sheet it names grown to the
  // reference's top-left.
  for (const s of book.sheets) {
    const own = precedents.get(s.name)!;
    for (const cell of s.cells) {
      if (cell.f === undefined) continue;
      const read: Precedent[] = [];
      for (const r of parseRefs(cell.f)) {
        const { name, status } = r.sheet === null ? { name: s.name, status: 'published' as const } : resolveSheet(r.sheet);
        if (read.some((p) => p.sheet === name && p.ref === r.ref)) continue;
        read.push({ sheet: name, status, local: name === s.name, ref: r.ref, top: r.top, left: r.left, bottom: r.bottom, right: r.right });
        const area = used.get(name);
        if (area) {
          area.bottom = Math.max(area.bottom, r.top);
          area.right = Math.max(area.right, r.left);
        }
      }
      own.set(cell.a, read);
    }
  }

  // Then the dependents, inside the used parts.
  for (const s of book.sheets) {
    for (const [a, read] of precedents.get(s.name)!) {
      const dependent: CellAt = { sheet: s.name, a };
      for (const p of read) {
        const into = dependents.get(p.sheet);
        const within = used.get(p.sheet);
        if (!into || !within) continue;
        for (const at of cellsIn(p, within)) {
          const list = into.get(at);
          // One formula reads a cell once, however many of its ranges cover it.
          if (!list) into.set(at, [dependent]);
          else if (list[list.length - 1] !== dependent) list.push(dependent);
        }
      }
    }
  }
  return { precedents, dependents, used, resolveSheet };
}

export const precedentsOf = (graph: RefGraph, sheet: string, a: string): Precedent[] => graph.precedents.get(sheet)?.get(a) ?? [];

export const dependentsOf = (graph: RefGraph, sheet: string, a: string): CellAt[] => graph.dependents.get(sheet)?.get(a) ?? [];
