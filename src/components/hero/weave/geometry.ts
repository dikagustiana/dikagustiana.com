/**
 * The weave's geometry (docs/home-hero-v2.md §2 "Weave layout", §3). Pure:
 * the canvas's size, the viewport's width, the text's line boxes and the
 * breakpoint in; threads, crossings and nodes out, in CSS pixels.
 *
 * The grid is square: warp and weft share one pitch P, and the thread counts
 * follow from the region's size. On a desktop the woven region runs from 60%
 * of the width to the right edge and from (band + P) to the bottom; above it
 * the warps hang loose and carry the nodes, and to its left the wefts run
 * loose to free ends at 22%, except that no weft passes under a line of text:
 * one level with a line starts just right of it. On a phone the block is
 * woven but for a short loose fringe of warp at its top, where the nodes run.
 * Plain weave: the warp is on top where (i + j) is even.
 */
import {
  BAND,
  IDLE,
  MOBILE_PITCH,
  MOBILE_WARP_FREE,
  NODES,
  PITCH,
  SAMPLE_STEP,
  SEED,
  STROKE,
  TEXT_CLEARANCE,
  WAVE,
  WEFT_FREE_JITTER,
  WEFT_FREE_LEFT,
  WOVEN_LEFT,
} from './constants';
import { between, mulberry32 } from './rng';

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface WeaveInput {
  /** The canvas, in CSS px. */
  width: number;
  height: number;
  /** The viewport's width, for the pitch's vw term. */
  viewportWidth: number;
  mobile: boolean;
  /** Each line box of the headline and the subtitle, in the canvas's coordinates: no weft runs under one. */
  lines: Rect[];
  seed?: number;
}

export interface Wave {
  amp: number;
  /** Radians per px. */
  q: number;
  psi: number;
}

export interface Warp {
  i: number;
  /** Its line through the woven region. */
  x: number;
  top: number;
  /** Loose from `top` down to here; woven below. Equal to `top` where there is no free zone. */
  wovenFrom: number;
  bottom: number;
  waves: Wave[];
  /** The idle motion's φ and T. */
  phase: number;
  period: number;
}

export interface Weft {
  j: number;
  /** Its line through the woven region. */
  y: number;
  /** The free end. */
  left: number;
  /** Loose from `left` to here; woven to the right. Equal to `left` where there is no free zone. */
  wovenFrom: number;
  right: number;
  waves: Wave[];
  phase: number;
  period: number;
}

export interface Crossing {
  i: number;
  j: number;
  x: number;
  y: number;
  warpOver: boolean;
}

export interface WeaveNode {
  warp: number;
  /** It travels down its warp from yStart to yEnd, inside the free zone, and starts again at the top. */
  yStart: number;
  yEnd: number;
  /** Where along that run it stands at rest (0 to 1), and starts from. */
  phase: number;
  /** px per second. */
  speed: number;
  r: number;
  hollow: boolean;
}

export interface WeaveModel {
  width: number;
  height: number;
  mobile: boolean;
  pitch: number;
  wovenLeft: number;
  wovenTop: number;
  warps: Warp[];
  wefts: Weft[];
  crossings: Crossing[];
  /**
   * Per warp, the heights of the crossings where it is on top, in order: its
   * segment ±P/3 of each is drawn over the wefts, the rest under them.
   */
  overAt: number[][];
  nodes: WeaveNode[];
  lines: Rect[];
  /** The idle motion's amplitude A. */
  amplitude: number;
  /** The most points any thread can be sampled to: the frame loop's buffers are this long. */
  maxSamples: number;
}

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The desktop pitch: clamp(52px, 3.4vw, 68px). */
export const desktopPitch = (viewportWidth: number) => clamp(PITCH.perViewportWidth * viewportWidth, PITCH.min, PITCH.max);

/** Plain weave: the warp is on top where its index and the weft's add to an even number. */
export const warpIsOver = (i: number, j: number) => (i + j) % 2 === 0;

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x >= edge1 ? 1 : 0;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** The static shape of a loose part, `d` px into its free zone (0 at the woven region): flat where it meets the cloth. */
export function restOffset(waves: Wave[], d: number, taper: number): number {
  if (d <= 0) return 0;
  let w = 0;
  for (const wave of waves) w += wave.amp * Math.sin(wave.q * d + wave.psi);
  return smoothstep(0, taper, d) * w;
}

/** How far a weft reaches across its line: half its stroke, its waviness at most, and the idle amplitude. */
export const weftReach = (amplitude: number) => STROKE.weft / 2 + WAVE.weft.amplitude * 1.3 + amplitude;

/** The waviness grows in over this much of a free zone. */
export const warpTaper = (warp: Warp) => Math.min(80, warp.wovenFrom - warp.top);
export const weftTaper = (weft: Weft) => Math.min(120, weft.wovenFrom - weft.left);

export function buildWeave(input: WeaveInput): WeaveModel {
  const { width: W, height: H, mobile, lines } = input;
  const rng = mulberry32(input.seed ?? SEED);
  const P = mobile ? MOBILE_PITCH : desktopPitch(input.viewportWidth);
  const amplitude = mobile ? IDLE.mobileAmplitude : IDLE.amplitude;

  let warpXs: number[];
  let weftYs: number[];
  let wovenLeft: number;
  let wovenTop: number;
  if (mobile) {
    // Edge to edge, the grid centred in the block under the warps' fringe.
    const fringe = Math.min(MOBILE_WARP_FREE, H / 3);
    const nWarp = Math.floor(W / P) + 1;
    const nWeft = Math.max(1, Math.floor((H - fringe) / P));
    const x0 = (W - (nWarp - 1) * P) / 2;
    const y0 = fringe + (H - fringe - (nWeft - 1) * P) / 2;
    warpXs = Array.from({ length: nWarp }, (_, i) => x0 + i * P);
    weftYs = Array.from({ length: nWeft }, (_, j) => y0 + j * P);
    wovenLeft = 0;
    wovenTop = fringe;
  } else {
    wovenLeft = WOVEN_LEFT * W;
    wovenTop = BAND + P;
    const nWarp = Math.floor((W - wovenLeft) / P) + 1;
    const nWeft = Math.max(0, Math.floor((H - wovenTop) / P));
    warpXs = Array.from({ length: nWarp }, (_, i) => wovenLeft + i * P);
    weftYs = Array.from({ length: nWeft }, (_, j) => wovenTop + (j + 0.5) * P);
  }

  // Waves shared by the threads of a kind, each a little off in phase from
  // its neighbour, so loose threads move as a family and never cross.
  const warpQ = [TAU / between(WAVE.warp.wavelength[0], WAVE.warp.wavelength[1], rng), TAU / between(60, 90, rng)];
  const weftQ = [TAU / between(WAVE.weft.wavelength[0], WAVE.weft.wavelength[1], rng), TAU / between(110, 150, rng)];
  const warpPsi = between(0, TAU, rng);
  const weftPsi = between(0, TAU, rng);
  const period = () => between(IDLE.period[0], IDLE.period[1], rng);

  const warpWave = mobile ? WAVE.warp.amplitude * 0.6 : WAVE.warp.amplitude;
  const warps: Warp[] = warpXs.map((x, i) => ({
    i,
    x,
    top: 0,
    wovenFrom: wovenTop,
    bottom: H,
    waves: [
      { amp: warpWave * between(0.7, 1, rng), q: warpQ[0], psi: warpPsi + 0.4 * i + between(-0.2, 0.2, rng) },
      { amp: warpWave * 0.3 * between(0.6, 1, rng), q: warpQ[1], psi: warpPsi * 1.7 + 0.6 * i + between(-0.2, 0.2, rng) },
    ],
    phase: between(0, TAU, rng),
    period: period(),
  }));

  // How far a weft reaches across itself: half its stroke, its waviness at
  // most, and the idle motion. A line of text inside that band moves its free
  // end to the line's right, and past the cloth's edge it has no loose part.
  const reach = weftReach(amplitude);
  const wefts: Weft[] = weftYs.map((y, j) => {
    let left = mobile ? 0 : WEFT_FREE_LEFT * W + between(-WEFT_FREE_JITTER, WEFT_FREE_JITTER, rng);
    for (const line of lines) {
      if (line.bottom > y - reach && line.top < y + reach) left = Math.max(left, line.right + TEXT_CLEARANCE);
    }
    const wovenFrom = mobile ? 0 : wovenLeft;
    left = Math.min(left, wovenFrom);
    return {
      j,
      y,
      left,
      wovenFrom,
      right: W,
      waves: mobile
        ? []
        : [
            { amp: WAVE.weft.amplitude * between(0.7, 1, rng), q: weftQ[0], psi: weftPsi + 0.7 * j + between(-0.2, 0.2, rng) },
            { amp: WAVE.weft.amplitude * 0.3 * between(0.6, 1, rng), q: weftQ[1], psi: weftPsi * 1.3 + 0.9 * j + between(-0.2, 0.2, rng) },
          ],
      phase: between(0, TAU, rng),
      period: period(),
    };
  });

  const crossings: Crossing[] = [];
  wefts.forEach((weft) => warps.forEach((warp) => crossings.push({ i: warp.i, j: weft.j, x: warp.x, y: weft.y, warpOver: warpIsOver(warp.i, weft.j) })));

  // The nodes: on each warp, evenly spaced along its run (with a little
  // seeded play) and all at that warp's own pace, so they never meet.
  const nodes: WeaveNode[] = [];
  const draft: Omit<WeaveNode, 'hollow'>[] = [];
  const perWarp = mobile ? NODES.mobilePerWarp : NODES.perWarp;
  for (const warp of warps) {
    const yStart = mobile ? NODES.mobileTop : NODES.top;
    const yEnd = warp.wovenFrom - NODES.clearance - NODES.radius[1];
    if (yEnd - yStart < 6 * NODES.radius[1]) continue;
    const speed = between(NODES.speed[0], NODES.speed[1], rng);
    const offset = rng();
    for (let k = 0; k < perWarp; k++) {
      const phase = (offset + k / perWarp + between(-0.08, 0.08, rng) / perWarp + 1) % 1;
      draft.push({ warp: warp.i, yStart, yEnd, phase, speed, r: between(NODES.radius[0], NODES.radius[1], rng) });
    }
  }
  // Half of them hollow, half solid, spread along the row by the seed.
  const order = draft.map((_, k) => k);
  for (let k = order.length - 1; k > 0; k--) {
    const m = Math.floor(rng() * (k + 1));
    [order[k], order[m]] = [order[m], order[k]];
  }
  const hollow = new Set(order.slice(0, Math.floor(draft.length / 2)));
  draft.forEach((d, k) => nodes.push({ ...d, hollow: hollow.has(k) }));

  const overAt = warps.map((warp) => crossings.filter((c) => c.i === warp.i && c.warpOver).map((c) => c.y).sort((a, b) => a - b));

  const longest = Math.max(H, W);
  return {
    width: W,
    height: H,
    mobile,
    pitch: P,
    wovenLeft,
    wovenTop,
    warps,
    wefts,
    crossings,
    overAt,
    nodes,
    lines,
    amplitude,
    maxSamples: Math.ceil(longest / SAMPLE_STEP) + 3,
  };
}
