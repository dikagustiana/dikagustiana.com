/**
 * The weave's geometry (docs/home-hero-v2.md §2 "Weave layout", §3). Pure:
 * the canvas's size, the viewport's width, the headline block and the
 * breakpoint in; threads, crossings and nodes out, in CSS pixels.
 *
 * The grid is square: warp and weft share one pitch P, and the thread counts
 * follow from the region's size. On a desktop the woven region runs from 60%
 * of the width to the right edge and from (band + P) to the bottom; above it
 * the warps hang loose and carry the nodes, and to its left the wefts run
 * loose to free ends at 22%. On a phone the weave is a fully woven block.
 * Plain weave: the warp is on top where (i + j) is even.
 */
import {
  BAND,
  IDLE,
  MOBILE_PITCH,
  NODES,
  PITCH,
  SAMPLE_STEP,
  SEED,
  STROKE,
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
  /** The headline block, in the canvas's coordinates; null where there is none to avoid. */
  text: Rect | null;
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
  /** Passes under the headline block, so it is drawn faded there. */
  underText: boolean;
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
  /** It drifts back and forth between these, inside the warp's free zone. */
  yMin: number;
  yMax: number;
  /** Where it stands at rest, and starts from. */
  y0: number;
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
  text: Rect | null;
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

/** The waviness grows in over this much of a free zone. */
export const warpTaper = (warp: Warp) => Math.min(80, warp.wovenFrom - warp.top);
export const weftTaper = (weft: Weft) => Math.min(120, weft.wovenFrom - weft.left);

export function buildWeave(input: WeaveInput): WeaveModel {
  const { width: W, height: H, mobile, text } = input;
  const rng = mulberry32(input.seed ?? SEED);
  const P = mobile ? MOBILE_PITCH : desktopPitch(input.viewportWidth);
  const amplitude = mobile ? IDLE.mobileAmplitude : IDLE.amplitude;

  let warpXs: number[];
  let weftYs: number[];
  let wovenLeft: number;
  let wovenTop: number;
  if (mobile) {
    // Edge to edge, the grid centred in the block.
    const nWarp = Math.floor(W / P) + 1;
    const nWeft = Math.max(1, Math.floor(H / P));
    const x0 = (W - (nWarp - 1) * P) / 2;
    const y0 = (H - (nWeft - 1) * P) / 2;
    warpXs = Array.from({ length: nWarp }, (_, i) => x0 + i * P);
    weftYs = Array.from({ length: nWeft }, (_, j) => y0 + j * P);
    wovenLeft = 0;
    wovenTop = 0;
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

  const warps: Warp[] = warpXs.map((x, i) => ({
    i,
    x,
    top: 0,
    wovenFrom: mobile ? 0 : wovenTop,
    bottom: H,
    waves: mobile
      ? []
      : [
          { amp: WAVE.warp.amplitude * between(0.7, 1, rng), q: warpQ[0], psi: warpPsi + 0.4 * i + between(-0.2, 0.2, rng) },
          { amp: WAVE.warp.amplitude * 0.3 * between(0.6, 1, rng), q: warpQ[1], psi: warpPsi * 1.7 + 0.6 * i + between(-0.2, 0.2, rng) },
        ],
    phase: between(0, TAU, rng),
    period: period(),
  }));

  const reach = STROKE.weft / 2 + WAVE.weft.amplitude * 1.3 + amplitude;
  const wefts: Weft[] = weftYs.map((y, j) => {
    const left = mobile ? 0 : WEFT_FREE_LEFT * W + between(-WEFT_FREE_JITTER, WEFT_FREE_JITTER, rng);
    return {
      j,
      y,
      left,
      wovenFrom: mobile ? 0 : wovenLeft,
      right: W,
      waves: mobile
        ? []
        : [
            { amp: WAVE.weft.amplitude * between(0.7, 1, rng), q: weftQ[0], psi: weftPsi + 0.7 * j + between(-0.2, 0.2, rng) },
            { amp: WAVE.weft.amplitude * 0.3 * between(0.6, 1, rng), q: weftQ[1], psi: weftPsi * 1.3 + 0.9 * j + between(-0.2, 0.2, rng) },
          ],
      phase: between(0, TAU, rng),
      period: period(),
      underText: !!text && y + reach > text.top && y - reach < text.bottom && left < text.right && W > text.left,
    };
  });

  const crossings: Crossing[] = [];
  wefts.forEach((weft) => warps.forEach((warp) => crossings.push({ i: warp.i, j: weft.j, x: warp.x, y: weft.y, warpOver: warpIsOver(warp.i, weft.j) })));

  const nodes: WeaveNode[] = [];
  if (!mobile) {
    const draft: Omit<WeaveNode, 'hollow'>[] = [];
    for (const warp of warps) {
      const n = NODES.perWarp[0] + Math.floor(rng() * (NODES.perWarp[1] - NODES.perWarp[0] + 1));
      const r = () => between(NODES.radius[0], NODES.radius[1], rng);
      const lo = NODES.top;
      const hi = warp.wovenFrom - NODES.clearance;
      if (hi - lo < 4 * NODES.radius[1]) continue;
      // Two nodes on one warp keep to their own halves, so they never meet.
      const spans = n > 1 ? [[lo, (lo + hi) / 2 - NODES.radius[1]], [(lo + hi) / 2 + NODES.radius[1], hi]] : [[lo, hi]];
      for (const [a, b] of spans) {
        const radius = r();
        const yMin = a + radius;
        const yMax = b - radius;
        draft.push({ warp: warp.i, yMin, yMax, y0: between(yMin, yMax, rng), speed: between(NODES.speed[0], NODES.speed[1], rng), r: radius });
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
  }

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
    text,
    amplitude,
    maxSamples: Math.ceil(longest / SAMPLE_STEP) + 3,
  };
}
