// Adapted from Factory Yard (github.com/Khalidabdi1/factory, commit 148758a), after ai-iso-skill (MIT, © 2026 Tolga Cohce).
import * as THREE from 'three';
import { TOP, W } from '../kernel/iso';
import { Part, v3 } from '../kernel/part';
import type { Rng } from '../kernel/math';
import type { EngineContext } from '../context';

// ---- static scene: the helpers every builder shares, and the slab ----
export const crown = new THREE.IcosahedronGeometry(1, 0), cone = new THREE.ConeGeometry(1, 1, 7), roof4 = new THREE.ConeGeometry(1, 1, 4);
export const yaw = (a: number): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), a);
export function tree(p: Part, rng: Rng, x: number, y: number, s = 1, z = 0): void {
  p.box(x - 0.22 * s, y - 0.22 * s, z, 0.44 * s, 0.44 * s, 2.2 * s);
  p.geo(crown, new THREE.Matrix4().compose(W(x, y, z + 2.2 * s + 1.7 * s), yaw(rng.rand(0, 3)), v3(2 * s, 2.2 * s, 2 * s)));
}
export function pine(p: Part, rng: Rng, x: number, y: number, s = 1, z = 0): void {
  p.box(x - 0.15 * s, y - 0.15 * s, z, 0.3 * s, 0.3 * s, 1.2 * s);
  p.geo(cone, new THREE.Matrix4().compose(W(x, y, z + 3.2 * s), yaw(rng.rand(0, 3)), v3(1.5 * s, 4.4 * s, 1.5 * s)));
}
// a palm: a leaning trunk and hairline fronds
export function palm(p: Part, rng: Rng, x: number, y: number, s = 1, z = 0): void {
  const lean = rng.rand(-0.6, 0.6), top = W(x + lean * s, y + lean * 0.4 * s, z + 5.4 * s);
  p.geo(new THREE.CylinderGeometry(0.14, 0.22, 5.4 * s, 6), new THREE.Matrix4().compose(W(x + lean * s / 2, y + lean * 0.2 * s, z + 2.7 * s),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(lean * 0.04, 0, -lean * 0.18 / s)), v3(1, 1, 1)));
  const a0 = rng.rand(0, 1);
  for (let i = 0; i < 7; i++) { const a = a0 + i / 7 * Math.PI * 2, c = Math.cos(a), d = Math.sin(a);
    const m = top.clone().add(v3(c * 1.5 * s, 0.35 * s, d * 1.5 * s)), e = top.clone().add(v3(c * 2.7 * s, -0.9 * s, d * 2.7 * s));
    p.seg('line', top, m).seg('line', m, e); }
  p.geo(crown, new THREE.Matrix4().compose(top, yaw(a0), v3(0.38 * s, 0.32 * s, 0.38 * s)));
}
export const CURB = 0.15;
export function lampPost(p: Part, x: number, y: number, ax: number, ay: number, z = CURB): void {
  p.box(x - 0.08, y - 0.08, z, 0.16, 0.16, 4.4);
  const hx = x + ax * 1.1, hy = y + ay * 1.1;
  p.seg('line', W(x, y, z + 4.3), W(hx, hy, z + 4.3));
  p.box(hx - 0.3, hy - 0.18, z + 4.05, 0.6, 0.36, 0.18, 'l');
}
export const ring = (cx: number, cy: number, r: number, z: number, n = 40): THREE.Vector3[] => {
  const s: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
    s.push(W(cx + r * Math.cos(a), cy + r * Math.sin(a), z), W(cx + r * Math.cos(b), cy + r * Math.sin(b), z)); }
  return s;
};
// fences: hairline posts and two rails
export function fence(p: Part, x1: number, y1: number, x2: number, y2: number, z = 0, h = 2.4): void {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 4));
  for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n; p.seg('line', W(x, y, z), W(x, y, z + h)); }
  for (const k of [0.46, 0.96]) p.seg('line', W(x1, y1, z + h * k), W(x2, y2, z + h * k));
}
// dashed centre lines on the ground
export function dashes(p: Part, G: THREE.Matrix4, x0: number, y0: number, x1: number, y1: number, skip: (x: number, y: number) => boolean = () => false): void {
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  for (let d = 1; d < L - 3; d += 6) { const x = x0 + ux * d, y = y0 + uy * d; if (!skip(x, y) && !skip(x + ux * 3, y + uy * 3)) p.draw(G, [x, y, x + ux * 3, y + uy * 3], 'line', 0.05); }
}

/**
 * The slab: the world's ground as one part, 4 m thick so its edge reads at
 * the plate's rim, with a faint grid every 50 m at the far view. Everything
 * the generated layout places stands on it (Phase D's builders).
 */
export function buildSlab(ctx: EngineContext): THREE.Group {
  const { x0, x1, y0, y1 } = ctx.layout.world, p = new Part(ctx), G = TOP(0, 0, 0);
  p.extrude([[x0, y0, -4], [x0, y1, -4], [x0, y1, 0], [x0, y0, 0]], [x1 - x0, 0, 0], 'gr');
  for (let x = Math.ceil(x0 / 50) * 50; x < x1; x += 50) p.draw(G, [x, y0, x, y1], 'detail', 0.02);
  for (let y = Math.ceil(y0 / 50) * 50; y < y1; y += 50) p.draw(G, [x0, y, x1, y], 'detail', 0.02);
  const g = p.build('slab');
  g.traverse((o) => { o.raycast = () => {}; });   // nothing to click, and the heaviest mesh to test on every hover
  return g;
}
