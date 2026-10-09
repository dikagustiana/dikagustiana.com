// Original to this repository (Kawasan Industri world engine, fallback kernel).
/**
 * The engine context: everything one mounted world shares, held on one
 * object created by createWorld and passed to every builder, so two worlds
 * on one page share nothing and dispose leaves no module-level state.
 *
 *   scene     the world, drawn first
 *   sky       what is drawn over it, never hidden (marks, markers, labels)
 *   hooks     what builders may ask of the view; the view installs them
 *   entities  everything clickable, in the order it was built
 *   peeks     the groups that open as a section drawing, with their entity
 *   texts     the text meshes, so the view can hide small text at the far view
 *   guard     in development (or with the debug API), throws when a figure
 *             reaches a scene builder through Part.text
 */
import * as THREE from 'three';
import type { Rng } from './kernel/math';
import type { Theme } from './theme';
import type { Entity } from './types';
import type { GeneratedLayout } from '@/world/placement/types';
import { assertNoFigure } from './kernel/part';

/** What scene code may ask of the view. Until a view exists these do nothing. */
export interface Hooks {
  /** An entity is going away: drop it from the selection and anything else that holds it. */
  forget(ent: Entity): void;
  select(ent: Entity | null): void;
  isSelected(ent: Entity): boolean;
  /** Bring an entity into view and keep it there while it is selected. */
  track(ent: Entity): void;
  /** Select a building and come in close enough for it to open as a section. */
  lookInside(ent: Entity): void;
  /** A selected thing became another (a load handed from one vehicle to the next): carry the selection over. */
  handOff(from: Entity, to: Entity): void;
}

export interface TextRegistry {
  meshes: THREE.Mesh[];
  /** True while the view is far: small text is hidden. */
  far: boolean;
}

export interface EngineContext {
  scene: THREE.Scene;
  sky: THREE.Scene;
  gfx: { aniso: number };
  hooks: Hooks;
  rng: Rng;
  theme: Theme;
  layout: GeneratedLayout;
  texts: TextRegistry;
  font: string;
  text2d: boolean;
  guard?: (text: string) => void;
  /** The visitor asks for reduced motion. */
  reduced: boolean;
  debug: boolean;
  entities: Entity[];
  peeks: [THREE.Group, Entity][];
}

export function idleHooks(): Hooks {
  return { forget() {}, select() {}, isSelected: () => false, track() {}, lookInside() {}, handOff() {} };
}

export function createContext(o: { rng: Rng; theme: Theme; layout: GeneratedLayout; font: string; reduced: boolean; debug: boolean; text2d: boolean }): EngineContext {
  const scene = new THREE.Scene(), sky = new THREE.Scene();
  scene.name = 'world'; sky.name = 'sky';
  const checked = o.debug === true || import.meta.env.DEV === true;
  return {
    scene, sky,
    gfx: { aniso: 1 },
    hooks: idleHooks(),
    rng: o.rng,
    theme: o.theme,
    layout: o.layout,
    texts: { meshes: [], far: false },
    font: o.font,
    text2d: o.text2d,
    guard: checked ? assertNoFigure : undefined,
    reduced: o.reduced,
    debug: o.debug,
    entities: [],
    peeks: [],
  };
}
