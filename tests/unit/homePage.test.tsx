/**
 * The homepage after About (owner decisions D3(a), D4(a), 2026-10-10): the
 * map first, then the glimpse, then the revision of judgment, as the same
 * section with the same id it had on About, so a link to #changed-my-mind
 * still lands — and the page goes to it. The argument that came with it was
 * removed by owner decision on 2026-10-11: the glimpse is followed directly
 * by Changed my mind. The map is stubbed here (its own suites cover it);
 * everything under it is the real thing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, configure, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));
// PageLayout pulls in Header/Footer/auth; stub it to a passthrough, and SEO to null.
vi.mock('@/components/layouts/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));
vi.mock('@/components/industry-chain', () => ({
  IndustryChainPreview: () => (
    <section id="industry-chain">
      <h1>The industry chain</h1>
    </section>
  ),
}));

import Index from '@/pages/Index';
import { CHANGED_MIND } from '@/data/changedMind';
import { essayRow, essaysTable } from './helpers/essaysTable';

// Generous waits: the full suite runs the world suites beside this one on four
// cores, and a starved worker once took 7.8 s to settle the same query in
// selectedOrder.test.tsx.
configure({ asyncUtilTimeout: 5000 });

const mount = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Index />
      </QueryClientProvider>
    </MemoryRouter>,
  );

const follows = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

beforeEach(() => fromMock.mockReset());

describe('the homepage', () => {
  it('follows the glimpse with the revision of judgment, and carries no argument section, with the map still first', async () => {
    fromMock.mockImplementation(essaysTable([essayRow(1, { is_selected: true, selected_rank: 1 }), essayRow(2)]).from);
    const { container } = mount();
    const glimpse = await screen.findByRole('list', { name: 'Glimpse' });
    await waitFor(() => expect(within(glimpse).getAllByRole('listitem')).toHaveLength(2));

    const map = container.querySelector('#industry-chain')!;
    const glimpseSection = glimpse.closest('section')!;
    const changed = container.querySelector('section#changed-my-mind')!;
    expect(changed).not.toBeNull();
    expect(follows(map, glimpse)).toBe(true);
    // nothing between the two: the next section after the glimpse is Changed my mind
    expect(glimpseSection.nextElementSibling).toBe(changed);
    expect(within(changed).getByRole('heading', { level: 2, name: CHANGED_MIND.heading })).toBeInTheDocument();
    expect(container.querySelector('main :is(h1, h2, h3)')!.textContent).toBe('The industry chain');
    expect(container.querySelector('#the-argument')).toBeNull();
    expect(screen.queryByText('The argument')).toBeNull();
    // one of each: the page does not carry a second copy
    expect(container.querySelectorAll('#changed-my-mind')).toHaveLength(1);
  });

  it('goes to a fragment once nothing is fetching, and leaves a reader who has already scrolled where they are', async () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    fromMock.mockImplementation(essaysTable([essayRow(1)]).from);
    const at = (url: string) =>
      render(
        <MemoryRouter initialEntries={[url]}>
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <Index />
          </QueryClientProvider>
        </MemoryRouter>,
      );

    const first = at('/#changed-my-mind');
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo.mock.calls[0][0]).toMatchObject({ behavior: 'smooth' });
    first.unmount();

    // no fragment, no jump
    scrollTo.mockReset();
    const plain = at('/');
    await screen.findByRole('list', { name: 'Glimpse' });
    await new Promise((r) => requestAnimationFrame(r));
    expect(scrollTo).not.toHaveBeenCalled();
    plain.unmount();

    // a reader already on their way down is not pulled back
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 400 });
    at('/#changed-my-mind');
    await screen.findByRole('list', { name: 'Glimpse' });
    await new Promise((r) => requestAnimationFrame(r));
    expect(scrollTo).not.toHaveBeenCalled();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  it('looks a fragment up as typed when it is not valid percent-encoding, and throws nothing', async () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => errors.push(e.error);
    window.addEventListener('error', onError);
    const typed = document.body.appendChild(Object.assign(document.createElement('div'), { id: '100%' }));
    fromMock.mockImplementation(essaysTable([essayRow(1)]).from);
    try {
      render(
        <MemoryRouter initialEntries={['/#100%']}>
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <Index />
          </QueryClientProvider>
        </MemoryRouter>,
      );
      await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
      expect(errors).toEqual([]);
    } finally {
      window.removeEventListener('error', onError);
      typed.remove();
    }
  });

  it('goes to a fragment on arrival only: one that comes after the page has settled is left to the browser', async () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    fromMock.mockImplementation(essaysTable([essayRow(1)]).from);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let go: (to: string) => void = () => {};
    const Navigator = () => {
      go = useNavigate();
      return null;
    };
    render(
      <MemoryRouter initialEntries={['/']}>
        <QueryClientProvider client={client}>
          <Navigator />
          <Index />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('list', { name: 'Glimpse' });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    await new Promise((r) => requestAnimationFrame(r));

    // the skip link, or any in-page move, after arrival
    act(() => go('/#changed-my-mind'));
    await new Promise((r) => requestAnimationFrame(r));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('keeps Changed my mind when nothing is published: the glimpse is absent, not empty', async () => {
    fromMock.mockImplementation(essaysTable([essayRow(1, { published: false, is_selected: true, selected_rank: 1 })]).from);
    mount();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Glimpse' })).toBeNull());
    expect(document.getElementById('changed-my-mind')).not.toBeNull();
  });
});
