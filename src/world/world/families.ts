/**
 * Building families (PRD §7.6, mega prompt §6.2): one parametric builder per
 * family, drawn with the engine's Part into whatever box the layout gives it.
 * Nothing here is drawn per sub-industry; a family is a form, and the zone
 * decides the family. No colours: tones only, through the theme's tokens.
 *
 * Every builder draws into the Part it is given and returns the glazing it
 * drew as window rectangles (face matrix and local rect), so the caller can
 * build the windows of a zone as their own small part and light them after
 * dark (PRD §7.12; PRD v2 §3.8).
 *
 * v2 (PRD v2 §3.5, D-V2-4): a company is a building. A block's two lots are
 * each drawn with the family's builder at lot size (every builder is
 * parametric in its box and holds its form down to a lot of 18 by 24 m); a
 * large family draws its shared form once behind an office unit per company.
 * The block keeps a signboard at its front centre, each lot a kerb sign with
 * its ticker and a bar along its front in its status tone.
 */
import * as THREE from 'three';
import type { BuildingFamily } from '@/lib/world/registry/types';
import type { Box } from '@/world/placement/types';
import { FRONT, SIDE, TOP, W } from '../engine/kernel/iso';
import type { Part, Tone } from '../engine/kernel/part';
import type { Rng } from '../engine/kernel/math';
import { crown, cone, pine, tree, yaw } from '../engine/world/ground';
import { v3 } from '../engine/kernel/part';

export interface WindowRect { M: THREE.Matrix4; x: number; y: number; w: number; h: number }
/** A point in world terms: x east, y south, z up. */
export type At = readonly [number, number, number];
/** What goes to and fro on a lot (PRD v2 Appendix C). */
export type RunKind = 'loader' | 'harvester' | 'boat' | 'log-truck' | 'forklift' | 'straddle' | 'shunter' | 'car' | 'ambulance';
/**
 * Where a family's activity happens (PRD v2 §3.7, Appendix C), in world terms: the builder knows where it drew its
 * stacks, doors, docks and cranes, so the activity stands exactly on them (sim/activity.ts).
 */
export interface Anchors {
  /** Smoke, steam, dust and compressor puffs rise from these; the power plant's plume. */
  smoke?: At[]; steam?: At[]; dust?: At[]; vents?: At[]; plume?: At[];
  /** An excavator's pivot, and the haul road round its pit (closed). */
  arm?: At[]; loop?: At[][];
  /** A pumpjack's foot; a flare's tip; a kiln's mouth; a beacon. */
  pump?: At[]; flare?: At[]; kiln?: At[]; beacon?: At[];
  /** A conveyor's runs, and the exchange's band: dashes travel along them. */
  conveyor?: (readonly [At, At])[]; band?: readonly [At, At];
  /** Something going to and fro. */
  run?: { from: At; to: At; kind: RunKind }[];
  /** An aerator's or a basin's ripples. */
  rings?: { at: At; r: number }[];
  /** Where walkers come and go (at the street band). */
  door?: At[];
  /** A quay crane's trolley run; the apron's taxiway toward take-off; the interchange's lanes on the overpass. */
  trolley?: (readonly [At, At])[]; runway?: readonly [At, At]; overpass?: (readonly [At, At])[];
  /** A swinging jib: a tower crane's or a scrap crane's with its magnet; a hoist's climb. */
  jib?: { at: At; len: number; kind: 'tower' | 'magnet' }[]; hoist?: readonly [At, At];
  /** The power plant's pylons, which the energy layer's pulses run along. */
  pylons?: At[];
}
export interface Drawn {
  windows: WindowRect[];
  /** Where the family's roof or top is, for the status mark. */
  top: number;
  /** Where its activity happens. */
  act?: Anchors;
}

type Builder = (p: Part, b: Box, rng: Rng) => Drawn;

const w = (b: Box) => b.x1 - b.x0, d = (b: Box) => b.y1 - b.y0;

/** A row of windows along the south and east faces of a box, as rects for the lit part. */
function windows(b: Box, z0: number, z1: number, step = 4, h = 1.2): WindowRect[] {
  const out: WindowRect[] = [];
  for (let z = z0 + 1.2; z + h < z1; z += 3) {
    for (let x = b.x0 + 2; x + 1.6 < b.x1; x += step) out.push({ M: FRONT(x, b.y1, z + h), x: 0, y: 0, w: 1.6, h });
    for (let y = b.y0 + 2; y + 1.6 < b.y1; y += step) out.push({ M: SIDE(b.x1, y + 1.6, z + h), x: 0, y: 0, w: 1.6, h });
  }
  return out;
}
const sawtooth = (p: Part, b: Box, z: number, h: number) => { for (let x = b.x0; x + 6 <= b.x1 + 0.01; x += 6) p.extrude([[x, b.y0, z], [x + 6, b.y0, z], [x + 6, b.y0, z + h * 0.35], [x + 1.2, b.y0, z + h]], [0, d(b), 0]); };
const stack = (p: Part, x: number, y: number, z: number, h: number, r = 1.2) => p.cylZ(x, y, z, r, h, 10);
const silo = (p: Part, x: number, y: number, z: number, h: number, r = 3) => { p.cylZ(x, y, z, r, h, 12); p.geo(cone, new THREE.Matrix4().compose(W(x, y, z + h + 1.2), yaw(0), v3(r * 1.1, 2.4, r * 1.1))); };
const slab = (p: Part, b: Box, z: number, h: number, tone: 'n' | 'g' | 'gr' | 'gs' | 's' = 'n') => p.box(b.x0, b.y0, z, w(b), d(b), h, tone);
const inset = (b: Box, m: number): Box => ({ x0: b.x0 + m, x1: b.x1 - m, y0: b.y0 + m, y1: b.y1 - m });
const yard = (p: Part, b: Box, k: 'glass' | 'sand' | 'grass' | 'road' | 'deck' = 'sand') => p.fill2(TOP(b.x0, b.y0, 0), 0, 0, w(b), d(b), k, 0.015);
const fenceRing = (p: Part, b: Box, h = 2.2) => { const seg = (x1: number, y1: number, x2: number, y2: number) => { const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 5)); for (let i = 0; i <= n; i++) p.seg('detail', W(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, 0), W(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, h)); p.seg('detail', W(x1, y1, h), W(x2, y2, h)); };
  seg(b.x0, b.y0, b.x1, b.y0); seg(b.x1, b.y0, b.x1, b.y1); seg(b.x1, b.y1, b.x0, b.y1); seg(b.x0, b.y1, b.x0, b.y0); };
const sign = (p: Part, b: Box, text: string, size = 1.6) => p.text(FRONT(b.x0 + 1, b.y1, 1), text, 0, 0.2, size, 'ink');
/** How many things of a given pitch fit along a length, at least one. */
const fits = (len: number, pitch: number) => Math.max(1, Math.floor(len / pitch));
/** The middle of a building's front, at its foot: its door. */
const door = (i: Box, z = 0): At => [(i.x0 + i.x1) / 2, i.y1 + 0.6, z];

// a plain hall: walls, a flat or sawtooth roof, glazing
const hall = (roof: 'flat' | 'saw', h: number): Builder => (p, b) => { const i = inset(b, 4); yard(p, b); slab(p, i, 0, h); if (roof === 'saw') sawtooth(p, i, h, 3); return { windows: windows(i, 0, h), top: h + (roof === 'saw' ? 3 : 0) }; };
// a tower: a slender box with a plinth and a roof plant
const tower = (floors: number): Builder => (p, b) => { const i = inset(b, 5), h = floors * 3.2; yard(p, b, 'deck'); slab(p, { ...b, x0: b.x0 + 2, x1: b.x1 - 2, y0: b.y0 + 2, y1: b.y1 - 2 }, 0, 1.2); slab(p, i, 1.2, h); p.box(i.x0 + 2, i.y0 + 2, h + 1.2, 4, 3, 1.6); return { windows: windows(i, 1.2, h + 1.2, 3.2, 1.6), top: h + 2.8, act: { door: [door(i, 1.2)] } }; };
// a low shop or depot with a canopy
const shopfront = (h: number, canopy = true): Builder => (p, b) => { const i = inset(b, 3); yard(p, b, 'deck'); slab(p, i, 0, h); if (canopy) p.box(i.x0, i.y1, h - 1, w(i), 2.5, 0.2); return { windows: windows(i, 0, h, 3, 1.8), top: h, act: { door: [door(i)] } }; };
// an open pit: terraces cut downward, a haul ramp, a shovel
const pit: Builder = (p, b, rng) => {
  const c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2] as const; yard(p, b, 'sand');
  for (let k = 0; k < 4; k++) { const r = Math.min(w(b), d(b)) / 2 - 6 - k * 7, z = -k * 3; const ring: [number, number, number][] = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ring.push([c[0] + r * Math.cos(a) * (w(b) / d(b)), c[1] + r * Math.sin(a), z]); } p.extrude(ring, [0, 0, -3], 'gr', { seams: false }); }
  p.box(c[0] + 10, c[1] - 3, -12, 4, 6, 3, 'k'); rng.next();
  // the haul road on the first terrace, the excavator on the floor with its arm (sim/activity.ts), the dust it raises
  const r1 = Math.min(w(b), d(b)) / 2 - 6 - 7 - 2, loop: At[] = [];
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; loop.push([c[0] + r1 * Math.cos(a) * (w(b) / d(b)), c[1] + r1 * Math.sin(a), -3]); }
  return { windows: [], top: 1, act: { arm: [[c[0] + 12, c[1], -9]], loop: [loop], dust: [[c[0] + 16, c[1] - 2, -10]] } };
};
const wellPad: Builder = (p, b, rng) => { yard(p, b, 'sand'); const c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], pump: At[] = []; for (const [dx, dy] of [[-10, -6], [10, -6], [0, 8]]) { pump.push([c[0] + dx, c[1] + dy + 3.4, 0]); const x = c[0] + dx, y = c[1] + dy; p.extrude([[x - 2, y - 2, 0], [x + 2, y - 2, 0], [x + 2, y + 2, 0], [x - 2, y + 2, 0]], [0, 0, 0.4]); p.seg('line', W(x - 2, y - 2, 0.4), W(x, y, 14)); p.seg('line', W(x + 2, y - 2, 0.4), W(x, y, 14)); p.seg('line', W(x + 2, y + 2, 0.4), W(x, y, 14)); p.seg('line', W(x - 2, y + 2, 0.4), W(x, y, 14)); } for (let i = 0; i < 3; i++) p.cylZ(b.x0 + 8 + i * 7, b.y1 - 8, 0, 2.6, 5, 10, 'k'); rng.next();
  // the flare stack in the far corner; its flame flickers, and burns bright at night
  const fx = b.x1 - 5, fy = b.y0 + 5; p.cylZ(fx, fy, 0, 0.4, 12, 8);
  return { windows: [], top: 14, act: { pump, flare: [[fx, fy, 12.6]] } }; };
const quarry: Builder = (p, b, rng) => { yard(p, b, 'sand'); const i = inset(b, 8); p.extrude([[i.x0, i.y0, 0], [i.x1, i.y0, 0], [i.x1, i.y1, 0], [i.x0, i.y1, 0]], [0, 0, -6], 'gr'); p.box(b.x1 - 16, b.y1 - 12, 0, 10, 6, 4); stack(p, b.x1 - 8, b.y1 - 9, 4, 3, 0.6); rng.next();
  const r = inset(b, 4), my = (i.y0 + i.y1) / 2;
  return { windows: [], top: 7, act: { arm: [[i.x0 + 7, my, -6]], dust: [[i.x0 + 10, my, -6]], loop: [[[r.x0, r.y0, 0], [r.x1, r.y0, 0], [r.x1, r.y1 - 14, 0], [r.x0, r.y1 - 14, 0]]], smoke: [[b.x1 - 8, b.y1 - 9, 7]] } }; };
// a stockpile: cones of bulk along the longer side, a conveyor across them
const stockpile: Builder = (p, b, rng) => {
  yard(p, b, 'sand'); const along = w(b) >= d(b), len = along ? w(b) : d(b), n = Math.min(3, fits(len - 6, 16)), r = Math.min(7, Math.min(w(b), d(b)) / 2 - 3);
  for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = along ? b.x0 + 3 + t * (len - 6) : (b.x0 + b.x1) / 2, y = along ? (b.y0 + b.y1) / 2 : b.y0 + 3 + t * (len - 6); p.geo(cone, new THREE.Matrix4().compose(W(x, y, 3), yaw(rng.rand(0, 3)), v3(r, 6, r)), 'k'); }
  p.seg('line', W(b.x0 + 3, b.y0 + 3, 0.5), W(b.x1 - 3, b.y1 - 3, 6)); p.seg('line', W(b.x0 + 3, b.y0 + 3.6, 0.5), W(b.x1 - 3, b.y1 - 2.4, 6));
  return { windows: [], top: 6, act: { conveyor: [[[b.x0 + 3, b.y0 + 3.3, 0.6], [b.x1 - 3, b.y1 - 2.7, 6.1]]], run: [{ from: [b.x0 + 5, b.y1 - 2, 0], to: [b.x1 - 5, b.y1 - 2, 0], kind: 'loader' }] } };
};
const plantation: Builder = (p, b, rng) => { yard(p, b, 'grass'); for (let x = b.x0 + 6; x < b.x1 - 4; x += 9) for (let y = b.y0 + 6; y < b.y1 - 4; y += 9) tree(p, rng, x + rng.rand(-1, 1), y + rng.rand(-1, 1), 0.7); p.box(b.x0 + 2, b.y1 - 10, 0, 12, 8, 4); return { windows: [], top: 4, act: { run: [{ from: [b.x0 + 18, b.y1 - 6, 0], to: [b.x1 - 6, b.y1 - 6, 0], kind: 'harvester' }] } }; };
const field: Builder = (p, b, rng) => { yard(p, b, 'grass'); const G = TOP(0, 0, 0.02); for (let y = b.y0 + 3; y < b.y1 - 2; y += 3) p.draw(G, [b.x0 + 2, y, b.x1 - 2, y], 'detail', 0.03); p.box(b.x0 + 2, b.y1 - 12, 0, 16, 10, 3.6); for (let i = 0; i < 6; i++) p.box(b.x1 - 10 - i * 3, b.y1 - 6, 0, 0.8, 0.6, 0.9, 'k'); rng.next();
  const y = b.y0 + 1.5 + 3 * Math.max(1, Math.floor((d(b) - 16) / 6));
  return { windows: [], top: 4, act: { run: [{ from: [b.x0 + 4, y, 0], to: [b.x1 - 4, y, 0], kind: 'harvester' }] } }; };
const pond: Builder = (p, b, rng) => { yard(p, b, 'grass'); const G = TOP(0, 0, 0.03), rings: { at: At; r: number }[] = []; for (let k = 0; k < 3; k++) { const x0 = b.x0 + 6 + k * ((w(b) - 12) / 3); rings.push({ at: [x0 + 1 + ((w(b) - 12) / 3 - 3) / 2, b.y0 + 6 + (d(b) - 24) / 2, 0.06], r: Math.min((w(b) - 12) / 3 - 3, d(b) - 24) * 0.3 }); p.fill2(G, x0 + 1, b.y0 + 6, (w(b) - 12) / 3 - 3, d(b) - 24, 'sea', 0.03); p.rect2(G, x0 + 1, b.y0 + 6, (w(b) - 12) / 3 - 3, d(b) - 24, 'line', 0.04); } p.box(b.x0 + 4, b.y1 - 14, 0, 18, 10, 4); for (const dx of [0, 8]) p.box(b.x1 - 26 + dx, b.y1 - 12, 0, 6, 8, 3); for (let i = 0; i < 6; i++) p.seg('line', W(b.x1 - 8 - i * 2, b.y0 + 2, 0), W(b.x1 - 8 - i * 2, b.y0 + 2, 1.1)); rng.next();
  const mid = rings[1].at, pw = (w(b) - 12) / 3 - 3;
  return { windows: [], top: 4, act: { rings, run: [{ from: [mid[0] - pw * 0.35, mid[1] + 3, 0.1], to: [mid[0] + pw * 0.35, mid[1] + 3, 0.1], kind: 'boat' }] } }; };
const forest: Builder = (p, b, rng) => { yard(p, b, 'grass'); for (let k = 0; k < 60; k++) { const x = rng.rand(b.x0 + 3, b.x1 - 24), y = rng.rand(b.y0 + 3, b.y1 - 3); if (rng.next() < 0.6) pine(p, rng, x, y, rng.rand(0.8, 1.2)); else tree(p, rng, x, y, rng.rand(0.8, 1.1)); } for (let i = 0; i < 4; i++) p.cylY(b.x1 - 18, b.y0 + 8 + i * 3, 0.6, 0.6, 12, 8, 'k'); p.box(b.x1 - 20, b.y1 - 9, 0, 14, 6, 3.6);
  return { windows: [], top: 4, act: { run: [{ from: [b.x1 - 4, b.y0 + 12, 0], to: [b.x1 - 4, b.y1 - 2, 0], kind: 'log-truck' }] } }; };
// a process plant: the hall across the back, a row of silos and a pipe rack in front of it, the stacks at the front corner
const processPlant: Builder = (p, b, rng) => {
  const i = inset(b, 3), hall: Box = { ...i, y1: i.y0 + d(i) * 0.5 };
  yard(p, b); slab(p, hall, 0, 10); sawtooth(p, hall, 10, 2.5);
  const n = Math.min(3, fits(w(i) - 8, 7));
  for (let k = 0; k < n; k++) silo(p, i.x0 + 3.5 + k * 7, hall.y1 + 5, 0, 15, 2.8);
  p.cylY(i.x0 + 2, hall.y1 + 1, 4, 0.8, d(i) * 0.3, 8);
  stack(p, i.x1 - 2.5, i.y1 - 4, 0, 26, 1.3); if (w(i) > 16) stack(p, i.x1 - 6.5, i.y1 - 4, 0, 20, 1);
  p.box(i.x0 + 1, i.y1 - 7, 0, Math.min(10, w(i) * 0.45), 6, 4); rng.next();
  const smoke: At[] = [[i.x1 - 2.5, i.y1 - 4, 26.4]]; if (w(i) > 16) smoke.push([i.x1 - 6.5, i.y1 - 4, 20.4]);
  return { windows: windows(hall, 0, 10), top: 27, act: { smoke, kiln: [[i.x1 - 2.5, i.y1 - 2.4, 1.2]], conveyor: [[[i.x0 + 2, hall.y1 + 1, 5], [i.x0 + 2, hall.y1 + 1 + d(i) * 0.3, 5]]],
    run: [{ from: [i.x0 + 2, i.y1 + 1.5, 0], to: [i.x0 + Math.min(10, w(i) * 0.45), i.y1 + 1.5, 0], kind: 'forklift' }] } };
};
const factory: Builder = (p, b) => { const i = inset(b, 3); yard(p, b); slab(p, i, 0, 8); sawtooth(p, i, 8, 2.4); stack(p, i.x1 - 3, i.y0 + 3, 8, 6, 0.8);
  return { windows: windows(i, 0, 8), top: 11, act: { smoke: [[i.x1 - 3, i.y0 + 3, 14.4]], run: [{ from: [i.x0 + 2, i.y1 + 1.5, 0], to: [i.x1 - 2, i.y1 + 1.5, 0], kind: 'forklift' }] } }; };
const packaging: Builder = (p, b) => { const i = inset(b, 3); yard(p, b); slab(p, i, 0, 7); for (let x = i.x0 + 4; x < i.x1 - 4; x += 8) p.box(x, i.y1 - 0.4, 0, 3, 0.4, 3.4, 'k');
  return { windows: windows(i, 0, 7), top: 7, act: { steam: [[(i.x0 + i.x1) / 2, (i.y0 + i.y1) / 2, 7.4]], conveyor: [[[i.x0 + 1, i.y1 + 0.8, 1], [i.x1 - 1, i.y1 + 0.8, 1]]], run: [{ from: [i.x0 + 2, i.y1 + 2.4, 0], to: [i.x1 - 2, i.y1 + 2.4, 0], kind: 'forklift' }] } }; };
const powerPlant: Builder = (p, b) => { const i = inset(b, 4); yard(p, b, 'glass'); slab(p, { ...i, x1: i.x0 + w(i) * 0.55 }, 0, 14); stack(p, i.x1 - 8, i.y0 + 8, 0, 38, 2.2); stack(p, i.x1 - 16, i.y0 + 8, 0, 32, 1.8); const pylons: At[] = []; for (let k = 0; k < 3; k++) { const x = i.x0 + w(i) * 0.6 + k * 9, y = i.y1 - 8; pylons.push([x, y, 12]); p.box(x - 0.3, y - 0.3, 0, 0.6, 0.6, 12); p.seg('line', W(x - 3, y, 12), W(x + 3, y, 12)); p.seg('line', W(x, y - 3, 12), W(x, y + 3, 12)); }
  return { windows: windows({ ...i, x1: i.x0 + w(i) * 0.55 }, 0, 14, 5), top: 38, act: { plume: [[i.x1 - 8, i.y0 + 8, 38.4], [i.x1 - 16, i.y0 + 8, 32.4]], pylons } }; };
const waterPlant: Builder = (p, b) => { const i = inset(b, 4); yard(p, b, 'glass'); const rings: { at: At; r: number }[] = []; for (const [dx, dy] of [[0.25, 0.3], [0.7, 0.3], [0.25, 0.72], [0.7, 0.72]]) { rings.push({ at: [i.x0 + w(i) * dx, i.y0 + d(i) * dy, 2.46], r: Math.min(w(i), d(i)) * 0.16 }); p.cylZ(i.x0 + w(i) * dx, i.y0 + d(i) * dy, 0, Math.min(w(i), d(i)) * 0.18, 2.4, 16); p.fill2(TOP(0, 0, 2.42), i.x0 + w(i) * dx - 4, i.y0 + d(i) * dy - 4, 8, 8, 'sea', 0.02); } p.box(i.x0, i.y1 - 6, 0, 12, 6, 4); return { windows: [], top: 4, act: { rings } }; };
const warehouse: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'glass'); slab(p, i, 0, 9); for (let x = i.x0 + 6; x < i.x1 - 6; x += 10) { p.rect2(FRONT(x, i.y1, 4), 0, 0, 4, 4, 'detail'); p.box(x - 1, i.y1 - 0.2, 0.9, 6, 2.6, 0.3, 'k'); }
  return { windows: [], top: 9, act: { run: [{ from: [i.x0 + 4, i.y1 + 3.4, 0], to: [i.x1 - 4, i.y1 + 3.4, 0], kind: 'forklift' }] } }; };
const coldStore: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'glass'); slab(p, i, 0, 10, 'g'); const vents: At[] = []; for (let k = 0; k < 4; k++) { if (i.x0 + 6 + k * 6 <= i.x1) vents.push([i.x0 + 4 + k * 6, i.y0 + 3.5, 11.6]); p.box(i.x0 + 2 + k * 6, i.y0 + 2, 10, 4, 3, 1.4); }
  return { windows: [], top: 11.4, act: { vents, run: [{ from: [i.x0 + 3, i.y1 + 2.4, 0], to: [i.x1 - 3, i.y1 + 2.4, 0], kind: 'forklift' }] } }; };
const office: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'deck'); slab(p, i, 0, 6.4); p.box(i.x0 - 1, i.y1, 3.2, w(i) + 2, 3, 0.2); return { windows: windows(i, 0, 6.4, 3, 1.6), top: 6.4, act: { door: [door(i)] } }; };
const quay: Builder = (p, b) => { yard(p, b, 'road'); const G = TOP(0, 0, 0.02), trolley: (readonly [At, At])[] = []; for (let x = b.x0 + 10; x < b.x1 - 10; x += 60) { trolley.push([[x + 7, b.y0 + 7, 23.4], [x + 7, b.y1 - 4, 23.4]]); const legs = [[x, b.y0 + 6], [x + 14, b.y0 + 6], [x, b.y1 - 6], [x + 14, b.y1 - 6]]; for (const [lx, ly] of legs) p.box(lx - 0.5, ly - 0.5, 0, 1, 1, 24); p.box(x - 1, b.y0 + 5, 24, 16, d(b) - 10, 1.6); p.box(x + 6, b.y1 - 2, 25.6, 1.4, 1.4, 40); p.box(x + 5, b.y1 - 1.3, 60, 3, 1.2, 1.2); p.seg('line', W(x + 6.7, b.y1 - 1.3, 65), W(x + 6.7, b.y1 + 22, 48)); } for (let k = 0; k < 10; k++) p.box(b.x0 + 20 + k * 9, b.y0 + 10, 0, 6.1, 2.4, 2.6, 'k'); p.draw(G, [b.x0, b.y1 - 3, b.x1, b.y1 - 3], 'line', 0.04);
  return { windows: [], top: 66, act: { trolley, run: [{ from: [b.x0 + 20, b.y0 + 16, 0], to: [Math.min(b.x1 - 10, b.x0 + 110), b.y0 + 16, 0], kind: 'straddle' }] } }; };
const apron: Builder = (p, b) => { yard(p, b, 'road'); const G = TOP(0, 0, 0.02); for (let x = b.x0 + 10; x < b.x1 - 10; x += 30) p.draw(G, [x, b.y0 + 4, x, b.y1 - 20], 'line', 0.04); const t = { x0: b.x0 + 6, x1: b.x1 - 6, y0: b.y1 - 16, y1: b.y1 - 2 }; slab(p, t, 0, 7, 'g'); p.cylZ(b.x1 - 14, b.y0 + 10, 0, 1.6, 20, 10); p.box(b.x1 - 18, b.y0 + 6, 20, 8, 8, 3, 'g'); for (let k = 0; k < 2; k++) { const x = b.x0 + 24 + k * 36, y = b.y0 + 22; p.box(x, y - 1.6, 1.4, 22, 3.2, 3.2); p.box(x + 8, y - 12, 2.2, 6, 24, 0.7); p.box(x + 20, y - 0.5, 2, 2, 1, 5); }
  return { windows: windows(t, 0, 7, 3, 1.6), top: 20, act: { runway: [[b.x0 + 12, b.y0 + 48, 0], [b.x1 - 8, b.y0 + 48, 0]] } }; };
const interchange: Builder = (p, b) => { yard(p, b, 'grass'); const c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]; const G = TOP(0, 0, 0.02); p.fill2(G, b.x0, c[1] - 6, w(b), 12, 'road', 0.02); p.box(c[0] - 6, b.y0, 0, 12, d(b), 0.6, 'k'); p.box(c[0] - 7, b.y0, 0.6, 14, d(b), 5.4); p.fill2(TOP(0, 0, 6.02), c[0] - 6, b.y0, 12, d(b), 'road', 0.02); for (const x of [c[0] - 7, c[0] + 7]) p.seg('line', W(x, b.y0, 6.8), W(x, b.y1, 6.8)); for (let k = 0; k < 4; k++) { p.box(c[0] - 18 + k * 9, c[1] + 8, 0, 3, 5, 3.4); } p.box(c[0] - 20, c[1] + 7, 3.4, 40, 7, 0.4);
  return { windows: [], top: 7, act: { overpass: [[[c[0] + 3, b.y0 + 2, 6.05], [c[0] + 3, b.y1 - 2, 6.05]], [[c[0] - 3, b.y1 - 2, 6.05], [c[0] - 3, b.y0 + 2, 6.05]]] } }; };
const railYard: Builder = (p, b) => { yard(p, b, 'sand'); const G = TOP(0, 0, 0.03); for (let k = 0; k < 4; k++) { const y = b.y0 + 8 + k * 9; for (const o of [-0.72, 0.72]) p.draw(G, [b.x0 + 2, y + o, b.x1 - 2, y + o], 'line', 0.04); for (let x = b.x0 + 2; x < b.x1 - 2; x += 1.6) p.draw(G, [x, y - 1.2, x, y + 1.2], 'detail', 0.03); } p.box(b.x1 - 14, b.y1 - 10, 0, 10, 6, 5); p.box(b.x1 - 12, b.y1 - 9, 5, 6, 4, 3, 'g');
  return { windows: [], top: 8, act: { run: [{ from: [b.x0 + 8, b.y0 + 17, 0.1], to: [b.x1 - 24, b.y0 + 17, 0.1], kind: 'shunter' }] } }; };
const shed3pl: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'glass'); slab(p, i, 0, 9); for (let x = i.x0 + 4; x < i.x1 - 4; x += 7) p.rect2(FRONT(x, i.y1, 4), 0, 0, 4, 4, 'detail'); p.text(FRONT(i.x0 + 2, i.y1, 8.2), '3PL', 0, 0, 2.2, 'paint'); return { windows: [], top: 9, act: { run: [{ from: [i.x0 + 3, i.y1 + 3, 0], to: [i.x1 - 3, i.y1 + 3, 0], kind: 'forklift' }] } }; };
const depot: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'glass'); slab(p, { ...i, y1: i.y0 + d(i) * 0.55 }, 0, 7); for (let x = i.x0 + 3; x + 3.6 < i.x1 - 1; x += 7) p.rect2(FRONT(x, i.y0 + d(i) * 0.55, 3.6), 0, 0, 3.6, 3.6, 'detail'); const n = Math.min(3, fits(w(i) - 2, 9)); for (let k = 0; k < n; k++) p.box(i.x0 + 2 + k * 9, i.y1 - 8, 0, 6, 2.4, 3, 'k');
  const fy = i.y0 + d(i) * 0.55 + 2.4; return { windows: [], top: 7, act: { run: [{ from: [i.x0 + 3, fy, 0], to: [i.x1 - 3, fy, 0], kind: 'forklift' }] } }; };
const marketHall: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'deck'); slab(p, i, 0, 5); p.extrude([[i.x0, i.y0, 5], [i.x1, i.y0, 5], [(i.x0 + i.x1) / 2, i.y0, 9]], [0, d(i), 0]); return { windows: windows(i, 0, 5, 3, 1.6), top: 9, act: { door: [door(i)] } }; };
const supermarket: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'road'); slab(p, { ...i, y0: i.y0 + d(i) * 0.4 }, 0, 6); p.box(i.x0, i.y1, 4.6, w(i), 3, 0.3); const G = TOP(0, 0, 0.02); for (let x = i.x0 + 2; x < i.x1 - 2; x += 3) p.draw(G, [x, i.y0 + 2, x, i.y0 + d(i) * 0.36], 'detail', 0.03); return { windows: windows({ ...i, y0: i.y0 + d(i) * 0.4 }, 0, 6, 3, 2), top: 6, act: { door: [door(i)] } }; };
const departmentStore: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'deck'); slab(p, i, 0, 14); p.box(i.x0 - 1, i.y1, 3.6, w(i) + 2, 2.6, 0.3); return { windows: windows(i, 3.6, 14, 3.2, 1.8), top: 14, act: { door: [door(i)] } }; };
const dealership: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'road'); slab(p, { ...i, y1: i.y0 + d(i) * 0.55 }, 0, 6, 'g'); const n = Math.min(5, fits(w(i) - 1, 4)); for (let k = 0; k < n; k++) p.box(i.x0 + 1 + k * 4, i.y1 - 6, 0, 2, 4.4, 1.5, 'k');
  return { windows: [], top: 6, act: { door: [door({ ...i, y1: i.y0 + d(i) * 0.55 })], run: [{ from: [i.x0 + 2, i.y1 + 1.2, 0], to: [i.x1 - 2, i.y1 + 1.2, 0], kind: 'car' }] } }; };
const hotel: Builder = tower(8);
const restaurant: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'deck'); slab(p, i, 0, 4.4); for (let k = 0; k < 3; k++) { p.cylZ(i.x0 + 3 + k * 5, i.y1 + 2, 0, 0.9, 0.8, 8); } return { windows: windows(i, 0, 4.4, 3, 2), top: 4.4, act: { door: [door(i)] } }; };
const cinema: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'deck'); slab(p, i, 0, 11); p.box(i.x0 + 2, i.y1 - 0.4, 11, w(i) - 4, 0.6, 3, 'k'); return { windows: windows({ ...i, y1: i.y1 }, 0, 4, 4, 2), top: 14, act: { door: [door(i)] } }; };
const school: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'grass'); slab(p, { ...i, y1: i.y0 + d(i) * 0.5 }, 0, 7); p.box(i.x0 - 0.3, i.y0 + d(i) * 0.5, 0, 0.3, 0.3, 9); p.box(i.x0 - 0.3, i.y0 + d(i) * 0.5, 7.5, 2, 0.1, 1.2, 'k'); const G = TOP(0, 0, 0.02); p.rect2(G, i.x0 + 4, i.y0 + d(i) * 0.6, w(i) - 8, d(i) * 0.35, 'line', 0.03); return { windows: windows({ ...i, y1: i.y0 + d(i) * 0.5 }, 0, 7, 3, 1.6), top: 9, act: { door: [door({ ...i, y1: i.y0 + d(i) * 0.5 })] } }; };
const hospital: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'deck'); slab(p, { ...i, y1: i.y0 + d(i) * 0.6 }, 0, 18); slab(p, { ...i, y0: i.y0 + d(i) * 0.6 }, 0, 5); p.box(i.x0 + w(i) / 2 - 1.2, i.y0 + 4, 18, 2.4, 0.5, 2.4, 'k'); p.box(i.x0 + w(i) / 2 - 0.25, i.y0 + 3, 18, 0.5, 2.4, 2.4, 'k');
  return { windows: windows({ ...i, y1: i.y0 + d(i) * 0.6 }, 0, 18, 3.2, 1.6), top: 20, act: { door: [door(i)], run: [{ from: [i.x0 + 2, i.y1 + 2, 0], to: [i.x1 - 2, i.y1 + 2, 0], kind: 'ambulance' }] } }; };
const clinic: Builder = shopfront(5, true);
const lab: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'deck'); slab(p, i, 0, 7, 'g'); for (let k = 0; k < 3; k++) stack(p, i.x0 + 3 + k * 4, i.y0 + 3, 7, 2, 0.5); return { windows: [], top: 9, act: { door: [door(i)] } }; };
const officeTower: Builder = tower(9);
const bankTower: Builder = (p, b, rng) => { const r = tower(12)(p, b, rng); const i = inset(b, 5); p.box(i.x0 - 1, i.y1, 0, w(i) + 2, 4, 0.3); for (const x of [i.x0, i.x1 - 0.6]) p.box(x, i.y1 + 3.4, 0.3, 0.6, 0.6, 5); return r; };
const exchange: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'deck'); slab(p, i, 0, 12); for (let x = i.x0 + 2; x < i.x1 - 2; x += 3) p.box(x, i.y1 - 2.4, 0, 0.7, 0.7, 12); p.box(i.x0 + 1, i.y1 - 3, 12, w(i) - 2, 3.6, 0.6);
  // the band along the front under the roof, where the day's tickers run (dashes, never text)
  return { windows: windows({ ...i, y1: i.y1 - 3 }, 0, 12, 3, 2), top: 12.6, act: { door: [door(i)], band: [[i.x0 + 1.5, i.y1 + 0.7, 11.2], [i.x1 - 1.5, i.y1 + 0.7, 11.2]] } }; };
// a recycling plant: the sorting hall at the back, bales and heaps in the yard in front, a conveyor up to the hall
const recycling: Builder = (p, b, rng) => {
  const i = inset(b, 3), hall: Box = { ...i, y1: i.y0 + d(i) * 0.5 };
  yard(p, b, 'sand'); slab(p, hall, 0, 9); sawtooth(p, hall, 9, 2.4);
  const cols = Math.min(2, fits(w(i), 12));
  for (let k = 0; k < cols * 2; k++) p.geo(crown, new THREE.Matrix4().compose(W(i.x0 + 6 + (k % cols) * 12, hall.y1 + 6 + Math.floor(k / cols) * 10, 2.5), yaw(rng.rand(0, 3)), v3(4.5, 2.6, 4.5)), 'k');
  p.seg('line', W(i.x1 - 3, i.y1 - 2, 0.5), W(i.x1 - 3, hall.y1, 8));
  return { windows: windows(hall, 0, 9), top: 11, act: { conveyor: [[[i.x1 - 3, i.y1 - 2, 0.7], [i.x1 - 3, hall.y1, 8.2]]], steam: [[(i.x0 + i.x1) / 2, (i.y0 + hall.y1) / 2, 11.6]] } };
};
const scrapYard: Builder = (p, b, rng) => { yard(p, b, 'sand'); fenceRing(p, inset(b, 2)); for (let k = 0; k < 6; k++) p.box(b.x0 + 6 + (k % 3) * 14, b.y0 + 6 + Math.floor(k / 3) * 14, 0, 8, 8, rng.rand(2, 4), 'k');
  return { windows: [], top: 4, act: { jib: [{ at: [b.x1 - 6, b.y1 - 6, 0], len: 10, kind: 'magnet' }] } }; };
const compost: Builder = (p, b, rng) => { yard(p, b, 'grass'); for (let k = 0; k < 5; k++) p.extrude([[b.x0 + 4, b.y0 + 4 + k * 7, 0], [b.x1 - 4, b.y0 + 4 + k * 7, 0], [b.x1 - 4, b.y0 + 7 + k * 7, 0], [b.x0 + 4, b.y0 + 7 + k * 7, 0]], [0, 0, 2], 'gs', { seams: false }); rng.next();
  return { windows: [], top: 2, act: { steam: [[(b.x0 + b.x1) / 2 - 6, b.y0 + 5.5, 2.2], [(b.x0 + b.x1) / 2 + 6, b.y0 + 19.5, 2.2]] } }; };
const telecomTower: Builder = (p, b) => { const c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]; yard(p, b, 'glass'); fenceRing(p, inset(b, 2), 2); const h = 46; for (const [dx, dy] of [[-2.5, -2.5], [2.5, -2.5], [2.5, 2.5], [-2.5, 2.5]]) p.seg('line', W(c[0] + dx, c[1] + dy, 0), W(c[0] + dx * 0.25, c[1] + dy * 0.25, h)); for (let z = 6; z < h; z += 8) { const s = 2.5 * (1 - z / h * 0.75); p.draw(TOP(c[0] - s, c[1] - s, z), [0, 0, 2 * s, 0, 2 * s, 0, 2 * s, 2 * s, 2 * s, 2 * s, 0, 2 * s, 0, 2 * s, 0, 0], 'detail', 0); } for (let k = 0; k < 3; k++) p.box(c[0] - 0.4 + Math.cos(k * 2.1) * 1.2, c[1] - 0.2 + Math.sin(k * 2.1) * 1.2, h - 4, 0.8, 0.4, 2.2, 'k'); p.box(c[0] - 0.3, c[1] - 0.3, h, 0.6, 0.6, 1.2, 'l'); p.box(b.x0 + 2, b.y1 - 6, 0, 5, 4, 2.8); return { windows: [], top: h + 1.2, act: { beacon: [[c[0], c[1], h + 1.6]] } }; };
const constructionSite: Builder = (p, b, rng) => { yard(p, b, 'sand'); fenceRing(p, inset(b, 2), 2.4); const i = inset(b, Math.min(8, Math.min(w(b), d(b)) / 4)); slab(p, i, 0, 0.6); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) p.box(i.x0 + 2 + dx * (w(i) - 4.6), i.y0 + 2 + dy * (d(i) - 4.6), 0.6, 0.6, 0.6, 9); for (let z = 3.6; z <= 9.6; z += 3) slab(p, i, z, 0.4); const cx = b.x1 - 6, cy = b.y0 + 6; p.box(cx - 0.6, cy - 0.6, 0, 1.2, 1.2, 28); rng.next();
  // the crane's jib swings and the hoist climbs the frame (sim/activity.ts); the mast stands here
  return { windows: [], top: 29, act: { jib: [{ at: [cx, cy, 28], len: 24, kind: 'tower' }], hoist: [[i.x0 + 1.4, i.y1 - 1.4, 0.6], [i.x0 + 1.4, i.y1 - 1.4, 9.6]] } }; };
const thinkTank: Builder = (p, b) => { const i = inset(b, 3); yard(p, b, 'deck'); slab(p, i, 0, 7); p.box(i.x0 - 6, i.y1, 0, w(i) + 12, 10, 0.5); for (let x = i.x0 - 6; x <= i.x1 + 6; x += 3) p.seg('line', W(x, i.y1 + 10, 0.5), W(x, i.y1 + 10, 1.5)); p.seg('line', W(i.x0 - 6, i.y1 + 10, 1.5), W(i.x1 + 6, i.y1 + 10, 1.5)); return { windows: windows(i, 0, 7, 3, 2.2), top: 7, act: { door: [door(i, 0.5)] } }; };

export const FAMILY_BUILDERS: Record<BuildingFamily, Builder> = {
  pit, 'well-pad': wellPad, quarry, stockpile, 'plantation-block': plantation, field, pond, 'forest-block': forest,
  'process-plant': processPlant, factory, 'packaging-plant': packaging, 'power-plant': powerPlant, 'water-plant': waterPlant, warehouse, 'cold-store': coldStore,
  'operator-office': office, quay, apron, interchange, 'rail-yard': railYard, '3pl-shed': shed3pl, depot, 'market-hall': marketHall,
  supermarket, minimarket: shopfront(4.4), 'department-store': departmentStore, shop: shopfront(5.2), dealership, hotel, restaurant, cinema,
  school, hospital, clinic, lab, 'office-tower': officeTower, 'bank-tower': bankTower, exchange, 'recycling-plant': recycling,
  'scrap-yard': scrapYard, 'compost-site': compost, 'telecom-tower': telecomTower, 'construction-site': constructionSite, 'think-tank': thinkTank,
};

/** Draw a family into a part; the sign, when given, is the name on its front (the fixtures'). */
export function drawFamily(p: Part, family: BuildingFamily, b: Box, rng: Rng, label?: string): Drawn {
  const drawn = FAMILY_BUILDERS[family](p, b, rng);
  if (label) sign(p, b, label, 1.4);
  return drawn;
}

/** The ground a family stands on: the block's yard round and between its lots. */
export function blockYard(p: Part, family: BuildingFamily, b: Box): void {
  const k: Parameters<typeof yard>[2] = ['pit', 'well-pad', 'quarry', 'stockpile', 'scrap-yard', 'recycling-plant', 'construction-site', 'rail-yard'].includes(family) ? 'sand'
    : ['plantation-block', 'field', 'pond', 'forest-block', 'compost-site', 'interchange', 'school'].includes(family) ? 'grass'
      : ['quay', 'apron', 'supermarket', 'dealership'].includes(family) ? 'road' : ['factory', 'process-plant', 'packaging-plant'].includes(family) ? 'sand' : 'deck';
  yard(p, b, k);
}

/** An office unit (10 by 8 m) beside a large family's shared form: a low box with a canopy and windows. */
export function officeUnit(p: Part, b: Box): Drawn {
  const h = 4.4; yard(p, b, 'deck');
  slab(p, inset(b, 0.6), 0, h);
  p.box(b.x0 + 0.2, b.y1 - 1.2, 2.6, w(b) - 0.4, 1.4, 0.2);
  return { windows: windows(inset(b, 0.6), 0, h, 2.6, 1.2), top: h, act: { door: [door(inset(b, 0.6))] } };
}

/** The block's signboard at its front centre: a pylon with a panel, between the two lots (PRD v2 §3.5). */
export function signboard(p: Part, b: Box, front: 's' | 'e'): void {
  const [cx, cy] = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
  if (front === 's') { p.box(cx - 0.2, b.y1 - 1.6, 0, 0.4, 0.4, 3); p.box(cx - 1.5, b.y1 - 1.7, 3, 3, 0.6, 3.4, 'k'); }
  else { p.box(b.x1 - 1.6, cy - 0.2, 0, 0.4, 0.4, 3); p.box(b.x1 - 1.7, cy - 1.5, 3, 0.6, 3, 3.4, 'k'); }
}

/** A lot's kerb sign: a post and a panel with the ticker (or "Vacant"), facing the street (PRD v2 §3.5). */
export function kerbSign(p: Part, at: readonly [number, number], front: 's' | 'e', text: string): void {
  const [x, y] = at;
  // the ticker is 2 m tall, eight pixels at the street band's 4 px/m
  const W = Math.max(5, text.length * 1.45 + 1.2);
  if (front === 's') { p.box(x, y - 0.15, 0, 0.3, 0.3, 2); p.box(x - 0.4, y - 0.2, 2, W, 0.4, 2.8, 'w'); p.text(FRONT(x + 0.2, y + 0.21, 4.8), text, 0, 2.3, 2, 'ink'); }
  else { p.box(x - 0.15, y, 0, 0.3, 0.3, 2); p.box(x - 0.2, y - W + 0.4, 2, 0.4, W, 2.8, 'w'); p.text(SIDE(x + 0.21, y + 0.2, 4.8), text, 0, 2.3, 2, 'ink'); }
}

/** A lot's status bar: a low bar along its front, in the status's tone (PRD v2 §3.5); seen at the district band. */
export function statusBar(p: Part, lot: Box, front: 's' | 'e', tone: Tone): void {
  if (front === 's') p.box(lot.x0 + 0.5, lot.y1 - 1.6, 0, Math.max(1, w(lot) - 1), 1.4, 0.9, tone, { lines: false });
  else p.box(lot.x1 - 1.6, lot.y0 + 0.5, 0, 1.4, Math.max(1, d(lot) - 1), 0.9, tone, { lines: false });
}

/** The shared form of a large family: the block less the strip its lots open onto, where the office units stand. */
export function sharedBox(b: Box, entry: 's' | 'e' | 'n', strip: number): Box {
  return entry === 's' ? { ...b, y1: b.y1 - strip } : entry === 'n' ? { ...b, y0: b.y0 + strip } : { ...b, x1: b.x1 - strip };
}
