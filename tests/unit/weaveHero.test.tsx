/**
 * The Home Hero v2 (src/components/hero/WeaveHero.tsx, HeroWeave.tsx,
 * docs/home-hero-v2.md): the exact copy, one sentence a line, as a real h1
 * and paragraph; the weave as one decorative canvas, at the device's pixel
 * ratio capped at 2; the full still frame and no animation frames for
 * reduced motion; a loop that stops when the canvas is wholly off screen or
 * the tab is hidden and goes on from where it stopped; the stacked layout's
 * fully woven block under 768px.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { WeaveHero } from '@/components/hero/WeaveHero';

type IOCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;

let frames: FrameRequestCallback[] = [];
let observers: IOCallback[] = [];
let media: Record<string, boolean> = {};
let draws = 0;
let arcs = 0;

/** Run the frames queued so far, at `now` milliseconds. */
const tick = (now: number) => {
  const queued = frames;
  frames = [];
  act(() => queued.forEach((f) => f(now)));
};

beforeEach(() => {
  frames = [];
  observers = [];
  media = {};
  draws = 0;
  arcs = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((f) => {
    frames.push(f);
    return frames.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: media[query] ?? false, media: query, addEventListener: () => {}, removeEventListener: () => {} })),
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IOCallback, public options?: IntersectionObserverInit) {
        observers.push(cb);
        expect(options?.threshold).toBe(0);
      }
      observe() {}
      disconnect() {}
    },
  );
  // A canvas with a size and a 2D context that counts what it is asked to draw.
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 1366, bottom: 440, width: 1366, height: 440, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
  const ctx = new Proxy(
    {},
    {
      get: (_, key) => {
        if (key === 'clearRect') return () => draws++;
        if (key === 'arc') return () => arcs++;
        if (key === 'createLinearGradient') return () => ({ addColorStop: () => {} });
        return () => {};
      },
      set: () => true,
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });
});

const hero = () => document.querySelector('section.weave-hero') as HTMLElement;
const canvas = () => hero().querySelector('canvas') as HTMLCanvasElement;

describe('the copy', () => {
  it('is a real h1, one sentence a line, and the subline, exactly as the PRD gives them', () => {
    render(<WeaveHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveAccessibleName('Spreading intelligence. Rebuilding industry.');
    expect(Array.from(h1.querySelectorAll('span'), (s) => s.textContent)).toEqual(['Spreading intelligence.', 'Rebuilding industry.']);
    for (const line of h1.querySelectorAll('span')) expect(line.className).toContain('whitespace-nowrap');
    expect(screen.getByText('Exploring how to accelerate both — and what it takes for Indonesia to industrialise again.').tagName).toBe('P');
    expect(hero()).toHaveAttribute('aria-labelledby', h1.id);
  });
});

describe('the canvas', () => {
  it('is decorative: hidden from assistive technology, out of the focus order, taking no pointer', () => {
    render(<WeaveHero />);
    expect(hero().querySelectorAll('canvas')).toHaveLength(1);
    expect(canvas()).toHaveAttribute('aria-hidden', 'true');
    expect(canvas()).not.toHaveAttribute('tabindex');
    expect(canvas().getAttribute('class')).toContain('pointer-events-none');
  });

  it('draws at the device pixel ratio, capped at 2, and records the square pitch it built', () => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 });
    render(<WeaveHero />);
    expect(canvas().width).toBe(1366 * 2);
    expect(canvas().height).toBe(440 * 2);
    expect(Number(canvas().dataset.pitch)).toBeGreaterThanOrEqual(52);
    expect(Number(canvas().dataset.warps)).toBeGreaterThan(0);
    expect(Number(canvas().dataset.wefts)).toBeGreaterThan(0);
  });
});

describe('the motion', () => {
  it('runs one frame loop that draws every frame', () => {
    render(<WeaveHero />);
    const before = draws;
    tick(1000);
    tick(1016);
    tick(1032);
    expect(draws - before).toBe(3);
    expect(frames).toHaveLength(1);
  });

  it('holds the full still frame for reduced motion: nodes drawn, no frame ever requested', () => {
    media['(prefers-reduced-motion: reduce)'] = true;
    render(<WeaveHero />);
    expect(frames).toHaveLength(0);
    expect(draws).toBeGreaterThan(0);
    // the intro's last frame: the nodes are in
    expect(arcs).toBeGreaterThan(0);
  });

  it('stops when the canvas is wholly off screen and starts again when any of it returns', () => {
    render(<WeaveHero />);
    act(() => observers.forEach((cb) => cb([{ isIntersecting: false, intersectionRatio: 0 }])));
    frames = [];
    tick(2000);
    expect(frames).toHaveLength(0);
    act(() => observers.forEach((cb) => cb([{ isIntersecting: true, intersectionRatio: 0.01 }])));
    expect(frames).toHaveLength(1);
  });

  it('stops while the tab is hidden', () => {
    render(<WeaveHero />);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    frames = [];
    tick(3000);
    expect(frames).toHaveLength(0);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(frames).toHaveLength(1);
  });

  it('plays the intro from its start on each mount, with nothing drawn yet', () => {
    render(<WeaveHero />);
    // at t = 0 no node is in yet
    expect(arcs).toBe(0);
  });
});

describe('the breakpoints', () => {
  it('stacks under 768px: the text first, then a fully woven block', () => {
    media['(max-width: 767.98px)'] = true;
    render(<WeaveHero />);
    expect(hero()).toHaveAttribute('data-layout', 'stacked');
    expect(canvas()).toHaveAttribute('data-weave', 'mobile');
    expect(canvas().dataset.pitch).toBe('40');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.compareDocumentPosition(canvas()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the weave behind the text from 768px', () => {
    render(<WeaveHero />);
    expect(hero()).toHaveAttribute('data-layout', 'side');
    expect(canvas()).toHaveAttribute('data-weave', 'desktop');
  });
});
