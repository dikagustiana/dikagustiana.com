// Adapted from Factory Yard (github.com/Khalidabdi1/factory, commit 148758a), after ai-iso-skill (MIT, © 2026 Tolga Cohce).

// ---- small maths ----

/**
 * The seeded random number generator. One per world instance, never
 * module-global, so two worlds on one page (or a remount) are independent and
 * deterministic for the same seed (mega prompt §4.2). Builders draw from it
 * while constructing, so the order of construction decides what the world
 * looks like. Nothing in the engine may call Math.random().
 */
export interface Rng {
  readonly seed: number;
  /** Uniform in [0, 1). */
  next(): number;
  rand(a: number, b: number): number;
  pick<T>(a: readonly T[]): T;
}

export const DEFAULT_SEED = 20261004;

export function createRng(seed: number = DEFAULT_SEED): Rng {
  let s = seed | 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed,
    next,
    rand: (a, b) => a + (b - a) * next(),
    pick: (a) => a[Math.floor(next() * a.length)],
  };
}

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
export const ease = (t: number): number => t * t * (3 - 2 * t);
