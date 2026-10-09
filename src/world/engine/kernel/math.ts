// Original to this repository (Kawasan Industri world engine, fallback kernel).
/**
 * Numbers for the engine: the seeded generator every random draw goes
 * through, and the few scalar helpers the view and the simulation share.
 *
 * The generator is mulberry32 (Tommy Ettinger, public domain): one 32-bit
 * state word, advanced by a Weyl increment and scrambled. It is small, fast
 * and good enough for scattering trees and spacing trucks; the same seed
 * always gives the same sequence, so a seed replays the same world and the
 * placement algorithm (src/world/placement/place.ts) reproduces the
 * committed layout.
 *
 * This file has no imports: scripts/world/build-layout.ts loads it under
 * node --experimental-strip-types.
 */

export interface Rng {
  /** The seed the generator started from. */
  readonly seed: number;
  /** A float in [0, 1). */
  next(): number;
  /** A float in [a, b). */
  rand(a: number, b: number): number;
  /** One element of a non-empty list. */
  pick<T>(items: readonly T[]): T;
}

/** The engine's default seed: the day the world's work began, 4 October 2026 (the placement uses the same). */
export const DEFAULT_SEED = 20261004;

export function createRng(seed: number = DEFAULT_SEED): Rng {
  let state = seed | 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed,
    next,
    rand: (a, b) => a + (b - a) * next(),
    pick: (items) => items[Math.min(items.length - 1, Math.floor(next() * items.length))],
  };
}

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Hermite step between two edges: 0 below lo, 1 above hi. */
export const smoothstep = (lo: number, hi: number, v: number): number => {
  const t = clamp((v - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
};

/** The fraction of the way to a goal an exponential ease covers in dt seconds at a given rate per second. */
export const approach = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);
