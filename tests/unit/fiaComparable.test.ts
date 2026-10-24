/**
 * docs/prd/2026-10-fia-fixes item 4: lines compared on a canonical identity
 * (canonical.ts), across the four published coal packages, with PTBA's
 * rupiah converted (fx.ts). The rate is a test number, not Bank Indonesia's.
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/fia-published-coal.json';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import {
  CANONICAL,
  PUBLISHED_MAP,
  ROW_ROLES,
  canonicalOf,
  comparable,
  comparedValue,
  currencyOf,
  isResolved,
  peerFigure,
  perUnitOwn,
  roleValue,
} from '@/lib/finance-in-action/canonical';
import { perUnitInPackage } from '@/lib/finance-in-action/unitEconomics';
import type { FxRate } from '@/lib/finance-in-action/fx';

const PKGS = fixture.packages as unknown as ModelPackage[];
const pkg = (t: string) => PKGS.find((p) => p.meta.ticker === t)!;
const RATES: FxRate[] = [{ periodId: 'FY25', from: 'USD', to: 'IDR', rate: 16_000, basis: 'average', source: 'TEST', sourceUrl: 'https://example.test' }];

describe('every published package resolves', () => {
  it.each(PKGS.map((p) => [p.meta.ticker, p] as const))('%s: every unit-economics line is listed', (_t, p) => {
    for (const line of p.unitEconomics.lines) expect(isResolved(p, line), `${p.meta.ticker} ${line.id}`).toBe(true);
  });

  it.each(PKGS.map((p) => [p.meta.ticker, p] as const))('%s: every listed line and row exists in the package', (_t, p) => {
    const map = PUBLISHED_MAP[p.meta.subIndustry][p.meta.ticker];
    const ids = new Set(p.unitEconomics.lines.map((l) => l.id));
    for (const id of Object.keys(map.lines)) expect(ids.has(id), `${p.meta.ticker} line ${id}`).toBe(true);
    const rows = new Set(p.sheets.find((s) => s.id === 'model')!.rows.map((r) => r.id));
    for (const [role, list] of Object.entries(map.rows)) {
      expect(ROW_ROLES).toContain(role);
      for (const id of list!) expect(rows.has(id), `${p.meta.ticker} ${role} ${id}`).toBe(true);
    }
  });

  it('maps only to the canonical list', () => {
    for (const p of PKGS) for (const line of p.unitEconomics.lines) {
      const c = canonicalOf(p, line);
      if (c !== null) expect(CANONICAL).toContain(c);
    }
  });

  it('the listed rows reconcile: profit to owners is gross profit and the lines below it', () => {
    for (const p of PKGS) {
      const v = (r: (typeof ROW_ROLES)[number]) => roleValue(p, r, 'FY25') ?? 0;
      const owners = v('gross_profit_total') - v('opex') + v('other_net') + v('finance_income') - v('finance') + v('jv_share') - v('tax') - v('minority');
      expect(owners, p.meta.ticker).toBeCloseTo(v('owners'), 0);
    }
  });
});

describe('comparable', () => {
  it('ADRO and PTBA per tonne: no longer null, PTBA in US dollars', () => {
    const adro = pkg('ADRO');
    const ptba = pkg('PTBA');
    expect(currencyOf(ptba)).toBe('Rp');
    const cmp = comparable(adro, ptba, 'royalty', RATES);
    expect(cmp.ok).toBe(true);
    const own = perUnitOwn(ptba, 'royalty', 'FY25')!;
    expect(own).toBeCloseTo(4_322_659 / 45.43, 3);
    expect(comparedValue(ptba, 'royalty', 'FY25', RATES, adro)).toBeCloseTo(own / 16_000, 6);
    expect(comparedValue(ptba, 'revenue', 'FY25', RATES, adro)).toBeCloseTo(42_651_724 / 45.43 / 16_000, 6);
  });

  it('PTBA without a rate for the period is null, never its rupiah figure', () => {
    expect(comparedValue(pkg('PTBA'), 'royalty', 'FY25', [], pkg('ADRO'))).toBeNull();
    expect(comparedValue(pkg('PTBA'), 'royalty', '26Q2', RATES, pkg('ADRO'))).toBeNull();
  });

  it('ITMG: its line ids differ from ADRO\'s, and the identity resolves them', () => {
    const adro = pkg('ADRO');
    const itmg = pkg('ITMG');
    expect(itmg.unitEconomics.lines.some((l) => l.id === 'contractor')).toBe(false);
    // ADRO's mining is contractor-and-fuel; ITMG's is mining costs plus fuel.
    expect(comparedValue(itmg, 'mining', 'FY25', RATES, adro)).toBeCloseTo((658_760 + 20_626) / 24.7 / 1000, 6);
    expect(comparedValue(itmg, 'freight', 'FY25', RATES, adro)).toBeCloseTo(71_751 / 24.7 / 1000, 6);
  });

  it('INDY carries no mining line of its own: not comparable, not zero', () => {
    expect(comparable(pkg('ADRO'), pkg('INDY'), 'mining', RATES)).toMatchObject({ ok: false, reason: 'no-line' });
    expect(comparedValue(pkg('INDY'), 'mining', 'FY25', RATES, pkg('ADRO'))).toBeNull();
    expect(comparedValue(pkg('INDY'), 'royalty', 'FY25', RATES, pkg('ADRO'))).toBeCloseTo(289_591.296 / 30.8 / 1000, 6);
  });

  it('the strip ratio is compared as stored, without conversion', () => {
    expect(comparedValue(pkg('PTBA'), 'strip_ratio', 'FY25', [], pkg('ADRO'))).toBeCloseTo(6.07, 9);
    expect(comparedValue(pkg('ADRO'), 'strip_ratio', 'FY25', [], pkg('PTBA'))).toBeCloseTo(3.5533, 4);
  });

  it('perUnitInPackage applies the conversion it is given', () => {
    const toUsd = (v: number | null) => (v === null ? null : v / 16_000);
    expect(perUnitInPackage(pkg('PTBA'), 'royalty', 'FY25', toUsd)).toBeCloseTo(4_322_659 / 45.43 / 16_000, 6);
  });
});

describe('peerFigure: the peer columns of the unit-economics table', () => {
  const line = (p: ModelPackage, id: string) => p.unitEconomics.lines.find((l) => l.id === id)!;

  it('on ADRO\'s page, PTBA\'s royalty is drawn in US dollars', () => {
    const adro = pkg('ADRO');
    expect(peerFigure(adro, line(adro, 'royalty'), pkg('PTBA'), 'FY25', RATES)).toEqual({ value: expect.closeTo(4_322_659 / 45.43 / 16_000, 6), currency: 'US$' });
    expect(peerFigure(adro, line(adro, 'contractor'), pkg('ITMG'), 'FY25', RATES).value).toBeCloseTo((658_760 + 20_626) / 24.7 / 1000, 6);
  });

  it('on PTBA\'s page, ADRO stays in US dollars and is not converted', () => {
    const ptba = pkg('PTBA');
    expect(peerFigure(ptba, line(ptba, 'royalty'), pkg('ADRO'), 'FY25', [])).toEqual({ value: expect.closeTo(124_555 / 6.28 / 1000, 6), currency: 'US$' });
  });

  it('a line with no identity compares with nothing', () => {
    const ptba = pkg('PTBA');
    expect(peerFigure(ptba, line(ptba, 'opex'), pkg('ITMG'), 'FY25', RATES).value).toBeNull();
  });
});

describe('the key-figure period', () => {
  it('orders period ids by the month they end', async () => {
    const { periodEnd } = await import('@/lib/finance-in-action/keyFigures');
    expect(periodEnd('FY25')).toBe(periodEnd('25Q4'));
    expect(periodEnd('26Q2')).toBeGreaterThan(periodEnd('FY25'));
    expect(periodEnd('24Q4')).toBeLessThan(periodEnd('FY25'));
    expect(periodEnd('26Q3E')).toBeGreaterThan(periodEnd('26Q2'));
    expect(periodEnd('H1 26')).toBe(-1);
  });
});

describe('the source column, abbreviated (item 4)', () => {
  it('names each document by the month it closes, and the note', async () => {
    const { abbreviateSources, documentShort } = await import('@/lib/finance-in-action/model/explain');
    expect(documentShort('Interim Consolidated Financial Statements 31 March 2026 and 31 December 2025')).toBe('Q1 26');
    expect(documentShort('Consolidated Financial Statements 31 December 2025 and 2024')).toBe('FY 25');
    expect(documentShort('Alamtri Resources Indonesia FY25 Public Expose')).toBeNull();
    const at = (document: string, period: string, note?: string) => ({ key: '', label: '', period: '', source: { issuer: 'ADRO', document, period, note } });
    expect(
      abbreviateSources([
        at('Interim Consolidated Financial Statements 31 March 2026 and 31 December 2025', 'Q1 2025 (comparative)', '26'),
        at('Interim Consolidated Financial Statements 30 June 2026 and 31 December 2025', 'H1 2025 (comparative)', '27'),
        at('Interim Consolidated Financial Statements 30 September 2025 and 31 December 2024', '9M 2025', '27'),
        at('Consolidated Financial Statements 31 December 2025 and 2024', 'FY 2025', '27'),
        at('Consolidated Financial Statements 31 December 2025 and 2024', 'FY 2025', '27'),
      ]),
    ).toBe('Q1 26 n.26 · H1 26 n.27 · 9M 25 n.27 · FY 25 n.27');
  });
});

describe('the grouped bar (item 4)', () => {
  it('ADRO and its three peers in ticker order, PTBA converted, a gap where a company has no line', async () => {
    const { groupedBars } = await import('@/lib/finance-in-action/canonical');
    const b = groupedBars(pkg('ADRO'), PKGS, 'FY25', RATES)!;
    expect(b.companies.map((c) => [c.ticker, c.self, c.converted])).toEqual([
      ['ADRO', true, null],
      ['INDY', false, null],
      ['ITMG', false, null],
      ['PTBA', false, 'Rp'],
    ]);
    expect(b.groups.map((g) => g.canonical)).toEqual(['revenue', 'mining', 'freight', 'royalty', 'processing', 'da', 'gross_profit', 'strip_ratio']);
    const mining = b.groups.find((g) => g.canonical === 'mining')!;
    expect(mining.values[1]).toBeNull();
    expect(mining.values[3]).toBeCloseTo((12_982_411 + 3_713_992) / 45.43 / 16_000, 6);
    expect(b.groups.find((g) => g.canonical === 'strip_ratio')!.unit).toBe('x');
    // Without a rate PTBA is a gap, never its rupiah figure.
    expect(groupedBars(pkg('ADRO'), PKGS, 'FY25', [])!.groups[0].values[3]).toBeNull();
  });
});
