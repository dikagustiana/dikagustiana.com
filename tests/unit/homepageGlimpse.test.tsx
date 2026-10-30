/**
 * Admin → Content → Homepage Glimpse (src/components/admin/HomepageGlimpse.tsx):
 * three slots, each a searchable list of published essays and a Clear
 * button; an essay in one slot cannot be chosen for another; up and down
 * swap neighbours; Save writes all three in one call; the preview shows what
 * the homepage will, an empty slot filled with the newest essay. Before the
 * pin migration the panel says so and saves nothing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { fromMock, rpcMock } = vi.hoisted(() => ({ fromMock: vi.fn(), rpcMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a), rpc: (...a: unknown[]) => rpcMock(...a) },
}));
vi.mock('@/lib/auditLog', () => ({ logAuditEvent: vi.fn(async () => undefined) }));
vi.mock('@/components/auth/AdminOnly', () => ({ AdminOnly: () => null }));

import { HomepageGlimpse } from '@/components/admin/HomepageGlimpse';
import { essayRow, essaysTable } from './helpers/essaysTable';

configure({ asyncUtilTimeout: 5000 });

const mount = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <HomepageGlimpse />
      </QueryClientProvider>
    </MemoryRouter>,
  );

const slotButton = (n: number) => document.querySelector<HTMLButtonElement>(`[data-glimpse-slot="${n}"]`)!;
const previewTitles = () =>
  within(screen.getByRole('list', { name: 'Preview of the pinned essays' }))
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent);

beforeEach(() => {
  fromMock.mockReset();
  rpcMock.mockReset().mockResolvedValue({ error: null });
});

describe('Homepage Glimpse', () => {
  const rows = () => [
    essayRow(1, { featured_rank: 1, section: 'finance' }),
    essayRow(2, { featured_rank: 2 }),
    essayRow(3),
    essayRow(4),
    essayRow(5, { published: false, title: 'A draft' }),
  ];

  it('shows the three slots as saved, and the preview with the empty slot filled by the newest essay', async () => {
    fromMock.mockImplementation(essaysTable(rows()).from);
    mount();
    await waitFor(() => expect(slotButton(1)).toHaveTextContent('Essay 1'));
    expect(slotButton(1)).toHaveTextContent('Finance');
    expect(slotButton(2)).toHaveTextContent('Essay 2');
    expect(slotButton(3)).toHaveTextContent('Empty');
    expect(previewTitles()).toEqual(['Essay 1', 'Essay 2', 'Essay 4']);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('lists published essays only, searchable, and disables one already in another slot', async () => {
    fromMock.mockImplementation(essaysTable(rows()).from);
    mount();
    await waitFor(() => expect(slotButton(3)).toHaveTextContent('Empty'));
    fireEvent.click(slotButton(3));
    const list = await screen.findByRole('list', { name: 'Essays for slot 3' });
    const option = (id: string) => list.querySelector<HTMLButtonElement>(`[data-glimpse-option="${id}"]`)!;
    expect(option('e1')).toBeDisabled();
    expect(option('e2')).toBeDisabled();
    expect(option('e3')).toBeEnabled();
    expect(list).not.toHaveTextContent('A draft');

    fireEvent.change(screen.getByRole('textbox', { name: 'Search essays for slot 3' }), { target: { value: 'essay 3' } });
    expect(within(list).getAllByRole('button')).toHaveLength(1);
    fireEvent.click(option('e3'));
    await waitFor(() => expect(slotButton(3)).toHaveTextContent('Essay 3'));
    expect(previewTitles()).toEqual(['Essay 1', 'Essay 2', 'Essay 3']);
  });

  it('swaps slots by up and down, clears one, and saves all three in one call', async () => {
    fromMock.mockImplementation(essaysTable(rows()).from);
    mount();
    await waitFor(() => expect(slotButton(1)).toHaveTextContent('Essay 1'));
    expect(screen.getByRole('button', { name: 'Move slot 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move slot 3 down' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Move slot 1 down' }));
    expect(slotButton(1)).toHaveTextContent('Essay 2');
    expect(slotButton(2)).toHaveTextContent('Essay 1');
    fireEvent.click(screen.getByRole('button', { name: 'Move slot 2 down' }));
    expect(slotButton(3)).toHaveTextContent('Essay 1');
    fireEvent.click(screen.getByRole('button', { name: 'Clear slot 1' }));
    expect(slotButton(1)).toHaveTextContent('Empty');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    expect(rpcMock).toHaveBeenCalledWith('set_featured_essays', { p_ids: [null, null, 'e1'] });
  });

  it('saves nothing before the pin migration, and says why', async () => {
    // the column is not there, so no row carries a pin
    fromMock.mockImplementation(essaysTable(rows().map((r) => ({ ...r, featured_rank: null })), { featuredColumn: false }).from);
    mount();
    await screen.findByText(/migration 20261030100000_essay_featured_rank/);
    expect(slotButton(1)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(previewTitles()).toEqual(['Essay 4', 'Essay 3', 'Essay 2']);
  });
});
