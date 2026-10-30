/**
 * Drawing the weave on a canvas (docs/home-hero-v2.md §3 "Rendering").
 *
 * Order: every warp, then every weft over them (with its dashed fibre), then
 * at each crossing where the warp is on top its own segment, ±P/3 of the
 * crossing, then the nodes. The warp is split at those segments rather than
 * drawn whole and redrawn: a line stroked twice comes out bolder at its
 * anti-aliased edges, and every patch would show as a darker dash. A hollow
 * node first clears its disc, so the hero's background shows through it and
 * the warp does not. Last, the weave fades out over the hero's bottom edge
 * into the Glimpse's background (and, on a phone, in over its top edge).
 *
 * Everything that does not change from frame to frame (gradients, colours,
 * the point buffers) is made once per layout in preparePaint, so a frame
 * allocates nothing.
 */
import { BOTTOM_FADE, MOBILE_TOP_FADE, NODES, STROKE, UNDER_TEXT, WEFT_TAPER } from './constants';
import { idleAmplitude, INTRO_END, nodeProgress, nodeScale, nodeY, sampleSpan, sampleWeft, warpProgress, warpX, weftProgress } from './animate';
import type { WeaveModel } from './geometry';

export interface Palette {
  ink: string;
  accent: string;
  fibre: string;
}

type Style = string | CanvasGradient;

export interface Paint {
  /** Per weft: its stroke and its fibre's. */
  weft: Style[];
  fibre: Style[];
  bottomFade: CanvasGradient | null;
  topFade: CanvasGradient | null;
  dash: number[];
  noDash: number[];
  xs: Float32Array;
  ys: Float32Array;
  palette: Palette;
}

/** An rgba() string for a CSS colour (#rgb, #rrggbb or rgb()) at an alpha. */
export function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  let r = 0;
  let g = 0;
  let b = 0;
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (d) => d + d) : hex[1];
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    const rgb = c.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (!rgb) return c;
    [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * A weft's opacity at x: it fades in from its free end over WEFT_TAPER, and
 * under the headline block it is UNDER_TEXT.alpha, rising to full over the
 * last UNDER_TEXT.fade px before the block's right edge.
 */
export function weftAlpha(model: WeaveModel, x: number, underText: boolean): number {
  if (model.mobile) return 1;
  const start = Math.min(...model.wefts.map((w) => w.left));
  const taper = Math.min(1, Math.max(0, (x - start) / WEFT_TAPER));
  if (!underText || !model.text) return taper;
  const right = model.text.right;
  const fade = x >= right ? 1 : x <= right - UNDER_TEXT.fade ? UNDER_TEXT.alpha : UNDER_TEXT.alpha + ((1 - UNDER_TEXT.alpha) * (x - (right - UNDER_TEXT.fade))) / UNDER_TEXT.fade;
  return taper * fade;
}

function weftGradient(ctx: CanvasRenderingContext2D, model: WeaveModel, color: string, underText: boolean): Style {
  if (model.mobile || model.wefts.length === 0) return color;
  const start = Math.min(...model.wefts.map((w) => w.left));
  const stops = [start, start + WEFT_TAPER];
  if (underText && model.text) stops.push(model.text.right - UNDER_TEXT.fade, model.text.right);
  const xs = [...new Set(stops.map((x) => Math.min(model.width, Math.max(0, x))))].sort((a, b) => a - b);
  const g = ctx.createLinearGradient(0, 0, model.width, 0);
  for (const x of xs) g.addColorStop(x / model.width, withAlpha(color, weftAlpha(model, x, underText)));
  return g;
}

export function preparePaint(ctx: CanvasRenderingContext2D, model: WeaveModel, palette: Palette): Paint {
  const normal = { weft: weftGradient(ctx, model, palette.accent, false), fibre: weftGradient(ctx, model, palette.fibre, false) };
  const faded = { weft: weftGradient(ctx, model, palette.accent, true), fibre: weftGradient(ctx, model, palette.fibre, true) };
  let bottomFade: CanvasGradient | null = null;
  if (model.height > BOTTOM_FADE) {
    bottomFade = ctx.createLinearGradient(0, model.height - BOTTOM_FADE, 0, model.height);
    bottomFade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomFade.addColorStop(1, 'rgba(0, 0, 0, 1)');
  }
  let topFade: CanvasGradient | null = null;
  if (model.mobile && model.height > MOBILE_TOP_FADE) {
    topFade = ctx.createLinearGradient(0, 0, 0, MOBILE_TOP_FADE);
    topFade.addColorStop(0, 'rgba(0, 0, 0, 1)');
    topFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }
  return {
    weft: model.wefts.map((w) => (w.underText ? faded.weft : normal.weft)),
    fibre: model.wefts.map((w) => (w.underText ? faded.fibre : normal.fibre)),
    bottomFade,
    topFade,
    dash: [...STROKE.fibreDash],
    noDash: [],
    xs: new Float32Array(model.maxSamples),
    ys: new Float32Array(model.maxSamples),
    palette,
  };
}

function polyline(ctx: CanvasRenderingContext2D, xs: Float32Array, ys: Float32Array, n: number) {
  if (n < 2) return;
  ctx.moveTo(xs[0], ys[0]);
  for (let k = 1; k < n; k++) ctx.lineTo(xs[k], ys[k]);
}

/**
 * One frame at time t (seconds since the intro began). Still: the intro's
 * last frame, no idle motion. The caller has cleared the canvas and set its
 * device-pixel transform.
 */
export function drawWeave(ctx: CanvasRenderingContext2D, model: WeaveModel, paint: Paint, t: number, still = false): void {
  const time = still ? INTRO_END : t;
  const A = still ? 0 : idleAmplitude(model, time);
  const { xs, ys, palette } = paint;

  ctx.lineJoin = 'round';

  const reach = model.pitch / 3;

  // 1. The warps, but for their segments over the wefts.
  ctx.beginPath();
  for (const warp of model.warps) {
    const drawnTo = warp.top + (warp.bottom - warp.top) * (still ? 1 : warpProgress(model, warp.i, time));
    let from = warp.top;
    for (const y of model.overAt[warp.i]) {
      polyline(ctx, xs, ys, sampleSpan(warp, from, Math.min(drawnTo, y - reach), time, A, xs, ys));
      from = y + reach;
    }
    polyline(ctx, xs, ys, sampleSpan(warp, from, drawnTo, time, A, xs, ys));
  }
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = STROKE.warp;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 2. The wefts over them, each with its fibre.
  for (const weft of model.wefts) {
    const n = sampleWeft(weft, time, A, still ? 1 : weftProgress(model, weft.j, time), xs, ys);
    if (n < 2) continue;
    ctx.beginPath();
    polyline(ctx, xs, ys, n);
    ctx.setLineDash(paint.noDash);
    ctx.strokeStyle = paint.weft[weft.j];
    ctx.lineWidth = STROKE.weft;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.setLineDash(paint.dash);
    ctx.strokeStyle = paint.fibre[weft.j];
    ctx.lineWidth = STROKE.fibre;
    ctx.stroke();
  }
  ctx.setLineDash(paint.noDash);

  // 3. The warps' segments over the wefts: ±P/3 of each crossing where the warp is on top.
  ctx.beginPath();
  for (const warp of model.warps) {
    const drawnTo = warp.top + (warp.bottom - warp.top) * (still ? 1 : warpProgress(model, warp.i, time));
    for (const y of model.overAt[warp.i]) {
      polyline(ctx, xs, ys, sampleSpan(warp, Math.max(warp.top, y - reach), Math.min(drawnTo, y + reach), time, A, xs, ys));
    }
  }
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = STROKE.warp;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 4. The nodes.
  const alpha = still ? 1 : nodeProgress(time);
  const scale = nodeScale(alpha);
  if (alpha > 0) {
    ctx.globalAlpha = alpha;
    for (const node of model.nodes) {
      const warp = model.warps[node.warp];
      const y = still ? node.y0 : nodeY(node, time);
      const x = warpX(warp, y, time, A);
      const r = node.r * scale;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (node.hollow) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = palette.ink;
        ctx.lineWidth = NODES.hollowStroke;
        ctx.stroke();
      } else {
        ctx.fillStyle = palette.ink;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // 5. Fade out over the bottom edge, into the background below (and in over a phone block's top).
  if (paint.bottomFade || paint.topFade) {
    ctx.globalCompositeOperation = 'destination-out';
    if (paint.bottomFade) {
      ctx.fillStyle = paint.bottomFade;
      ctx.fillRect(0, model.height - BOTTOM_FADE, model.width, BOTTOM_FADE);
    }
    if (paint.topFade) {
      ctx.fillStyle = paint.topFade;
      ctx.fillRect(0, 0, model.width, MOBILE_TOP_FADE);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
