/**
 * The Home Hero v2 weave's motion (src/components/hero/weave/animate.ts,
 * docs/home-hero-v2.md §2 "Motion", R7): the intro's three phases with their
 * staggers and easeOutCubic, the idle field growing in after it with the
 * PRD's formula, period range and k, and the nodes flowing down their warps
 * at their own pace, fading in at the top and out before the cloth.
 */
import { describe, expect, it } from 'vitest';
import { IDLE, INTRO, NODES, SAMPLE_STEP } from '@/components/hero/weave/constants';
import {
  drawDuration,
  easeOutCubic,
  idleAmplitude,
  INTRO_END,
  nodeFlowAlpha,
  nodeProgress,
  nodeRun,
  nodeScale,
  nodeY,
  sampleSpan,
  sampleWarp,
  sampleWeft,
  warpProgress,
  warpX,
  weftProgress,
  weftY,
} from '@/components/hero/weave/animate';
import { buildWeave } from '@/components/hero/weave/geometry';

const model = buildWeave({ width: 1366, height: 440, viewportWidth: 1366, mobile: false, lines: [{ left: 82, top: 130, right: 660, bottom: 270 }] });
const buf = () => [new Float32Array(model.maxSamples), new Float32Array(model.maxSamples)] as const;

describe('easing', () => {
  it('is easeOutCubic, clamped to 0..1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 12);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });
});

describe('the intro', () => {
  it('draws the warps inside 0–1.2 s, 35 ms apart from left to right', () => {
    const n = model.warps.length;
    const d = drawDuration(INTRO.warp, n);
    expect(warpProgress(model, 0, 0)).toBe(0);
    expect(warpProgress(model, 1, 0.035)).toBeCloseTo(0, 9);
    expect(warpProgress(model, 1, 0.035 + d / 2)).toBeCloseTo(easeOutCubic(0.5), 9);
    // the last one is done at 1.2 s
    expect(warpProgress(model, n - 1, 1.2)).toBeCloseTo(1, 9);
    expect(warpProgress(model, n - 1, 1.19)).toBeLessThan(1);
    // the left one leads
    expect(warpProgress(model, 0, 0.4)).toBeGreaterThan(warpProgress(model, n - 1, 0.4));
  });

  it('extends the wefts inside 1.0–2.5 s, 80 ms apart from top to bottom', () => {
    const m = model.wefts.length;
    expect(weftProgress(model, 0, 1.0)).toBe(0);
    expect(weftProgress(model, 0, 1.01)).toBeGreaterThan(0);
    expect(weftProgress(model, 1, 1.08)).toBeCloseTo(0, 9);
    expect(weftProgress(model, m - 1, 2.5)).toBeCloseTo(1, 9);
    expect(weftProgress(model, m - 1, 2.45)).toBeLessThan(1);
  });

  it('fades and grows the nodes in over 2.0–2.6 s, from 0.6 of their size', () => {
    expect(nodeProgress(1.99)).toBe(0);
    expect(nodeScale(nodeProgress(2.0))).toBeCloseTo(0.6, 12);
    expect(nodeProgress(2.3)).toBeCloseTo(easeOutCubic(0.5), 9);
    expect(nodeProgress(2.6)).toBe(1);
    expect(nodeScale(1)).toBe(1);
    expect(INTRO_END).toBe(2.6);
  });

  it('never draws a thread in under half a second, however many there are', () => {
    expect(drawDuration(INTRO.warp, 40)).toBe(INTRO.minDuration);
  });
});

describe('the idle motion', () => {
  it('is still through the intro and grows in over the second after it', () => {
    expect(idleAmplitude(model, 0)).toBe(0);
    expect(idleAmplitude(model, INTRO_END)).toBe(0);
    expect(idleAmplitude(model, INTRO_END + 0.5)).toBeCloseTo(1.5, 9);
    expect(idleAmplitude(model, INTRO_END + 1)).toBe(3);
    expect(idleAmplitude(model, 60)).toBe(3);
  });

  it('displaces a warp by A·sin(2πt/T + φ + k·y) and a weft by A·sin(2πt/T′ + φ + k·x) in the woven region', () => {
    const warp = model.warps[3];
    const weft = model.wefts[2];
    const t = 7.3;
    const y = 300;
    const x = 1000;
    expect(warpX(warp, y, t, 3)).toBeCloseTo(warp.x + 3 * Math.sin((2 * Math.PI * t) / warp.period + warp.phase + IDLE.k * y), 9);
    expect(weftY(weft, x, t, 3)).toBeCloseTo(weft.y + 3 * Math.sin((2 * Math.PI * t) / weft.period + weft.phase + IDLE.k * x), 9);
    expect(warpX(warp, y, t, 0)).toBe(warp.x);
  });

  it('gives every thread its own period, 6–10 s', () => {
    for (const thread of [...model.warps, ...model.wefts]) {
      expect(thread.period).toBeGreaterThanOrEqual(6);
      expect(thread.period).toBeLessThanOrEqual(10);
    }
    expect(new Set(model.warps.map((w) => w.period)).size).toBeGreaterThan(1);
  });

  it('keeps the crossings together: a warp and a weft still meet within the idle amplitude of their crossing', () => {
    for (const c of model.crossings) {
      for (const t of [3, 5.5, 9]) {
        expect(Math.abs(warpX(model.warps[c.i], c.y, t, 3) - c.x)).toBeLessThanOrEqual(3 + 1e-9);
        expect(Math.abs(weftY(model.wefts[c.j], c.x, t, 3) - c.y)).toBeLessThanOrEqual(3 + 1e-9);
      }
    }
  });
});

describe('sampling', () => {
  it('samples every 8px, down to the drawn share of a warp, ending exactly there', () => {
    const [xs, ys] = buf();
    const warp = model.warps[0];
    const n = sampleWarp(warp, 0, 0, 0.5, xs, ys);
    expect(ys[0]).toBe(0);
    expect(ys[1] - ys[0]).toBe(SAMPLE_STEP);
    expect(ys[n - 1]).toBeCloseTo(220, 4);
    expect(sampleWarp(warp, 0, 0, 0, xs, ys)).toBe(0);
  });

  it('samples a weft from its free end rightward', () => {
    const [xs, ys] = buf();
    const weft = model.wefts[0];
    const n = sampleWeft(weft, 0, 0, 1, xs, ys);
    expect(xs[0]).toBeCloseTo(weft.left, 4);
    expect(xs[n - 1]).toBeCloseTo(weft.right, 4);
  });

  it('samples a span of a warp between two heights', () => {
    const [xs, ys] = buf();
    const n = sampleSpan(model.warps[1], 200, 220, 4, 3, xs, ys);
    expect(ys[0]).toBe(200);
    expect(ys[n - 1]).toBe(220);
    expect(sampleSpan(model.warps[1], 220, 200, 4, 3, xs, ys)).toBe(0);
  });
});

describe('the nodes', () => {
  it('rest where they start through the intro', () => {
    for (const node of model.nodes) {
      expect(nodeRun(node, 0)).toBeCloseTo(node.phase, 9);
      expect(nodeY(node, INTRO_END)).toBeCloseTo(node.yStart + node.phase * (node.yEnd - node.yStart), 9);
    }
  });

  it('flow down their warp at their own pace once the intro is over, and start again at the top', () => {
    for (const node of model.nodes) {
      const span = node.yEnd - node.yStart;
      const dt = 0.25;
      let last = nodeY(node, INTRO_END);
      let wraps = 0;
      for (let t = INTRO_END + dt; t < INTRO_END + 60; t += dt) {
        const y = nodeY(node, t);
        expect(y).toBeGreaterThanOrEqual(node.yStart);
        expect(y).toBeLessThan(node.yEnd);
        if (y < last) {
          // back at the top: it went past the end by what it had left to travel
          wraps++;
          expect(last + node.speed * dt - span).toBeCloseTo(y, 6);
        } else {
          expect(y - last).toBeCloseTo(node.speed * dt, 6);
        }
        last = y;
      }
      // 60 s at 18–30 px/s over a run of about a hundred px: round several times
      expect(wraps).toBeGreaterThanOrEqual(Math.floor((node.speed * 60) / span) - 1);
    }
  });

  it('fade in over the top of their run and out over its foot, so their return is never seen', () => {
    const node = model.nodes[0];
    const span = node.yEnd - node.yStart;
    const fade = Math.min(NODES.fade, span / 3);
    // the time at which the node stands d px down its run, on its first pass
    const at = (d: number) => INTRO_END + (((d / span - node.phase + 1) % 1) * span) / node.speed;
    expect(nodeFlowAlpha(node, at(0))).toBeCloseTo(0, 9);
    expect(nodeFlowAlpha(node, at(fade / 2))).toBeCloseTo(0.5, 6);
    expect(nodeFlowAlpha(node, at(span / 2))).toBe(1);
    expect(nodeFlowAlpha(node, at(span - fade / 2))).toBeCloseTo(0.5, 6);
    expect(nodeFlowAlpha(node, at(span - 0.01))).toBeLessThan(1e-3);
    expect(nodeFlowAlpha(node, at(0.01))).toBeLessThan(1e-3);
  });
});
