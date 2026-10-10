// @vitest-environment node
/**
 * The working paper's references (PRD site sweep 2026-10, R4.4, R4.8): the scanner reads what a regular
 * expression written apart from it reads, in 50 real formulas drawn from the committed JSON with a fixed
 * seed and in every other formula of the file; the sheet names that need quoting, `$` anchors, ranges and
 * literals by hand; and the graph's precedents and dependents, Consol SoFP 24!D9 (=D114+D53) first, and
 * each sheet's used part, which takes in every cell a formula names.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_COL,
  MAX_ROW,
  buildRefGraph,
  cellsIn,
  contains,
  decodeA1,
  dependentsOf,
  encodeA1,
  parseRefs,
  precedentsOf,
  qualifiedRef,
  type CellAt,
} from '@/lib/workbook/refs';
import { buildSheetModel, snap } from '@/lib/workbook/sheet';
import type { PublishedWorkbook, WorkbookCell } from '@/lib/workbook/types';
import { seeded } from './helpers/seeded';

const book = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../public/consolidation/pt-dummy-psak-338.workbook.json'), 'utf8'),
) as PublishedWorkbook;
const graph = buildRefGraph(book);
const FORMULAS = book.sheets.flatMap((s) => s.cells.flatMap((c) => (c.f === undefined ? [] : [{ sheet: s.name, a: c.a, f: c.f }])));

/**
 * The oracle: one regular expression over the formula with its strings blanked. Enough for this file's
 * formulas; the hand-written cases cover what it does not (doubled quotes, whole columns, reversed ranges).
 */
function oracle(formula: string): string[] {
  const text = formula.replace(/"(?:[^"]|"")*"/g, (s) => ' '.repeat(s.length));
  const re = /(?<![\w$.])(?:'((?:[^']|'')+)'!|([A-Za-z_][\w.]*)!)?\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?(?![\w(!])/g;
  return [...text.matchAll(re)].map((m) => `${m[1]?.replace(/''/g, "'") ?? m[2] ?? ''}!${m[3]}${m[4]}${m[5] ? `:${m[5]}${m[6]}` : ''}`);
}
const scanned = (formula: string): string[] => parseRefs(formula).map((r) => `${r.sheet ?? ''}!${r.ref}`);

/** R4.8's 50, drawn kind by kind so that every function the file calls is among them. */
const STRATA: [string, number, (f: string) => boolean][] = [
  ['SUBTOTAL', 1, (f) => f.includes('SUBTOTAL(')],
  ['SUMIFS', 4, (f) => f.includes('SUMIFS(')],
  ['CONCATENATE', 5, (f) => f.includes('CONCATENATE(')],
  ['IF', 6, (f) => /\bIF\(/.test(f)],
  ['ROUND', 6, (f) => f.includes('ROUND(')],
  ['SUM', 8, (f) => /\bSUM\(/.test(f)],
  ['a quoted sheet', 10, (f) => f.includes("'")],
  ['a bare sheet', 3, (f) => /(?:^|[^'\w#])[A-Za-z]\w*!/.test(f)],
  ['arithmetic alone', 7, (f) => !/[A-Z]\(/.test(f) && !f.includes('!')],
];

function sample(): typeof FORMULAS {
  const random = seeded(20261010);
  const picked = new Set<number>();
  for (const [, count, matches] of STRATA) {
    const pool = FORMULAS.flatMap((x, i) => (matches(x.f) && !picked.has(i) ? [i] : []));
    const drawn = new Set<number>();
    while (drawn.size < Math.min(count, pool.length)) drawn.add(pool[Math.floor(random() * pool.length)]);
    for (const i of drawn) picked.add(i);
  }
  return [...picked].map((i) => FORMULAS[i]);
}

describe('the reference scanner', () => {
  it('reads what an independent regex reads in 50 real formulas drawn with a fixed seed, every function the file calls among them', () => {
    const fifty = sample();
    expect(fifty).toHaveLength(50);
    for (const fn of ['SUM(', 'ROUND(', 'IF(', 'CONCATENATE(', 'SUMIFS(', 'SUBTOTAL(']) expect(fifty.some((x) => x.f.includes(fn)), fn).toBe(true);
    for (const { sheet, a, f } of fifty) {
      const where = `${sheet}!${a}: ${f}`;
      expect(scanned(f), where).toEqual(oracle(f));
      // Each reference points back at its own text in the formula.
      for (const r of parseRefs(f)) expect(f.slice(r.start, r.end).replace(/\$/g, '').endsWith(r.ref), where).toBe(true);
    }
  });

  it("and in every one of the file's 15,476 formulas", () => {
    expect(FORMULAS).toHaveLength(15476);
    const differ = FORMULAS.filter(({ f }) => JSON.stringify(scanned(f)) !== JSON.stringify(oracle(f)));
    expect(differ).toEqual([]);
  });

  it('reads a sheet name with spaces, an ampersand, a leading hyphen or a trailing space as written, and undoes a doubled quote', () => {
    expect(scanned("SUM('Consol SoFP 23 & 22'!AE17:AE18,'Consol SoFP 23 & 22'!AE20)")).toEqual(['Consol SoFP 23 & 22!AE17:AE18', 'Consol SoFP 23 & 22!AE20']);
    expect(scanned("-SUM('NCI Detail & Movement'!P48,'NCI Detail & Movement'!P49)")).toEqual(['NCI Detail & Movement!P48', 'NCI Detail & Movement!P49']);
    expect(scanned("-'-BS-RP Disclosure 2023'!S169")).toEqual(['-BS-RP Disclosure 2023!S169']);
    const [soce] = parseRefs("'SoCE Consol '!L77");
    expect(soce.sheet).toBe('SoCE Consol ');
    expect(soce.ref).toBe('L77');
    expect(scanned("'Dika''s ''notes'''!B2+1")).toEqual(["Dika's 'notes'!B2"]);
    expect(scanned('-SOCE!H52')).toEqual(['SOCE!H52']);
    expect(scanned('-Control!F32')).toEqual(['Control!F32']);
  });

  it('drops the $ anchors from a reference but keeps where it was written', () => {
    expect(scanned('F11*$C$1')).toEqual(['!F11', '!C1']);
    expect(scanned('D$10*D13')).toEqual(['!D10', '!D13']);
    const formula = "ROUND('Consol SoFP 24'!$AH$17:AH18,0)+$B2";
    const refs = parseRefs(formula);
    expect(refs.map((r) => formula.slice(r.start, r.end))).toEqual(["'Consol SoFP 24'!$AH$17:AH18", '$B2']);
    expect(refs[0]).toMatchObject({ sheet: 'Consol SoFP 24', ref: 'AH17:AH18', top: 17, left: 34, bottom: 18, right: 34 });
  });

  it('reads a range top-left first, whole columns and whole rows, and keeps a one-cell range as written', () => {
    expect(parseRefs('SUM(N70:N70)')[0]).toMatchObject({ ref: 'N70:N70', top: 70, bottom: 70, left: 14, right: 14 });
    expect(parseRefs('SUM(B9:A1)')[0]).toMatchObject({ ref: 'A1:B9', top: 1, left: 1, bottom: 9, right: 2 });
    expect(parseRefs('SUM(A:C)')[0]).toMatchObject({ sheet: null, ref: 'A:C', top: 1, left: 1, bottom: MAX_ROW, right: 3 });
    expect(parseRefs('SUM($5:$3)')[0]).toMatchObject({ ref: '3:5', top: 3, left: 1, bottom: 5, right: MAX_COL });
    expect(scanned("SUMIFS('Elimination 2024'!G:G,'Elimination 2024'!C:C,\"Adjusting\")")).toEqual(['Elimination 2024!G:G', 'Elimination 2024!C:C']);
  });

  it('skips string literals, even with "!", ":" or a quote inside, function names, numbers and error literals', () => {
    expect(scanned('IF(C12="BS",D12,0)')).toEqual(['!C12', '!D12']);
    expect(scanned('CONCATENATE("To elimination Intercompany loan ",C72," x ",D72)')).toEqual(['!C72', '!D72']);
    expect(scanned('IF(A1="Sheet1!B2:C3",\'Elimination 2024\'!G5,"it\'s ""A9""")')).toEqual(['!A1', 'Elimination 2024!G5']);
    expect(scanned('SUMIFS(G4:G658,C4:C658,"Adjusting")')).toEqual(['!G4:G658', '!C4:C658']);
    expect(scanned('ROUND(SUM(J38:BD38),0)')).toEqual(['!J38:BD38']);
    expect(scanned('SUBTOTAL(9,Z7:Z72)')).toEqual(['!Z7:Z72']);
    expect(scanned('LOG10(A1)*1.5E+10-ATAN2(B1,2)')).toEqual(['!A1', '!B1']);
    // A reference Excel lost names nothing; a cell off the grid is not a reference.
    expect(scanned("'Consol SoFP 24'!T66+'Consol SoFP 24'!#REF!")).toEqual(['Consol SoFP 24!T66']);
    expect(scanned("'CF 2024'!#REF!")).toEqual([]);
    expect(scanned('#REF!+IFERROR(A1,#N/A)+#DIV/0!')).toEqual(['!A1']);
    expect(scanned('XFE1+A0+XFD1048576')).toEqual(['!XFD1048576']);
  });

  it("writes a cross-sheet reference as Excel does, quoting a name that needs it, and reads it back for every sheet's name", () => {
    expect(qualifiedRef('SOCE', 'H52')).toBe('SOCE!H52');
    expect(qualifiedRef('SoCE Consol ', 'L77')).toBe("'SoCE Consol '!L77");
    expect(qualifiedRef('-BS-RP Disclosure 2023', 'S169')).toBe("'-BS-RP Disclosure 2023'!S169");
    expect(qualifiedRef("Dika's", 'A1')).toBe("'Dika''s'!A1");
    expect(qualifiedRef('AB12', 'A1')).toBe("'AB12'!A1");
    for (const name of [...book.sheets, ...book.excluded].map((s) => s.name)) {
      expect(parseRefs(qualifiedRef(name, 'B2:C3'))[0], name).toMatchObject({ sheet: name, ref: 'B2:C3' });
    }
  });

  it('decodes an address and walks an area row by row, inside a bound when given one', () => {
    expect(decodeA1('$AJ$120')).toEqual({ col: 36, row: 120 });
    expect(decodeA1('A0')).toBeNull();
    expect(decodeA1('XFE1')).toBeNull();
    const area = { top: 4, left: 4, bottom: 5, right: 5 };
    expect([...cellsIn(area)]).toEqual(['D4', 'E4', 'D5', 'E5']);
    expect([...cellsIn({ top: 1, left: 2, bottom: MAX_ROW, right: 2 }, { top: 1, left: 1, bottom: 3, right: 9 })]).toEqual(['B1', 'B2', 'B3']);
    expect(contains(area, 5, 4)).toBe(true);
    expect(contains(area, 6, 4)).toBe(false);
  });
});

/** What every formula reads by the oracle: the reading cell, the sheet read (upper case) and the bounds. */
const READS = FORMULAS.flatMap((x) => {
  const reader: CellAt = { sheet: x.sheet, a: x.a };
  return oracle(x.f).map((written) => {
    const bang = written.lastIndexOf('!');
    const [from, to = from] = written.slice(bang + 1).split(':').map((s) => decodeA1(s)!);
    return { reader, target: (written.slice(0, bang) || x.sheet).toUpperCase(), from, to };
  });
});

/** Every formula cell that reads `sheet!a`, by a plain walk over the oracle's reads. */
function readers(sheet: string, a: string): CellAt[] {
  const at = decodeA1(a)!;
  const found: CellAt[] = [];
  for (const { reader, target, from, to } of READS) {
    if (target !== sheet.toUpperCase() || at.row < from.row || at.row > to.row || at.col < from.col || at.col > to.col) continue;
    if (found[found.length - 1] !== reader) found.push(reader);
  }
  return found.map(({ sheet: s, a: cell }) => ({ sheet: s, a: cell }));
}

describe("the workbook's graph", () => {
  it('gives Consol SoFP 24!D9 (=D114+D53) its two precedents on its own sheet, and D9 to each of them as a dependent', () => {
    const sheet = book.sheets.find((s) => s.name === 'Consol SoFP 24')!;
    expect(sheet.cells.find((c) => c.a === 'D9')!.f).toBe('D114+D53');
    expect(precedentsOf(graph, 'Consol SoFP 24', 'D9')).toEqual([
      { sheet: 'Consol SoFP 24', status: 'published', local: true, ref: 'D114', top: 114, left: 4, bottom: 114, right: 4 },
      { sheet: 'Consol SoFP 24', status: 'published', local: true, ref: 'D53', top: 53, left: 4, bottom: 53, right: 4 },
    ]);
    for (const a of ['D114', 'D53']) {
      expect(dependentsOf(graph, 'Consol SoFP 24', a)).toContainEqual({ sheet: 'Consol SoFP 24', a: 'D9' });
      expect(dependentsOf(graph, 'Consol SoFP 24', a)).toEqual(readers('Consol SoFP 24', a));
    }
    // Nothing in the file reads D9 itself.
    expect(dependentsOf(graph, 'Consol SoFP 24', 'D9')).toEqual(readers('Consol SoFP 24', 'D9'));
    expect(dependentsOf(graph, 'Consol SoFP 24', 'D9')).toEqual([]);
  });

  it("resolves a cross-sheet reference to the sheet's own name, and says when D9 left that sheet out", () => {
    expect(precedentsOf(graph, 'Consol SoFP 23 & 22', 'J102')).toEqual([
      { sheet: 'Adjustment Consolaa', status: 'excluded', local: false, ref: 'G14', top: 14, left: 7, bottom: 14, right: 7 },
    ]);
    expect(graph.dependents.has('Adjustment Consolaa')).toBe(false);
    expect(graph.resolveSheet('soce consol ')).toEqual({ name: 'SoCE Consol ', status: 'published' });
    expect(graph.resolveSheet('SoCE Consol')).toEqual({ name: 'SoCE Consol', status: 'unknown' });
    expect(graph.resolveSheet('FACE REPORT')).toEqual({ name: 'Face Report', status: 'excluded' });
    expect(graph.resolveSheet('WP Consol')).toEqual({ name: 'WP Consol', status: 'excluded' });
    // The jump R4.8's end-to-end test takes, and a bare sheet name.
    expect(precedentsOf(graph, 'Consol SoFP 24', 'AF26')).toMatchObject([{ sheet: 'Elimination 2024', status: 'published', local: false, ref: 'G82' }]);
    expect(dependentsOf(graph, 'Elimination 2024', 'G82')).toContainEqual({ sheet: 'Consol SoFP 24', a: 'AF26' });
    expect(precedentsOf(graph, 'Supplementary CF 24', 'E75')).toMatchObject([{ sheet: 'SOCE', status: 'published', local: false, ref: 'H52' }]);
    expect(dependentsOf(graph, 'SOCE', 'H52')).toContainEqual({ sheet: 'Supplementary CF 24', a: 'E75' });
  });

  it("keeps a range as one precedent, and gives its cells a dependent only inside the sheet's used part", () => {
    expect(precedentsOf(graph, 'Adjustment Consol', 'I2').map((p) => p.ref)).toEqual(['I5:I1010', 'D5:D1010']);
    expect(book.sheets.find((s) => s.name === 'Adjustment Consol')!.dimension).toBe('A2:L96');
    // Formulas on other sheets name its cells down to row 177, so its used part runs there.
    expect(graph.used.get('Adjustment Consol')).toEqual({ top: 1, left: 1, bottom: 177, right: 12 });
    expect(dependentsOf(graph, 'Adjustment Consol', 'I50')).toContainEqual({ sheet: 'Adjustment Consol', a: 'I2' });
    expect(dependentsOf(graph, 'Adjustment Consol', 'I177')).toContainEqual({ sheet: 'Adjustment Consol', a: 'I2' });
    expect(dependentsOf(graph, 'Adjustment Consol', 'I178')).toEqual([]);
  });

  it('grows a sheet past its cells with a value to every cell a formula names, so a jump lands on that cell', () => {
    // The four sheets a formula reads past their dimension, and how far.
    const grown = book.sheets.flatMap((s) => {
      const u = graph.used.get(s.name)!;
      const end = encodeA1(u.right, u.bottom);
      return s.dimension.endsWith(`:${end}`) ? [] : [`${s.name}: ${s.dimension} to ${end}`];
    });
    expect(grown).toEqual([
      'Consol SoFP 24: B3:AJ120 to AM120',
      'Consol SoFP 23 & 22: B3:BH120 to IY165',
      'Consol SoPL-OCI 23 & 22: A3:BF105 to CD109',
      'Adjustment Consol: A2:L96 to L177',
    ]);
    // Capital Proforma Control!D82 reads 'Consol SoFP 23 & 22'!K131, an empty cell past row 120.
    expect(precedentsOf(graph, 'Capital Proforma Control', 'D82')).toMatchObject([{ sheet: 'Consol SoFP 23 & 22', ref: 'K131' }]);
    const sheet = book.sheets.find((s) => s.name === 'Consol SoFP 23 & 22')!;
    expect(sheet.cells.some((c) => c.a === 'K131')).toBe(false);
    const model = buildSheetModel(sheet, book.styles, graph.used.get(sheet.name));
    expect(snap(model, { col: 11, row: 131 })).toEqual({ col: 11, row: 131 });
    expect(dependentsOf(graph, 'Consol SoFP 23 & 22', 'K131')).toEqual([{ sheet: 'Capital Proforma Control', a: 'D82' }]);
    // Without the used part, the grid would end at row 120 and the jump land on K120.
    expect(snap(buildSheetModel(sheet, book.styles), { col: 11, row: 131 })).toEqual({ col: 11, row: 120 });
    // Every cell a formula names on a published sheet is inside its grid.
    for (const s of book.sheets) {
      for (const [, read] of graph.precedents.get(s.name)!) {
        for (const p of read) {
          const u = graph.used.get(p.sheet);
          if (u) expect(contains(u, p.left, p.top), `${p.sheet}!${p.ref}`).toBe(true);
        }
      }
    }
  });

  it('lists the same dependents as a plain walk over the file, for every filled cell of three sheets', () => {
    for (const name of ['Consol SoFP 24', 'Elimination 2024', 'SOCE']) {
      const sheet = book.sheets.find((s) => s.name === name)!;
      for (const c of sheet.cells) expect(dependentsOf(graph, name, c.a), `${name}!${c.a}`).toEqual(readers(name, c.a));
    }
  });

  it('reads a cell once however often a formula names it, bounds whole columns and rows, and names an unknown sheet as written', () => {
    const cells: WorkbookCell[] = [
      { a: 'A1', v: 1 },
      { a: 'B1', v: 2, f: 'A1+A1+SUM(A1:A2)' },
      { a: 'A2', v: 3 },
      { a: 'B2', v: 4, f: 'SUM(A:A)' },
      { a: 'B3', v: 5, f: 'SUM(2:2)+Gone!A1+Nowhere!A1' },
    ];
    const tiny: PublishedWorkbook = {
      ...book,
      excluded: [{ name: 'Gone', order: 2, reason: 'hidden' }],
      sheets: [{ ...book.sheets[0], name: 'Only', dimension: 'A1:C4', cells }],
    };
    const g = buildRefGraph(tiny);
    expect(precedentsOf(g, 'Only', 'B1').map((p) => p.ref)).toEqual(['A1', 'A1:A2']);
    expect(dependentsOf(g, 'Only', 'A1')).toEqual([{ sheet: 'Only', a: 'B1' }, { sheet: 'Only', a: 'B2' }]);
    expect(dependentsOf(g, 'Only', 'A4')).toEqual([{ sheet: 'Only', a: 'B2' }]);
    expect(dependentsOf(g, 'Only', 'A5')).toEqual([]);
    expect(dependentsOf(g, 'Only', 'C2')).toEqual([{ sheet: 'Only', a: 'B3' }]);
    expect(dependentsOf(g, 'Only', 'D2')).toEqual([]);
    expect(precedentsOf(g, 'Only', 'B3').map(({ sheet, status, local, ref }) => ({ sheet, status, local, ref }))).toEqual([
      { sheet: 'Only', status: 'published', local: true, ref: '2:2' },
      { sheet: 'Gone', status: 'excluded', local: false, ref: 'A1' },
      { sheet: 'Nowhere', status: 'unknown', local: false, ref: 'A1' },
    ]);
  });
});
