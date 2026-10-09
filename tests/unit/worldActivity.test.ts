/**
 * Activity and night (PRD v2 §3.7, §3.8, Appendix C, C1–C3; mega prompt §5):
 * every family has its activity, standing on the anchors its builder drew;
 * the activity is instanced within its draw-call budget, moves with the
 * simulation's clock and replays with the seed; after dark every block is lit,
 * lamps stand along every road, and the published companies' windows glow in
 * the accent; the energy and cold-chain layers show their own.
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BUILDING_FAMILIES } from '@/lib/world/registry/types';
import { LAYOUT } from '@/world/placement/layout.generated';
import { createRng } from '@/world/engine/kernel/math';
import { Part } from '@/world/engine/kernel/part';
import { createTheme } from '@/world/engine/theme';
import { createContext } from '@/world/engine/context';
import { DAY } from '@/world/engine/sim/clock';
import { ACTIVITY_BUDGET, ACTIVITY_KINDS, FAMILY_ACTIVITY, createActivity } from '@/world/sim/activity';
import { VEHICLE_SCALE } from '@/world/sim/vehicles';
import { FAMILY_BUILDERS, type Anchors } from '@/world/world/families';
import { LARGE_FAMILIES } from '@/world/placement/place';
import { disposeWorlds, frames, installWorldStubs, mountWorld } from './helpers/mountWorld';

/** Which anchor each activity kind stands on (the run kinds stand on a run of that kind). */
const ANCHOR: Record<string, (a: Anchors) => boolean> = {
  excavator: (a) => !!a.arm?.length, haul: (a) => !!a.loop?.length, dust: (a) => !!a.dust?.length, pumpjack: (a) => !!a.pump?.length, flare: (a) => !!a.flare?.length,
  conveyor: (a) => !!a.conveyor?.length, smoke: (a) => !!a.smoke?.length, steam: (a) => !!a.steam?.length, kiln: (a) => !!a.kiln?.length, plume: (a) => !!a.plume?.length,
  pulse: (a) => !!a.pylons?.length, ripples: (a) => !!a.rings?.length, aerator: (a) => !!a.rings?.length, compressor: (a) => !!a.vents?.length, walkers: (a) => !!a.door?.length,
  band: (a) => !!a.band, 'quay-crane': (a) => !!a.trolley?.length, plane: (a) => !!a.runway, cars: (a) => !!a.overpass?.length, beacon: (a) => !!a.beacon?.length,
  'tower-crane': (a) => !!a.jib?.some((j) => j.kind === 'tower'), magnet: (a) => !!a.jib?.some((j) => j.kind === 'magnet'), hoist: (a) => !!a.hoist,
  loader: (a) => !!a.run?.some((r) => r.kind === 'loader'), harvester: (a) => !!a.run?.some((r) => r.kind === 'harvester'), boat: (a) => !!a.run?.some((r) => r.kind === 'boat'),
  'log-truck': (a) => !!a.run?.some((r) => r.kind === 'log-truck'), forklift: (a) => !!a.run?.some((r) => r.kind === 'forklift'), straddle: (a) => !!a.run?.some((r) => r.kind === 'straddle'),
  shunter: (a) => !!a.run?.some((r) => r.kind === 'shunter'), parking: (a) => !!a.run?.some((r) => r.kind === 'car'), ambulance: (a) => !!a.run?.some((r) => r.kind === 'ambulance'),
};

describe('every family has its activity (PRD v2 §3.7, Appendix C, C1)', () => {
  it('lists an activity for every family, of kinds the activity draws', () => {
    expect(Object.keys(FAMILY_ACTIVITY).sort()).toEqual([...BUILDING_FAMILIES].sort());
    for (const f of BUILDING_FAMILIES) {
      expect(FAMILY_ACTIVITY[f].length, f).toBeGreaterThan(0);
      for (const k of FAMILY_ACTIVITY[f]) expect(ACTIVITY_KINDS, `${f}: ${k}`).toContain(k);
    }
    expect(Object.keys(ANCHOR).sort()).toEqual([...ACTIVITY_KINDS].sort());
  });

  it('stands every family’s activity on the anchors its builder draws, at the sizes it is drawn at (a lot, or a large family’s block)', () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
    const ctx = createContext({ rng: createRng(3), theme: createTheme(() => ''), layout: LAYOUT, font: 'sans-serif', reduced: false, debug: false, text2d: false });
    const LOT = [{ x0: 0, x1: 18, y0: 0, y1: 24 }, { x0: 0, x1: 40, y0: 0, y1: 30 }], BLOCK = [{ x0: 0, x1: 120, y0: 0, y1: 80 }];
    for (const f of BUILDING_FAMILIES) for (const box of LARGE_FAMILIES.includes(f) ? BLOCK : LOT) {
      const act = FAMILY_BUILDERS[f](new Part(ctx), box, createRng(7)).act ?? {};
      for (const k of FAMILY_ACTIVITY[f]) expect(ANCHOR[k](act), `${f} ${box.x1}×${box.y1}: ${k}`).toBe(true);
      // every anchor stands on the block, and nothing on it is a figure
      const pts = [...(act.smoke ?? []), ...(act.steam ?? []), ...(act.door ?? []), ...(act.pump ?? []), ...(act.kiln ?? [])];
      for (const p of pts) { expect(p[0], f).toBeGreaterThanOrEqual(box.x0 - 1); expect(p[0], f).toBeLessThanOrEqual(box.x1 + 1); expect(p[1], f).toBeGreaterThanOrEqual(box.y0 - 1); expect(p[1], f).toBeLessThanOrEqual(box.y1 + 3); }
    }
  });
});

describe('the weighbridges’ booms (PRD v2 §3.6)', () => {
  it('lifts a gate’s boom while a vehicle is at it, and lowers it when none is', () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
    const ctx = createContext({ rng: createRng(3), theme: createTheme(() => ''), layout: LAYOUT, font: 'sans-serif', reduced: false, debug: false, text2d: false });
    const busy = new Set<string>(['gate-east']);
    const a = createActivity(ctx, LAYOUT, [], { phone: false, busyGates: () => busy });
    const mesh = ctx.scene.getObjectByName('activity-boom') as THREE.InstancedMesh;
    const gates = LAYOUT.gates.filter((g) => g.weighbridge);
    expect(mesh.count).toBe(gates.length);
    // how far a boom's bar rises: the up component of its length direction
    const rise = (i: number) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return new THREE.Vector3(1, 0, 0).transformDirection(m).y; };
    for (let k = 0; k < 90; k++) a.update(1 / 60);
    a.draw();
    gates.forEach((g, i) => expect(rise(i), g.id).toBeCloseTo(g.id === 'gate-east' ? Math.sin(1.35) : 0, 2));
    busy.clear();
    for (let k = 0; k < 90; k++) a.update(1 / 60);
    a.draw();
    gates.forEach((g, i) => expect(rise(i), g.id).toBeCloseTo(0, 2));
    a.dispose();
  });
});

describe('the activity in the world (PRD v2 §3.7, C1, C3)', () => {
  beforeEach(installWorldStubs);
  afterEach(disposeWorlds);
  const activityRoot = (scene: THREE.Scene) => scene.getObjectByName('activity')!;
  const matrices = (scene: THREE.Scene, name: string) => Array.from((scene.getObjectByName(name) as THREE.InstancedMesh).instanceMatrix.array);

  it('shows every kind of each family that stands in the world', async () => {
    const { scene } = await mountWorld();
    const { counts } = window.world!.activity();
    const placed = new Set(LAYOUT.blocks.map((b) => b.family));
    for (const f of ['warehouse', 'cold-store', 'think-tank', 'operator-office', 'telecom-tower', 'construction-site', 'apron', 'interchange', 'rail-yard', 'power-plant', 'water-plant'] as const) placed.add(f);
    for (const f of placed) for (const k of FAMILY_ACTIVITY[f]) expect(counts[k] ?? 0, `${f}: ${k}`).toBeGreaterThan(0);
    expect(counts.lamps).toBeGreaterThan(500);
    void scene;
  });

  it('draws all its activity and the lamps instanced, within its draw-call budget, at the district band', async () => {
    const { scene, handle } = await mountWorld();
    handle.setLayer('energy', true); handle.setLayer('cold-chain', true);
    window.world!.skip(10); frames(3);
    let calls = 0, instances = 0;
    const walk = (o: THREE.Object3D) => { if (!o.visible) return; if ((o as THREE.Mesh).isMesh || (o as { isLineSegments2?: boolean }).isLineSegments2) { calls++; if ((o as THREE.InstancedMesh).isInstancedMesh) instances += (o as THREE.InstancedMesh).count; } o.children.forEach(walk); };
    walk(activityRoot(scene));
    expect(window.world!.band()).toBe('district');
    expect(calls).toBeLessThanOrEqual(ACTIVITY_BUDGET);
    // far more things move and light than there are draw calls
    expect(instances).toBeGreaterThan(calls * 30);
  });

  it('moves with the simulation’s clock: held while the world is paused, on again when it runs', async () => {
    const { scene, handle } = await mountWorld();
    frames(1);
    const before = matrices(scene, 'activity-puff'), t0 = window.world!.activity().time;
    handle.pause(true); frames(20);
    expect(window.world!.activity().time).toBe(t0);
    expect(matrices(scene, 'activity-puff')).toEqual(before);
    handle.pause(false); handle.step(2); frames(1);
    expect(window.world!.activity().time).toBeGreaterThan(t0 + 1.9);
    expect(matrices(scene, 'activity-puff')).not.toEqual(before);
  });

  it('replays with the seed: two worlds with one seed pose every actor alike after the same steps', async () => {
    const names = ['activity-puff', 'activity-forklift', 'activity-arm', 'activity-dash', 'activity-walker'];
    const snap = async () => { const m = await mountWorld({ seed: 5 }); m.handle.step(30); frames(1); const out = names.map((n) => matrices(m.scene, n)); m.handle.dispose(); return out; };
    const a = await snap(), b = await snap();
    expect(a).toEqual(b);
    expect(a[0].some((v) => v !== 0)).toBe(true);
  });

  it('shows the doors’ walkers at the street band only, the power line with the energy layer, the cold stores’ tint with the cold-chain layer', async () => {
    const { scene, handle } = await mountWorld();
    const near = scene.getObjectByName('activity-near')!, energy = scene.getObjectByName('activity-energy')!, cold = scene.getObjectByName('activity-cold')!;
    frames(2);
    expect(near.visible).toBe(false); expect(energy.visible).toBe(false); expect(cold.visible).toBe(false);
    window.world!.centre('INTP', 6); frames(2);
    expect(window.world!.band()).toBe('street'); expect(near.visible).toBe(true);
    handle.setLayer('energy', true); expect(energy.visible).toBe(true);
    handle.setLayer('cold-chain', true); expect(cold.visible).toBe(true);
    expect(energy.children.some((c) => (c as THREE.InstancedMesh).isInstancedMesh && (c as THREE.InstancedMesh).count > 0)).toBe(true);
    expect(cold.children.length).toBeGreaterThan(0);
  });

  it('runs the energy layer’s line from the power plant to every block, its pulses in place when the layer is shown, even paused', async () => {
    const { scene, handle } = await mountWorld();
    frames(1);
    const { counts } = window.world!.activity();
    expect(counts.fed).toBe(LAYOUT.blocks.length);
    const energy = scene.getObjectByName('activity-energy')!;
    const wire = energy.children.find((c) => (c as { isLineSegments2?: boolean }).isLineSegments2) as THREE.Mesh;
    // a segment per pylon span, per region's feeder and per block's drop
    expect(wire.geometry.getAttribute('instanceStart').count).toBeGreaterThan(LAYOUT.blocks.length);
    const pulses = energy.children.find((c) => (c as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh;
    expect(pulses.count).toBeGreaterThan(LAYOUT.blocks.length);
    handle.pause(true); handle.setLayer('energy', true); frames(1);
    const m = new THREE.Matrix4(), moved = Array.from({ length: pulses.count }, (_, i) => { pulses.getMatrixAt(i, m); return m.elements[12] !== 0 || m.elements[14] !== 0; });
    expect(moved.every(Boolean)).toBe(true);
  });

  it('carries the vehicles’ scale once: a forklift and a car stand at 1.25 × their metric length', async () => {
    const { scene } = await mountWorld();
    frames(1);
    for (const [name, metres] of [['activity-forklift', 3.85], ['activity-car', 4.2]] as const) {
      const mesh = scene.getObjectByName(name) as THREE.InstancedMesh, geo = mesh.geometry;
      geo.computeBoundingBox();
      const m = new THREE.Matrix4(), s = new THREE.Vector3(); mesh.getMatrixAt(0, m); m.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
      expect(geo.boundingBox!.max.x - geo.boundingBox!.min.x, name).toBeCloseTo(metres, 1);
      expect(s.x, name).toBeCloseTo(VEHICLE_SCALE, 3);
    }
  });

  it('draws no smoke or steam on a phone; the lamps stay', async () => {
    const { scene } = await mountWorld({ reducedDetail: true, width: 390, height: 700 });
    frames(1);
    const { counts } = window.world!.activity();
    for (const k of ['smoke', 'steam', 'dust', 'compressor', 'plume']) expect(counts[k] ?? 0, k).toBe(0);
    expect(scene.getObjectByName('activity-puff')).toBeUndefined();
    expect(counts.lamps).toBeGreaterThan(500);
  });
});

describe('day and night (PRD v2 §3.8, C2)', () => {
  beforeEach(installWorldStubs);
  afterEach(disposeWorlds);

  it('lasts six minutes from 10:00', async () => {
    expect(DAY).toBe(360);
    await mountWorld();
    const h0 = window.world!.activity().hour;
    expect(h0).toBeGreaterThanOrEqual(10); expect(h0).toBeLessThan(10.2);
  });

  it('lights every block at 20:00: every building’s windows warm, the published brighter in the accent, a lamp at every block, lamps along every road', async () => {
    const { scene, handle } = await mountWorld();
    handle.setModelStatus(new Map([['INTP', { ticker: 'INTP', state: 'published', period: '2026Q2' }]]));
    frames(2);
    const windows = (name: string) => { const out = new Set<THREE.MeshBasicMaterial>(); scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial; if ((o as THREE.Mesh).isMesh && o.parent?.name.startsWith('windows-') && m.name === name) out.add(m); }); return [...out]; };
    // every zone has its windows part, every building's windows in it; INTP's zone has the published ones too
    let parts = 0; scene.traverse((o) => { if (o.name.startsWith('windows-')) parts++; });
    expect(parts).toBe(new Set(LAYOUT.blocks.map((b) => b.zone)).size);
    const [dim] = windows('dim'), [lit] = windows('window');
    expect(dim).toBeTruthy(); expect(lit).toBeTruthy();
    const head = scene.getObjectByName('activity-lamp-head') as THREE.InstancedMesh, lamp = head.material as THREE.MeshBasicMaterial;
    const pools = scene.getObjectByName('activity-pools')!;
    const day = { dim: dim.color.clone(), lit: lit.color.clone(), lamp: lamp.color.clone() };
    expect(pools.visible).toBe(false);
    window.world!.skip(10); frames(3);
    expect(window.world!.activity().hour).toBeGreaterThanOrEqual(20);
    expect(window.world!.activity().night).toBe(1);
    // every building's windows warm; the published company's glow brighter than any other's
    const lum = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    expect(dim.color.equals(day.dim)).toBe(false); expect(lit.color.equals(day.lit)).toBe(false);
    expect(lum(lit.color)).toBeGreaterThan(lum(dim.color));
    // the lamps come on and their pools show; a lamp at every block's front
    expect(lamp.color.equals(day.lamp)).toBe(false);
    expect(pools.visible).toBe(true);
    expect(((pools.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(0.2);
    expect(window.world!.activity().litBlocks).toBe(LAYOUT.blocks.length);
    expect(window.world!.activity().counts.lamps).toBeGreaterThan(500);
  });

  it('lights the exchange’s band after dark, in the accent, above the darkened world', async () => {
    const { scene } = await mountWorld();
    frames(2);
    const band = (scene.getObjectByName('activity-band') as THREE.InstancedMesh).material as THREE.MeshBasicMaterial;
    expect(band.name).toBe('glow-band');
    const day = band.color.clone();
    window.world!.skip(10); frames(3);
    expect(window.world!.activity().night).toBe(1);
    const hsl = (c: THREE.Color) => c.getHSL({ h: 0, s: 0, l: 0 });
    expect(band.color.equals(day)).toBe(false);
    expect(hsl(band.color).l).toBeGreaterThanOrEqual(0.8);
  });
});
