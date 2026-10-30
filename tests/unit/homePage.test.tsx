/**
 * The homepage: the Weave Hero (2026-10-29), then the glimpse, and nothing
 * after it. The industry chain map that stood between them was removed by
 * owner decision on 2026-10-29; the two sections About left under the glimpse
 * (owner decision D4(a), 2026-10-10), the argument and the revision of
 * judgment, on 2026-10-11. A fragment that names a section of the page is
 * still gone to once the page has drawn. Everything here is the real thing
 * (the hero has its own suite, weaveHero.test.tsx).
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

import Index from '@/pages/Index';
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
  it('ends with the glimpse: the hero first, then the row, and no map, argument or revision of judgment', async () => {
    fromMock.mockImplementation(essaysTable([essayRow(1, { is_selected: true, selected_rank: 1 }), essayRow(2)]).from);
    const { container } = mount();
    const glimpse = await screen.findByRole('list', { name: 'Glimpse' });
    await waitFor(() => expect(within(glimpse).getAllByRole('listitem')).toHaveLength(2));

    const hero = container.querySelector('main > section.weave-hero')!;
    const glimpseSection = glimpse.closest('section')!;
    expect(hero).toBe(container.querySelector('main > section'));
    // the glimpse follows the hero directly: the map is gone
    expect(hero.nextElementSibling).toBe(glimpseSection);
    expect(follows(hero, glimpse)).toBe(true);
    expect(container.querySelector('#industry-chain')).toBeNull();
    expect(screen.queryByText('The industry chain')).toBeNull();
    // the page's last section
    expect(glimpseSection.nextElementSibling).toBeNull();
    // the hero's headline is the page's one h1, and the first heading on it
    const first = container.querySelector('main :is(h1, h2, h3)')!;
    expect(first.tagName).toBe('H1');
    expect(first.textContent).toBe('Democratising knowledge. Rebuilding industry.');
    expect(container.querySelectorAll('main h1')).toHaveLength(1);
    expect(container.querySelector('#the-argument')).toBeNull();
    expect(screen.queryByText('The argument')).toBeNull();
    expect(container.querySelector('#changed-my-mind')).toBeNull();
    expect(screen.queryByText('What I changed my mind about')).toBeNull();
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

    const first = at('/#glimpse-heading');
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
    at('/#glimpse-heading');
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
    act(() => go('/#glimpse-heading'));
    await new Promise((r) => requestAnimationFrame(r));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('is the hero alone when nothing is published: the glimpse is absent, not empty', async () => {
    fromMock.mockImplementation(essaysTable([essayRow(1, { published: false, is_selected: true, selected_rank: 1 })]).from);
    const { container } = mount();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Glimpse' })).toBeNull());
    const sections = container.querySelectorAll('main > section');
    expect(sections).toHaveLength(1);
    expect(sections[0].classList.contains('weave-hero')).toBe(true);
  });
});
