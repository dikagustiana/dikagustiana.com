/**
 * docs/prd/2026-10-fia-fixes item 11: the homepage order is reachable from
 * the Glimpse in admin mode, and its rows move by dragging (pointer or
 * keyboard) instead of up and down arrows.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { auth, saveMutate, order } = vi.hoisted(() => ({
  auth: { current: { isAdmin: false, isLoading: false } },
  saveMutate: vi.fn(),
  // One object across renders, as react-query returns it: a new one each time would loop the panel's effect.
  order: {
    data: {
      rows: [
        { id: 'a', title: 'First', section: 'finance', published: true, selected_rank: 1 },
        { id: 'b', title: 'Second', section: 'next-big-thing', published: false, selected_rank: 2 },
      ],
      missingColumn: false,
    },
    isLoading: false,
    error: null,
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useOptionalAuth: () => auth.current, useAuth: () => auth.current }));
vi.mock('@/hooks/queries/useUnifiedContent', () => ({
  useSelectedOrder: () => order,
  useSaveSelectedOrder: () => ({ mutate: saveMutate, isPending: false }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { HomepageOrder } from '@/components/admin/HomepageOrder';
import { AdminOnly } from '@/components/auth/AdminOnly';

describe('the homepage order panel', () => {
  it('is #homepage-order, with a drag handle per row and no up or down arrows', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <HomepageOrder />
      </QueryClientProvider>,
    );
    const list = screen.getByRole('list', { name: /Homepage order: drag a row/ });
    expect(list.closest('#homepage-order')).not.toBeNull();
    expect(within(list).getByRole('button', { name: 'Drag "First", position 1' })).toHaveAttribute('aria-roledescription', 'sortable');
    expect(within(list).getByRole('button', { name: 'Drag "Second", position 2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /up$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /down$/ })).toBeNull();
    // "To the front" stays a click away, and writes the whole order.
    act(() => within(list).getByRole('button', { name: 'Move "Second" to the front' }).click());
    expect(saveMutate.mock.calls[0][0]).toEqual(['b', 'a']);
  });
});

describe('AdminOnly', () => {
  const mount = () =>
    render(
      <MemoryRouter>
        <AdminOnly>
          <a href="/admin/content#homepage-order">Edit order</a>
        </AdminOnly>
      </MemoryRouter>,
    );

  it('renders nothing for a reader, or while the session is being read', () => {
    auth.current = { isAdmin: false, isLoading: false };
    mount();
    expect(screen.queryByText('Edit order')).toBeNull();
    auth.current = { isAdmin: true, isLoading: true };
    mount();
    expect(screen.queryByText('Edit order')).toBeNull();
  });

  it('renders its children for an admin', () => {
    auth.current = { isAdmin: true, isLoading: false };
    mount();
    expect(screen.getByRole('link', { name: 'Edit order' })).toHaveAttribute('href', '/admin/content#homepage-order');
  });
});
