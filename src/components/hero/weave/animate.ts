/**
 * The weave's motion (docs/home-hero-v2.md §2 "Motion"). Pure: a model and a
 * time in, how much of each thread is drawn and where its points are.
 *
 * The intro plays once: the warps draw top to bottom, 35 ms apart from left
 * to right, inside 0–1.2 s; the wefts extend left to right, 80 ms apart from
 * top to bottom, inside 1.0–2.5 s; the nodes fade and grow in over 2.0–2.6 s.
 * Every easing is easeOutCubic. The idle motion then grows in over a second
 * and runs for good, one shared field so the crossings stay together:
 *
 *   warp x-offset = A·sin(2π·t/T + φᵢ + k·y),  weft y-offset = A·sin(2π·t/T' + φⱼ + k·x)
 *
 * and the nodes drift up and down their warp inside its free zone. Still
 * (reduced motion), it is the intro's last frame with no idle motion.
 */
import { IDLE, INTRO, SAMPLE_STEP } from './constants';
import { restOffset, smoothstep, warpTaper, weftTaper, type Warp, type WeaveModel, type WeaveNode, type Weft } from './geometry';

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const easeOutCubic = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);

/** When the intro is over: the nodes are in. */
export const INTRO_END = INTRO.nodes.end;

/** How long one thread takes to draw, so the last of `count` ends with its phase. */
export function drawDuration(phase: { start: number; end: number; stagger: number }, count: number): number {
  return Math.max(INTRO.minDuration, phase.end - phase.start - Math.max(0, count - 1) * phase.stagger);
}

/** The share of warp `i` drawn at time t: from its top down. */
export function warpProgress(model: WeaveModel, i: number, t: number): number {
  const { start, stagger } = INTRO.warp;
  return easeOutCubic((t - start - i * stagger) / drawDuration(INTRO.warp, model.warps.length));
}

/** The share of weft `j` drawn at time t: from its free end rightward. */
export function weftProgress(model: WeaveModel, j: number, t: number): number {
  const { start, stagger } = INTRO.weft;
  return easeOutCubic((t - start - j * stagger) / drawDuration(INTRO.weft, model.wefts.length));
}

/** How far the nodes have come in at time t: their opacity, 0 to 1. */
export function nodeProgress(t: number): number {
  return easeOutCubic((t - INTRO.nodes.start) / (INTRO.nodes.end - INTRO.nodes.start));
}

/** Their scale at that progress: from 0.6 to 1. */
export const nodeScale = (progress: number) => INTRO.nodes.scaleFrom + (1 - INTRO.nodes.scaleFrom) * progress;

/** The idle field's amplitude at time t: none during the intro, A a second after it. */
export function idleAmplitude(model: WeaveModel, t: number): number {
  return model.amplitude * smoothstep(INTRO_END, INTRO_END + IDLE.rampIn, t);
}

/** Warp `warp`'s x at height y, at time t, under an idle amplitude A. */
export function warpX(warp: Warp, y: number, t: number, A: number): number {
  const rest = restOffset(warp.waves, warp.wovenFrom - y, warpTaper(warp));
  return warp.x + rest + (A === 0 ? 0 : A * Math.sin((TAU * t) / warp.period + warp.phase + IDLE.k * y));
}

/** Weft `weft`'s y at x, at time t, under an idle amplitude A. */
export function weftY(weft: Weft, x: number, t: number, A: number): number {
  const rest = restOffset(weft.waves, weft.wovenFrom - x, weftTaper(weft));
  return weft.y + rest + (A === 0 ? 0 : A * Math.sin((TAU * t) / weft.period + weft.phase + IDLE.k * x));
}

/**
 * Warp `warp`, drawn from its top down to `progress` of its length, as points
 * every SAMPLE_STEP px written into xs and ys (no allocation). Returns the count.
 */
export function sampleWarp(warp: Warp, t: number, A: number, progress: number, xs: Float32Array, ys: Float32Array): number {
  if (progress <= 0) return 0;
  const end = warp.top + (warp.bottom - warp.top) * progress;
  return sampleSpan(warp, warp.top, end, t, A, xs, ys);
}

/** The part of warp `warp` between heights from and to (clipped to what is drawn). */
export function sampleSpan(warp: Warp, from: number, to: number, t: number, A: number, xs: Float32Array, ys: Float32Array): number {
  if (to <= from) return 0;
  let n = 0;
  for (let y = from; y < to && n < xs.length - 1; y += SAMPLE_STEP) {
    xs[n] = warpX(warp, y, t, A);
    ys[n] = y;
    n++;
  }
  xs[n] = warpX(warp, to, t, A);
  ys[n] = to;
  return n + 1;
}

/** Weft `weft`, drawn from its free end rightward to `progress` of its length. */
export function sampleWeft(weft: Weft, t: number, A: number, progress: number, xs: Float32Array, ys: Float32Array): number {
  if (progress <= 0) return 0;
  const end = weft.left + (weft.right - weft.left) * progress;
  let n = 0;
  for (let x = weft.left; x < end && n < xs.length - 1; x += SAMPLE_STEP) {
    xs[n] = x;
    ys[n] = weftY(weft, x, t, A);
    n++;
  }
  xs[n] = end;
  ys[n] = weftY(weft, end, t, A);
  return n + 1;
}

/** Where a node stands at time t: back and forth between its bounds, from its rest point, once the intro is over. */
export function nodeY(node: WeaveNode, t: number): number {
  const span = node.yMax - node.yMin;
  if (span <= 0) return node.y0;
  const travelled = node.y0 - node.yMin + node.speed * Math.max(0, t - INTRO_END);
  const s = travelled % (2 * span);
  return node.yMin + (s <= span ? s : 2 * span - s);
}
