/**
 * The homepage order before and after its migration. The homepage row is
 * every published essay: the starred ones first in the owner's order, then
 * the rest newest first, cut to the limit (owner decision D3(a),
 * 2026-10-10). Every reader of essays.selected_rank asks for the ranked
 * order first and, when Postgres answers 42703 (the column is not there
 * yet), asks again newest first, so a deploy ahead of migration
 * 20261009140000_essay_selected_rank changes nothing a reader can see. Any
 * other error is still an error. Unstarring clears the rank in the same
 * write, and falls back to the flag alone.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));
vi.mock('@/lib/auditLog', () => ({ logAuditEvent: vi.fn(async () => undefined) }));

import { useSelectedEssays } from '@/hooks/queries/useSelectedEssays';
import { useSelectedOrder, useToggleSelectContent } from '@/hooks/queries/useUnifiedContent';
import { useFeaturedFinanceEssay } from '@/hooks/queries/useFinance';
import { essayRow, essaysTable, type EssayRow } from './helpers/essaysTable';

const MISSING = { code: '42703', message: 'column essays.selected_rank does not exist' };

interface Call { method: string; args: unknown[] }

/** One thenable builder per query; each awaited query takes the next result and records its chain. */
function queries(results: unknown[]) {
  const chains: Call[][] = [];
  fromMock.mockImplementation(() => {
    const calls: Call[] = [];
    chains.push(calls);
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'neq', 'order', 'limit', 'maybeSingle', 'update']) {
      b[m] = (...args: unknown[]) => { calls.push({ method: m, args }); return b; };
    }
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(results.shift()).then(res, rej);
    return b;
  });
  return chains;
}

const orderedBy = (chain: Call[]) => chain.filter((c) => c.method === 'order').map((c) => c.args[0]);

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => fromMock.mockReset());

describe('the homepage order', () => {
  const filters = (chain: Call[]) => chain.filter((c) => c.method === 'eq').map((c) => c.args);
  const slugs = (rows: unknown) => (rows as EssayRow[]).map((r) => r.slug);
  const serve = (rows: EssayRow[], opts?: { rankColumn?: boolean }) => {
    const table = essaysTable(rows, opts);
    fromMock.mockImplementation(table.from);
    return table.chains;
  };

  it('reads the starred in the owner\'s order and the rest newest first, in two queries', async () => {
    const chains = queries([{ data: [{ id: 'a', slug: 'a' }], error: null }, { data: [{ id: 'b', slug: 'b' }], error: null }]);
    const { result } = renderHook(() => useSelectedEssays(30), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'a', slug: 'a' }, { id: 'b', slug: 'b' }]));
    expect(chains).toHaveLength(2);
    expect(filters(chains[0])).toEqual([['is_selected', true], ['published', true]]);
    expect(orderedBy(chains[0])).toEqual(['selected_rank', 'created_at']);
    expect(chains[0].find((c) => c.method === 'order')!.args[1]).toEqual({ ascending: true, nullsFirst: false });
    expect(filters(chains[1])).toEqual([['is_selected', false], ['published', true]]);
    expect(orderedBy(chains[1])).toEqual(['created_at']);
    expect(chains[1].find((c) => c.method === 'order')!.args[1]).toEqual({ ascending: false });
    for (const chain of chains) expect(chain.find((c) => c.method === 'limit')!.args).toEqual([30]);
  });

  it('puts the starred first by rank, an unplaced star after the placed ones, then every other essay newest first', async () => {
    serve([
      essayRow(1, { is_selected: true, selected_rank: 2 }),
      essayRow(2),
      essayRow(3, { is_selected: true, selected_rank: null }),
      essayRow(4, { is_selected: true, selected_rank: 1 }),
      essayRow(5),
      essayRow(6, { published: false }),
      essayRow(7, { is_selected: true, selected_rank: null, day: 0 }),
      essayRow(8, { is_selected: true, published: false, selected_rank: 3 }),
      essayRow(9),
    ]);
    const { result } = renderHook(() => useSelectedEssays(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    // 4 and 1 by rank; 3 then 7, unplaced, newest first; then 9, 5, 2.
    // The drafts (6, and 8 for all its rank) are nowhere.
    expect(slugs(result.current.data)).toEqual(['essay-4', 'essay-1', 'essay-3', 'essay-7', 'essay-9', 'essay-5', 'essay-2']);
  });

  it('carries every published essay with nothing starred, newest first', async () => {
    serve([essayRow(1), essayRow(3), essayRow(2)]);
    const { result } = renderHook(() => useSelectedEssays(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(slugs(result.current.data)).toEqual(['essay-3', 'essay-2', 'essay-1']);
  });

  it('stops at the limit, and the starred are never the ones cut', async () => {
    const rows = Array.from({ length: 40 }, (_, i) => essayRow(i + 1, i % 8 === 0 ? { is_selected: true, selected_rank: 40 - i } : {}));
    serve(rows);
    const { result } = renderHook(() => useSelectedEssays(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const got = result.current.data as unknown as EssayRow[];
    expect(got).toHaveLength(30);
    // five starred (1, 9, 17, 25, 33), lowest rank first, then 25 of the 35 others, newest first
    expect(slugs(got.slice(0, 5))).toEqual(['essay-33', 'essay-25', 'essay-17', 'essay-9', 'essay-1']);
    expect(slugs(got.slice(5, 8))).toEqual(['essay-40', 'essay-39', 'essay-38']);
    expect(slugs(got).at(-1)).toBe('essay-13');
  });

  it('falls back to newest first for the starred, with the same filters, before the migration is applied', async () => {
    const chains = serve(
      [
        essayRow(1, { is_selected: true, selected_rank: 1 }),
        essayRow(2, { is_selected: true, selected_rank: 2 }),
        essayRow(3),
        essayRow(4),
      ],
      { rankColumn: false },
    );
    const { result } = renderHook(() => useSelectedEssays(8), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    // The rank is not there, so the starred lead newest first; the rest follow as before.
    expect(slugs(result.current.data)).toEqual(['essay-2', 'essay-1', 'essay-4', 'essay-3']);
    expect(chains).toHaveLength(3);
    const retry = chains[2];
    expect(orderedBy(retry)).toEqual(['created_at']);
    expect(filters(retry)).toEqual(filters(chains[0]));
    expect(filters(retry)).toEqual([['is_selected', true], ['published', true]]);
  });

  it('shows an essay once when it comes back from both reads', async () => {
    // Starred between the two reads: the first saw it starred, the second not yet.
    queries([
      { data: [{ id: 'a', slug: 'a' }], error: null },
      { data: [{ id: 'b', slug: 'b' }, { id: 'a', slug: 'a' }], error: null },
    ]);
    const { result } = renderHook(() => useSelectedEssays(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual([{ id: 'a', slug: 'a' }, { id: 'b', slug: 'b' }]);
  });

  it('treats any other error as an error, and asks no fallback', async () => {
    const chains = queries([{ data: null, error: { code: '42501', message: 'permission denied' } }, { data: [], error: null }]);
    const { result } = renderHook(() => useSelectedEssays(8), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(chains).toHaveLength(2);
    expect(chains.map(orderedBy)).toEqual([['selected_rank', 'created_at'], ['created_at']]);
  });

  it('tells the admin panel the order cannot be saved yet', async () => {
    const chains = queries([{ data: null, error: MISSING }, { data: [{ id: 'a', title: 'A', section: 'finance', published: null }], error: null }]);
    const { result } = renderHook(() => useSelectedOrder(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({ rows: [{ id: 'a', title: 'A', section: 'finance', published: false, selected_rank: null }], missingColumn: true });
    // drafts are in, archived essays are out, in both queries
    for (const chain of chains) expect(chain.find((c) => c.method === 'neq')!.args).toEqual(['status', 'archived']);
  });

  it('places the Finance landing\'s featured essay by the same order', async () => {
    const chains = queries([{ data: null, error: MISSING }, { data: { id: 'f' }, error: null }]);
    const { result } = renderHook(() => useFeaturedFinanceEssay(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ id: 'f' }));
    expect(orderedBy(chains[0])).toEqual(['selected_rank', 'created_at']);
    expect(orderedBy(chains[1])).toEqual(['created_at']);
  });

  it('clears the rank when an essay is unstarred, and writes the flag alone before the migration', async () => {
    const chains = queries([{ error: MISSING }, { error: null }, { data: { title: 'A', slug: 'a', section: 'finance' }, error: null }]);
    const { result } = renderHook(() => useToggleSelectContent(), { wrapper });
    await result.current.mutateAsync({ id: 'a', currentlySelected: true });
    expect(chains[0].find((c) => c.method === 'update')!.args).toEqual([{ is_selected: false, selected_rank: null }]);
    expect(chains[1].find((c) => c.method === 'update')!.args).toEqual([{ is_selected: false }]);
  });

  it('writes the flag only when starring: a new star joins the end of the row', async () => {
    const chains = queries([{ error: null }, { data: { title: 'A', slug: 'a', section: 'finance' }, error: null }]);
    const { result } = renderHook(() => useToggleSelectContent(), { wrapper });
    await result.current.mutateAsync({ id: 'a', currentlySelected: false });
    expect(chains[0].find((c) => c.method === 'update')!.args).toEqual([{ is_selected: true }]);
  });
});
