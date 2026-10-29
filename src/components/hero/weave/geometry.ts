/**
 * The weave's geometry (docs/hero-weave-prd.md §3, "Geometry approach").
 * Pure: a composition and a seed in, threads, crossings and path strings out.
 *
 * Each thread has two parts. The woven part is computed once (`buildWeave`)
 * and never moves. The loose part is a seeded rest shape plus the motion of
 * motion.ts, sampled from the weave entry out to the free end and drawn as a
 * Catmull-Rom curve converted to cubic Béziers (`looseD`), once per frame.
 *
 * Over-under is drawn as a knot diagram: the woven warps, then the woven
 * wefts over them, then at every crossing where the warp is on top a short
 * patch of warp over the weft, each laid on a slightly wider stroke of the
 * background so the weft shows a gap either side of it. Plain weave: the
 * warp is over where (warp + weft) is even, so the parity alternates along
 * every thread.
 */
import type { Composition } from './config';
import { between, mulberry32 } from './rng';
import { displacement, falloff, smoothstep, type ThreadMotion } from './motion';

export type Vec = readonly [number, number];

interface Wave {
  amp: number;
  /** Radians per unit along the thread. */
  q: number;
  psi: number;
}

/** The static, seeded shape of a loose thread, across the thread at distance s from the entry. */
export interface RestShape {
  /** The fan of the warps, the sag of the wefts: reached at `driftRamp`, held beyond it. */
  drift: number;
  driftRamp: number;
  /** The waviness grows in over this length, so the thread leaves the cloth straight. */
  taper: number;
  waves: Wave[];
}

export interface LooseThread {
  kind: 'warp' | 'weft';
  index: number;
  /** Where the loose part meets the cloth: s = 0. */
  entry: Vec;
  /** Unit vector from the entry toward the free end. */
  outward: Vec;
  /** Unit vector of the displacement, across the thread. */
  across: Vec;
  /** The free end's distance from the entry inside the canvas (the falloff's ramp). */
  length: number;
  /** Distance from the entry of each sample; the last is the drawn end. */
  s: Float64Array;
  /** The rest shape evaluated at each sample. */
  rest: Float64Array;
  shape: RestShape;
  motion: ThreadMotion;
  strokeWidth: number;
}

export interface Crossing {
  warp: number;
  weft: number;
  x: number;
  y: number;
  warpOver: boolean;
}

export interface WeaveNode {
  /** The warp it sits on; it moves with that thread. */
  warp: number;
  s: number;
  r: number;
  hollow: boolean;
}

export interface Weave {
  composition: Composition;
  warpX: number[];
  weftY: number[];
  /** Warps first, then wefts: the 20 animated paths of the desktop composition. */
  loose: LooseThread[];
  crossings: Crossing[];
  nodes: WeaveNode[];
  woven: {
    /** Every woven warp, one subpath each. */
    warps: string;
    /** Every woven weft's solid stroke, one subpath each. */
    wefts: string;
    /** Each woven weft's fibre, its own path so its dashes start at the weave entry. */
    fibres: string[];
    /** The background strokes under the over-patches: the visible gap. */
    gaps: string;
    /** The warp patches drawn over the weft where the warp is on top. */
    patches: string;
  };
  /** Half the length of a gap along its warp (its patch reaches a unit further). */
  patchReach: number;
  /**
   * No thread, node or gap is ever left of `left` or, for the wefts, above
   * `top`, at any moment of the motion: the region the headline may use.
   */
  keepOut: { left: number; top: number };
}

export interface BuildOptions {
  /**
   * How far above the canvas the warps are drawn, overriding the
   * composition's `extendAbove`: WeaveHero asks for what its fit needs.
   */
  extendAbove?: number;
}

/** `count` positions from `from` to `to`, the spacing shrinking toward `to` (density gradient). */
export function spaced(from: number, to: number, count: number, compress: number): number[] {
  if (count === 1) return [from];
  return Array.from({ length: count }, (_, i) => from + (to - from) * (1 - Math.pow(1 - i / (count - 1), compress)));
}

/** Plain weave: the warp is over the weft where their indices add to an even number. */
export const warpIsOver = (warp: number, weft: number) => (warp + weft) % 2 === 0;

export function restOffset(shape: RestShape, s: number): number {
  const drift = shape.drift * smoothstep(0, shape.driftRamp, s);
  let wave = 0;
  for (const w of shape.waves) wave += w.amp * Math.sin(w.q * s + w.psi);
  return drift + smoothstep(0, shape.taper, s) * wave;
}

/** Sample distances: about 24 along the loose part inside the canvas, then every `step` beyond it. */
function samples(length: number, beyond: number, step = 30): Float64Array {
  const inside = 24;
  const extra = beyond > 0 ? Math.ceil(beyond / step) : 0;
  const out = new Float64Array(inside + extra);
  for (let k = 0; k < inside; k++) out[k] = (length * k) / (inside - 1);
  for (let k = 1; k <= extra; k++) out[inside - 1 + k] = length + (beyond * k) / extra;
  return out;
}

const TAU = Math.PI * 2;

export function buildWeave(c: Composition, options: BuildOptions = {}): Weave {
  const rng = mulberry32(c.seed);
  const { warp, weft } = c;
  const extendAbove = options.extendAbove ?? warp.extendAbove;
  const warpX = spaced(warp.xFrom, warp.xTo, warp.count, warp.compress);
  const weftY = spaced(weft.yFrom, weft.yTo, weft.count, weft.compress);
  const centreX = (warp.xFrom + warp.xTo) / 2;

  // Waves shared by the threads of a kind, each thread a little off in phase,
  // so neighbours move together and never cross in the air.
  const warpQ = [TAU / between(300, 360, rng), TAU / between(150, 190, rng)];
  const weftQ = [TAU / between(420, 500, rng), TAU / between(210, 250, rng)];
  const warpPsi = [between(0, TAU, rng), between(0, TAU, rng)];
  const weftPsi = [between(0, TAU, rng), between(0, TAU, rng)];

  const loose: LooseThread[] = [];

  warpX.forEach((x, i) => {
    const freeEnd = warp.freeEndY + between(-warp.freeEndJitter, warp.freeEndJitter, rng);
    const length = warp.wovenFromY - freeEnd;
    const shape: RestShape = {
      drift: warp.fan * (x - centreX),
      driftRamp: length,
      taper: 0.4 * length,
      waves: [
        { amp: warp.waviness * between(0.7, 1, rng), q: warpQ[0], psi: warpPsi[0] + 0.38 * i + between(-0.2, 0.2, rng) },
        { amp: warp.waviness * 0.35 * between(0.6, 1, rng), q: warpQ[1], psi: warpPsi[1] + 0.55 * i + between(-0.2, 0.2, rng) },
      ],
    };
    loose.push(
      thread('warp', i, [x, warp.wovenFromY], [0, -1], [1, 0], length, extendAbove, shape, {
        amplitude: warp.amplitude,
        phase: 0.5 * i + between(-0.25, 0.25, rng),
        k: TAU / warp.wavelength,
        period: c.period,
        ramp: length,
      }, warp.strokeWidth),
    );
  });

  weftY.forEach((y, j) => {
    const freeEnd = weft.freeEndX + between(-weft.freeEndJitter, weft.freeEndJitter, rng);
    const length = weft.wovenFromX - freeEnd;
    const shape: RestShape = {
      drift: weft.sag * (0.6 + (0.4 * j) / Math.max(1, weft.count - 1)) * between(0.8, 1.1, rng),
      driftRamp: length,
      taper: 0.35 * length,
      waves: [
        { amp: weft.waviness * between(0.7, 1, rng), q: weftQ[0], psi: weftPsi[0] + 0.7 * j + between(-0.2, 0.2, rng) },
        { amp: weft.waviness * 0.3 * between(0.6, 1, rng), q: weftQ[1], psi: weftPsi[1] + 0.9 * j + between(-0.2, 0.2, rng) },
      ],
    };
    loose.push(
      thread('weft', j, [weft.wovenFromX, y], [-1, 0], [0, 1], length, 0, shape, {
        amplitude: weft.amplitude,
        phase: 0.9 * j + between(-0.3, 0.3, rng),
        k: TAU / weft.wavelength,
        period: c.period,
        ramp: length,
      }, weft.strokeWidth),
    );
  });

  const crossings: Crossing[] = [];
  for (let j = 0; j < weftY.length; j++) {
    for (let i = 0; i < warpX.length; i++) {
      crossings.push({ warp: i, weft: j, x: warpX[i], y: weftY[j], warpOver: warpIsOver(i, j) });
    }
  }

  const nodes: WeaveNode[] = [];
  loose.slice(0, warp.count).forEach((t, i) => {
    const n = warp.nodes.min + Math.floor(rng() * (warp.nodes.max - warp.nodes.min + 1));
    const first = between(0.3, n > 1 ? 0.55 : 0.88, rng);
    const at = n > 1 ? [first, between(first + 0.25, 0.9, rng)] : [first];
    for (const u of at) {
      nodes.push({ warp: i, s: u * t.length, r: between(warp.nodes.radiusMin, warp.nodes.radiusMax, rng), hollow: rng() < 0.45 });
    }
  });
  // Mixed by design: never all filled or all hollow.
  if (nodes.length > 1 && nodes.every((n) => n.hollow === nodes[0].hollow)) nodes[1].hollow = !nodes[0].hollow;

  const right = c.width + c.bleed;
  const bottom = c.height + c.bleed;
  const patchReach = weft.strokeWidth / 2 + 0.75;
  const over = crossings.filter((x) => x.warpOver);
  const span = (reach: number) => over.map((x) => `M${fmt(x.x)} ${fmt(x.y - reach)}V${fmt(x.y + reach)}`).join('');

  const weave: Weave = {
    composition: c,
    warpX,
    weftY,
    loose,
    crossings,
    nodes,
    woven: {
      warps: warpX.map((x) => `M${fmt(x)} ${fmt(warp.wovenFromY)}V${fmt(bottom)}`).join(''),
      wefts: weftY.map((y) => `M${fmt(weft.wovenFromX)} ${fmt(y)}H${fmt(right)}`).join(''),
      fibres: weftY.map((y) => `M${fmt(weft.wovenFromX)} ${fmt(y)}H${fmt(right)}`),
      gaps: span(patchReach),
      // A unit longer than its gap at each end, over the warp's own line, so
      // the gap's anti-aliased edge never shows across the warp as a hairline.
      patches: span(patchReach + 1),
    },
    patchReach,
    keepOut: { left: 0, top: 0 },
  };
  weave.keepOut = keepOut(weave);
  return weave;
}

function thread(
  kind: LooseThread['kind'],
  index: number,
  entry: Vec,
  outward: Vec,
  across: Vec,
  length: number,
  beyond: number,
  shape: RestShape,
  motion: ThreadMotion,
  strokeWidth: number,
): LooseThread {
  const s = samples(length, beyond);
  const rest = new Float64Array(s.length);
  for (let k = 0; k < s.length; k++) rest[k] = restOffset(shape, s[k]);
  return { kind, index, entry, outward, across, length, s, rest, shape, motion, strokeWidth };
}

/** A point of a loose thread at time t, s units from its entry. */
export function loosePoint(thread: LooseThread, t: number, s: number, rest = restOffset(thread.shape, s)): Vec {
  const off = rest + displacement(t, s, thread.motion);
  return [
    thread.entry[0] + thread.outward[0] * s + thread.across[0] * off,
    thread.entry[1] + thread.outward[1] * s + thread.across[1] * off,
  ];
}

export function nodePosition(weave: Weave, node: WeaveNode, t: number): Vec {
  return loosePoint(weave.loose[node.warp], t, node.s);
}

let xs = new Float64Array(256);
let ys = new Float64Array(256);

/**
 * The loose part at time t as a path: from the weave entry out to the free
 * end, so a dash pattern on it is anchored at the cloth. Catmull-Rom through
 * the samples, as cubic Béziers; the curve leaves the entry along the woven
 * thread's own line, so the join has no kink.
 */
export function looseD(thread: LooseThread, t: number): string {
  const n = thread.s.length;
  if (n > xs.length) {
    xs = new Float64Array(n);
    ys = new Float64Array(n);
  }
  for (let k = 0; k < n; k++) {
    const s = thread.s[k];
    const off = thread.rest[k] + displacement(t, s, thread.motion);
    xs[k] = thread.entry[0] + thread.outward[0] * s + thread.across[0] * off;
    ys[k] = thread.entry[1] + thread.outward[1] * s + thread.across[1] * off;
  }
  // The point before the first: one step back along the woven line.
  const step = thread.s[1] - thread.s[0];
  const bx = xs[0] - thread.outward[0] * step;
  const by = ys[0] - thread.outward[1] * step;
  let d = `M${fmt(xs[0])} ${fmt(ys[0])}`;
  for (let k = 0; k < n - 1; k++) {
    const x0 = k === 0 ? bx : xs[k - 1];
    const y0 = k === 0 ? by : ys[k - 1];
    const x3 = k + 2 < n ? xs[k + 2] : xs[k + 1];
    const y3 = k + 2 < n ? ys[k + 2] : ys[k + 1];
    d +=
      `C${fmt(xs[k] + (xs[k + 1] - x0) / 6)} ${fmt(ys[k] + (ys[k + 1] - y0) / 6)} ` +
      `${fmt(xs[k + 1] - (x3 - xs[k]) / 6)} ${fmt(ys[k + 1] - (y3 - ys[k]) / 6)} ` +
      `${fmt(xs[k + 1])} ${fmt(ys[k + 1])}`;
  }
  return d;
}

/** Two decimals: below a hundredth of a pixel at any size the hero draws. */
export function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/**
 * The bounds no thread crosses at any moment: the rest shape less the full
 * reach of the motion at each sample, the stroke's half width, a node's
 * radius, and a unit for the curve between samples.
 */
function keepOut(weave: Weave): { left: number; top: number } {
  const { warp, crossingGap } = weave.composition;
  let left = Math.min(...weave.warpX) - warp.strokeWidth / 2 - crossingGap;
  let top = Math.min(...weave.weftY) - weave.patchReach;
  for (const t of weave.loose) {
    for (let k = 0; k < t.s.length; k++) {
      const reach = t.rest[k] - t.motion.amplitude * falloff(t.s[k], t.motion.ramp) - t.strokeWidth / 2 - 1;
      if (t.kind === 'warp') left = Math.min(left, t.entry[0] + reach);
      else top = Math.min(top, t.entry[1] + reach);
    }
  }
  for (const n of weave.nodes) {
    const t = weave.loose[n.warp];
    const x = t.entry[0] + restOffset(t.shape, n.s) - t.motion.amplitude * falloff(n.s, t.motion.ramp);
    left = Math.min(left, x - n.r - warp.nodes.hollowStroke / 2 - 1);
  }
  return { left, top };
}

export interface FitBox {
  /** The hero, in CSS pixels. */
  width: number;
  height: number;
  /** The headline block's right and bottom edges, from the hero's left and top. */
  textRight: number;
  textBottom: number;
  /** Clear space kept between the headline and any thread, in CSS pixels. */
  gap: number;
  /** The largest share of the woven width that may run past the hero's right edge. */
  maxCrop: number;
}

export interface Fit {
  /** CSS pixels per viewBox unit. */
  scale: number;
  /** How far the composition's right edge runs past the hero's, in CSS pixels. */
  shift: number;
}

/**
 * Where the composition sits in the hero: anchored bottom-right, as large as
 * the hero's height allows, but never so large that a thread reaches the
 * headline. The warps clear its right edge and the wefts its bottom edge,
 * with `gap` to spare; when the headline is wide, the composition may run
 * past the right edge by up to `maxCrop` of the woven width before it is
 * scaled down instead. Null when nothing fits beside the headline.
 */
export function fitComposition(weave: Weave, box: FitBox): Fit | null {
  const c = weave.composition;
  const fromRight = c.width - weave.keepOut.left;
  const fromBottom = c.height - weave.keepOut.top;
  const wovenWidth = c.width - c.warp.xFrom;
  const room = box.width - box.textRight - box.gap;
  const scale = Math.min(
    box.height / c.height,
    room / (fromRight - box.maxCrop * wovenWidth),
    (box.height - box.textBottom - box.gap) / fromBottom,
  );
  if (!(scale > 0) || !Number.isFinite(scale)) return null;
  return { scale, shift: Math.max(0, fromRight * scale - room) };
}
