/**
 * The Weave Hero on the homepage (src/components/hero/WeaveHero.tsx,
 * docs/hero-weave-prd.md): the exact copy as a real h1 and paragraph; a
 * complete, still weave in the first render, before any animation frame;
 * a loop that rewrites only the loose paths and the nodes; and a gate that
 * holds the weave still for reduced motion, for a hero under a tenth in
 * view and for a hidden tab. Under 640px it draws the mobile composition.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { WeaveHero } from '@/components/hero/WeaveHero';
import { DESKTOP, MOBILE } from '@/components/hero/weave/config';

type IOCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;

let frames: FrameRequestCallback[] = [];
let observers: IOCallback[] = [];
let media: Record<string, boolean> = {};

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
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((f) => {
    frames.push(f);
    return frames.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: media[query] ?? false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IOCallback) {
        observers.push(cb);
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

const hero = () => document.querySelector('section.weave-hero') as HTMLElement;
const looseWarps = () => Array.from(document.querySelectorAll<SVGPathElement>('path[data-thread="warp"]'));
const looseWefts = () => Array.from(document.querySelectorAll<SVGPathElement>('defs path'));
const woven = () => Array.from(document.querySelectorAll('svg > g > path:not([data-thread])')).map((p) => p.getAttribute('d'));

describe('the copy', () => {
  it('is a real h1 in two lines and the subline, exactly as the PRD gives them', () => {
    render(<WeaveHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveAccessibleName('Spreading intelligence. Rebuilding manufacturing.');
    expect(Array.from(h1.querySelectorAll('span'), (s) => s.textContent)).toEqual(['Spreading intelligence.', 'Rebuilding manufacturing.']);
    expect(screen.getByText('Exploring how to accelerate both.').tagName).toBe('P');
    expect(hero()).toHaveAttribute('aria-labelledby', h1.id);
    // the illustration is decorative and takes no pointer, so the text stays selectable
    const svg = hero().querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg.getAttribute('class')).toContain('pointer-events-none');
  });
});

describe('the first frame', () => {
  it('is the whole weave, still, before any animation frame has run', () => {
    render(<WeaveHero />);
    const svg = hero().querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 1600 900');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMaxYMax slice');
    expect(looseWarps()).toHaveLength(14);
    expect(looseWefts()).toHaveLength(6);
    for (const p of [...looseWarps(), ...looseWefts()]) expect(p.getAttribute('d')).toMatch(/^M[\d.]+ [\d.]+C/);
    // woven warps, woven wefts, six fibres, the gaps and the patches
    expect(woven()).toHaveLength(2 + 6 + 2);
    for (const d of woven()) expect(d).toMatch(/^M/);
    // every loose weft drawn twice: the thread and its fibre
    expect(svg.querySelectorAll('use')).toHaveLength(12);
    expect(svg.querySelectorAll('circle').length).toBeGreaterThanOrEqual(14);
    expect(svg.querySelectorAll('circle').length).toBeLessThan(40);
  });
});

describe('the loop', () => {
  it('rewrites the loose paths and the nodes, and never the woven ones', () => {
    render(<WeaveHero />);
    expect(hero()).toHaveAttribute('data-motion', 'running');
    const before = { loose: looseWarps().map((p) => p.getAttribute('d')), wefts: looseWefts().map((p) => p.getAttribute('d')), woven: woven() };
    const node = document.querySelector('circle')!;
    const cx = node.getAttribute('cx');
    tick(1000); // the first frame only sets the clock
    expect(looseWarps().map((p) => p.getAttribute('d'))).toEqual(before.loose);
    tick(1016);
    tick(1032);
    for (let k = 0; k < 40; k++) tick(1048 + k * 16);
    expect(looseWarps().map((p) => p.getAttribute('d'))).not.toEqual(before.loose);
    expect(looseWefts().map((p) => p.getAttribute('d'))).not.toEqual(before.wefts);
    expect(node.getAttribute('cx')).not.toBe(cx);
    expect(woven()).toEqual(before.woven);
  });
});

describe('the gate', () => {
  it('holds the weave still for a reader who asked for reduced motion', () => {
    media['(prefers-reduced-motion: reduce)'] = true;
    render(<WeaveHero />);
    expect(hero()).toHaveAttribute('data-motion', 'still');
    expect(frames).toHaveLength(0);
    expect(looseWarps()).toHaveLength(14); // still drawn, complete
  });

  it('stops under a tenth in view and starts again above it', () => {
    render(<WeaveHero />);
    expect(hero()).toHaveAttribute('data-motion', 'running');
    act(() => observers.forEach((cb) => cb([{ isIntersecting: true, intersectionRatio: 0.05 }])));
    expect(hero()).toHaveAttribute('data-motion', 'still');
    frames = [];
    tick(5000);
    expect(frames).toHaveLength(0); // no frame asked for while stopped
    act(() => observers.forEach((cb) => cb([{ isIntersecting: true, intersectionRatio: 0.1 }])));
    expect(hero()).toHaveAttribute('data-motion', 'running');
    act(() => observers.forEach((cb) => cb([{ isIntersecting: false, intersectionRatio: 0 }])));
    expect(hero()).toHaveAttribute('data-motion', 'still');
  });

  it('stops while the tab is hidden', () => {
    render(<WeaveHero />);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(hero()).toHaveAttribute('data-motion', 'still');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(hero()).toHaveAttribute('data-motion', 'running');
  });
});

describe('the breakpoints', () => {
  it('draws the separate 900 × 900 composition under 640px, the text above it', () => {
    media['(max-width: 639.98px)'] = true;
    render(<WeaveHero />);
    expect(hero()).toHaveAttribute('data-layout', 'stacked');
    const svg = hero().querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 900 900');
    expect(svg).toHaveAttribute('data-composition', MOBILE.name);
    expect(looseWarps()).toHaveLength(MOBILE.warp.count);
    // the text comes first in the document, the weave after it
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws the desktop composition behind the text from 640px', () => {
    render(<WeaveHero />);
    expect(hero()).toHaveAttribute('data-layout', 'side');
    expect(hero().querySelector('svg')).toHaveAttribute('data-composition', DESKTOP.name);
  });
});
