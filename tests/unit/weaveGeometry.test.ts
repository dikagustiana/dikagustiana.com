/**
 * The Home Hero v2 weave's geometry (src/components/hero/weave/geometry.ts,
 * docs/home-hero-v2.md §2): a square grid whose pitch is clamp(52px, 3.4vw,
 * 68px) on a desktop and 40px on a phone, counts that follow from the region
 * (floor(wovenW/P) + 1 warps, floor(wovenH/P) wefts), the woven region from
 * 60% of the width and from band + P down, wefts loose from 22% but never
 * under a line of text, three nodes flowing on each warp's free zone (two on
 * a phone's fringe), half solid and half hollow, and plain-weave parity.
 */
import { describe, expect, it } from 'vitest';
import { BAND, MOBILE_WARP_FREE, NODES, STROKE, TEXT_CLEARANCE, WAVE, WEFT_FREE_JITTER } from '@/components/hero/weave/constants';
import { buildWeave, desktopPitch, restOffset, warpIsOver, weftReach, type WeaveInput, type WeaveModel } from '@/components/hero/weave/geometry';
import { mulberry32 } from '@/components/hero/weave/rng';

/** The headline's two lines and the subtitle's two, at 1366 × 440. */
const LINES = [
  { left: 82, top: 130, right: 660, bottom: 200 },
  { left: 82, top: 200, right: 610, bottom: 270 },
  { left: 82, top: 294, right: 520, bottom: 326 },
  { left: 82, top: 326, right: 470, bottom: 358 },
];
const desktop = (over: Partial<WeaveInput> = {}) =>
  buildWeave({ width: 1366, height: 440, viewportWidth: 1366, mobile: false, lines: LINES, ...over });
const mobile = (over: Partial<WeaveInput> = {}) =>
  buildWeave({ width: 390, height: 205, viewportWidth: 390, mobile: true, lines: [], ...over });
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
    const model = desktop({ lines: [] });
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

  it('carries three nodes on each warp, radius 5–7px, half solid and half hollow, inside the free zone', () => {
    const model = desktop({ width: 1920, height: 655, viewportWidth: 1920 });
    expectNodes(model, NODES.perWarp, NODES.top);
  });
});

describe('the text', () => {
  it('has no weft under any of its lines: a weft level with a line starts just right of it', () => {
    const model = desktop();
    const free = desktop({ lines: [] });
    const reach = weftReach(model.amplitude);
    expect(reach).toBe(STROKE.weft / 2 + WAVE.weft.amplitude * 1.3 + 3);
    for (const weft of model.wefts) {
      const level = LINES.filter((l) => l.bottom > weft.y - reach && l.top < weft.y + reach);
      const expected = Math.min(weft.wovenFrom, Math.max(free.wefts[weft.j].left, ...level.map((l) => l.right + TEXT_CLEARANCE)));
      expect(weft.left).toBeCloseTo(expected, 9);
      for (const l of level) expect(weft.left).toBeGreaterThanOrEqual(l.right + TEXT_CLEARANCE);
    }
    // the headline's first line and its second both stop the top weft; each subtitle line stops one; the last weft runs free
    expect(model.wefts.map((w) => Math.round(w.left))).toEqual([688, 638, 548, 498, Math.round(free.wefts[4].left)]);
  });

  it('leaves a weft no loose part where a line reaches the cloth', () => {
    const model = desktop({ lines: [{ left: 82, top: 380, right: 900, bottom: 410 }] });
    const last = model.wefts.at(-1)!;
    expect(last.left).toBe(last.wovenFrom);
  });
});

/** Every warp with a run carries `perWarp` nodes, flowing from `top` to just above the cloth. */
function expectNodes(model: WeaveModel, perWarp: number, top: number) {
  for (const warp of model.warps) {
    const own = model.nodes.filter((x) => x.warp === warp.i);
    expect(own).toHaveLength(perWarp);
    // all at the warp's own pace, spread evenly along its run, so they never meet
    expect(new Set(own.map((n) => n.speed)).size).toBe(1);
    const phases = own.map((n) => n.phase).sort((a, b) => a - b);
    const gaps = phases.map((p, k) => (k === 0 ? p + 1 - phases.at(-1)! : p - phases[k - 1]));
    for (const g of gaps) expect(g).toBeGreaterThan(0.8 / perWarp);
  }
  const hollow = model.nodes.filter((n) => n.hollow).length;
  expect(Math.abs(hollow - (model.nodes.length - hollow))).toBeLessThanOrEqual(1);
  for (const n of model.nodes) {
    expect(n.r).toBeGreaterThanOrEqual(NODES.radius[0]);
    expect(n.r).toBeLessThanOrEqual(NODES.radius[1]);
    expect(n.speed).toBeGreaterThanOrEqual(NODES.speed[0]);
    expect(n.speed).toBeLessThanOrEqual(NODES.speed[1]);
    expect(n.phase).toBeGreaterThanOrEqual(0);
    expect(n.phase).toBeLessThan(1);
    expect(n.yStart).toBe(top);
    // never reaching the woven region
    expect(n.yEnd + n.r + NODES.clearance).toBeLessThanOrEqual(model.wovenTop);
  }
}

describe('the phone layout', () => {
  it('is woven edge to edge under a short fringe of loose warp, with no loose weft', () => {
    const model = mobile();
    const fringe = Math.min(MOBILE_WARP_FREE, 205 / 3);
    expect(model.wovenTop).toBeCloseTo(fringe, 9);
    expect(model.warps).toHaveLength(Math.floor(390 / 40) + 1);
    expect(model.wefts).toHaveLength(Math.floor((205 - fringe) / 40));
    for (const warp of model.warps) {
      expect(warp.top).toBe(0);
      expect(warp.wovenFrom).toBeCloseTo(fringe, 9);
      for (const wave of warp.waves) expect(wave.amp).toBeLessThanOrEqual(WAVE.warp.amplitude * 0.6);
    }
    for (const weft of model.wefts) {
      expect(weft.left).toBe(0);
      expect(weft.wovenFrom).toBe(0);
      expect(weft.right).toBe(390);
      expect(weft.waves).toEqual([]);
      expect(weft.y).toBeGreaterThan(fringe);
    }
    // the grid is centred across, and in the block under the fringe
    expect(model.warps[0].x).toBeCloseTo(390 - model.warps.at(-1)!.x, 9);
    expect(model.wefts[0].y - fringe).toBeCloseTo(205 - model.wefts.at(-1)!.y, 9);
  });

  it('carries two nodes on each warp of the fringe', () => {
    expectNodes(mobile(), NODES.mobilePerWarp, NODES.mobileTop);
    expect(mobile().nodes.length).toBe(2 * mobile().warps.length);
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
