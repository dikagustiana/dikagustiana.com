/**
 * The glimpse (src/components/home/Glimpse.tsx): absent with nothing
 * published; one column per essay in the order given, each a section, a
 * title, a deck and a month, and nothing a card would add (no author, no
 * reading time, no number); the buttons only when the row overflows, paging
 * by most of the visible width, smoothly or at once by the reader's motion
 * preference; and a focusable, named row so the arrow keys reach it. Fed by
 * the homepage's own query, the row is every published essay with the
 * starred ones leading (owner decision D3(a), 2026-10-10).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

import { Glimpse } from '@/components/home/Glimpse';
import { useSelectedEssays, type SelectedEssay } from '@/hooks/queries/useSelectedEssays';
import { essayRow, essaysTable } from './helpers/essaysTable';

// Generous waits: the full suite runs the world suites beside this one on four
// cores, and a starved worker once took 7.8 s to settle the same query in
// selectedOrder.test.tsx.
configure({ asyncUtilTimeout: 5000 });

function essay(i: number, over: Partial<SelectedEssay> = {}): SelectedEssay {
  return {
    id: `e${i}`,
    slug: `essay-${i}`,
    title: `Essay ${i}`,
    snippet: `Deck ${i}.`,
    section: 'next-big-thing',
    phase: null,
    author: 'Someone Named',
    read_time: '7 min read',
    date: '2026-08-01',
    created_at: '2026-07-01T00:00:00Z',
    finance_section: null,
    fsli_slug: null,
    topic: null,
    finance_modules: null,
    ...over,
  };
}

const mount = (essays: SelectedEssay[] | undefined, isLoading = false) =>
  render(
    <MemoryRouter>
      <Glimpse essays={essays} isLoading={isLoading} />
    </MemoryRouter>,
  );

/** jsdom lays nothing out; give the row a width and a wider content. */
function overflow(scrollWidth: number, clientWidth: number) {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => scrollWidth });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => clientWidth });
}

describe('Glimpse', () => {
  const scrollBy = vi.fn();
  beforeEach(() => {
    scrollBy.mockReset();
    Element.prototype.scrollBy = scrollBy as unknown as Element['scrollBy'];
    overflow(0, 0);
  });
  afterEach(() => {
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('is absent, not empty, with nothing published', () => {
    const { container } = mount([]);
    expect(container.innerHTML).toBe('');
  });

  it('shows one column per essay, in the order given, as a glimpse and not a card', () => {
    const rows = Array.from({ length: 24 }, (_, i) => essay(i + 1));
    mount(rows);
    const row = screen.getByRole('list', { name: 'Glimpse' });
    const items = within(row).getAllByRole('listitem');
    expect(items).toHaveLength(24);
    expect(items.map((li) => within(li).getByRole('heading', { level: 3 }).textContent)).toEqual(rows.map((r) => r.title));
    const first = items[0];
    expect(first).toHaveTextContent('The Next Big Thing');
    expect(first).toHaveTextContent('Deck 1.');
    expect(first).toHaveTextContent('Aug 2026');
    expect(first).not.toHaveTextContent('Someone Named');
    expect(first).not.toHaveTextContent('7 min');
    expect(first).not.toHaveTextContent('01');
    expect(within(first).getByRole('link')).toHaveAttribute('href', '/the-next-big-thing/essay-1');
    // the row itself takes focus, so the arrow keys scroll it
    expect(row).toHaveAttribute('tabindex', '0');
  });

  it('dates an undated essay by its creation month', () => {
    mount([essay(1, { date: null })]);
    expect(screen.getByRole('listitem')).toHaveTextContent('Jul 2026');
  });

  it('has no buttons when every column fits, and pages by most of the visible width when they do not', async () => {
    mount([essay(1), essay(2)]);
    expect(screen.queryByRole('button')).toBeNull();

    overflow(3000, 1000);
    const { unmount } = mount(Array.from({ length: 12 }, (_, i) => essay(i + 1)));
    const forward = screen.getByRole('button', { name: 'Further along the row' });
    const back = screen.getByRole('button', { name: 'Earlier in the row' });
    expect(back).toBeDisabled();
    await userEvent.click(forward);
    expect(scrollBy).toHaveBeenCalledWith({ left: 800, behavior: 'smooth' });
    unmount();
  });

  it('jumps instead of gliding for a reader who asked for reduced motion', async () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    overflow(3000, 1000);
    mount(Array.from({ length: 12 }, (_, i) => essay(i + 1)));
    await userEvent.click(screen.getByRole('button', { name: 'Further along the row' }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 800, behavior: 'instant' });
  });

  it('keeps the heading and draws placeholders while loading', () => {
    mount(undefined, true);
    expect(screen.getByRole('heading', { name: 'Glimpse' })).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});

/** The homepage's own wiring: the query the page makes, into the row. */
function HomepageRow() {
  const { data, isLoading } = useSelectedEssays(30);
  return <Glimpse essays={data} isLoading={isLoading} />;
}

const mountHomepageRow = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <HomepageRow />
      </QueryClientProvider>
    </MemoryRouter>,
  );

describe('the homepage row', () => {
  beforeEach(() => fromMock.mockReset());

  it('holds every published essay: the three starred in the owner\'s order, then the eighteen others newest first', async () => {
    const starred = [
      essayRow(1, { is_selected: true, selected_rank: 3 }),
      essayRow(2, { is_selected: true, selected_rank: 1 }),
      essayRow(3, { is_selected: true, selected_rank: 2 }),
    ];
    const others = Array.from({ length: 18 }, (_, i) => essayRow(i + 4));
    fromMock.mockImplementation(essaysTable([...others, ...starred, essayRow(99, { published: false })]).from);
    mountHomepageRow();

    const row = await screen.findByRole('list', { name: 'Glimpse' });
    await waitFor(() => expect(within(row).getAllByRole('listitem')).toHaveLength(21));
    const titles = within(row).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles.slice(0, 3)).toEqual(['Essay 2', 'Essay 3', 'Essay 1']);
    expect(titles.slice(3)).toEqual(Array.from({ length: 18 }, (_, i) => `Essay ${21 - i}`));
    expect(titles).not.toContain('Essay 99');
  });

  it('is absent when nothing is published, starred or not', async () => {
    fromMock.mockImplementation(essaysTable([essayRow(1, { published: false, is_selected: true, selected_rank: 1 })]).from);
    const { container } = mountHomepageRow();
    // the placeholders while the query runs, then nothing at all
    expect(screen.getByRole('heading', { name: 'Glimpse' })).toBeInTheDocument();
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });
});
