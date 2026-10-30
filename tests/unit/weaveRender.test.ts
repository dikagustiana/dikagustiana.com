/**
 * Drawing the Home Hero v2 weave (src/components/hero/weave/render.ts,
 * docs/home-hero-v2.md §3 "Rendering"), on a context that records what is
 * asked of it: warps, then wefts with their dashed fibre, then the warps'
 * segments over the wefts at exactly the crossings where the warp is on
 * top, then the nodes, a hollow one clearing its disc first; the faded and
 * tapering wefts; nothing drawn before the intro begins and the full weave
 * when still.
 */
import { describe, expect, it } from 'vitest';
import { SAMPLE_STEP, STROKE, UNDER_TEXT, WEFT_TAPER } from '@/components/hero/weave/constants';
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
const TEXT = { left: 82, top: 130, right: 792, bottom: 410 };
const model = buildWeave({ width: 1366, height: 440, viewportWidth: 1366, mobile: false, text: TEXT });

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

  it('clears a hollow node’s disc before ringing it, and fills a solid one', () => {
    const ctx = draw(0, true);
    const arcs = ctx.log.filter((o) => o.op === 'arc').length;
    expect(arcs).toBe(model.nodes.length);
    const cleared = ctx.log.filter((o) => o.op === 'fill' && o.state.globalCompositeOperation === 'destination-out').length;
    expect(cleared).toBe(model.nodes.filter((n) => n.hollow).length);
    const solid = ctx.log.filter((o) => o.op === 'fill' && o.state.globalCompositeOperation === 'source-over' && o.state.fillStyle === palette.ink).length;
    expect(solid).toBe(model.nodes.filter((n) => !n.hollow).length);
  });

  it('fades the weave out over the bottom edge', () => {
    const ctx = draw(0, true);
    const fade = ctx.log.filter((o) => o.op === 'fillRect');
    expect(fade).toHaveLength(1);
    expect(fade[0].state.globalCompositeOperation).toBe('destination-out');
    expect(fade[0].args).toEqual([0, 400, 1366, 40]);
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

describe('the wefts under the headline', () => {
  it('fade in from the free end, and sit at 35% under the block, rising to full over its last 120px', () => {
    const start = Math.min(...model.wefts.map((w) => w.left));
    expect(weftAlpha(model, start, false)).toBe(0);
    expect(weftAlpha(model, start + WEFT_TAPER, false)).toBe(1);
    expect(weftAlpha(model, 500, true)).toBeCloseTo(UNDER_TEXT.alpha, 9);
    expect(weftAlpha(model, TEXT.right - UNDER_TEXT.fade, true)).toBeCloseTo(UNDER_TEXT.alpha, 9);
    expect(weftAlpha(model, TEXT.right - UNDER_TEXT.fade / 2, true)).toBeCloseTo((UNDER_TEXT.alpha + 1) / 2, 9);
    expect(weftAlpha(model, TEXT.right, true)).toBe(1);
    expect(weftAlpha(model, 1200, true)).toBe(1);
  });

  it('are stroked with the faded gradient, the others with the plain taper', () => {
    // a shorter block, so some wefts pass below it
    const short = buildWeave({ width: 1366, height: 440, viewportWidth: 1366, mobile: false, text: { ...TEXT, bottom: 260 } });
    const paint = preparePaint(recorder() as unknown as CanvasRenderingContext2D, short, palette);
    const faded = short.wefts.find((w) => w.underText)!;
    const plain = short.wefts.find((w) => !w.underText)!;
    const stopsOf = (g: unknown) => (g as { stops: [number, string][] }).stops;
    expect(stopsOf(paint.weft[faded.j]).some(([, c]) => c.endsWith(`, ${UNDER_TEXT.alpha})`))).toBe(true);
    expect(stopsOf(paint.weft[plain.j]).some(([, c]) => c.endsWith(`, ${UNDER_TEXT.alpha})`))).toBe(false);
  });

  it('are plain colours on a phone, where nothing is loose and nothing lies under text', () => {
    const phone = buildWeave({ width: 390, height: 205, viewportWidth: 390, mobile: true, text: null });
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
