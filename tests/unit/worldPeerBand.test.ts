/**
 * The peer band rule (PRD §8.3; mega prompt §8.2): per sub-industry, over
 * published packages of the same period. No peer: nothing. One comparator:
 * two marks, headed "vs one comparator". Three or more companies: a band
 * from min to max with the median. Never a band from two points. A peer of
 * another sub-industry, another status, or without the metric's value does
 * not count.
 */
import { describe, expect, it } from 'vitest';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { COMPARATOR_HEADING, worldPeerBand } from '@/lib/world/peerBand';
import fixture from '@/data/finance-in-action/fixtures/XCEM.SYNTHETIC.json';

const base = fixture as unknown as ModelPackage;
/** A package like the fixture with one peer-band metric at one period, value v (SYNTHETIC: the fixture's own provenance). */
function pkg(ticker: string, v: number | null, o: { sub?: string; status?: ModelPackage['meta']['status']; period?: string } = {}): ModelPackage {
  const period = o.period ?? '25Q4';
  return { ...base, meta: { ...base.meta, ticker, subIndustry: o.sub ?? 'SYN-CEM', status: o.status ?? 'published' }, peerBand: v === null ? [] : [{ metric: 'gross-margin', unit: '%', period, value: v }] } as ModelPackage;
}

describe('the world peer band', () => {
  it('names the heading the PRD gives one comparator', () => { expect(COMPARATOR_HEADING).toBe('vs one comparator'); });

  it('gives nothing without a peer, nothing without the company’s own value', () => {
    expect(worldPeerBand(pkg('AAAA', 40), [pkg('AAAA', 40)])).toEqual([{ kind: 'none', metric: 'gross-margin', unit: '%', period: '25Q4', reason: 'no-peer' }]);
    const own = pkg('AAAA', 40); own.peerBand = [{ metric: 'gross-margin', unit: '%', period: '25Q4', value: null as unknown as number, rowRef: 'is!nope' } as ModelPackage['peerBand'][number]];
    expect(worldPeerBand(own, [own, pkg('BBBB', 30)])[0]).toMatchObject({ kind: 'none', reason: 'no-value' });
  });

  it('two companies are a comparator, never a band', () => {
    const r = worldPeerBand(pkg('AAAA', 40), [pkg('AAAA', 40), pkg('BBBB', 30)]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'comparator', self: { ticker: 'AAAA', value: 40, self: true }, other: { ticker: 'BBBB', value: 30, self: false } });
    expect(r[0]).not.toHaveProperty('min');
  });

  it('three or more are a band from min to max with the median; four give the middle pair’s mean', () => {
    const three = worldPeerBand(pkg('AAAA', 40), [pkg('AAAA', 40), pkg('BBBB', 30), pkg('CCCC', 50)])[0];
    expect(three).toMatchObject({ kind: 'band', min: 30, max: 50, median: 40 });
    expect((three as { points: unknown[] }).points).toHaveLength(3);
    const four = worldPeerBand(pkg('AAAA', 40), [pkg('AAAA', 40), pkg('BBBB', 30), pkg('CCCC', 50), pkg('DDDD', 60)])[0];
    expect(four).toMatchObject({ kind: 'band', min: 30, max: 60, median: 45 });
  });

  it('counts only published packages of the same sub-industry with the metric at the same period', () => {
    const peers = [pkg('AAAA', 40), pkg('BBBB', 30, { sub: 'SYN-OTHER' }), pkg('CCCC', 50, { status: 'preview' }), pkg('DDDD', 55, { period: '25Q3' }), pkg('EEEE', null)];
    expect(worldPeerBand(pkg('AAAA', 40), peers)[0]).toMatchObject({ kind: 'none', reason: 'no-peer' });
    expect(worldPeerBand(pkg('AAAA', 40), [...peers, pkg('FFFF', 45)])[0]).toMatchObject({ kind: 'comparator', other: { ticker: 'FFFF' } });
  });
});
