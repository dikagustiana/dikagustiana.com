/**
 * The Home Hero v2 weave's numbers (docs/home-hero-v2.md §2, "Weave layout"
 * and "Motion"). Lengths are CSS pixels, times seconds.
 */

/** The navy band at the hero's top: the background reaches cream here. */
export const BAND = 110;

/** Below this width the hero stacks: text on top, the weave under it. */
export const MOBILE_MAX = 767.98;

/** The square grid's pitch, the same for warp and weft: clamp(52px, 3.4vw, 68px). */
export const PITCH = { min: 52, perViewportWidth: 0.034, max: 68 } as const;
export const MOBILE_PITCH = 40;
/** On a phone the weave fills this share of the hero, at its bottom. */
export const MOBILE_WEAVE_SHARE = 0.38;
/** On a phone the warps hang loose over the block's top this far, carrying the nodes, before the weave. */
export const MOBILE_WARP_FREE = 80;

/** The woven region starts at this share of the hero's width and runs to its right edge. */
export const WOVEN_LEFT = 0.6;
/** The wefts' free ends, as a share of the hero's width. */
export const WEFT_FREE_LEFT = 0.22;
/** Seeded spread of the wefts' free ends, ± px. */
export const WEFT_FREE_JITTER = 14;
/** A weft's free end fades in over this length. */
export const WEFT_TAPER = 80;

/** Static waviness of the loose parts: amplitude (px) and wavelength range (px). */
export const WAVE = {
  warp: { amplitude: 6, wavelength: [110, 170] },
  weft: { amplitude: 8, wavelength: [220, 320] },
} as const;

export const STROKE = { warp: 2, weft: 5, fibre: 1.5, fibreDash: [4, 5] } as const;

/**
 * No weft passes under the text (owner, 30 October 2026): a weft level with a
 * line of the headline or the subtitle starts this far right of that line.
 */
export const TEXT_CLEARANCE = 28;

/**
 * The nodes flow (owner, 30 October 2026): several on each warp at once,
 * travelling down its free zone at their own pace, out of the navy band and
 * into the cloth, fading in at the top and out just before the weave.
 */
export const NODES = {
  perWarp: 3,
  mobilePerWarp: 2,
  radius: [5, 7],
  hollowStroke: 1.5,
  /** px per second, down the warp. */
  speed: [18, 30],
  /** Where a node starts, inside the band, and how far above the woven region it ends. */
  top: 36,
  mobileTop: 4,
  clearance: 6,
  /** It fades in over its first px of travel and out over its last (a third of a short run at most). */
  fade: 26,
} as const;

export const INTRO = {
  warp: { start: 0, end: 1.2, stagger: 0.035 },
  weft: { start: 1.0, end: 2.5, stagger: 0.08 },
  nodes: { start: 2.0, end: 2.6, scaleFrom: 0.6 },
  /** A thread never draws in less than this, however many there are. */
  minDuration: 0.5,
} as const;

export const IDLE = {
  amplitude: 3,
  mobileAmplitude: 1.5,
  period: [6, 10],
  /** Radians per px along the thread. */
  k: 0.004,
  /** The idle field grows in over this long once the intro ends, so nothing jumps. */
  rampIn: 1,
} as const;

/** Curves are sampled every this many px and drawn as polylines. */
export const SAMPLE_STEP = 8;
export const DPR_MAX = 2;
/** The weave fades out over the hero's last px, into the Glimpse's background. */
export const BOTTOM_FADE = 40;
/** A phone's woven block fades in over its first px, so its warps do not end in a hard line. */
export const MOBILE_TOP_FADE = 28;
export const RESIZE_DEBOUNCE_MS = 150;
export const SEED = 20261030;
