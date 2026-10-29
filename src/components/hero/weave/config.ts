/**
 * The two compositions of the Weave Hero (docs/hero-weave-prd.md §2,
 * "Illustration spec"). Every length is in viewBox units.
 *
 * Desktop and tablet draw the 1600 × 900 composition: 14 navy warp threads
 * (intelligence) from the top edge, 6 terracotta weft threads
 * (manufacturing) entering at x ≈ 240, woven in plain weave in the
 * bottom-right corner. Mobile draws a separate 900 × 900 composition: the
 * woven corner and short loose ends only, so the cloth is never cropped
 * through its middle.
 */

export interface WarpConfig {
  count: number;
  /** Base x of the first and last thread; spacing compresses toward `xTo`. */
  xFrom: number;
  xTo: number;
  /** Exponent of the spacing curve: 1 is even, larger compresses harder. */
  compress: number;
  /** Where the loose part enters the weave; woven below this y. */
  wovenFromY: number;
  /** The free end inside the canvas (0 is the top edge). */
  freeEndY: number;
  /** Seeded spread of the free ends around `freeEndY` (± this). */
  freeEndJitter: number;
  /**
   * Thread drawn above the free end, past the canvas's top edge, so the warp
   * still enters from the hero's top edge when the composition is fitted
   * smaller than the hero (WeaveHero). Zero draws the free ends.
   */
  extendAbove: number;
  strokeWidth: number;
  /** The loose threads fan out by this fraction of their distance from the centre. */
  fan: number;
  /** Amplitude of the static, seeded waviness of the loose part. */
  waviness: number;
  /** Displacement amplitude of the motion (horizontal). */
  amplitude: number;
  /** Wavelength of the travelling ripple along the thread. */
  wavelength: number;
  nodes: { min: number; max: number; radiusMin: number; radiusMax: number; hollowStroke: number };
}

export interface WeftConfig {
  count: number;
  /** Base y of the first and last thread; spacing compresses toward `yTo`. */
  yFrom: number;
  yTo: number;
  compress: number;
  /** The free end, inside the canvas rather than at its edge. */
  freeEndX: number;
  freeEndJitter: number;
  /** Where the loose part enters the weave; woven from this x to the right edge. */
  wovenFromX: number;
  strokeWidth: number;
  /** The inner dashed stroke that suggests twisted fibre. */
  fibreWidth: number;
  fibreDash: [number, number];
  /** The loose ends droop by up to this much toward their free end. */
  sag: number;
  waviness: number;
  /** Displacement amplitude of the motion (vertical). */
  amplitude: number;
  wavelength: number;
}

export interface Composition {
  name: 'desktop' | 'mobile';
  width: number;
  height: number;
  seed: number;
  /** Period of the motion, in seconds. */
  period: number;
  /** Width of the background gap on each side of a warp that passes over a weft. */
  crossingGap: number;
  /** How far the woven threads run past the canvas edge, so no cap is ever seen. */
  bleed: number;
  warp: WarpConfig;
  weft: WeftConfig;
}

export const DESKTOP: Composition = {
  name: 'desktop',
  width: 1600,
  height: 900,
  seed: 20261029,
  period: 10,
  crossingGap: 1.6,
  bleed: 24,
  warp: {
    count: 14,
    xFrom: 1000,
    xTo: 1600,
    compress: 1.35,
    wovenFromY: 470,
    freeEndY: 0,
    freeEndJitter: 0,
    extendAbove: 2400,
    strokeWidth: 2.2,
    fan: 0.08,
    waviness: 9,
    amplitude: 8,
    wavelength: 380,
    nodes: { min: 1, max: 2, radiusMin: 4, radiusMax: 6, hollowStroke: 1.6 },
  },
  weft: {
    count: 6,
    yFrom: 480,
    yTo: 880,
    compress: 1.35,
    freeEndX: 240,
    freeEndJitter: 28,
    // The PRD gives ≈ 1020; the first warp stands at x = 1000, so the weft is
    // woven from just before it and that first crossing is a static one.
    wovenFromX: 990,
    strokeWidth: 7,
    fibreWidth: 2,
    fibreDash: [6, 7],
    sag: 18,
    waviness: 12,
    amplitude: 10,
    wavelength: 520,
  },
};

export const MOBILE: Composition = {
  name: 'mobile',
  width: 900,
  height: 900,
  seed: 20261030,
  period: 10,
  crossingGap: 2.2,
  bleed: 30,
  warp: {
    count: 10,
    xFrom: 400,
    xTo: 900,
    compress: 1.35,
    wovenFromY: 380,
    freeEndY: 120,
    freeEndJitter: 34,
    extendAbove: 0,
    strokeWidth: 3.4,
    fan: 0.08,
    waviness: 7,
    amplitude: 8,
    wavelength: 300,
    nodes: { min: 1, max: 1, radiusMin: 6, radiusMax: 8.5, hollowStroke: 2.4 },
  },
  weft: {
    count: 5,
    yFrom: 410,
    yTo: 870,
    compress: 1.35,
    freeEndX: 110,
    freeEndJitter: 30,
    wovenFromX: 388,
    strokeWidth: 10.5,
    fibreWidth: 3,
    fibreDash: [9, 10],
    sag: 14,
    waviness: 9,
    amplitude: 10,
    wavelength: 360,
  },
};
