// Original to this repository (Kawasan Industri world engine, fallback kernel), after ai-iso-skill (MIT, © 2026 Tolga Cohce).
/**
 * The world's axes and the three face planes of the isometric drawing.
 *
 * World coordinates are the layout's: +x east, +y south, +z up, one unit a
 * metre. three.js is y-up, so a world point (x, y, z) lives at three.js
 * (x, z, y); W() does that swap and is the only place it happens.
 *
 * From ai-iso-skill comes the idea of drawing flat things on a plane: a
 * face is an origin and two in-plane axes, and anything drawn in the face's
 * own 2D units (u to the right, v downward) lands on it through one matrix.
 * The camera sees the top (z = const), the south face (y = const, facing
 * +y) and the east face (x = const, facing +x); FRONT and SIDE take the
 * face's top-left corner as seen from the camera, as the skill does, so a
 * face's local rectangle [0, w] × [0, h] runs right and down on screen.
 *
 * The matrices map (u, v, n) to three.js space, where n is a lift along the
 * face's outward normal (toward the camera): enough to keep a decal off the
 * surface it is drawn on.
 */
import * as THREE from 'three';

/** A world point or direction, (x, y, z) with z up. */
export type V3 = readonly [x: number, y: number, z: number];

/** A world point as a three.js vector. */
export const W = (x: number, y: number, z = 0): THREE.Vector3 => new THREE.Vector3(x, z, y);

/** The cross product of two world directions, in world terms. */
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * A face: origin O, in-plane axes U (local u) and V (local v), all in world
 * terms. The third column is the unit normal U × V, which for the three
 * faces below points toward the camera.
 */
export function plane(O: V3, U: V3, V: V3): THREE.Matrix4 {
  const N = cross(U, V), len = Math.hypot(N[0], N[1], N[2]) || 1;
  const u = W(U[0], U[1], U[2]), v = W(V[0], V[1], V[2]), n = W(N[0] / len, N[1] / len, N[2] / len), o = W(O[0], O[1], O[2]);
  return new THREE.Matrix4().set(
    u.x, v.x, n.x, o.x,
    u.y, v.y, n.y, o.y,
    u.z, v.z, n.z, o.z,
    0, 0, 0, 1,
  );
}

/** The ground plane at height z: u east, v south, origin (x, y). */
export const TOP = (x: number, y: number, z: number): THREE.Matrix4 => plane([x, y, z], [1, 0, 0], [0, 1, 0]);
/** A south-facing wall (y = const): u east, v down, origin its top-left corner (x, y, z). */
export const FRONT = (x: number, y: number, z: number): THREE.Matrix4 => plane([x, y, z], [1, 0, 0], [0, 0, -1]);
/** An east-facing wall (x = const): u north, v down, origin its top-left corner (x, y, z), the wall's south end. */
export const SIDE = (x: number, y: number, z: number): THREE.Matrix4 => plane([x, y, z], [0, -1, 0], [0, 0, -1]);

/** The direction from the scene toward the camera, in world terms: the viewer stands to the south-east, above. */
export const VIEWER: V3 = [1, 1, 1];
