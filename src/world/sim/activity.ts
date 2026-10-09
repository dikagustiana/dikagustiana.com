/**
 * Activity and night (PRD v2 §3.7, §3.8, Appendix C, D-V2-7, D-V2-8; mega
 * prompt §5): every family shows a motion at the district band, and after
 * dark every building, every road and every fire lights.
 *
 *   - Each family's activity (FAMILY_ACTIVITY, one entry per family) stands on
 *     the anchors its builder returned: smoke and steam rise from the stacks it
 *     drew, forklifts work its docks, walkers come and go at its doors.
 *   - Everything repeated is instanced: one InstancedMesh per model (a puff, a
 *     ring, a dash, a forklift, an excavator's arm …), so all of it costs a few
 *     dozen draw calls whatever the number of blocks (ACTIVITY_BUDGET).
 *   - It moves with the simulation's clock (update advances its own time; draw
 *     poses the instances once a frame), so it pauses when the world pauses and
 *     replays with the seed: every phase comes from the instance's generator.
 *   - Night: lamps stand along every road and at every lot's front, their heads
 *     and their pools of light coming on with the dark; kilns, flares and the
 *     telecom beacons burn. Windows warm through the theme (theme.shade).
 *   - The energy layer shows the power line from the power plant's pylons with
 *     pulses running along it; the cold-chain layer tints the cold stores.
 *
 * Motion is illustrative; nothing here is a figure, and nothing is text.
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { BuildingFamily } from '@/lib/world/registry/types';
import type { GeneratedLayout, Pt } from '@/world/placement/types';
import type { EngineContext } from '../engine/context';
import { Part, type Tone } from '../engine/kernel/part';
import type { LayerName } from '../engine/types';
import type { ActivitySite } from '../world/build';
import type { At, RunKind } from '../world/families';
import { drawModel, VEHICLE_SCALE } from './vehicles';

/** What can move on a lot (PRD v2 Appendix C). */
export const ACTIVITY_KINDS = [
  'excavator', 'haul', 'dust', 'pumpjack', 'flare', 'conveyor', 'loader', 'harvester', 'aerator', 'boat', 'log-truck',
  'smoke', 'steam', 'kiln', 'forklift', 'plume', 'pulse', 'ripples', 'compressor', 'walkers', 'band', 'quay-crane',
  'straddle', 'plane', 'cars', 'shunter', 'parking', 'ambulance', 'magnet', 'beacon', 'tower-crane', 'hoist',
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/**
 * Every family's activity at the district band (PRD v2 Appendix C). Ships calling at the quay, the rail shuttle,
 * trucks docking and the town's vans are the flows' (sim/flows.ts); this is what stands on the lots themselves.
 */
export const FAMILY_ACTIVITY: Record<BuildingFamily, readonly ActivityKind[]> = {
  pit: ['excavator', 'haul', 'dust'], quarry: ['excavator', 'haul', 'dust', 'smoke'], 'well-pad': ['pumpjack', 'flare'], stockpile: ['conveyor', 'loader'],
  'plantation-block': ['harvester'], field: ['harvester'], pond: ['aerator', 'boat'], 'forest-block': ['log-truck'],
  'process-plant': ['smoke', 'kiln', 'conveyor', 'forklift'], factory: ['smoke', 'forklift'], 'packaging-plant': ['steam', 'conveyor', 'forklift'],
  'power-plant': ['plume', 'pulse'], 'water-plant': ['ripples'], warehouse: ['forklift'], '3pl-shed': ['forklift'], depot: ['forklift'], 'cold-store': ['forklift', 'compressor'],
  'operator-office': ['walkers'], 'office-tower': ['walkers'], 'bank-tower': ['walkers'], exchange: ['walkers', 'band'],
  quay: ['quay-crane', 'straddle'], apron: ['plane'], interchange: ['cars'], 'rail-yard': ['shunter'],
  'market-hall': ['walkers'], supermarket: ['walkers'], minimarket: ['walkers'], 'department-store': ['walkers'], shop: ['walkers'], dealership: ['walkers', 'parking'],
  hotel: ['walkers'], restaurant: ['walkers'], cinema: ['walkers'], school: ['walkers'], hospital: ['walkers', 'ambulance'], clinic: ['walkers'], lab: ['walkers'],
  'recycling-plant': ['conveyor', 'steam'], 'scrap-yard': ['magnet'], 'compost-site': ['steam'], 'telecom-tower': ['beacon'], 'construction-site': ['tower-crane', 'hoist'],
  'think-tank': ['walkers'],
};

/** All activity and the lamps together draw in at most this many calls (PRD v2 §3.7). */
export const ACTIVITY_BUDGET = 60;
/** How fast a boom swings (full travel in a second and a half), and how far up it goes. */
const BOOM_SPEED = 1 / 0.7, BOOM_LIFT = 1.35;
/** A lamp every so many metres along a road, alternating sides; one at every lot's front. */
const LAMP_PITCH = 44;
/** The energy layer: a pulse every so many metres along its lines; the feeders' and the drops' heights. */
const PULSE_PITCH = 18, FEEDER_Z = 12, DROP_Z = 4;

type Model = 'boom' | 'puff' | 'ring' | 'dash' | 'arm' | 'haul' | 'pump-frame' | 'pump-beam' | 'loader' | 'harvester' | 'boat' | 'log-truck' | 'forklift'
  | 'straddle' | 'shunter' | 'car' | 'ambulance' | 'plane' | 'trolley' | 'jib-tower' | 'jib-magnet' | 'hoist' | 'walker' | 'post';
type GlowModel = 'flame' | 'kiln' | 'beacon' | 'band' | 'lamp-head' | 'pool';

const PUFF = new THREE.IcosahedronGeometry(0.6, 0);

/** The models, facing +x about their origin, in metres. */
function drawActor(p: Part, m: Model): void {
  const wheels = (xs: number[], half: number, r: number) => { for (const x of xs) { p.cylY(x, half, r, r, 0.35, 8, 'kb'); p.cylY(x, -half - 0.35, r, r, 0.35, 8, 'kb'); } };
  switch (m) {
    // a puff: a low ball, a unit across, faces shaded as every solid's are
    case 'puff': p.geo(PUFF, new THREE.Matrix4(), 'w'); break;
    // a weighbridge's boom: a bar across the road from its post, white with dark bands
    case 'boom': p.box(0, -0.15, -0.15, 10, 0.3, 0.3, 'w'); for (let k = 1; k < 10; k += 2) p.box(k, -0.17, -0.17, 1, 0.34, 0.34, 'kb'); break;
    case 'ring': {
      // a ring of unit radius, a tenth wide, flat on the water
      const n = 18, ro = 1, ri = 0.88;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2; p.extrude([[ro * Math.cos(a), ro * Math.sin(a), 0], [ro * Math.cos(b), ro * Math.sin(b), 0], [ri * Math.cos(b), ri * Math.sin(b), 0], [ri * Math.cos(a), ri * Math.sin(a), 0]], [0, 0, 0.04], 'w', { lines: false }); }
      break;
    }
    case 'dash': p.box(-0.8, -0.3, -0.15, 1.6, 0.6, 0.3, 'w', { lines: false }); break;
    case 'arm': p.box(0, -0.35, -0.35, 6.4, 0.7, 0.7, 'n'); p.box(5.6, -0.8, -1.6, 1.4, 1.6, 1.4, 'k'); break;
    case 'haul': drawModel(p, 'dump'); break;
    case 'pump-frame': p.box(-1.6, -1.1, 0, 3.6, 2.2, 0.4, 'k'); p.box(-0.3, -0.9, 0.4, 0.6, 0.3, 3.2, 'k'); p.box(-0.3, 0.6, 0.4, 0.6, 0.3, 3.2, 'k'); break;
    case 'pump-beam': p.box(-3, -0.3, -0.3, 6, 0.6, 0.6, 'n'); p.box(2.6, -0.45, -1.4, 0.9, 0.9, 1.8, 'k'); p.box(-3.2, -0.5, -0.8, 1, 1, 1, 'kb'); break;
    case 'loader': p.box(-4, -1.1, 0.5, 4, 2.2, 1.6, 'k'); p.box(-3.6, -0.9, 2.1, 1.6, 1.8, 1.4, 'kb'); p.box(0, -1.3, 0.2, 1, 2.6, 1.2, 'n'); wheels([-0.9, -3.2], 1.1, 0.6); break;
    case 'harvester': p.box(-5, -1.3, 0.6, 5, 2.6, 2.2, 'gs'); p.box(-1.6, -1, 2.8, 1.6, 2, 1.4, 'kb'); p.box(0, -2.6, 0.3, 1.4, 5.2, 0.8, 'k'); wheels([-1, -4], 1.3, 0.7); break;
    case 'boat': p.extrude([[0, 0, 0], [-1.4, -1, 0], [-5, -1, 0], [-5, 1, 0], [-1.4, 1, 0]], [0, 0, 0.8], 'w'); p.box(-3.4, -0.6, 0.8, 1.4, 1.2, 0.9, 'kb'); break;
    case 'log-truck': p.box(-2.4, -1.2, 0.5, 2.4, 2.4, 2.2, 'kb'); p.box(-11, -1.1, 0.9, 8.4, 2.2, 0.3, 'k'); for (let k = 0; k < 3; k++) p.box(-10.6, -1 + k * 0.7, 1.2, 7.8, 0.6, 0.6, 's'); wheels([-1.6, -8, -9.6], 1.2, 0.5); break;
    case 'forklift': p.box(-2.4, -0.7, 0.3, 2.4, 1.4, 1.2, 'k'); p.box(-1.8, -0.6, 1.5, 0.1, 1.2, 1.2, 'kb'); p.box(0, -0.6, 0.2, 0.15, 1.2, 2.8, 'kb'); p.box(0.15, -0.6, 0.3, 1.3, 1.2, 0.9, 's'); break;
    case 'straddle': for (const [x, y] of [[-6, -1.8], [0, -1.8], [-6, 1.6], [0, 1.6]]) p.box(x, y, 0, 0.4, 0.4, 7, 'k'); p.box(-6, -1.8, 7, 6.4, 3.8, 0.8, 'kb'); p.box(-5.6, -1.2, 1.6, 5.6, 2.4, 2.6, 'a'); break;
    case 'shunter': p.box(-12, -1.5, 0.8, 12, 3, 3.2, 'kb'); p.box(-10, -1.6, 4, 2.4, 3.2, 0.4, 'k'); break;
    case 'car': p.box(-4.2, -0.9, 0.3, 4.2, 1.8, 0.9, 'n'); p.box(-3.2, -0.8, 1.2, 2.2, 1.6, 0.7, 'g'); break;
    case 'ambulance': p.box(-5.4, -1, 0.4, 5.4, 2, 2.2, 'w'); p.box(-5.4, -1.02, 1.2, 5.4, 2.04, 0.4, 'a'); p.box(-0.06, -0.9, 1.3, 0.06, 1.8, 0.8, 'g'); break;
    case 'plane': p.box(-22, -1.6, 1.4, 22, 3.2, 3.2, 'w'); p.box(-14, -12, 2.2, 6, 24, 0.7, 'n'); p.box(-22, -0.5, 4.6, 3, 1, 5, 'n'); p.box(-22, -4, 5.4, 2.4, 8, 0.4, 'n'); break;
    case 'trolley': p.box(-1.2, -1.6, -0.4, 2.4, 3.2, 1, 'k'); p.box(-0.1, -0.1, -9, 0.2, 0.2, 8.6, 'k'); p.box(-1.2, -3, -11.8, 2.4, 6, 2.6, 'a'); break;
    case 'jib-tower': p.box(-8, -0.45, 0, 24, 0.9, 0.9, 'n'); p.box(-8, -1, -1.4, 3, 2, 1.4, 'k'); p.box(13, -0.1, -10, 0.2, 0.2, 10, 'k'); p.box(12.4, -0.6, -11.2, 1.2, 1.2, 1.2, 'k'); p.box(-0.8, -0.8, 0.9, 1.6, 1.6, 2.2, 'kb'); break;
    case 'jib-magnet': p.box(-1, -1, 0, 2, 2, 2.4, 'k'); p.box(-0.4, -0.4, 2.4, 0.8, 0.8, 6, 'k'); p.box(0, -0.3, 8, 10, 0.6, 0.6, 'n'); p.box(9.8, -0.06, 4.6, 0.12, 0.12, 3.4, 'k'); p.cylZ(9.86, 0, 4, 1, 0.6, 10, 'kb'); break;
    case 'hoist': p.box(-0.8, -0.8, 0, 1.6, 1.6, 1.8, 'a'); break;
    case 'walker': drawModel(p, 'walker'); break;
    case 'post': p.box(-0.15, -0.15, 0, 0.3, 0.3, 6.4, 'k'); p.box(-0.15, -0.12, 6.2, 1.8, 0.24, 0.2, 'k'); break;
  }
}
function drawGlow(p: Part, m: GlowModel): void {
  switch (m) {
    case 'flame': p.box(-0.5, -0.5, 0, 1, 1, 2.2, 'l', { lines: false }); break;
    case 'kiln': p.box(-1.4, -0.4, 0, 2.8, 0.8, 1.6, 'l', { lines: false }); break;
    case 'beacon': p.box(-0.5, -0.5, 0, 1, 1, 1, 'l', { lines: false }); break;
    // the exchange's band: a dash, lit after dark
    case 'band': p.box(-0.8, -0.3, -0.15, 1.6, 0.6, 0.3, 'l', { lines: false }); break;
    case 'lamp-head': p.box(1.4, -0.45, 6.4, 1.1, 0.9, 0.45, 'l', { lines: false }); break;
    case 'pool': { const n = 16, pts: [number, number, number][] = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([1.9 + 5.5 * Math.cos(a), 5.5 * Math.sin(a), 0]); } p.extrude(pts, [0, 0, 0.02], 'l', { seams: false, lines: false }); break; }
  }
}

/** Models drawn at the vehicles' scale (PRD v2 §3.2: vehicles at 1.25 × metric size), carried by their instances. */
const SCALED = new Set<Model>(['haul', 'loader', 'harvester', 'boat', 'log-truck', 'forklift', 'straddle', 'shunter', 'car', 'ambulance', 'plane', 'walker']);
/** What each run kind is drawn with, and its speed in metres per second. */
const RUN_MODEL: Record<RunKind, Model> = { loader: 'loader', harvester: 'harvester', boat: 'boat', 'log-truck': 'log-truck', forklift: 'forklift', straddle: 'straddle', shunter: 'shunter', car: 'car', ambulance: 'ambulance' };
const RUN_SPEED: Record<RunKind, number> = { loader: 2.5, harvester: 2, boat: 1.6, 'log-truck': 4, forklift: 2.2, straddle: 3, shunter: 3, car: 3, ambulance: 5 };
/** Which kind of activity each run kind is (for the per-kind counts). */
const RUN_KIND: Record<RunKind, ActivityKind> = { loader: 'loader', harvester: 'harvester', boat: 'boat', 'log-truck': 'log-truck', forklift: 'forklift', straddle: 'straddle', shunter: 'shunter', car: 'parking', ambulance: 'ambulance' };

export interface Activity {
  /** Advance the activity's own time (a simulation step). */
  update(dt: number): void;
  /** Pose every instance for the frame from that time (once a frame). */
  draw(): void;
  setLayer(name: LayerName, on: boolean): void;
  /** The district band hides the walkers at the doors (PRD v2 §3.3). */
  setDetail(tiny: boolean, far: boolean): void;
  /** How many of each kind stand in the world, and the lamps. */
  counts(): Record<string, number>;
  /** The blocks lit after dark: every block with a lamp at a lot's front (the windows light through the theme). */
  litBlocks(): Set<string>;
  /** One site of each family that stands in the world: its centre, for a frame per family. */
  families(): Record<string, [number, number]>;
  /** The meshes drawn, for the draw-call budget. */
  meshes(): THREE.Object3D[];
  /** Its simulated time. */
  time(): number;
  dispose(): void;
}

export function createActivity(ctx: EngineContext, layout: GeneratedLayout, sites: readonly ActivitySite[], o: { phone: boolean; busyGates?: () => ReadonlySet<string> }): Activity {
  const { scene, rng, theme } = ctx;
  const root = new THREE.Group(); root.name = 'activity'; scene.add(root);
  const near = new THREE.Group(); near.name = 'activity-near'; near.visible = false; root.add(near);
  const energy = new THREE.Group(); energy.name = 'activity-energy'; energy.visible = false; root.add(energy);
  const cold = new THREE.Group(); cold.name = 'activity-cold'; cold.visible = false; root.add(cold);
  const poolGroup = new THREE.Group(); poolGroup.name = 'activity-pools'; poolGroup.visible = false; root.add(poolGroup);
  // the cold stores' tint: the accent, translucent, with the cold-chain layer
  const coldTint = new THREE.MeshBasicMaterial({ color: theme.fill.livef.color.clone(), transparent: true, opacity: 0.2, depthWrite: false }); coldTint.name = 'cold-tint';
  const counts: Record<string, number> = {};
  let fed = false;
  const count = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };

  // ---- the instanced meshes, created on first use, sized when everything is placed ----
  interface Slot { model: Model | GlowModel; glow: boolean; parent: THREE.Group; n: number; mesh: THREE.InstancedMesh | null }
  const slots = new Map<string, Slot>();
  const slot = (model: Model | GlowModel, glow = false, parent: THREE.Group = root): Slot => {
    const key = `${model}:${parent.name}`; let s = slots.get(key);
    if (!s) { s = { model, glow, parent, n: 0, mesh: null }; slots.set(key, s); }
    return s;
  };
  /** A reserved instance: its slot and index, posed by draw(). */
  interface Inst { s: Slot; i: number }
  const take = (s: Slot): Inst => ({ s, i: s.n++ });

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qp = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), col = new THREE.Color();
  const UP = new THREE.Vector3(0, 1, 0), SIDE = new THREE.Vector3(0, 0, 1);
  /** Stand an instance at world (x, y, z), heading h, pitched by pitch about its own side, scaled. */
  const pose = (x: Inst, wx: number, wy: number, wz: number, h = 0, scale = 1, pitch = 0, sz = scale) => {
    const mesh = x.s.mesh!; pos.set(wx, wz, wy); q.setFromAxisAngle(UP, -h);
    if (pitch) { qp.setFromAxisAngle(SIDE, pitch); q.multiply(qp); }
    scl.set(scale, sz, scale); m4.compose(pos, q, scl); mesh.setMatrixAt(x.i, m4);
  };
  const tint = (x: Inst, c: THREE.Color) => x.s.mesh!.setColorAt(x.i, c);

  // ---- the actors, as plain records; draw() poses them from the time ----
  interface Puff { x: Inst; at: At; k: number; n: number; period: number; rise: number; size: number; drift: number; phase: number; color: THREE.Color }
  interface Swing { x: Inst; at: At; base: number; amp: number; period: number; phase: number; dip?: number; scale?: number }
  interface Run { x: Inst; from: At; to: At; len: number; speed: number; phase: number; scale: number }
  interface Loop { x: Inst; pts: At[]; cum: number[]; len: number; speed: number; phase: number }
  interface Dash { x: Inst; from: At; to: At; len: number; speed: number; offset: number; color?: THREE.Color }
  interface Ring { x: Inst; at: At; r: number; period: number; phase: number }
  interface Blink { x: Inst; at: At; period: number; phase: number; flicker: boolean }
  interface Walk { x: Inst; from: At; out: Pt; len: number; speed: number; phase: number }
  interface Hoist { x: Inst; from: At; to: At; period: number; phase: number }
  interface Plane { x: Inst; from: At; to: At; period: number; phase: number }
  const puffs: Puff[] = [], swings: Swing[] = [], runs: Run[] = [], loops: Loop[] = [], dashes: Dash[] = [], rings: Ring[] = [], blinks: Blink[] = [], walks: Walk[] = [], hoists: Hoist[] = [], planes: Plane[] = [];
  const statics: { x: Inst; at: At; h: number; scale: number }[] = [];
  const toneOf = (t: Tone) => theme.tone(t).clone();
  const smokeCol = toneOf('g'), steamCol = toneOf('w'), dustCol = toneOf('s'), pulseCol = toneOf('a'), beltCol = toneOf('k');

  const emit = (kind: ActivityKind, at: At, color: THREE.Color, o2: { n?: number; period?: number; rise?: number; size?: number; drift?: number } = {}) => {
    // phones draw no smoke or steam (PRD v2 §3.14)
    if (o.phone) return;
    const n = o2.n ?? 4, period = o2.period ?? 6, phase = rng.rand(0, period);
    for (let k = 0; k < n; k++) puffs.push({ x: take(slot('puff')), at, k, n, period, rise: o2.rise ?? 9, size: o2.size ?? 1.6, drift: o2.drift ?? 3, phase, color });
    count(kind);
  };
  const run = (kind: RunKind, from: At, to: At) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]); if (len < 1) return;
    const model = RUN_MODEL[kind];
    runs.push({ x: take(slot(model)), from, to, len, speed: RUN_SPEED[kind], phase: rng.rand(0, 2 * len / RUN_SPEED[kind]), scale: SCALED.has(model) ? VEHICLE_SCALE : 1 });
    count(RUN_KIND[kind]);
  };
  const belt = (kind: ActivityKind | null, from: At, to: At, color: THREE.Color | undefined, pitch = 3, parent: THREE.Group = root, speed = 2.5, lit = false) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]); if (len < 1) return;
    const n = Math.max(1, Math.floor(len / pitch));
    for (let k = 0; k < n; k++) dashes.push({ x: take(lit ? slot('band', true, parent) : slot('dash', false, parent)), from, to, len, speed, offset: (k / n) * len, color });
    if (kind) count(kind);
  };

  // ---- every site's activity, from its anchors ----
  for (const st of sites) {
    const a = st.act;
    for (const at of a.smoke ?? []) emit('smoke', at, smokeCol, { n: 5, period: 7, rise: 12, size: 1.8 });
    for (const at of a.steam ?? []) emit('steam', at, steamCol, { n: 4, period: 5, rise: 7, size: 1.5, drift: 1.5 });
    for (const at of a.dust ?? []) emit('dust', at, dustCol, { n: 3, period: 4, rise: 3, size: 2.2, drift: 4 });
    for (const at of a.vents ?? []) emit('compressor', at, steamCol, { n: 2, period: 3, rise: 3, size: 0.9, drift: 1 });
    for (const at of a.plume ?? []) emit('plume', at, smokeCol, { n: 6, period: 12, rise: 30, size: 4, drift: 10 });
    for (const at of a.arm ?? []) { swings.push({ x: take(slot('arm')), at, base: rng.rand(0, Math.PI * 2), amp: 0.9, period: 9, phase: rng.rand(0, 9), dip: 0.35 }); count('excavator'); }
    for (const pts of a.loop ?? []) {
      // two haul trucks round the pit's road
      const cum = [0]; for (let i = 1; i <= pts.length; i++) { const p0 = pts[i - 1], p1 = pts[i % pts.length]; cum.push(cum[i - 1] + Math.hypot(p1[0] - p0[0], p1[1] - p0[1])); }
      const len = cum[cum.length - 1];
      for (let k = 0; k < 2; k++) loops.push({ x: take(slot('haul')), pts, cum, len, speed: 5, phase: (k / 2) * len + rng.rand(0, 10) });
      count('haul');
    }
    for (const at of a.pump ?? []) { statics.push({ x: take(slot('pump-frame')), at, h: 0, scale: 1 }); swings.push({ x: take(slot('pump-beam')), at: [at[0], at[1], at[2] + 3.6], base: 0, amp: 0, period: 4, phase: rng.rand(0, 4), dip: 0.3 }); count('pumpjack'); }
    // a flare's and a kiln's fire, and the light they throw on the ground after dark
    for (const at of a.flare ?? []) { blinks.push({ x: take(slot('flame', true)), at, period: 0.6, phase: rng.rand(0, 1), flicker: true }); statics.push({ x: take(slot('pool', true, poolGroup)), at: [at[0] - 1.9, at[1], 0.25], h: 0, scale: 1.4 }); count('flare'); }
    for (const at of a.kiln ?? []) { statics.push({ x: take(slot('kiln', true)), at, h: 0, scale: 1 }); statics.push({ x: take(slot('pool', true, poolGroup)), at: [at[0] - 1.9, at[1] + 2, 0.25], h: 0, scale: 0.9 }); count('kiln'); }
    for (const at of a.beacon ?? []) { blinks.push({ x: take(slot('beacon', true)), at, period: 2, phase: rng.rand(0, 2), flicker: false }); count('beacon'); }
    for (const [f, t] of a.conveyor ?? []) belt('conveyor', f, t, beltCol);
    // the band's colour is its glow material's: light by day, lit in the accent after dark (PRD v2 §3.8)
    if (a.band) belt('band', a.band[0], a.band[1], undefined, 2.4, root, 4, true);
    for (const r of a.run ?? []) run(r.kind, r.from, r.to);
    for (const r of a.rings ?? []) { for (let k = 0; k < 2; k++) rings.push({ x: take(slot('ring')), at: r.at, r: r.r, period: 4, phase: rng.rand(0, 4) + k * 2 }); count(st.family === 'pond' ? 'aerator' : 'ripples'); }
    for (const at of a.door ?? []) {
      // two walkers out of the door and back, along the front, at the street band
      for (let k = 0; k < 2; k++) { const side = k ? 1 : -1, out: Pt = [at[0] + side * rng.rand(4, 9), at[1] + rng.rand(2, 5)]; walks.push({ x: take(slot('walker', false, near)), from: at, out, len: Math.hypot(out[0] - at[0], out[1] - at[1]), speed: rng.rand(1, 1.5), phase: rng.rand(0, 20) }); }
      count('walkers');
    }
    for (const [f, t] of a.trolley ?? []) { runs.push({ x: take(slot('trolley')), from: f, to: t, len: Math.hypot(t[0] - f[0], t[1] - f[1]), speed: 2, phase: rng.rand(0, 40), scale: 1 }); count('quay-crane'); }
    if (a.runway) { planes.push({ x: take(slot('plane')), from: a.runway[0], to: a.runway[1], period: 50, phase: rng.rand(0, 50) }); count('plane'); }
    for (const [f, t] of a.overpass ?? []) { const len = Math.hypot(t[0] - f[0], t[1] - f[1]); for (let k = 0; k < 3; k++) runs.push({ x: take(slot('car')), from: f, to: t, len, speed: -6, phase: (k / 3) * (len / 6) + rng.rand(0, 1), scale: VEHICLE_SCALE }); count('cars'); }
    for (const j of a.jib ?? []) { swings.push({ x: take(slot(j.kind === 'tower' ? 'jib-tower' : 'jib-magnet')), at: j.at, base: rng.rand(0, Math.PI * 2), amp: j.kind === 'tower' ? 1.4 : 1.1, period: j.kind === 'tower' ? 24 : 12, phase: rng.rand(0, 24) }); count(j.kind === 'tower' ? 'tower-crane' : 'magnet'); }
    if (a.hoist) { hoists.push({ x: take(slot('hoist')), from: a.hoist[0], to: a.hoist[1], period: 16, phase: rng.rand(0, 16) }); count('hoist'); }
    // the power plant's pylons: the energy layer's line out of the plant and on to every block (PRD v2 §3.9)
    if (a.pylons?.length) {
      const lines: [At, At][] = [];
      for (let i = 0; i + 1 < a.pylons.length; i++) lines.push([a.pylons[i], a.pylons[i + 1]]);
      if (!fed) {
        // from the last pylon a feeder to each region's substation, and from there a drop to each of its blocks
        fed = true;
        const last = a.pylons[a.pylons.length - 1];
        for (const r of layout.regions) {
          const blocks = layout.blocks.filter((b) => b.region === r.id); if (!blocks.length) continue;
          const sub: At = [r.anchor[0], r.anchor[1], FEEDER_Z];
          lines.push([last, sub]);
          for (const b of blocks) lines.push([sub, [b.anchor[0], b.anchor[1], DROP_Z]]);
          count('fed', blocks.length);
        }
      }
      for (const [f, t] of lines) belt(null, f, t, pulseCol, PULSE_PITCH, energy, 12);
      count('pulse');
      const segs: number[] = []; for (const [f, t] of lines) segs.push(f[0], f[2], f[1], t[0], t[2], t[1]);
      const wire = new LineSegments2(new LineSegmentsGeometry().setPositions(segs), theme.line.live); wire.raycast = () => {}; wire.frustumCulled = false; energy.add(wire);
    }
    // the cold-chain layer tints the cold stores (PRD v2 §3.12)
    if (st.family === 'cold-store') {
      const b = st.box, g = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0 - 4, 12, b.y1 - b.y0 - 4), coldTint);
      g.position.set((b.x0 + b.x1) / 2, 6, (b.y0 + b.y1) / 2); g.raycast = () => {}; cold.add(g);
    }
  }
  // the town's vans and cars are the flows'; the fixtures' and the blocks' lamps light every block (C2)
  const lit = new Set<string>();

  // ---- the weighbridges' booms: up while a vehicle is at the gate, down when none is (PRD v2 §3.6) ----
  const booms = layout.gates.filter((g) => g.weighbridge).map((g) => {
    const c = Math.cos(g.heading), sn = Math.sin(g.heading);
    return { id: g.id, x: take(slot('boom')), at: [g.at[0] - sn * 5, g.at[1] + c * 5, 1.1] as At, h: Math.atan2(-c, sn), up: 0 };
  });
  count('booms', booms.length);

  // ---- lamps: along every road, alternating sides, and one at every drawn form's front (PRD v2 §3.8) ----
  const lampAt = (x: number, y: number, h: number) => {
    statics.push({ x: take(slot('post')), at: [x, y, 0], h, scale: 1 });
    statics.push({ x: take(slot('lamp-head', true)), at: [x, y, 0], h, scale: 1 });
    // the pool lies a little above the road's paint, so it is drawn over it
    statics.push({ x: take(slot('pool', true, poolGroup)), at: [x, y, 0.25], h, scale: 1 });
    count('lamps');
  };
  for (const r of layout.roads) {
    const pts = r.closed ? [...r.points, r.points[0]] : r.points, k = r.width / 2 + 1.2;
    let side = 1, carry = LAMP_PITCH / 2;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [a, b] = [pts[i], pts[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, h = Math.atan2(uy, ux);
      for (let s = carry; s < L; s += LAMP_PITCH) {
        // right of travel is (−uy, ux); the lamp's arm reaches back over the road
        const x = a[0] + ux * s - uy * k * side, y = a[1] + uy * s + ux * k * side;
        lampAt(x, y, h + (side > 0 ? -Math.PI / 2 : Math.PI / 2));
        side = -side;
      }
      carry = (carry - L) % LAMP_PITCH; if (carry < 0) carry += LAMP_PITCH;
    }
  }
  for (const st of sites) {
    // a yard lamp at the front corner of every form, so every block is lit after dark
    const b = st.box; lampAt(b.x1 - 1.5, b.y1 - 1.5, -Math.PI / 2);
    if (st.code) lit.add(st.code);
  }

  // ---- build the meshes now every instance is counted ----
  const meshes: THREE.InstancedMesh[] = [];
  for (const s of slots.values()) {
    const p = new Part(ctx); p.cull = false;
    if (s.glow) drawGlow(p, s.model as GlowModel); else drawActor(p, s.model as Model);
    const geo = p.solidGeometry();
    const mat = s.glow ? (s.model === 'pool' ? theme.glow.pool : s.model === 'lamp-head' ? theme.glow.lamp : s.model === 'band' ? theme.glow.band : theme.glow.fire) : theme.solid;
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, s.n));
    mesh.name = `activity-${s.model}`; mesh.count = s.n; mesh.frustumCulled = false; mesh.raycast = () => {};
    if (!s.glow) for (let i = 0; i < s.n; i++) mesh.setColorAt(i, col.setRGB(1, 1, 1));
    if (s.model === 'pool') mesh.renderOrder = 1;
    s.mesh = mesh; s.parent.add(mesh); meshes.push(mesh);
  }
  // the dashes' and the puffs' colours are fixed; statics are posed once (the first render uploads them), and only
  // the meshes of what moves upload again each frame
  for (const d of dashes) if (d.color) tint(d.x, d.color);
  for (const p of puffs) tint(p.x, p.color);
  for (const s of statics) pose(s.x, s.at[0], s.at[1], s.at[2], s.h, s.scale);
  const moving = new Set<THREE.InstancedMesh>();
  for (const list of [puffs, swings, runs, loops, dashes, rings, blinks, walks, hoists, planes, booms] as { x: Inst }[][]) for (const a of list) moving.add(a.x.s.mesh!);
  const ringMesh = rings[0]?.x.s.mesh ?? null;

  let t = 0, posed = -1;
  const lerp3 = (a: At, b: At, k: number): At => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const tri = (u: number) => (u < 0.5 ? u * 2 : 2 - u * 2);
  function draw() {
    if (posed === t) return;
    posed = t;
    for (const p of puffs) {
      // each puff rises from the stack, drifts with the wind, grows and fades (shrinks to nothing)
      const u = (((t + p.phase) / p.period + p.k / p.n) % 1 + 1) % 1, s = p.size * (0.5 + u * 1.6) * (1 - u * u);
      pose(p.x, p.at[0] + p.drift * u, p.at[1] - p.drift * 0.4 * u, p.at[2] + p.rise * u, 0, Math.max(0.01, s));
    }
    for (const w of swings) {
      const u = Math.sin(((t + w.phase) / w.period) * Math.PI * 2);
      if (w.amp) pose(w.x, w.at[0], w.at[1], w.at[2], w.base + w.amp * u, 1, w.dip ? -w.dip * Math.max(0, u) : 0);
      else pose(w.x, w.at[0], w.at[1], w.at[2], w.base, 1, (w.dip ?? 0) * u);
    }
    for (const r of runs) {
      // to and fro: out along the run and back, turning at each end (a negative speed runs one way only, looping)
      if (r.speed < 0) { const s = ((t + r.phase) * -r.speed) % r.len; const k = s / r.len; const p = lerp3(r.from, r.to, k); pose(r.x, p[0], p[1], p[2], Math.atan2(r.to[1] - r.from[1], r.to[0] - r.from[0]), r.scale); continue; }
      const u = (((t + r.phase) * r.speed) / (2 * r.len)) % 1, k = tri(u), p = lerp3(r.from, r.to, k);
      const h = Math.atan2(r.to[1] - r.from[1], r.to[0] - r.from[0]) + (u < 0.5 ? 0 : Math.PI);
      pose(r.x, p[0], p[1], p[2], h, r.scale);
    }
    for (const l of loops) {
      const s = ((t * l.speed + l.phase) % l.len + l.len) % l.len;
      let i = 1; while (i < l.cum.length - 1 && l.cum[i] < s) i++;
      const a = l.pts[i - 1], b = l.pts[i % l.pts.length], k = (s - l.cum[i - 1]) / Math.max(1e-6, l.cum[i] - l.cum[i - 1]);
      pose(l.x, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2], Math.atan2(b[1] - a[1], b[0] - a[0]), VEHICLE_SCALE * 0.9);
    }
    for (const d of dashes) {
      // a hidden layer's pulses wait until it is shown
      if (!d.x.s.parent.visible) continue;
      const s = (d.offset + t * d.speed) % d.len, p = lerp3(d.from, d.to, s / d.len);
      pose(d.x, p[0], p[1], p[2], Math.atan2(d.to[1] - d.from[1], d.to[0] - d.from[0]));
    }
    for (const r of rings) {
      // a ring spreads from the aerator and fades into the water
      const u = (((t + r.phase) / r.period) % 1 + 1) % 1;
      pose(r.x, r.at[0], r.at[1], r.at[2], 0, Math.max(0.01, r.r * (0.2 + u)), 0, 1);
      tint(r.x, col.setRGB(1, 1, 1).lerp(theme.fill.sea.color, u));
    }
    for (const b of blinks) {
      const u = (((t + b.phase) / b.period) % 1 + 1) % 1;
      const s = b.flicker ? 0.75 + 0.35 * Math.sin(u * Math.PI * 2) * Math.sin(u * Math.PI * 6 + 1) : u < 0.35 ? 1 : 0.01;
      pose(b.x, b.at[0], b.at[1], b.at[2], 0, s, 0, b.flicker ? s * 1.2 : s);
    }
    for (const w of walks) {
      const u = (((t + w.phase) * w.speed) / (2 * w.len)) % 1, k = tri(u);
      const x = w.from[0] + (w.out[0] - w.from[0]) * k, y = w.from[1] + (w.out[1] - w.from[1]) * k;
      pose(w.x, x, y, w.from[2], Math.atan2(w.out[1] - w.from[1], w.out[0] - w.from[0]) + (u < 0.5 ? 0 : Math.PI), VEHICLE_SCALE);
    }
    for (const h of hoists) { const k = tri((((t + h.phase) / h.period) % 1 + 1) % 1); const p = lerp3(h.from, h.to, k); pose(h.x, p[0], p[1], p[2]); }
    for (const b of booms) pose(b.x, b.at[0], b.at[1], b.at[2], b.h, 1, b.up * BOOM_LIFT);
    for (const p of planes) {
      // taxi along the apron, take off past its end, and gone until the next
      const u = (((t + p.phase) / p.period) % 1 + 1) % 1, run = 0.55;
      const dx = p.to[0] - p.from[0], dy = p.to[1] - p.from[1], h = Math.atan2(dy, dx);
      if (u < run) { const k = (u / run) ** 2; pose(p.x, p.from[0] + dx * k, p.from[1] + dy * k, p.from[2], h, VEHICLE_SCALE); }
      else if (u < 0.8) { const k = (u - run) / (0.8 - run); pose(p.x, p.to[0] + dx * k * 0.8, p.to[1] + dy * k * 0.8, 60 * k * k, h, VEHICLE_SCALE, -0.25 * Math.min(1, k * 3)); }
      else pose(p.x, p.from[0], p.from[1], -50, h, 0.01);
    }
    for (const m of moving) if (m.parent?.visible) m.instanceMatrix.needsUpdate = true;
    if (ringMesh?.instanceColor) ringMesh.instanceColor.needsUpdate = true;
    // the pools of light show only after dark
    poolGroup.visible = theme.night() > 0.02;
  }
  draw();

  return {
    update(dt) {
      t += dt;
      const busy = o.busyGates?.();
      for (const b of booms) b.up = busy?.has(b.id) ? Math.min(1, b.up + dt * BOOM_SPEED) : Math.max(0, b.up - dt * BOOM_SPEED);
    },
    draw,
    setLayer(name, on) {
      if (name === 'energy') energy.visible = on;
      if (name === 'cold-chain') cold.visible = on;
      // pose again on the next frame, even with the clock paused, so a layer shown has its pulses in place
      posed = -1;
    },
    setDetail(tiny) {
      const show = !tiny && !o.phone;
      if (show !== near.visible) { near.visible = show; posed = -1; }
    },
    counts: () => ({ ...counts }),
    litBlocks: () => new Set(lit),
    families() {
      const out: Record<string, [number, number]> = {};
      for (const st of sites) if (!out[st.family] && Object.keys(st.act).length) out[st.family] = [(st.box.x0 + st.box.x1) / 2, (st.box.y0 + st.box.y1) / 2];
      return out;
    },
    meshes: () => [...meshes, ...energy.children.filter((c) => !(c as THREE.InstancedMesh).isInstancedMesh), ...cold.children],
    time: () => t,
    dispose() { for (const m of meshes) { m.removeFromParent(); m.geometry.dispose(); m.dispose(); } for (const c of [...energy.children, ...cold.children]) { (c as THREE.Mesh).geometry?.dispose(); } coldTint.dispose(); root.removeFromParent(); },
  };
}
