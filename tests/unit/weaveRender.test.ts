/**
 * Drawing the Home Hero v2 weave (src/components/hero/weave/render.ts,
 * docs/home-hero-v2.md §3 "Rendering"), on a context that records what is
 * asked of it: warps, then wefts with their dashed fibre, then the warps'
 * segments over the wefts at exactly the crossings where the warp is on
 * top, then the nodes, a hollow one clearing its disc first and each faded
 * along its run; each weft tapering in from its own free end; nothing drawn
 * before the intro begins and the full weave when still.
 */
import { describe, expect, it } from 'vitest';
import { SAMPLE_STEP, STROKE, WEFT_TAPER } from '@/components/hero/weave/constants';
import { idleAmplitude, INTRO_END, nodeFlowAlpha, nodeY, warpX } from '@/components/hero/weave/animate';
import { buildWeave } from '@/components/hero/weave/geometry';
import { drawWeave, preparePaint, weftAlpha, withAlpha } from '@/components/hero/weave/render';

type Op = { op: string; args: unknown[]; state: Record<string, unknown> };

/** A 2D context that keeps a log of its calls, with the drawing state at each. */
function recorder() {
  const log: Op[] = [];
  const state: Record<string, unknown> = { globalAlpha: 1, globalCompositeOperation: 'source-over', lineDash: [] };
  let path: number[][] = [];
  const ctx = {
    log,
    paths: [] as { points: number[][]; state: Record<string, unknown> }[],
    beginPath() {
      path = [];
      log.push({ op: 'beginPath', args: [], state: { ...state } });
    },
    moveTo(x: number, y: number) {
      path.push([x, y, 1]);
    },
    lineTo(x: number, y: number) {
      path.push([x, y, 0]);
    },
    arc(...args: unknown[]) {
      log.push({ op: 'arc', args, state: { ...state } });
    },
    stroke() {
      log.push({ op: 'stroke', args: [], state: { ...state } });
      ctx.paths.push({ points: path, state: { ...state } });
    },
    fill() {
      log.push({ op: 'fill', args: [], state: { ...state } });
    },
    fillRect(...args: unknown[]) {
      log.push({ op: 'fillRect', args, state: { ...state } });
    },
    setLineDash(d: number[]) {
      state.lineDash = d;
    },
    createLinearGradient(...args: number[]) {
      const stops: [number, string][] = [];
      return { args, stops, addColorStop: (o: number, c: string) => stops.push([o, c]) };
    },
  };
  for (const key of ['strokeStyle', 'fillStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha', 'globalCompositeOperation']) {
    Object.defineProperty(ctx, key, { get: () => state[key], set: (v) => (state[key] = v) });
  }
  return ctx;
}

const palette = { ink: '#1E2761', accent: '#C2694A', fibre: '#D98B6E' };
const LINES = [
  { left: 82, top: 130, right: 660, bottom: 200 },
  { left: 82, top: 200, right: 610, bottom: 270 },
];
const model = buildWeave({ width: 1366, height: 440, viewportWidth: 1366, mobile: false, lines: LINES });

function draw(t: number, still = false, m = model) {
  const ctx = recorder();
  const paint = preparePaint(ctx as unknown as CanvasRenderingContext2D, m, palette);
  drawWeave(ctx as unknown as CanvasRenderingContext2D, m, paint, t, still);
  return ctx;
}

describe('the drawing order', () => {
  it('strokes the warps, then each weft and its dashed fibre, then the warps over the wefts, then the nodes', () => {
    const ctx = draw(0, true);
    const strokes = ctx.paths.map((p) => p.state);
    // warps first: ink, 2px, no dash
    expect(strokes[0]).toMatchObject({ strokeStyle: palette.ink, lineWidth: STROKE.warp });
    // then per weft: its 5px stroke and its 1.5px dashed fibre
    for (let j = 0; j < model.wefts.length; j++) {
      expect(strokes[1 + 2 * j]).toMatchObject({ lineWidth: STROKE.weft, lineDash: [] });
      expect(strokes[2 + 2 * j]).toMatchObject({ lineWidth: STROKE.fibre, lineDash: [...STROKE.fibreDash] });
    }
    // then the warp patches, ink again
    const patches = strokes[1 + 2 * model.wefts.length];
    expect(patches).toMatchObject({ strokeStyle: palette.ink, lineWidth: STROKE.warp, lineDash: [] });
    // the nodes come after every stroke of a thread
    const lastThread = ctx.log.map((o) => o.op).lastIndexOf('stroke', ctx.log.findIndex((o) => o.op === 'arc'));
    expect(lastThread).toBeGreaterThan(-1);
  });

  it('draws each warp once: under the wefts but for ±P/3 of each crossing where it is on top, and over them there', () => {
    const ctx = draw(0, true);
    const under = ctx.paths[0].points;
    const over = ctx.paths[1 + 2 * model.wefts.length].points;
    const reach = model.pitch / 3;
    for (const c of model.crossings) {
      // within half a sample step: the polyline passes through the crossing
      const near = (pts: number[][]) => pts.some(([x, y]) => Math.abs(x - c.x) < 0.5 && Math.abs(y - c.y) <= SAMPLE_STEP / 2 + 1e-6);
      // a warp-over crossing is drawn after the wefts and not before; a weft-over one only before
      expect(near(over)).toBe(c.warpOver);
      expect(near(under)).toBe(!c.warpOver);
    }
    // each patch spans ±P/3
    for (const i of [0, 1]) {
      const y = model.overAt[i][0];
      const pts = over.filter(([x]) => Math.abs(x - model.warps[i].x) < 0.5);
      const ys = pts.map(([, py]) => py).filter((py) => Math.abs(py - y) <= reach + 1e-3);
      expect(Math.min(...ys)).toBeCloseTo(y - reach, 3);
      expect(Math.max(...ys)).toBeCloseTo(y + reach, 3);
    }
  });

  it('clears the hollow nodes’ discs before ringing them, and fills the solid ones, leaving out those faded to nothing', () => {
    const t = INTRO_END + 4.2;
    const ctx = draw(t);
    const shown = model.nodes.filter((n) => nodeFlowAlpha(n, t) > 0.002);
    const full = shown.filter((n) => nodeFlowAlpha(n, t) >= 0.999);
    const fading = shown.filter((n) => nodeFlowAlpha(n, t) < 0.999);
    // many nodes in view, most at full strength, some fading
    expect(shown.length).toBeGreaterThan(model.warps.length);
    expect(full.length).toBeGreaterThan(fading.length);
    expect(fading.length).toBeGreaterThan(0);
    expect(ctx.log.filter((o) => o.op === 'arc')).toHaveLength(shown.length);
    // the ones at full strength in one path of each kind, the fading ones one by one
    const cleared = ctx.log.filter((o) => o.op === 'fill' && o.state.globalCompositeOperation === 'destination-out');
    expect(cleared).toHaveLength(1 + fading.filter((n) => n.hollow).length);
    const solid = ctx.log.filter((o) => o.op === 'fill' && o.state.globalCompositeOperation === 'source-over' && o.state.fillStyle === palette.ink);
    expect(solid).toHaveLength(1 + fading.filter((n) => !n.hollow).length);
    // each clear is followed by its ring
    for (const fill of cleared) {
      const next = ctx.log[ctx.log.indexOf(fill) + 1];
      expect(next).toMatchObject({ op: 'stroke', state: { strokeStyle: palette.ink, lineWidth: 1.5, globalCompositeOperation: 'source-over' } });
    }
  });

  it('draws each node where its run has brought it, at its flow’s opacity', () => {
    const t = INTRO_END + 4.2;
    const arcs = draw(t).log.filter((o) => o.op === 'arc');
    for (const n of model.nodes.filter((m) => nodeFlowAlpha(m, t) > 0.002)) {
      const y = nodeY(n, t);
      const x = warpX(model.warps[n.warp], y, t, idleAmplitude(model, t));
      // on its warp as the warp lies this frame, rest wave and idle motion and all
      const arc = arcs.find((a) => Math.abs((a.args[0] as number) - x) < 1e-3 && Math.abs((a.args[1] as number) - y) < 1e-3)!;
      expect(arc).toBeDefined();
      expect(arc.args[2]).toBeCloseTo(n.r, 5);
      expect(arc.state.globalAlpha).toBeCloseTo(nodeFlowAlpha(n, t), 2);
    }
  });

  it('fades the weave out over the bottom edge, clearing a pixel past it for a buffer rounded up', () => {
    const ctx = draw(0, true);
    const fade = ctx.log.filter((o) => o.op === 'fillRect');
    expect(fade).toHaveLength(1);
    expect(fade[0].state.globalCompositeOperation).toBe('destination-out');
    expect(fade[0].args).toEqual([0, 400, 1366, 41]);
  });
});

describe('the intro and still frames', () => {
  it('draws nothing before the intro begins, and the whole weave when still', () => {
    const empty = draw(0, false);
    expect(empty.paths.every((p) => p.points.length === 0)).toBe(true);
    expect(empty.log.some((o) => o.op === 'arc')).toBe(false);
    const still = draw(0, true);
    expect(still.paths[0].points.length).toBeGreaterThan(model.warps.length * 10);
  });

  it('shows the nodes once the intro reaches them', () => {
    expect(draw(1.9).log.some((o) => o.op === 'arc')).toBe(false);
    const late = draw(2.3);
    const arc = late.log.find((o) => o.op === 'arc')!;
    expect(arc.state.globalAlpha).toBeGreaterThan(0);
    expect(arc.state.globalAlpha).toBeLessThan(1);
  });
});

describe('the wefts', () => {
  it('fade in from each one’s own free end over its first 80px, or over its loose part if shorter', () => {
    for (const weft of model.wefts) {
      const taper = Math.min(WEFT_TAPER, weft.wovenFrom - weft.left);
      if (taper <= 0) {
        expect(weftAlpha(weft, weft.left)).toBe(1);
        continue;
      }
      expect(weftAlpha(weft, weft.left)).toBe(0);
      expect(weftAlpha(weft, weft.left + taper / 2)).toBeCloseTo(0.5, 9);
      expect(weftAlpha(weft, weft.left + taper)).toBe(1);
      expect(weftAlpha(weft, 1200)).toBe(1);
    }
  });

  it('are stroked with that taper as a gradient from the free end', () => {
    const paint = preparePaint(recorder() as unknown as CanvasRenderingContext2D, model, palette);
    const weft = model.wefts[0];
    const g = paint.weft[weft.j] as unknown as { args: number[]; stops: [number, string][] };
    expect(g.args).toEqual([weft.left, 0, weft.left + WEFT_TAPER, 0]);
    expect(g.stops).toEqual([
      [0, 'rgba(194, 105, 74, 0)'],
      [1, 'rgba(194, 105, 74, 1)'],
    ]);
    // a weft stopped right of the headline still tapers in from where it starts
    expect(weft.left).toBeGreaterThan(LINES[0].right);
  });

  it('are plain colours on a phone, where nothing is loose', () => {
    const phone = buildWeave({ width: 390, height: 205, viewportWidth: 390, mobile: true, lines: [] });
    const paint = preparePaint(recorder() as unknown as CanvasRenderingContext2D, phone, palette);
    expect(paint.weft.every((s) => s === palette.accent)).toBe(true);
    expect(paint.topFade).not.toBeNull();
  });
});

describe('colours', () => {
  it('turns a CSS colour into rgba at an alpha', () => {
    expect(withAlpha('#C2694A', 0.35)).toBe('rgba(194, 105, 74, 0.35)');
    expect(withAlpha('#fff', 1)).toBe('rgba(255, 255, 255, 1)');
    expect(withAlpha('rgb(30, 39, 97)', 0.5)).toBe('rgba(30, 39, 97, 0.5)');
  });
});
