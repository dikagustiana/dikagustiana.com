// Original to this repository (Kawasan Industri world engine, fallback kernel).
/**
 * The ground and what grows on it: the slab the world stands on (its top,
 * its two visible edges and a survey grid), trees and pines for the
 * builders to scatter, a dashed line on a face, and a ring of points for
 * markers. The shared geometries (a tree's crown, a cone) are unit shapes
 * the builders place with a matrix; Part copies their triangles, so they are
 * never uploaded or disposed themselves.
 */
import * as THREE from 'three';
import { TOP, W } from '../kernel/iso';
import { Part, v3 } from '../kernel/part';
import type { Rng } from '../kernel/math';
import type { EngineContext } from '../context';

/** A low-poly crown, radius 1 about its centre. */
export const crown = new THREE.IcosahedronGeometry(1, 0);
/** A cone of radius 1 and height 1, centred on its middle (three.js's default). */
export const cone = new THREE.ConeGeometry(1, 1, 8);

const UP = new THREE.Vector3(0, 1, 0);
/** A turn about the vertical, for placing geometry with Matrix4.compose. */
export const yaw = (a: number): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(UP, a);

/** A broadleaf tree: a short trunk and a round crown; s scales it, z lifts it. */
export function tree(p: Part, rng: Rng, x: number, y: number, s = 1, z = 0): void {
  const trunk = 1.1 * s, spread = rng.rand(1.2, 1.6) * s, height = rng.rand(1.0, 1.3) * s;
  p.box(x - 0.14 * s, y - 0.14 * s, z, 0.28 * s, 0.28 * s, trunk, 'k', { lines: false });
  p.geo(crown, new THREE.Matrix4().compose(W(x, y, z + trunk + height * 0.8), yaw(rng.rand(0, Math.PI)), v3(spread, height, spread)), 'gs');
}

/** A pine: a trunk and two stacked cones. */
export function pine(p: Part, rng: Rng, x: number, y: number, s = 1, z = 0): void {
  const tall = rng.rand(2.6, 3.4) * s, r = rng.rand(0.9, 1.2) * s;
  p.box(x - 0.12 * s, y - 0.12 * s, z, 0.24 * s, 0.24 * s, 0.8 * s, 'k', { lines: false });
  p.geo(cone, new THREE.Matrix4().compose(W(x, y, z + 0.8 * s + tall * 0.35), yaw(0), v3(r, tall * 0.7, r)), 'gs');
  p.geo(cone, new THREE.Matrix4().compose(W(x, y, z + 0.8 * s + tall * 0.7), yaw(0.4), v3(r * 0.7, tall * 0.6, r * 0.7)), 'gs');
}

/** A dashed line from (x0, y0) to (x1, y1) in the face G's own units; skip(x, y) leaves a dash out. */
export function dashes(p: Part, G: THREE.Matrix4, x0: number, y0: number, x1: number, y1: number, skip?: (x: number, y: number) => boolean): void {
  const len = Math.hypot(x1 - x0, y1 - y0), dash = 3, gap = 3;
  if (len === 0) return;
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len, segs: number[] = [];
  for (let s = 0; s < len; s += dash + gap) {
    const e = Math.min(len, s + dash), ax = x0 + ux * s, ay = y0 + uy * s;
    if (skip?.(ax, ay)) continue;
    segs.push(ax, ay, x0 + ux * e, y0 + uy * e);
  }
  p.draw(G, segs, 'detail', 0.03);
}

/** n points round a circle of radius r at height z, as three.js points (for markers drawn as a closed loop). */
export const ring = (cx: number, cy: number, r: number, z: number, n = 48): THREE.Vector3[] => {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push(W(cx + r * Math.cos(a), cy + r * Math.sin(a), z)); }
  return out;
};

/** Depth of the slab under the ground. */
const SLAB = 4;
/** Survey grid spacing, metres. */
const GRID = 40;

/** The slab: the world's footprint as a shallow block, its top the ground (z = 0), with a survey grid drawn on it. */
export function buildSlab(ctx: EngineContext): THREE.Group {
  const { x0, x1, y0, y1 } = ctx.layout.world;
  const p = new Part(ctx);
  p.box(x0, y0, -SLAB, x1 - x0, y1 - y0, SLAB, 'w');
  // the grid lies on the bare slab, just under the region fills, so it shows only where nothing is drawn
  const G = TOP(0, 0, 0.005), segs: number[] = [];
  for (let x = Math.ceil(x0 / GRID) * GRID; x <= x1; x += GRID) segs.push(x, y0, x, y1);
  for (let y = Math.ceil(y0 / GRID) * GRID; y <= y1; y += GRID) segs.push(x0, y, x1, y);
  p.draw(G, segs, 'grid');
  const g = p.build('slab');
  g.traverse((o) => { o.raycast = () => {}; });
  return g;
}
