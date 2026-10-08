/**
 * The data boundary (PRD §8.3, §9.3.4; mega prompt §8): the world and the
 * board run against a client that throws on any write and never trip it;
 * every figure the board shows for a published package maps to a field of
 * that package; a company without a package shows no figure at all; a
 * failed index request reads 'Status unavailable' everywhere, never 'No
 * model yet'; the boundary's own API answers the same way; and a scene
 * builder throws in development if a figure reaches it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { formatDelta, formatNumber, formatPercent } from '@/lib/finance-in-action/format';
import fixture from '@/data/finance-in-action/fixtures/XCEM.SYNTHETIC.json';

const base = fixture as unknown as ModelPackage;
/** The capture script's mock, in the test: the SYNTHETIC cement fixture re-labelled for a placed company (rule 8: a mock, never ships). */
const MOCK: ModelPackage = { ...base, meta: { ...base.meta, ticker: 'INTP', name: 'INTP (SYNTHETIC mock, never ships)', status: 'published', pair: ['SMGR', 'SMCB'] } };

const { writes, fetchMock } = vi.hoisted(() => ({ writes: { count: 0 }, fetchMock: vi.fn<() => Promise<ModelPackage[]>>() }));
vi.mock('@/lib/finance-in-action/published', async (orig) => ({ ...(await orig<object>()), fetchPublishedPackages: () => fetchMock() }));
vi.mock('@/integrations/supabase/client', () => {
  const rows = [{ slug: 'mock-essay', title: 'A mock essay (never ships)', section: 'next-big-thing', date: '2026-09-01', phase: null }];
  const throwing = (name: string) => () => { writes.count++; throw new Error(`write attempted: ${name}`); };
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'limit', 'in', 'is', 'filter', 'range', 'gte', 'lte', 'or']) builder[m] = () => builder;
  for (const m of ['insert', 'update', 'upsert', 'delete', 'rpc']) builder[m] = throwing(m);
  const result = Promise.resolve({ data: rows, error: null });
  (builder as { then: unknown }).then = result.then.bind(result);
  return { supabase: { from: () => builder, rpc: throwing('rpc'), storage: { from: throwing('storage') }, channel: throwing('channel'), auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } };
});

import WorldFrame from '@/components/world/WorldFrame';
import { TOTAL_PLACED } from '@/lib/world/constants';
import { bindStations, getFlowWeights, getModelStatuses, resetPublishedIndex, statusesFrom } from '@/world/data/boundary';
import { assertNoFigure, FIGURE } from '@/world/engine/kernel/part';

function mount(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { writes.count = 0; resetPublishedIndex(); HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']; });
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

/** Every figure a package can put on screen, as the house formatter writes it. */
function allowedFigures(pkg: ModelPackage): Set<string> {
  const out = new Set<string>();
  const add = (v: number | null | undefined) => { if (v === null || v === undefined) return; for (const d of [0, 1, 2]) { out.add(formatNumber(v, d)); out.add(formatDelta(v, d)); } out.add(formatPercent(v, 1)); out.add(formatPercent(v, 0)); out.add(formatNumber(v * 100, 1) + '%'); out.add(String(v)); };
  for (const s of pkg.sheets) for (const r of s.rows) for (const c of r.cells) add(c.value);
  for (const p of pkg.periods) for (const t of p.label.match(/\d+/g) ?? []) out.add(t);
  for (const t of `${pkg.meta.asOf.latestQuarter} ${pkg.meta.asOf.fullStatementsTo} ${pkg.meta.version}`.match(/\d+/g) ?? []) out.add(t);
  for (const n of pkg.meta.conditionIds) { out.add(String(n)); out.add(String(n).padStart(2, '0')); }
  for (const s of pkg.sheets) for (const r of s.rows) for (const c of r.cells) { const src = (c as { source?: { page?: number; note?: string } }).source; if (src?.page) out.add(String(src.page)); if (src?.note) out.add(src.note); }
  for (const e of pkg.peerBand) add(e.value);
  return out;
}
/** Numeric tokens on screen, tickers and codes aside; a bracket or a leading minus is the formatter's negative or a label's punctuation, so the digits are compared. */
const figuresIn = (text: string) => (text.replace(/\b[A-Z]{4}\b/g, ' ').replace(/\b[A-Z]\d{3}\b/g, ' ').match(/-?\d[\d.,]*%?/g) ?? []).map((t) => t.replace(/[.,]$/, '').replace(/^-/, ''));

describe('the data boundary', () => {
  it('the world and the board run against a client that throws on writes, and the index is read once', async () => {
    fetchMock.mockResolvedValue([MOCK]);
    mount(<WorldFrame variant="full" heading="h1" boardTicker="INTP" />);
    await waitFor(() => expect(screen.getByText(`1 of ${TOTAL_PLACED} sub-industries have a published model`)).toBeInTheDocument(), { timeout: 8000 });
    const board = await screen.findByRole('dialog', { name: 'Board: INTP' });
    await waitFor(() => expect(within(board).getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('INTP (SYNTHETIC mock, never ships)'));
    expect(within(board).getByRole('note')).toHaveTextContent(/never ships/);
    expect(writes.count).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // published-only: every figure on the board is a field of the package, written by the house formatter
    const allowed = allowedFigures(MOCK);
    const shown = figuresIn(board.textContent ?? '');
    expect(shown.length).toBeGreaterThan(10);
    expect(shown.filter((t) => !allowed.has(t))).toEqual([]);
  }, 15000);

  it('a company without a package shows no figure, and the think tank reads the essays through the same client', async () => {
    fetchMock.mockResolvedValue([MOCK]);
    mount(<WorldFrame variant="full" heading="h1" boardTicker="SMGR" />);
    const board = await screen.findByRole('dialog', { name: 'Board: SMGR' });
    await waitFor(() => expect(board).toHaveTextContent('No model yet'));
    expect(figuresIn(board.textContent ?? '')).toEqual([]);
    expect(writes.count).toBe(0);
  }, 15000);

  it('an outage reads unavailable everywhere, never absence', async () => {
    fetchMock.mockRejectedValue(new Error('published models answered 503'));
    mount(<WorldFrame variant="full" heading="h1" boardTicker="INTP" />);
    await waitFor(() => expect(screen.getByText('Model status unavailable')).toBeInTheDocument(), { timeout: 8000 });
    const board = await screen.findByRole('dialog', { name: 'Board: INTP' });
    await waitFor(() => expect(board).toHaveTextContent('Status unavailable'));
    expect(board).toHaveTextContent('could not be read just now');
    expect(board).not.toHaveTextContent('No model yet');
    const statuses = statusesFrom(null, true);
    expect([...statuses.values()].every((s) => s.state === 'unavailable')).toBe(true);
    expect(statuses.size).toBeGreaterThan(100);
  }, 15000);

  it('the boundary’s own API: statuses, flows and bindings from one cached request; an outage is unavailable and retried next time', async () => {
    fetchMock.mockResolvedValue([MOCK]);
    const statuses = await getModelStatuses();
    expect(statuses.get('INTP')).toMatchObject({ state: 'published', period: '25Q4' });
    expect(statuses.get('SMGR')).toMatchObject({ state: 'none' });
    expect((await getFlowWeights()).every((f) => ['measured-heavy', 'measured-light', 'expected'].includes(f.cls))).toBe(true);
    const bindings = await bindStations('INTP', () => null);
    expect(bindings.every((b) => b.stationId === null && !FIGURE.test(b.label))).toBe(true);
    expect(await bindStations('SMGR', () => null)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resetPublishedIndex(); fetchMock.mockRejectedValueOnce(new Error('503'));
    expect([...(await getModelStatuses()).values()].every((s) => s.state === 'unavailable')).toBe(true);
    expect((await getModelStatuses()).get('INTP')?.state).toBe('published'); // the failed request was not cached
    resetPublishedIndex(); fetchMock.mockRejectedValueOnce(new Error('503')).mockRejectedValueOnce(new Error('503'));
    expect(await getFlowWeights()).toEqual([]);
    expect(await bindStations('INTP', () => null)).toEqual([]);
  });

  it('a scene builder throws in development when a figure reaches it', () => {
    for (const s of ['Rp 1.300 bn', '49,8%', '1.200', '653 bn', 'USD 12']) expect(() => assertNoFigure(s)).toThrow(/figure reached a scene builder/);
    for (const s of ['Construction Materials', 'ESTATE', 'Export · FX', 'Gate 3', '2 of 2', 'C111', 'Q4 25', 'Think tank']) expect(() => assertNoFigure(s)).not.toThrow();
  });
});
