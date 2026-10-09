/**
 * The section drawing every archetype interior starts from (PRD §7.7, §7.8;
 * after Factory Yard's world/interiors.ts): the walls cut low and hatched on
 * the cut, the roof as an outline, the floor, and a back wall the whiteboard
 * is drawn on. Each archetype module adds its stations inside this box.
 */
import * as THREE from 'three';
import { TOP, W } from '../engine/kernel/iso';
import { Part } from '../engine/kernel/part';
import type { EngineContext } from '../engine/context';
import type { Box } from '@/world/placement/types';

export const LOW = 1.0, T = 0.22;

/** A straight low wall along x or y, hatched on top, leaving gaps [a, b] (in the same coordinate) for doors. */
export function lowWall(c: Part, x0: number, y0: number, x1: number, y1: number, z: number, gaps: readonly (readonly [number, number])[] = []): void {
  const alongX = Math.abs(y1 - y0) < 1e-6, a0 = Math.min(alongX ? x0 : y0, alongX ? x1 : y1), a1 = Math.max(alongX ? x0 : y0, alongX ? x1 : y1);
  const runs: [number, number][] = []; let s = a0;
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g0 > s) runs.push([s, g0]); s = Math.max(s, g1); }
  if (a1 > s) runs.push([s, a1]);
  for (const [r0, r1] of runs) {
    if (r1 - r0 < 0.05) continue;
    const bx = alongX ? r0 : x0 - T / 2, by = alongX ? y0 - T / 2 : r0, w = alongX ? r1 - r0 : T, d = alongX ? T : r1 - r0;
    c.box(bx, by, z, w, d, LOW);
    const n = Math.max(w, d), segs: number[] = [];
    for (let u = 0.25; u < n - 0.05; u += 0.45) segs.push(...(w > d ? [u, 0, Math.min(n, u + T), d] : [0, u, w, Math.min(n, u + T)]));
    c.draw(TOP(bx, by, z + LOW), segs);
  }
}

export interface Cut {
  /** The cut: low walls and the roof outline, replacing the shell while open. */
  cut: THREE.Group;
  /** The inside: floor and whatever the archetype draws. */
  inside: THREE.Group;
  /** The back wall's face matrix (its top-left corner), where the whiteboard goes. */
  backWall: { x0: number; x1: number; y: number; z: number };
}

/** The shell of a plot cut open: walls low and hatched, roof as an outline, floor and back wall. */
export function buildCut(ctx: EngineContext, b: Box, front: 's' | 'e', roofZ = 4.2, draw?: (inside: Part, b: Box) => void): Cut {
  const cut = new Part(ctx), inside = new Part(ctx);
  const door: [number, number] = front === 's' ? [(b.x0 + b.x1) / 2 - 1, (b.x0 + b.x1) / 2 + 1] : [(b.y0 + b.y1) / 2 - 1, (b.y0 + b.y1) / 2 + 1];
  lowWall(cut, b.x0, b.y0, b.x1, b.y0, 0);
  lowWall(cut, b.x0, b.y1, b.x1, b.y1, 0, front === 's' ? [door] : []);
  lowWall(cut, b.x0, b.y0, b.x0, b.y1, 0);
  lowWall(cut, b.x1, b.y0, b.x1, b.y1, 0, front === 'e' ? [door] : []);
  // the roof as an outline, where it was
  const R = [W(b.x0, b.y0, roofZ), W(b.x1, b.y0, roofZ), W(b.x1, b.y1, roofZ), W(b.x0, b.y1, roofZ)];
  for (let i = 0; i < 4; i++) cut.seg('detail', R[i], R[(i + 1) % 4]);
  inside.fill2(TOP(b.x0, b.y0, 0), 0, 0, b.x1 - b.x0, b.y1 - b.y0, 'deck', 0.012);
  // the back wall stands full height, the whiteboard's wall: the north wall for a south-facing plot, the west wall otherwise
  const backWall = front === 's' ? { x0: b.x0, x1: b.x1, y: b.y0, z: 3.2 } : { x0: b.y0, x1: b.y1, y: b.x0, z: 3.2 };
  if (front === 's') inside.box(b.x0, b.y0, LOW, b.x1 - b.x0, T, 3.2 - LOW); else inside.box(b.x0, b.y0, LOW, T, b.y1 - b.y0, 3.2 - LOW);
  draw?.(inside, b);
  return { cut: cut.build('cut'), inside: inside.build('inside'), backWall };
}
