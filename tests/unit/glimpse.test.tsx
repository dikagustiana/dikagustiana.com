/**
 * The glimpse (src/components/home/Glimpse.tsx): absent with nothing
 * published; one column per essay in the order given, each a section, a
 * title, a deck and a month, and nothing a card would add (no author, no
 * reading time, no number); the list drawn once, its links the stops for Tab.
 *
 * The row is an Embla carousel. jsdom lays nothing out and moves nothing, so
 * Embla's hook is replaced here by a stand-in that records the options and
 * plugins it is given and answers as Embla's API does, and the AutoScroll
 * plugin's play and stop are watched. What is tested is the row's own part:
 * when it runs (owner decision, 2026-10-11) and when it stands still (reduced
 * motion, too few columns to loop, loading); that it runs at 30 px/s, right
 * to left; and what holds it (owner request, 2026-10-22): a drag, a swipe or
 * a sideways scroll, the pointer over it, keyboard focus in it, each until 3
 * s after the reader is done, and the pause button, which nothing else
 * undoes; and the arrows, which move one column, at once for reduced motion.
 * The motion itself is the e2e suite's (tests/e2e/glimpse.spec.ts). Fed by
 * the homepage's own query, the row is every published essay with the
 * starred ones leading (owner decision D3(a), 2026-10-10).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, configure, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { fromMock, embla } = vi.hoisted(() => {
  type Handler = () => void;
  const handlers = new Map<string, Set<Handler>>();
  const auto = {
    playing: false,
    play: vi.fn(),
    stop: vi.fn(),
    isPlaying: () => auto.playing,
  };
  const state = {
    options: {} as { loop?: boolean; dragFree?: boolean; align?: unknown },
    plugins: [] as Array<{ name: string; options: Record<string, unknown> }>,
    canScrollPrev: true,
    canScrollNext: true,
    auto,
    api: {
      on(event: string, handler: Handler) {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event)!.add(handler);
        return state.api;
      },
      off(event: string, handler: Handler) {
        handlers.get(event)?.delete(handler);
        return state.api;
      },
      plugins: () => ({ autoScroll: auto }),
      internalEngine: () => ({ options: { loop: !!state.options.loop } }),
      canScrollPrev: () => state.canScrollPrev,
      canScrollNext: () => state.canScrollNext,
      scrollPrev: vi.fn(),
      scrollNext: vi.fn(),
      scrollSnapList: () => [0, -288, -576],
    },
    emit(event: string) {
      handlers.get(event)?.forEach((handler) => handler());
    },
    reset() {
      handlers.clear();
      auto.playing = false;
      auto.play.mockReset().mockImplementation(() => {
        auto.playing = true;
      });
      auto.stop.mockReset().mockImplementation(() => {
        auto.playing = false;
      });
      state.api.scrollPrev.mockReset();
      state.api.scrollNext.mockReset();
      state.canScrollPrev = true;
      state.canScrollNext = true;
      state.options = {};
      state.plugins = [];
    },
  };
  return { fromMock: vi.fn(), embla: state };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

// Embla's hook, as it behaves: the API at once, and a reInit after a render
// that changed the options.
vi.mock('embla-carousel-react', () => ({
  default: function useEmblaCarousel(options: typeof embla.options, plugins: typeof embla.plugins) {
    embla.plugins = plugins;
    useEffect(() => {
      embla.options = options;
      embla.emit('reInit');
    }, [options]);
    return [() => {}, embla.api];
  },
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

const reduce = () => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
};

const frame = () => screen.getByRole('list', { name: 'Glimpse' }).parentElement!;

/** A pointer coming over the row, or leaving it: a mouse's, or a finger's. */
function pointer(type: 'pointerOver' | 'pointerOut', pointerType: 'mouse' | 'touch') {
  const event = createEvent[type](frame());
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  fireEvent(frame(), event);
}

beforeEach(() => embla.reset());
afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe('Glimpse', () => {
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
    // the list once, for a screen reader and for Tab: its links are the stops
    expect(screen.getAllByRole('list')).toHaveLength(1);
    expect(document.querySelectorAll('[aria-hidden="true"] a')).toHaveLength(0);
    for (const link of within(row).getAllByRole('link')) expect(link).not.toHaveAttribute('tabindex');
    expect(row).not.toHaveAttribute('tabindex');
  });

  it('dates an undated essay by its creation month', () => {
    mount([essay(1, { date: null })]);
    expect(screen.getByRole('listitem')).toHaveTextContent('Jul 2026');
  });

  it('keeps the heading and draws placeholders while loading', () => {
    mount(undefined, true);
    expect(screen.getByRole('heading', { name: 'Glimpse' })).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('has arrows on a wide screen only when there is somewhere to go, the first disabled at the start of a still row', () => {
    embla.canScrollPrev = false;
    embla.canScrollNext = false;
    const { unmount } = mount([essay(1), essay(2)]);
    expect(screen.queryByRole('button')).toBeNull();
    unmount();

    embla.canScrollNext = true;
    mount(Array.from({ length: 12 }, (_, i) => essay(i + 1)));
    const back = screen.getByRole('button', { name: 'Earlier in the row' });
    const forward = screen.getByRole('button', { name: 'Further along the row' });
    expect(back).toBeDisabled();
    expect(forward).toBeEnabled();
    // hidden on a phone, which has the swipe
    for (const arrow of [back, forward]) expect(arrow).toHaveClass('hidden', 'md:inline-flex');
    fireEvent.click(forward);
    expect(embla.api.scrollNext).toHaveBeenCalledWith(false);
  });

  it('jumps a column instead of gliding for a reader who asked for reduced motion', () => {
    reduce();
    mount(Array.from({ length: 12 }, (_, i) => essay(i + 1)));
    fireEvent.click(screen.getByRole('button', { name: 'Further along the row' }));
    expect(embla.api.scrollNext).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Earlier in the row' }));
    expect(embla.api.scrollPrev).toHaveBeenCalledWith(true);
  });
});

describe('the running row', () => {
  const layout = Element.prototype.getBoundingClientRect;
  let columnWidth = 288;
  const twelve = () => Array.from({ length: 12 }, (_, i) => essay(i + 1));

  beforeEach(() => {
    columnWidth = 288;
    // A page 1000px wide whose heading starts at 32px, with columns 288px
    // wide (a 256px column and its 32px gap).
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const width = this.tagName === 'LI' ? columnWidth : 0;
      const left = this.tagName === 'H2' ? 32 : 0;
      return { x: left, y: 0, left, top: 0, right: left + width, bottom: 0, width, height: 0, toJSON() {} } as DOMRect;
    };
  });
  afterEach(() => {
    Element.prototype.getBoundingClientRect = layout;
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('runs when the columns can loop: once round, right to left at 30 px/s, from where a reader leaves it', () => {
    mount(twelve());
    expect(embla.options).toMatchObject({ loop: true, dragFree: true });
    // every column stops at the page's margin, under the heading
    expect((embla.options.align as () => number)()).toBe(32);
    expect(embla.plugins.map((p) => p.name)).toEqual(['autoScroll', 'wheelGestures']);
    // 30 px/s is half a pixel in each of Embla's 1/60 s steps; the row
    // starts and stops by the glimpse alone
    expect(embla.plugins[0].options).toMatchObject({
      speed: 0.5,
      direction: 'forward',
      playOnInit: false,
      stopOnInteraction: true,
      stopOnMouseEnter: false,
    });
    expect(embla.auto.play).toHaveBeenCalled();
    expect(frame()).toHaveClass('glimpse__frame--running');
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Earlier in the row',
      'Further along the row',
      'Pause the row',
    ]);
  });

  it('holds still while a reader drags, swipes or scrolls it sideways, and runs again 3 s after they let go', () => {
    vi.useFakeTimers();
    mount(twelve());
    act(() => embla.emit('pointerDown'));
    expect(embla.auto.stop).toHaveBeenCalled();
    expect(embla.auto.playing).toBe(false);
    act(() => embla.emit('pointerUp'));
    act(() => vi.advanceTimersByTime(2999));
    expect(embla.auto.playing).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(embla.auto.playing).toBe(true);
  });

  it('holds still under a mouse until 3 s after it leaves; a finger on the screen is not a hover', () => {
    vi.useFakeTimers();
    mount(twelve());
    act(() => pointer('pointerOver', 'touch'));
    expect(embla.auto.playing).toBe(true);
    act(() => pointer('pointerOver', 'mouse'));
    expect(embla.auto.playing).toBe(false);
    // the pointer, not the timer: still held long after
    act(() => vi.advanceTimersByTime(10_000));
    expect(embla.auto.playing).toBe(false);
    act(() => pointer('pointerOut', 'mouse'));
    act(() => vi.advanceTimersByTime(2999));
    expect(embla.auto.playing).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(embla.auto.playing).toBe(true);
  });

  it('holds still while a column has keyboard focus, until 3 s after focus leaves the row', () => {
    vi.useFakeTimers();
    mount(twelve());
    const [first, second] = within(screen.getByRole('list', { name: 'Glimpse' })).getAllByRole('link');
    act(() => first.focus());
    expect(embla.auto.playing).toBe(false);
    // from column to column, still held
    act(() => second.focus());
    act(() => vi.advanceTimersByTime(5000));
    expect(embla.auto.playing).toBe(false);
    act(() => screen.getByRole('button', { name: 'Pause the row' }).focus());
    act(() => vi.advanceTimersByTime(2999));
    expect(embla.auto.playing).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(embla.auto.playing).toBe(true);
  });

  it('stops and starts by its own button, which a drag, a hover or focus does not undo', () => {
    vi.useFakeTimers();
    mount(twelve());
    expect(frame()).not.toHaveAttribute('data-paused');
    fireEvent.click(screen.getByRole('button', { name: 'Pause the row' }));
    expect(frame()).toHaveAttribute('data-paused');
    expect(embla.auto.playing).toBe(false);

    act(() => embla.emit('pointerDown'));
    act(() => embla.emit('pointerUp'));
    act(() => pointer('pointerOver', 'mouse'));
    act(() => pointer('pointerOut', 'mouse'));
    act(() => embla.emit('reInit'));
    act(() => vi.advanceTimersByTime(10_000));
    expect(embla.auto.play).toHaveBeenCalledTimes(1);
    expect(embla.auto.playing).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Resume the row' }));
    expect(frame()).not.toHaveAttribute('data-paused');
    expect(embla.auto.playing).toBe(true);
    expect(screen.getByRole('button', { name: 'Pause the row' })).toBeInTheDocument();
  });

  it('moves one column by its arrows, stopped while it does, and runs again 3 s after the last press', () => {
    vi.useFakeTimers();
    mount(twelve());
    fireEvent.click(screen.getByRole('button', { name: 'Further along the row' }));
    expect(embla.api.scrollNext).toHaveBeenCalledWith(false);
    // stopped before it moved, so the column lands where it should
    expect(embla.auto.stop.mock.invocationCallOrder[0]).toBeLessThan(embla.api.scrollNext.mock.invocationCallOrder[0]);
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(screen.getByRole('button', { name: 'Earlier in the row' }));
    expect(embla.api.scrollPrev).toHaveBeenCalledWith(false);
    act(() => vi.advanceTimersByTime(2999));
    expect(embla.auto.playing).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(embla.auto.playing).toBe(true);
  });

  it('stands still for a reader who asked for reduced motion, however long the row, and moves by hand', () => {
    reduce();
    mount(twelve());
    expect(embla.options.loop).toBe(false);
    expect(embla.auto.play).not.toHaveBeenCalled();
    expect(frame()).not.toHaveClass('glimpse__frame--running');
    // nothing moves, so nothing to pause; the arrows stay
    expect(screen.queryByRole('button', { name: 'Pause the row' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Further along the row' })).toBeInTheDocument();
    act(() => embla.emit('pointerUp'));
    expect(embla.auto.play).not.toHaveBeenCalled();
  });

  it('stands still when the columns are too few to loop, where the row would show its empty end', () => {
    // three columns of 288px less the widest do not cover a 1000px page
    mount([essay(1), essay(2), essay(3)]);
    expect(embla.options.loop).toBe(false);
    expect(embla.auto.play).not.toHaveBeenCalled();
    expect(screen.getByRole('list', { name: 'Glimpse' })).toHaveClass('glimpse__row--still');
    expect(screen.queryByRole('button', { name: 'Pause the row' })).toBeNull();
  });

  it('measures again when the columns change size, and stops running when they can no longer loop', () => {
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
    mount(Array.from({ length: 5 }, (_, i) => essay(i + 1)));
    expect(embla.options.loop).toBe(true);
    expect(embla.auto.playing).toBe(true);
    // narrower columns: four of them no longer cover the page
    columnWidth = 200;
    act(() => observers.forEach((callback) => callback()));
    expect(embla.options.loop).toBe(false);
    expect(embla.auto.playing).toBe(false);
    expect(screen.queryByRole('button', { name: 'Pause the row' })).toBeNull();
  });

  it('does not run its placeholders while loading', () => {
    mount(undefined, true);
    expect(embla.options.loop).toBe(false);
    expect(embla.auto.play).not.toHaveBeenCalled();
    expect(frame()).not.toHaveClass('glimpse__frame--running');
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
