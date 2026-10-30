/**
 * The Home Hero v2 weave's geometry (src/components/hero/weave/geometry.ts,
 * docs/home-hero-v2.md §2): a square grid whose pitch is clamp(52px, 3.4vw,
 * 68px) on a desktop and 40px on a phone, counts that follow from the region
 * (floor(wovenW/P) + 1 warps, floor(wovenH/P) wefts), the woven region from
 * 60% of the width and from band + P down, wefts loose from 22%, nodes in the
 * warps' free zone only, half solid and half hollow, plain-weave parity, and
 * the wefts that pass under the headline marked to be faded.
 */
import { describe, expect, it } from 'vitest';
import { BAND, NODES, STROKE, WAVE, WEFT_FREE_JITTER } from '@/components/hero/weave/constants';
import { buildWeave, desktopPitch, restOffset, warpIsOver, type WeaveInput } from '@/components/hero/weave/geometry';
import { mulberry32 } from '@/components/hero/weave/rng';

const TEXT = { left: 82, top: 130, right: 792, bottom: 410 };
const desktop = (over: Partial<WeaveInput> = {}) =>
  buildWeave({ width: 1366, height: 440, viewportWidth: 1366, mobile: false, text: TEXT, ...over });
const mobile = (over: Partial<WeaveInput> = {}) =>
  buildWeave({ width: 390, height: 205, viewportWidth: 390, mobile: true, text: null, ...over });
const diffs = (xs: number[]) => xs.slice(1).map((x, k) => x - xs[k]);

describe('the seeded generator', () => {
  it('repeats its sequence for a seed and differs between seeds', () => {
    const seq = (seed: number) => Array.from({ length: 5 }, mulberry32(seed));
    expect(seq(7)).toEqual(seq(7));
    expect(seq(8)).not.toEqual(seq(7));
  });

  it('draws the identical weave on every build', () => {
    expect(desktop()).toEqual(desktop());
  });
});

describe('the pitch', () => {
  it('is clamp(52px, 3.4vw, 68px) on a desktop and 40px on a phone', () => {
    expect(desktopPitch(1366)).toBe(52);
    expect(desktopPitch(1800)).toBeCloseTo(61.2, 9);
    expect(desktopPitch(1920)).toBeCloseTo(65.28, 9);
    expect(desktopPitch(2560)).toBe(68);
    expect(mobile().pitch).toBe(40);
  });

  it('is the same for warp and weft: every cell of the woven region is square', () => {
    for (const model of [desktop(), desktop({ width: 1920, height: 655, viewportWidth: 1920 }), mobile()]) {
      const warpGaps = diffs(model.warps.map((w) => w.x));
      const weftGaps = diffs(model.wefts.map((w) => w.y));
      for (const g of [...warpGaps, ...weftGaps]) expect(g).toBeCloseTo(model.pitch, 9);
    }
  });
});

describe('the desktop layout', () => {
  it('weaves from 60% of the width and from band + P, with counts that follow from the region', () => {
    for (const [width, height] of [[1366, 440], [1920, 655], [1024, 463], [2560, 760]]) {
      const model = desktop({ width, height, viewportWidth: width });
      const P = model.pitch;
      expect(model.wovenLeft).toBeCloseTo(0.6 * width, 9);
      expect(model.wovenTop).toBeCloseTo(BAND + P, 9);
      expect(model.warps).toHaveLength(Math.floor((width - 0.6 * width) / P) + 1);
      expect(model.wefts).toHaveLength(Math.floor((height - BAND - P) / P));
      expect(model.warps[0].x).toBeCloseTo(0.6 * width, 9);
      expect(model.warps.at(-1)!.x).toBeLessThanOrEqual(width);
      // the wefts lie inside the woven region
      expect(model.wefts[0].y).toBeGreaterThan(model.wovenTop);
      expect(model.wefts.at(-1)!.y).toBeLessThan(height);
    }
  });

  it('hangs the warps loose above the woven region and runs the wefts loose from 22% of the width', () => {
    const model = desktop();
    for (const warp of model.warps) {
      expect(warp.top).toBe(0);
      expect(warp.wovenFrom).toBe(model.wovenTop);
      expect(warp.bottom).toBe(440);
    }
    for (const weft of model.wefts) {
      expect(Math.abs(weft.left - 0.22 * 1366)).toBeLessThanOrEqual(WEFT_FREE_JITTER);
      expect(weft.wovenFrom).toBe(model.wovenLeft);
      expect(weft.right).toBe(1366);
    }
  });

  it('carries one or two nodes on each warp, radius 5–7px, half solid and half hollow, inside the free zone', () => {
    const model = desktop({ width: 1920, height: 655, viewportWidth: 1920 });
    for (const warp of model.warps) {
      const n = model.nodes.filter((x) => x.warp === warp.i).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(2);
    }
    const hollow = model.nodes.filter((n) => n.hollow).length;
    expect(Math.abs(hollow - (model.nodes.length - hollow))).toBeLessThanOrEqual(1);
    for (const n of model.nodes) {
      expect(n.r).toBeGreaterThanOrEqual(5);
      expect(n.r).toBeLessThanOrEqual(7);
      expect(n.speed).toBeGreaterThanOrEqual(4);
      expect(n.speed).toBeLessThanOrEqual(8);
      expect(n.yMin - n.r).toBeGreaterThanOrEqual(NODES.top);
      // never reaching the woven region
      expect(n.yMax + n.r).toBeLessThanOrEqual(model.wovenTop);
      expect(n.y0).toBeGreaterThanOrEqual(n.yMin);
      expect(n.y0).toBeLessThanOrEqual(n.yMax);
    }
  });

  it('marks the wefts that pass under the headline block, and only those', () => {
    const model = desktop();
    const under = model.wefts.filter((w) => w.underText);
    expect(under.length).toBeGreaterThan(0);
    // a weft's reach across itself: half its stroke, its waviness at most, and the idle amplitude
    const reach = STROKE.weft / 2 + WAVE.weft.amplitude * 1.3 + 3;
    for (const w of model.wefts) expect(w.underText).toBe(w.y - reach < TEXT.bottom && w.y + reach > TEXT.top);
    expect(desktop({ text: null }).wefts.some((w) => w.underText)).toBe(false);
  });
});

describe('the phone layout', () => {
  it('is fully woven edge to edge: no free zones, no nodes', () => {
    const model = mobile();
    expect(model.warps).toHaveLength(Math.floor(390 / 40) + 1);
    expect(model.wefts).toHaveLength(Math.floor(205 / 40));
    for (const warp of model.warps) {
      expect(warp.wovenFrom).toBe(warp.top);
      expect(warp.waves).toEqual([]);
    }
    for (const weft of model.wefts) {
      expect(weft.left).toBe(0);
      expect(weft.wovenFrom).toBe(0);
      expect(weft.right).toBe(390);
      expect(weft.underText).toBe(false);
    }
    expect(model.nodes).toEqual([]);
    // the grid is centred
    expect(model.warps[0].x).toBeCloseTo(390 - model.warps.at(-1)!.x, 9);
  });

  it('halves the idle amplitude', () => {
    expect(mobile().amplitude).toBe(1.5);
    expect(desktop().amplitude).toBe(3);
  });
});

describe('plain weave', () => {
  it('alternates over and under along every warp and every weft, warp on top where i + j is even', () => {
    for (const model of [desktop(), mobile()]) {
      const at = (i: number, j: number) => model.crossings.find((c) => c.i === i && c.j === j)!;
      expect(model.crossings).toHaveLength(model.warps.length * model.wefts.length);
      for (const c of model.crossings) expect(c.warpOver).toBe((c.i + c.j) % 2 === 0);
      for (let j = 0; j < model.wefts.length; j++) {
        for (let i = 1; i < model.warps.length; i++) expect(at(i, j).warpOver).toBe(!at(i - 1, j).warpOver);
      }
      for (let i = 0; i < model.warps.length; i++) {
        for (let j = 1; j < model.wefts.length; j++) expect(at(i, j).warpOver).toBe(!at(i, j - 1).warpOver);
        expect(model.overAt[i]).toEqual(model.crossings.filter((c) => c.i === i && c.warpOver).map((c) => c.y));
      }
    }
    expect(warpIsOver(0, 0)).toBe(true);
    expect(warpIsOver(1, 0)).toBe(false);
  });
});

describe('the loose parts', () => {
  it('meet the woven region flat: no offset and no slope at the boundary', () => {
    const waves = desktop().warps[0].waves;
    expect(restOffset(waves, 0, 80)).toBe(0);
    expect(restOffset(waves, -10, 80)).toBe(0);
    expect(Math.abs(restOffset(waves, 0.01, 80))).toBeLessThan(1e-4);
  });
});
