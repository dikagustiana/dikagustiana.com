/**
 * The homepage order before and after its migration. Every reader of
 * essays.selected_rank asks for the ranked order first and, when Postgres
 * answers 42703 (the column is not there yet), asks again newest first, so
 * a deploy ahead of migration 20261009140000_essay_selected_rank changes
 * nothing a reader can see. Any other error is still an error. Unstarring
 * clears the rank in the same write, and falls back to the flag alone.
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
  it('reads the owner\'s order when the column exists, in one query', async () => {
    const rows = [{ id: 'a', slug: 'a' }];
    const chains = queries([{ data: rows, error: null }]);
    const { result } = renderHook(() => useSelectedEssays(30), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(rows));
    expect(chains).toHaveLength(1);
    expect(orderedBy(chains[0])).toEqual(['selected_rank', 'created_at']);
    expect(chains[0].find((c) => c.method === 'order')!.args[1]).toEqual({ ascending: true, nullsFirst: false });
    expect(chains[0].find((c) => c.method === 'limit')!.args).toEqual([30]);
  });

  it('falls back to newest first, with the same filters, before the migration is applied', async () => {
    const rows = [{ id: 'a', slug: 'a' }];
    const chains = queries([{ data: null, error: MISSING }, { data: rows, error: null }]);
    const { result } = renderHook(() => useSelectedEssays(8), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(rows));
    expect(chains).toHaveLength(2);
    expect(orderedBy(chains[1])).toEqual(['created_at']);
    const filters = (chain: Call[]) => chain.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(filters(chains[1])).toEqual(filters(chains[0]));
    expect(filters(chains[1])).toEqual([['is_selected', true], ['published', true]]);
  });

  it('treats any other error as an error', async () => {
    queries([{ data: null, error: { code: '42501', message: 'permission denied' } }]);
    const { result } = renderHook(() => useSelectedEssays(8), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fromMock).toHaveBeenCalledTimes(1);
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
