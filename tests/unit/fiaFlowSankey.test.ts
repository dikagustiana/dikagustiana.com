/**
 * docs/prd/2026-10-fia-fixes item 5: the full flow of the income statement,
 * across the four published coal packages. Every ribbon is positive and both
 * sides of every step add up, whichever way a figure runs.
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/fia-published-coal.json';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { flowSankey, hasFlowMap, layoutFlow, matchSides, type FlowNode } from '@/lib/finance-in-action/flowSankey';

const PKGS = fixture.packages as unknown as ModelPackage[];
const pkg = (t: string) => PKGS.find((p) => p.meta.ticker === t)!;
const flowOf = (t: string, period: string) => {
  const wb = new Workbook(pkg(t));
  return flowSankey(wb, wb.values(), period);
};
const node = (m: ReturnType<typeof flowOf>, id: string) => m.nodes.find((n) => n.id === id);

describe('the full flow', () => {
  it('ADRO FY 25: the four columns, in US$ thousand', () => {
    const m = flowOf('ADRO', 'FY25');
    expect(m).toMatchObject({ available: true, unit: 'US$ thousand', revenue: 1873528 });
    expect(m.nodes.filter((n) => n.column === 0).map((n) => [n.id, n.value])).toEqual([
      ['rev_coal', 966340],
      ['rev_services', 865287],
      ['rev_other', 41901],
    ]);
    expect(m.nodes.filter((n) => n.column === 2 && n.kind === 'cost').map((n) => n.id)).toEqual(['mining', 'processing', 'freight', 'royalty', 'da', 'services_cost', 'other_cost']);
    expect(node(m, 'gross_profit')!.value).toBe(636636);
    expect(node(m, 'owners')!.value).toBe(447694);
    // Inventory movement folded into other cost of revenue, its parts listed.
    const other = node(m, 'other_cost')!;
    expect(other.value).toBe(-13248 + 25267);
    expect(other.parts.map((p) => p.label)).toEqual(['Coal inventory movement', 'Cost of revenue, others']);
    // Finance income and the joint ventures add to gross profit; they are not costs.
    expect(node(m, 'finance_income_in')!.value).toBe(97534);
    expect(node(m, 'jv_share_in')!.value).toBe(15857);
  });

  it.each(PKGS.flatMap((p) => p.periods.filter((x) => !x.forecast).map((x) => [p.meta.ticker, x.id] as const)))('%s %s: positive ribbons, every step balanced', (t, period) => {
    const m = flowOf(t, period);
    if (!m.available) {
      expect(m.reason).toBe('missing');
      return;
    }
    for (const l of m.links) expect(l.value).toBeGreaterThan(0);
    for (const n of m.nodes) expect(n.value, n.id).toBeGreaterThan(0);
    // Into and out of every node that has both, the same total.
    for (const n of m.nodes) {
      const ins = m.links.filter((l) => l.to === n.id).reduce((s, l) => s + l.value, 0);
      const outs = m.links.filter((l) => l.from === n.id).reduce((s, l) => s + l.value, 0);
      if (ins && outs) expect(ins, `${t} ${period} ${n.id}`).toBeCloseTo(outs, 3);
      expect(Math.max(ins, outs), `${t} ${period} ${n.id}`).toBeCloseTo(n.value, 3);
    }
    const l = layoutFlow(m);
    expect(l.nodes).toHaveLength(m.nodes.length);
  });

  it('a cost that is a credit in the period becomes a node on the way in, never a negative width (ADRO 24Q3)', () => {
    const m = flowOf('ADRO', '24Q3');
    const credit = node(m, 'other_cost_credit')!;
    expect(credit).toMatchObject({ column: 1, kind: 'credit', value: 21653 - 5523 });
    expect(node(m, 'other_cost')).toBeUndefined();
  });

  it('PTBA reads in its own rupiah', () => {
    expect(flowOf('PTBA', 'FY25')).toMatchObject({ available: true, unit: 'Rp million', revenue: 42651724 });
  });

  it('is mapped for the published coal packages only', () => {
    expect(PKGS.every(hasFlowMap)).toBe(true);
    expect(hasFlowMap({ ...pkg('ADRO'), meta: { ...pkg('ADRO').meta, ticker: 'ZZZZ' } })).toBe(false);
  });
});

describe('matchSides', () => {
  const n = (id: string, value: number) => ({ id, value }) as FlowNode;
  it('links overlapping intervals of the two stacks', () => {
    expect(matchSides([n('a', 5), n('b', 5)], [n('x', 3), n('y', 7)])).toEqual([
      { from: 'a', to: 'x', value: 3 },
      { from: 'a', to: 'y', value: 2 },
      { from: 'b', to: 'y', value: 5 },
    ]);
  });
});
