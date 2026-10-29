/**
 * The Weave Hero's geometry (src/components/hero/weave/geometry.ts,
 * docs/hero-weave-prd.md §3): seeded threads that are the same on every load,
 * the PRD's counts, ranges and density gradient, plain-weave parity that
 * alternates along every thread, patches exactly where the warp is over, a
 * loose part that leaves the cloth without a kink, a keep-out the motion
 * never crosses, and a fit that never lets a thread reach the headline.
 */
import { describe, expect, it } from 'vitest';
import { DESKTOP, MOBILE } from '@/components/hero/weave/config';
import {
  buildWeave,
  fitComposition,
  fmt,
  loosePoint,
  looseD,
  nodePosition,
  spaced,
  warpIsOver,
} from '@/components/hero/weave/geometry';
import { mulberry32 } from '@/components/hero/weave/rng';

const desktop = buildWeave(DESKTOP);
const mobile = buildWeave(MOBILE);
const diffs = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);

describe('the seeded generator', () => {
  it('repeats its sequence for a seed and differs between seeds', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const c = mulberry32(8);
    const seqA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
    expect(Array.from({ length: 5 }, c)).not.toEqual(seqA);
    for (const x of seqA) expect(x >= 0 && x < 1).toBe(true);
  });

  it('draws the identical weave on every build', () => {
    const again = buildWeave(DESKTOP);
    expect(again.woven).toEqual(desktop.woven);
    expect(again.nodes).toEqual(desktop.nodes);
    expect(again.loose.map((t) => looseD(t, 3.7))).toEqual(desktop.loose.map((t) => looseD(t, 3.7)));
  });
});

describe('the desktop composition', () => {
  it('has 14 warps from x = 1000 to 1600 and 6 wefts from y = 480 to 880, spacing compressing toward the corner', () => {
    expect(desktop.warpX).toHaveLength(14);
    expect(desktop.warpX[0]).toBe(1000);
    expect(desktop.warpX[13]).toBeCloseTo(1600, 9);
    expect(desktop.weftY).toHaveLength(6);
    expect(desktop.weftY[0]).toBe(480);
    expect(desktop.weftY[5]).toBeCloseTo(880, 9);
    for (const gaps of [diffs(desktop.warpX), diffs(desktop.weftY)]) {
      for (let k = 1; k < gaps.length; k++) expect(gaps[k]).toBeLessThan(gaps[k - 1]);
    }
  });

  it('has 20 loose threads with the PRD strokes, the warps loose above y ≈ 470 and the wefts from x ≈ 240', () => {
    const warps = desktop.loose.filter((t) => t.kind === 'warp');
    const wefts = desktop.loose.filter((t) => t.kind === 'weft');
    expect(desktop.loose).toHaveLength(20);
    expect(warps).toHaveLength(14);
    expect(wefts).toHaveLength(6);
    for (const t of warps) {
      expect(t.strokeWidth).toBe(2.2);
      expect(t.entry[1]).toBe(470);
      expect(t.length).toBe(470); // the free end at the top edge
    }
    for (const t of wefts) {
      expect(t.strokeWidth).toBe(7);
      const freeEnd = t.entry[0] - t.length;
      expect(freeEnd).toBeGreaterThan(240 - 30);
      expect(freeEnd).toBeLessThan(240 + 30);
    }
  });

  it('puts one or two nodes of radius 4–6 on each warp, filled and hollow mixed, under 40 in all', () => {
    expect(desktop.nodes.length).toBeLessThan(40);
    for (let i = 0; i < 14; i++) {
      const n = desktop.nodes.filter((x) => x.warp === i).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(2);
    }
    for (const n of desktop.nodes) {
      expect(n.r).toBeGreaterThanOrEqual(4);
      expect(n.r).toBeLessThanOrEqual(6);
      expect(n.s).toBeLessThan(desktop.loose[n.warp].length); // in the loose region
    }
    expect(desktop.nodes.some((n) => n.hollow)).toBe(true);
    expect(desktop.nodes.some((n) => !n.hollow)).toBe(true);
  });
});

describe('plain weave', () => {
  it('alternates over and under at every crossing, along every warp and every weft', () => {
    for (const weave of [desktop, mobile]) {
      const { warpX, weftY, crossings } = weave;
      expect(crossings).toHaveLength(warpX.length * weftY.length);
      const at = (i: number, j: number) => crossings.find((c) => c.warp === i && c.weft === j)!;
      for (let j = 0; j < weftY.length; j++) {
        for (let i = 1; i < warpX.length; i++) expect(at(i, j).warpOver).toBe(!at(i - 1, j).warpOver);
      }
      for (let i = 0; i < warpX.length; i++) {
        for (let j = 1; j < weftY.length; j++) expect(at(i, j).warpOver).toBe(!at(i, j - 1).warpOver);
      }
      for (const c of crossings) {
        expect(c.x).toBe(warpX[c.warp]);
        expect(c.y).toBe(weftY[c.weft]);
        expect(c.warpOver).toBe(warpIsOver(c.warp, c.weft));
      }
    }
  });

  it('patches the warp over the weft at exactly the crossings where the warp is on top, gap first', () => {
    for (const weave of [desktop, mobile]) {
      const over = weave.crossings.filter((c) => c.warpOver);
      const subpaths = weave.woven.patches.match(/M[^M]+/g)!;
      expect(subpaths).toHaveLength(over.length);
      over.forEach((c, k) => {
        const [, x, y0, y1] = subpaths[k].match(/^M([\d.]+) ([\d.]+)V([\d.]+)$/)!.map(Number);
        expect(x).toBeCloseTo(c.x, 1);
        // the patch spans the weft's full width and a little more
        expect(c.y - y0).toBeGreaterThan(weave.composition.weft.strokeWidth / 2);
        expect(y1 - c.y).toBeGreaterThan(weave.composition.weft.strokeWidth / 2);
      });
      // each gap is laid under its patch, a unit shorter at each end
      const gaps = weave.woven.gaps.match(/M[^M]+/g)!;
      expect(gaps).toHaveLength(over.length);
      gaps.forEach((g, k) => {
        const [, gx, g0, g1] = g.match(/^M([\d.]+) ([\d.]+)V([\d.]+)$/)!.map(Number);
        const [, px, p0, p1] = subpaths[k].match(/^M([\d.]+) ([\d.]+)V([\d.]+)$/)!.map(Number);
        expect(gx).toBe(px);
        expect(g0 - p0).toBeCloseTo(1, 1);
        expect(p1 - g1).toBeCloseTo(1, 1);
      });
    }
  });
});

describe('the loose segment', () => {
  it('meets the cloth at the weave entry, at every moment, leaving it along the woven line', () => {
    for (const t of desktop.loose) {
      for (const time of [0, 1.3, 4.9, 7.25]) {
        const [x, y] = loosePoint(t, time, 0);
        expect(x).toBeCloseTo(t.entry[0], 9);
        expect(y).toBeCloseTo(t.entry[1], 9);
        // a hair along the thread, the point is still on the woven line
        const [ax, ay] = loosePoint(t, time, 0.5);
        const off = (ax - t.entry[0]) * t.across[0] + (ay - t.entry[1]) * t.across[1];
        expect(Math.abs(off)).toBeLessThan(1e-3);
      }
      expect(looseD(t, 2).startsWith(`M${fmt(t.entry[0])} ${fmt(t.entry[1])}C`)).toBe(true);
    }
  });

  it('is sampled at about 24 points inside the canvas', () => {
    for (const t of desktop.loose) {
      const inside = Array.from(t.s).filter((s) => s <= t.length + 1e-9).length;
      expect(inside).toBe(24);
    }
  });

  it('moves with time away from the cloth', () => {
    const t = desktop.loose[0];
    expect(loosePoint(t, 0, t.length)).not.toEqual(loosePoint(t, 2.5, t.length));
  });

  it('carries its nodes with it', () => {
    for (const n of desktop.nodes) {
      const t = desktop.loose[n.warp];
      expect(nodePosition(desktop, n, 3)).toEqual(loosePoint(t, 3, n.s));
    }
  });
});

describe('the keep-out', () => {
  it('is never crossed by a thread or a node over a whole period of the motion', () => {
    for (const weave of [desktop, mobile]) {
      const { keepOut } = weave;
      for (let time = 0; time <= weave.composition.period; time += 0.5) {
        for (const t of weave.loose) {
          for (let s = 0; s <= t.s[t.s.length - 1]; s += 8) {
            const [x, y] = loosePoint(t, time, s);
            if (t.kind === 'warp') expect(x - t.strokeWidth / 2).toBeGreaterThanOrEqual(keepOut.left);
            else expect(y - t.strokeWidth / 2).toBeGreaterThanOrEqual(keepOut.top);
          }
        }
        for (const n of weave.nodes) {
          const [x] = nodePosition(weave, n, time);
          expect(x - n.r).toBeGreaterThanOrEqual(keepOut.left);
        }
      }
    }
  });
});

describe('the fit', () => {
  const box = { width: 1440, height: 810, textRight: 951, textBottom: 373, gap: 40, maxCrop: 0.25 };

  it('anchors the composition bottom-right and keeps every thread clear of the headline', () => {
    for (const b of [
      box,
      { ...box, width: 1024, height: 691, textRight: 684, textBottom: 301 },
      { ...box, width: 768, height: 900, textRight: 532, textBottom: 325, gap: 28 },
      { ...box, width: 2560, height: 900, textRight: 1041, textBottom: 393 },
    ]) {
      const fit = fitComposition(desktop, b)!;
      expect(fit.scale).toBeGreaterThan(0);
      expect(fit.scale).toBeLessThanOrEqual(b.height / 900);
      // composition px = hero right + shift − (1600 − x) · scale
      const warpLeft = b.width + fit.shift - (1600 - desktop.keepOut.left) * fit.scale;
      const weftTop = b.height - (900 - desktop.keepOut.top) * fit.scale;
      expect(warpLeft).toBeGreaterThanOrEqual(b.textRight + b.gap - 1e-9);
      expect(weftTop).toBeGreaterThanOrEqual(b.textBottom + b.gap - 1e-9);
      // never more than maxCrop of the woven width past the right edge
      expect(fit.shift).toBeLessThanOrEqual(b.maxCrop * 600 * fit.scale + 1e-9);
    }
  });

  it('fills the hero when there is room, and gives up when nothing fits beside the headline', () => {
    expect(fitComposition(desktop, { ...box, width: 2560, height: 900, textRight: 1041, textBottom: 393 })).toEqual({ scale: 1, shift: 0 });
    expect(fitComposition(desktop, { ...box, width: 600, textRight: 590 })).toBeNull();
  });
});

describe('spaced', () => {
  it('is even at compress 1 and denser toward the end above it', () => {
    expect(spaced(0, 10, 3, 1)).toEqual([0, 5, 10]);
    const d = diffs(spaced(0, 10, 5, 2));
    expect(d[0]).toBeGreaterThan(d[3]);
  });
});
