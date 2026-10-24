/**
 * Finance in Action v3.1, Commit 1: the contract, the fixtures, the slate and
 * the link register, validated against the JSON Schema and against the rules
 * the schema cannot state (brief §3, constraints 6, 7, 9 and 10).
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import packageSchema from '@/lib/finance-in-action/contract/model-package.schema.json';
import linkSchema from '@/lib/finance-in-action/contract/link-register.schema.json';
import type { ModelPackage, UELine } from '@/lib/finance-in-action/contract/types';
import { isMeasured, type IndustryLink } from '@/lib/finance-in-action/contract/links';
import {
  CHAIN_POSITION_IDS,
  checkSubtotals,
  checkUnitEconomicsLines,
  validatePackage,
} from '@/lib/finance-in-action/contract/validate';
import {
  CELL_KINDS,
  DEPTHS,
  GATE_STATUSES,
  PROVENANCES,
  SHEETS,
  STATUSES,
  TIE_OUT_STATUSES,
  UE_LINE_ROLES,
  ids,
} from '@/lib/finance-in-action/constants';
import { FIA_PREVIEW } from '@/lib/finance-in-action/flag';
import { STAGES } from '@/data/industryChain';
import { CONDITIONS } from '@/data/capitalConditions';
import links from '@/data/finance-in-action/links.json';
import subIndustries from '@/data/finance-in-action/sub-industries.json';
import slate from '@/data/finance-in-action/fixtures/slate.json';
import syntheticLinks from '@/data/finance-in-action/fixtures/links.SYNTHETIC.json';
import syntheticSubIndustries from '@/data/finance-in-action/fixtures/sub-industries.SYNTHETIC.json';

const FIXTURES = path.resolve(__dirname, '../../src/data/finance-in-action/fixtures');
const packageFiles = fs.readdirSync(FIXTURES).filter((f) => /^[A-Z0-9]+\.SYNTHETIC\.json$/.test(f));
const packages: ModelPackage[] = packageFiles.map((f) => JSON.parse(fs.readFileSync(path.join(FIXTURES, f), 'utf8')));
const byTicker = Object.fromEntries(packages.map((p) => [p.meta.ticker, p]));

const ajv = new Ajv({ allErrors: true, strict: false });
const validPackage = ajv.compile(packageSchema);
const validLinks = ajv.compile(linkSchema);

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const cells = (pkg: ModelPackage) => pkg.sheets.flatMap((s) => s.rows.flatMap((r) => r.cells));

describe('the preview flag', () => {
  it('is off in tests, as in production', () => {
    expect(FIA_PREVIEW).toBe(false);
  });
});

describe('the contract files', () => {
  it('are marked as a proposal pending owner approval and FSRE P-2', () => {
    const dir = path.resolve(__dirname, '../../src/lib/finance-in-action/contract');
    for (const f of ['types.ts', 'links.ts', 'model-package.schema.json', 'link-register.schema.json']) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      expect(text, f).toMatch(/PROPOSAL v3\.1, pending owner approval and FSRE P-2/);
    }
  });

  it('list each enumeration once: the schema repeats the constants exactly', () => {
    const at = (...keys: string[]) => keys.reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], packageSchema);
    expect(at('properties', 'meta', 'properties', 'status', 'enum')).toEqual(ids(STATUSES));
    expect(at('properties', 'meta', 'properties', 'provenance', 'enum')).toEqual(ids(PROVENANCES));
    expect(at('properties', 'meta', 'properties', 'depth', 'enum')).toEqual(ids(DEPTHS));
    expect(at('properties', 'sheets', 'items', 'properties', 'id', 'enum')).toEqual(ids(SHEETS));
    expect(at('definitions', 'cell', 'properties', 'kind', 'enum')).toEqual(ids(CELL_KINDS));
    expect(at('definitions', 'cell', 'properties', 'tieOut', 'properties', 'status', 'enum')).toEqual(ids(TIE_OUT_STATUSES));
    expect(at('definitions', 'ueLine', 'properties', 'role', 'enum')).toEqual(ids(UE_LINE_ROLES));
    expect(at('properties', 'workpaper', 'properties', 'gates', 'items', 'properties', 'status', 'enum')).toEqual(ids(GATE_STATUSES));
  });

  it('keeps a pass with an open escalation apart from a clean pass', () => {
    expect(ids(GATE_STATUSES)).toContain('passed_with_escalation');
    const labels = GATE_STATUSES.map((g) => g.label);
    expect(new Set(labels).size).toBe(labels.length);
    const glyphs = GATE_STATUSES.map((g) => g.glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('gives every status a glyph and a word, all different (constraint 13)', () => {
    expect(STATUSES.map((s) => s.label)).toEqual(['Published', 'Preview', 'In progress', 'Not started']);
    expect(new Set(STATUSES.map((s) => s.glyph)).size).toBe(STATUSES.length);
  });
});

describe('the synthetic fixtures', () => {
  it('are four packages, each labelled SYNTHETIC in its file name and its data', () => {
    expect(packageFiles.sort()).toEqual(['SCEM.SYNTHETIC.json', 'SCOA.SYNTHETIC.json', 'XCEM.SYNTHETIC.json', 'XCOA.SYNTHETIC.json']);
    for (const p of packages) {
      expect(p.meta.provenance).toBe('synthetic');
      expect(p.meta.version).toContain('SYNTHETIC');
      expect(p.meta.name).toContain('SYNTHETIC');
    }
  });

  it.each(packageFiles)('%s matches the JSON Schema', (file) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(FIXTURES, file), 'utf8'));
    const ok = validPackage(pkg);
    expect(validPackage.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it.each(packageFiles)('%s passes the package rules', (file) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(FIXTURES, file), 'utf8'));
    expect(validatePackage(pkg)).toEqual([]);
  });

  it.each(packageFiles)('%s carries the SHA-256 of its own content', (file) => {
    const pkg: ModelPackage = JSON.parse(fs.readFileSync(path.join(FIXTURES, file), 'utf8'));
    const hash = pkg.meta.contentHash;
    pkg.meta.contentHash = '';
    expect(createHash('sha256').update(JSON.stringify(pkg)).digest('hex')).toBe(hash);
  });

  it('put two published companies in one invented sub-industry, each the other’s pair', () => {
    const { XCOA, SCOA } = byTicker;
    expect(XCOA.meta.subIndustry).toBe(SCOA.meta.subIndustry);
    expect(XCOA.meta.subIndustry).toMatch(/^SYN-/);
    expect([XCOA.meta.status, SCOA.meta.status]).toEqual(['published', 'published']);
    expect(XCOA.meta.pair).toEqual(['SCOA']);
    expect(SCOA.meta.pair).toEqual(['XCOA']);
  });

  it('run eight reported quarters, one financial year and two forecast quarters', () => {
    for (const p of packages) {
      const q = p.periods.filter((x) => x.kind === 'quarter');
      expect(q.filter((x) => !x.forecast)).toHaveLength(8);
      expect(p.periods.filter((x) => x.kind === 'fy')).toHaveLength(1);
      expect(q.filter((x) => x.forecast)).toHaveLength(2);
    }
  });

  it('use every cell kind, including missing cells', () => {
    const kinds = new Set(packages.flatMap((p) => cells(p).map((c) => c.kind)));
    expect([...kinds].sort()).toEqual(ids(CELL_KINDS).sort());
    for (const t of ['XCOA', 'SCOA']) {
      expect(new Set(cells(byTicker[t]).map((c) => c.kind)).size, t).toBe(CELL_KINDS.length);
    }
  });

  it('carry one tie-out that agrees and one that differs', () => {
    const ties = cells(byTicker.XCOA).flatMap((c) => (c.tieOut ? [c.tieOut.status] : []));
    expect(ties.sort()).toEqual(['agrees', 'differs']);
  });

  it('give both coal companies unit economics with three or more named, driven cost lines, an unsplit remainder and two subtotals', () => {
    for (const t of ['XCOA', 'SCOA']) {
      const lines = byTicker[t].unitEconomics.lines;
      const named = lines.filter((l) => l.role === 'cost' && l.driver);
      expect(named.length).toBeGreaterThanOrEqual(3);
      const unsplit = lines.filter((l) => l.role === 'unsplit');
      expect(unsplit).toHaveLength(1);
      expect(unsplit[0].contains?.length).toBeGreaterThan(0);
      expect(lines.filter((l) => l.role === 'subtotal').map((l) => l.id)).toEqual(['gross_profit', 'operating_profit']);
    }
  });

  it('include a company whose volume row is missing in every period (constraint 9)', () => {
    const { XCEM } = byTicker;
    const ref = XCEM.unitEconomics.denominatorRowRef;
    const [sheet, rowId] = ref.split('!');
    const row = XCEM.sheets.find((s) => s.id === sheet)!.rows.find((r) => r.id === rowId)!;
    expect(row.cells.every((c) => c.kind === 'missing' && c.value === null)).toBe(true);
  });

  it('sit on chain stages from the chain map and on section 05 conditions', () => {
    const stageIds = STAGES.map((s) => s.id);
    for (const p of packages) {
      expect(stageIds).toContain(p.meta.chainStage);
      expect(p.meta.conditionIds.length).toBeGreaterThan(0);
    }
  });

  it('store no per-tonne figure as a sourced number (constraint 7)', () => {
    for (const p of packages) {
      for (const s of p.sheets) {
        for (const r of s.rows) {
          if (/per tonne/.test(r.unit)) expect(r.cells.some((c) => c.kind === 'sourced'), `${p.meta.ticker} ${s.id}!${r.id}`).toBe(false);
        }
      }
    }
  });

  it('read every peer-band value from its row', () => {
    for (const p of packages) {
      expect(p.peerBand.length).toBeGreaterThan(0);
      for (const e of p.peerBand) expect(e.rowRef).toBeTruthy();
    }
  });
});

describe('the unit-economics rules (brief §3)', () => {
  const base = (): UELine[] => clone(byTicker.XCOA.unitEconomics.lines);

  it('accept the fixture lines', () => {
    expect(checkUnitEconomicsLines(base())).toEqual([]);
  });

  it('require exactly one revenue line, first', () => {
    const none = base().filter((l) => l.role !== 'revenue');
    expect(checkUnitEconomicsLines(none).join()).toMatch(/exactly one revenue line/);
    const moved = base();
    moved.push(moved.shift()!);
    expect(checkUnitEconomicsLines(moved).join()).toMatch(/must come first/);
    const two = base();
    two.splice(1, 0, { ...two[0], id: 'revenue_2' });
    expect(checkUnitEconomicsLines(two).join()).toMatch(/exactly one revenue line, found 2/);
  });

  it('require a cost line before the first subtotal', () => {
    const lines = base().filter((l, i) => !(l.role === 'cost' && i < 6));
    expect(checkUnitEconomicsLines(lines).join()).toMatch(/at least one cost line before the first subtotal/);
  });

  it('allow at most one unsplit line per subtotal, and only with contains', () => {
    const two = base();
    const unsplit = two.find((l) => l.role === 'unsplit')!;
    two.splice(two.indexOf(unsplit), 0, { ...unsplit, id: 'other_2' });
    expect(checkUnitEconomicsLines(two).join()).toMatch(/more than one unsplit line/);
    const bare = base();
    delete bare.find((l) => l.role === 'unsplit')!.contains;
    expect(checkUnitEconomicsLines(bare).join()).toMatch(/must list what it contains/);
    const wrong = base();
    wrong[1].contains = ['anything'];
    expect(checkUnitEconomicsLines(wrong).join()).toMatch(/only an unsplit line may carry contains/);
  });

  it('allow one unsplit line under each of two subtotals', () => {
    const lines = base();
    const sga = lines.findIndex((l) => l.id === 'sga');
    lines.splice(sga + 1, 0, { id: 'other_opex', label: 'Other operating items', role: 'unsplit', rowRef: 'model!other_net', contains: ['x'] });
    expect(checkUnitEconomicsLines(lines)).toEqual([]);
  });

  it('check each subtotal against revenue less the lines above it, from the rows', () => {
    expect(checkSubtotals(byTicker.XCOA)).toEqual([]);
    const pkg = clone(byTicker.XCOA);
    const fy = pkg.periods.findIndex((p) => p.id === 'FY25');
    const gp = pkg.sheets.find((s) => s.id === 'model')!.rows.find((r) => r.id === 'gross_profit')!;
    gp.cells[fy].value = (gp.cells[fy].value as number) + 10;
    expect(checkSubtotals(pkg).join()).toMatch(/gross_profit in FY25/);
  });

  it('tolerate rounding within half a unit per value', () => {
    const pkg = clone(byTicker.XCOA);
    const fy = pkg.periods.findIndex((p) => p.id === 'FY25');
    const gp = pkg.sheets.find((s) => s.id === 'model')!.rows.find((r) => r.id === 'gross_profit')!;
    gp.cells[fy].value = (gp.cells[fy].value as number) + 0.4;
    expect(checkSubtotals(pkg)).toEqual([]);
  });
});

describe('the package rules beyond the schema', () => {
  it('reject a sourced per-tonne figure (constraint 7)', () => {
    const pkg = clone(byTicker.XCOA);
    const price = pkg.sheets.find((s) => s.id === 'model')!.rows.find((r) => r.id === 'price')!;
    price.cells[0] = { value: 800, kind: 'sourced', source: { issuer: 'x', document: 'y', period: 'Q1 24' } };
    expect(validatePackage(pkg).map((i) => i.message).join()).toMatch(/per-tonne figure must be a formula/);
  });

  it('reject a chain stage that is not in the chain map, and a condition not in section 05 (constraint 6)', () => {
    const pkg = clone(byTicker.XCOA);
    pkg.meta.chainStage = 'stage-raw-material-extraction';
    pkg.meta.conditionIds = [99];
    const messages = validatePackage(pkg).map((i) => i.message).join();
    expect(messages).toMatch(/not a chain map stage/);
    expect(messages).toMatch(/condition 99 is not in section 05/);
  });

  it('accept the two spanning layers as a chain position', () => {
    expect(CHAIN_POSITION_IDS).toEqual(expect.arrayContaining(['band-energy', 'band-logistics']));
  });

  it('accept the distributor and modern trade nodes as a chain position (FIA factory v1, X5), and no other node', () => {
    expect(CHAIN_POSITION_IDS).toEqual(expect.arrayContaining(['node-distributor', 'node-retail-modern']));
    expect(CHAIN_POSITION_IDS.filter((id) => id.startsWith('node-'))).toEqual(['node-distributor', 'node-retail-modern']);
    const pkg = clone(byTicker.XCOA);
    pkg.meta.chainStage = 'node-retail-modern';
    expect(validatePackage(pkg).map((i) => i.message).join()).not.toMatch(/chain map stage/);
    pkg.meta.chainStage = 'node-wholesaler';
    expect(validatePackage(pkg).map((i) => i.message).join()).toMatch(/not a chain map stage/);
  });

  it('reject a row with the wrong number of cells, and an unresolved row reference', () => {
    const pkg = clone(byTicker.XCOA);
    pkg.sheets[0].rows[0].cells.pop();
    pkg.unitEconomics.denominatorRowRef = 'model!nope';
    const messages = validatePackage(pkg).map((i) => i.message).join();
    expect(messages).toMatch(/cells for 11 periods/);
    expect(messages).toMatch(/model!nope does not name a row/);
  });

  it('reject an assumption in a reported period and a missing cell with a value', () => {
    const pkg = clone(byTicker.XCOA);
    const row = pkg.sheets.find((s) => s.id === 'assumptions')!.rows[0];
    row.cells[0] = { value: 1, kind: 'assumption' };
    row.cells[1] = { value: 1, kind: 'missing' };
    const messages = validatePackage(pkg).map((i) => i.message).join();
    expect(messages).toMatch(/assumptions belong to forecast periods only/);
    expect(messages).toMatch(/a missing cell has no value/);
  });

  it('reject a synthetic package that does not say so', () => {
    const pkg = clone(byTicker.XCOA);
    pkg.meta.version = 'XCOA-2025Q4-r1';
    expect(validatePackage(pkg).map((i) => i.path)).toContain('meta.version');
  });

  it('reject a peer-band value that is not its row’s', () => {
    const pkg = clone(byTicker.XCOA);
    pkg.peerBand[0].value = (pkg.peerBand[0].value as number) + 100;
    expect(validatePackage(pkg).map((i) => i.path)).toContain('peerBand[0]');
  });
});

describe('the slate', () => {
  it('lists PTBA, ITMG, INDY, ADRO, INTP, SMGR, BREN and PGEO (D-M5, chain view), then the FIA factory’s 32 (spec v1, A1), as not started, with no figures at all', () => {
    expect(slate.companies.slice(0, 8).map((c) => c.ticker)).toEqual(['PTBA', 'ITMG', 'INDY', 'ADRO', 'INTP', 'SMGR', 'BREN', 'PGEO']);
    const factory = slate.companies.slice(8);
    expect(factory).toHaveLength(32);
    // Two per sub-industry, sixteen sub-industries, each listed by the section.
    const bySub = new Map<string, string[]>();
    for (const c of factory) bySub.set(c.subIndustry, [...(bySub.get(c.subIndustry) ?? []), c.ticker]);
    expect(bySub.size).toBe(16);
    for (const [code, tickers] of bySub) {
      expect(tickers, code).toHaveLength(2);
      expect(subIndustries.some((s) => s.code === code), code).toBe(true);
    }
    expect(bySub.get('D113')).toEqual(['AMRT', 'MPPA']);
    expect(new Set(slate.companies.map((c) => c.ticker)).size).toBe(slate.companies.length);
    for (const c of slate.companies) {
      expect(c.status).toBe('not_started');
      expect(Object.keys(c).sort()).toEqual(['conditionIds', 'depth', 'name', 'status', 'subIndustry', 'ticker']);
    }
  });

  it('places INDY and ADRO on coal production and BREN on the energy layer, executive, with the conditions of D7 (two ways in, 22 Oct 2026)', () => {
    const at = (ticker: string) => slate.companies.find((c) => c.ticker === ticker);
    expect(at('INDY')).toMatchObject({ subIndustry: 'A121', depth: 'executive', conditionIds: [3, 8] });
    expect(at('ADRO')).toMatchObject({ subIndustry: 'A121', depth: 'executive', conditionIds: [3, 9] });
    expect(at('BREN')).toMatchObject({ depth: 'executive', conditionIds: [4, 6] });
    // D-M5 (chain view PRD, 22 Oct 2026): PGEO beside BREN on J411, so the peer band can be drawn.
    expect(at('PGEO')).toMatchObject({ subIndustry: 'J411', status: 'not_started', depth: 'executive', conditionIds: [4, 6] });
    expect(subIndustries.find((s) => s.code === at('BREN')?.subIndustry)).toMatchObject({ chainStage: 'band-energy', unit: 'MWh' });
    const conditions = new Set(CONDITIONS.map((c) => c.number));
    for (const c of slate.companies) for (const n of c.conditionIds) expect(conditions.has(n), `${c.ticker} condition ${n}`).toBe(true);
  });

  it('places every company in a known sub-industry on a chain-map stage', () => {
    const codes = subIndustries.map((s) => s.code);
    for (const c of slate.companies) expect(codes).toContain(c.subIndustry);
    for (const s of [...subIndustries, ...syntheticSubIndustries]) expect(CHAIN_POSITION_IDS).toContain(s.chainStage);
    for (const p of packages) expect(syntheticSubIndustries.map((s) => s.code)).toContain(p.meta.subIndustry);
  });
});

describe('the link register', () => {
  it('matches its schema', () => {
    expect(validLinks(links)).toBe(true);
    expect(validLinks(syntheticLinks)).toBe(true);
  });

  it('is seeded with one link, coal to cement, measured on both weights with a source each; intensity and pass-through still unmeasured', () => {
    expect(links).toHaveLength(1);
    const [seed] = links as IndustryLink[];
    expect(seed.whatFlows).toBe('Coal burnt as kiln fuel');
    expect([seed.intensity, seed.passThrough]).toEqual([null, null]);
    for (const w of [seed.costShare!, seed.demandShare!]) {
      expect(w.value).toBeGreaterThan(0);
      expect(w.value).toBeLessThanOrEqual(1);
      expect(w.period).not.toBe('');
      expect(w.source.trim()).not.toBe('');
    }
    expect(seed.caveat).toMatch(
      /^The price a cement plant pays can differ from a coal producer's realised price: calorific value, contract terms and domestic market obligation rules all sit between them\./,
    );
    expect(isMeasured(seed)).toBe(true);
  });

  it('counts a link as measured only when both weights carry a value and a source (constraint 10)', () => {
    const [syn] = syntheticLinks as IndustryLink[];
    expect(isMeasured(syn)).toBe(true);
    expect(isMeasured({ ...syn, demandShare: null })).toBe(false);
    expect(isMeasured({ ...syn, costShare: { ...syn.costShare!, source: ' ' } })).toBe(false);
  });

  it('keeps the synthetic link labelled SYNTHETIC', () => {
    for (const l of syntheticLinks) expect(l.whatFlows).toContain('SYNTHETIC');
  });
});
