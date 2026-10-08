// Adapted from Factory Yard (github.com/Khalidabdi1/factory, commit 148758a), after ai-iso-skill (MIT, © 2026 Tolga Cohce).
import * as THREE from 'three';
import type { Rng } from './kernel/math';
import type { Theme } from './theme';
import type { Entity } from './types';
import type { GeneratedLayout } from '@/world/placement/types';

// ---- the scene, the flags and the late-bound calls every module shares ----
//
// Factory Yard kept these as module globals in shared.ts (and found its page
// elements by id). Here they are one object made by createWorld and handed to
// every builder and system, so a world can be mounted, disposed and mounted
// again with nothing left behind (mega prompt §4.2).

/** Late-bound calls into the view, so the simulation never imports it. */
export interface Hooks {
  forget(ent: Entity): void;
  select(ent: Entity | null): void;
  isSelected(ent: Entity): boolean;
  track(ent: Entity): void;
  lookInside(ent: Entity): void;
  /** Someone selected turns into someone else: the selection goes with them. */
  handOff(from: Entity, to: Entity): void;
  inBuilding(x: number, y: number): boolean;
  closedAt(x: number, y: number, p?: unknown): boolean;
}

/** Text drawn on faces: registered so far-zoom can hide the small lettering and dispose can free the textures. */
export interface TextRegistry {
  meshes: THREE.Mesh[];
  far: boolean;
}

export interface EngineContext {
  scene: THREE.Scene;
  /** What is up in the sky past the plate's edges: drawn after the scene, never cut off. */
  sky: THREE.Scene;
  /** Set once the renderer exists: texture anisotropy for text drawn on faces. */
  gfx: { aniso: number };
  hooks: Hooks;
  rng: Rng;
  theme: Theme;
  layout: GeneratedLayout;
  texts: TextRegistry;
  /** The CSS font family the text textures are drawn in, read from the shell's variable. */
  font: string;
  /** Whether a 2D canvas exists to draw text textures with (a headless test has none; text is then left out). */
  text2d: boolean;
  reduced: boolean;
  debug: boolean;
  /** Every entity that can be clicked, in creation order; the view cycles through them. */
  entities: Entity[];
  /** Closed buildings that open as a section drawing while selected: [the group carrying userData.peek, its entity]. */
  peeks: [THREE.Group, Entity][];
}

const noop = () => {};

export function createContext(o: {
  rng: Rng; theme: Theme; layout: GeneratedLayout; font: string; reduced: boolean; debug: boolean; text2d: boolean;
}): EngineContext {
  return {
    scene: new THREE.Scene(),
    sky: new THREE.Scene(),
    gfx: { aniso: 1 },
    hooks: { forget: noop, select: noop, isSelected: () => false, track: noop, lookInside: noop, handOff: noop, inBuilding: () => false, closedAt: () => false },
    rng: o.rng,
    theme: o.theme,
    layout: o.layout,
    texts: { meshes: [], far: false },
    font: o.font,
    text2d: o.text2d,
    reduced: o.reduced,
    debug: o.debug,
    entities: [],
    peeks: [],
  };
}
