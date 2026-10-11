/**
 * The glimpse (src/components/home/Glimpse.tsx): absent with nothing
 * published; one column per essay in the order given, each a section, a
 * title, a deck and a month, and nothing a card would add (no author, no
 * reading time, no number). Still (jsdom lays nothing out, so a row here
 * stands still unless a test gives it widths): the buttons only when the row
 * overflows, paging by most of the visible width, smoothly or at once by the
 * reader's motion preference, and a focusable, named row so the arrow keys
 * reach it. Running (owner decision, 2026-10-11): the list twice with the
 * second copy hidden from screen readers and from Tab, a lap as long as one
 * copy at 30 px/s and measured again when the columns change, and still for
 * reduced motion or a row too short to loop. Fed by the homepage's own query,
 * the row is every published essay with the starred ones leading (owner
 * decision D3(a), 2026-10-10).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, configure, render, screen, waitFor, within } from '@testing-library/react';
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

describe('the running row', () => {
  const layout = Element.prototype.getBoundingClientRect;
  let columnWidth = 288;
  const reduce = () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  };
  const twelve = () => Array.from({ length: 12 }, (_, i) => essay(i + 1));
  const strip = () => screen.getByRole('list', { name: 'Glimpse' }).parentElement!;

  beforeEach(() => {
    columnWidth = 288;
    // A page 1000px wide whose heading starts at 32px, with columns 288px wide.
    overflow(0, 1000);
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const width = this.tagName === 'LI' ? columnWidth : 0;
      const left = this.tagName === 'H2' ? 32 : 0;
      return { x: left, y: 0, left, top: 0, right: left + width, bottom: 0, width, height: 0, toJSON() {} } as DOMRect;
    };
  });
  afterEach(() => {
    Element.prototype.getBoundingClientRect = layout;
    vi.unstubAllGlobals();
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('runs when one copy is wider than the page: the list twice, the second hidden from screen readers and from Tab', () => {
    mount(twelve());
    // one list for a screen reader, with every essay once
    expect(screen.getAllByRole('list')).toHaveLength(1);
    const row = screen.getByRole('list', { name: 'Glimpse' });
    expect(within(row).getAllByRole('listitem')).toHaveLength(12);
    for (const link of within(row).getAllByRole('link')) expect(link).not.toHaveAttribute('tabindex');
    const copy = document.querySelector('ul[aria-hidden="true"]')!;
    expect(copy.querySelectorAll('li')).toHaveLength(12);
    expect([...copy.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(twelve().map((e) => e.title));
    for (const link of copy.querySelectorAll('a')) expect(link).toHaveAttribute('tabindex', '-1');
    // the links are the stops: no focusable row, no buttons
    expect(row).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('button')).toBeNull();
    // a lap is one copy at 30 px/s: twelve 288px columns (no gap in jsdom)
    expect(strip()).toHaveClass('animate-marquee');
    expect(strip().style.getPropertyValue('--marquee-duration')).toBe(`${(12 * 288) / 30}s`);
    // and it starts with the first column at the heading's edge
    expect(strip().style.animationDelay).toBe(`${-(12 * 288 - 32) / 30}s`);
  });

  it('measures the lap again when the columns change size, so the speed holds', () => {
    const observers: Array<() => void> = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    mount(twelve());
    expect(strip().style.getPropertyValue('--marquee-duration')).toBe(`${(12 * 288) / 30}s`);
    // the phone's narrower columns
    columnWidth = 256;
    act(() => observers.forEach((callback) => callback()));
    expect(strip().style.getPropertyValue('--marquee-duration')).toBe(`${(12 * 256) / 30}s`);
  });

  it('stands still for a reader who asked for reduced motion, however long the row', () => {
    reduce();
    overflow(3000, 1000);
    mount(twelve());
    expect(document.querySelector('ul[aria-hidden="true"]')).toBeNull();
    expect(strip()).not.toHaveClass('animate-marquee');
    expect(screen.getByRole('list', { name: 'Glimpse' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Further along the row' })).toBeInTheDocument();
  });

  it('stands still when one copy is narrower than the page, where a loop would show its empty end', () => {
    mount([essay(1), essay(2), essay(3)]);
    expect(document.querySelector('ul[aria-hidden="true"]')).toBeNull();
    expect(strip()).not.toHaveClass('animate-marquee');
    expect(screen.getByRole('list', { name: 'Glimpse' })).toHaveAttribute('tabindex', '0');
  });

  it('does not run its placeholders while loading', () => {
    mount(undefined, true);
    expect(document.querySelector('ul[aria-hidden="true"]')).toBeNull();
    expect(screen.getByRole('list', { name: 'Glimpse' }).parentElement).not.toHaveClass('animate-marquee');
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
