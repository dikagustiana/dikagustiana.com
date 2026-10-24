/**
 * docs/prd/2026-10-fia-fixes item 3: the value chain reads the published coal
 * packages by canonical identity and row role, and says "not disclosed" where
 * a quarter carries no volume.
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/fia-published-coal.json';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { hasValueChain, valueChain } from '@/lib/finance-in-action/valueChain';

const pkg = (t: string) => (fixture.packages as unknown as ModelPackage[]).find((p) => p.meta.ticker === t)!;
const chainOf = (t: string, period: string) => {
  const wb = new Workbook(pkg(t));
  return valueChain(wb, wb.values(), period)!;
};
const cell = (c: ReturnType<typeof chainOf>, id: string) => [...c.stages.flatMap((s) => s.cells), ...c.branch].find((x) => x.def.id === id)!;

describe('the value chain', () => {
  it('is mapped for coal production and for nothing else yet', () => {
    expect(hasValueChain(pkg('ADRO'))).toBe(true);
    expect(hasValueChain({ ...pkg('ADRO'), meta: { ...pkg('ADRO').meta, subIndustry: 'B121' } })).toBe(false);
  });

  it('reads ADRO FY 25 from the mine to the result, with mining services as a branch', () => {
    const c = chainOf('ADRO', 'FY25');
    expect(c.stages.map((s) => s.def.title)).toEqual(['Mine', 'Haul & process', 'Sell', 'To the state', 'Result']);
    expect(c.quarterly).toBe(false);
    expect(cell(c, 'ob').value).toBe(26.33);
    expect(cell(c, 'strip').value).toBeCloseTo(3.5533, 4);
    expect(cell(c, 'mining').value).toBe(168021);
    expect(cell(c, 'volume').value).toBe(6.28);
    expect(cell(c, 'royalty').value).toBeCloseTo(0.1289, 4);
    expect(cell(c, 'gross_profit')).toMatchObject({ label: 'Coal gross profit', value: 416686 });
    expect(cell(c, 'owners').value).toBe(447694);
    expect(cell(c, 'services').value).toBe(865287);
  });

  it('in a quarter without a volume, the per-tonne cells are missing (not disclosed quarterly), the money cells are not', () => {
    const c = chainOf('ADRO', '26Q2');
    expect(c.quarterly).toBe(true);
    expect(c.priorPeriod?.id).toBe('25Q2');
    for (const id of ['ob', 'strip', 'cost_bcm', 'volume', 'price']) expect(cell(c, id).state, id).toBe('missing');
    expect(cell(c, 'mining').state).toBe('ok');
  });

  it('sums the lines one identity covers, and marks what a company does not split out', () => {
    const c = chainOf('PTBA', 'FY25');
    expect(cell(c, 'mining').value).toBe(12982411 + 3713992);
    expect(cell(c, 'processing').state).toBe('absent');
    expect(cell(c, 'services').state).toBe('absent');
    expect(cell(c, 'gross_profit').label).toBe('Gross profit');
  });
});
