/**
 * The fleet's models and their instancing (PRD v2 §3.6, Appendix A, D-V2-11;
 * mega prompt §4 task 4): one model per kind, built once with the engine's
 * Part and drawn for every vehicle of that kind by one InstancedMesh, so three
 * hundred vehicles cost a handful of draw calls. An instance's id maps back to
 * its entity, so picking a vehicle on screen finds its card.
 *
 * Vehicles are drawn at 1.25 times their metric size (PRD v2 §3.2, owner
 * decision 2): every truck, the bus and the return truck 12–13.4 m long, so
 * 15–17 m as drawn and at least 18 px at the hero's 1.25 px/m; a van 6 m, a
 * walker 2.2 m. Motion is illustrative; every vehicle's card says so.
 *
 * Which vehicle carries what follows the link's goods class (Appendix A):
 * bulk by dump truck in the ring and hopper trailer elsewhere, liquid by
 * tanker, cold by reefer, boxed by box truck (container trailer to and from
 * the port), parcel by van, people by bus, none by no vehicle at all.
 */
import * as THREE from 'three';
import type { Goods } from '@/lib/world/registry/types';
import type { RegionId } from '@/world/placement/types';
import type { EngineContext } from '../engine/context';
import { Part, type Tone } from '../engine/kernel/part';
import type { Entity } from '../engine/types';

export const VEHICLE_KINDS = ['dump', 'hopper', 'tanker', 'reefer', 'box', 'container', 'van', 'bus', 'loop'] as const;
export type VehicleKind = (typeof VEHICLE_KINDS)[number];
/** Everything the fleet draws by instancing: the vehicles, and the walkers and coins that share the mechanism. */
export type FleetKind = VehicleKind | 'walker' | 'coin';

export const VEHICLE_LABEL: Record<VehicleKind, string> = {
  dump: 'Dump truck', hopper: 'Hopper trailer', tanker: 'Tanker', reefer: 'Reefer truck', box: 'Box truck', container: 'Container trailer', van: 'Delivery van', bus: 'Bus', loop: 'Return truck',
};

/** Drawn this many times their metric size (PRD v2 §3.2). */
export const VEHICLE_SCALE = 1.25;
/** Length along travel in metres as drawn, for the queue's gaps. */
export const VEHICLE_LENGTH: Record<FleetKind, number> = {
  dump: 12 * VEHICLE_SCALE, hopper: 13.4 * VEHICLE_SCALE, tanker: 13 * VEHICLE_SCALE, reefer: 13 * VEHICLE_SCALE, box: 12 * VEHICLE_SCALE, container: 13 * VEHICLE_SCALE,
  van: 4.8 * VEHICLE_SCALE, bus: 12 * VEHICLE_SCALE, loop: 12 * VEHICLE_SCALE, walker: 0.5 * VEHICLE_SCALE, coin: 1.8,
};
/** Cruising speed in metres per simulated second. */
export const VEHICLE_SPEED: Record<VehicleKind, number> = { dump: 10, hopper: 11, tanker: 11, reefer: 12, box: 12, container: 11, van: 10, bus: 10, loop: 10 };

/** The vehicle that carries a link's goods (PRD v2 Appendix A); null where nothing physical moves. */
export function kindFor(goods: Goods, from: RegionId | null, to: RegionId | null): VehicleKind | null {
  switch (goods) {
    case 'bulk': return from === 'ring-geological' || from === 'ring-biological' ? 'dump' : 'hopper';
    case 'liquid': return 'tanker';
    case 'cold': return 'reefer';
    case 'boxed': return from === 'gateway' || to === 'gateway' ? 'container' : 'box';
    case 'parcel': return 'van';
    case 'people': return 'bus';
    case 'none': return null;
  }
}

/**
 * The models, each built facing +x with its front at the origin, in metric sizes before the scale. The cabs are
 * dark and the bodies mid-toned, so a vehicle reads against the pale road at the district band without an outline.
 */
function drawModel(p: Part, kind: FleetKind): void {
  const wheels = (xs: number[], half = 1.25, r = 0.5) => { for (const x of xs) { p.cylY(x, half, r, r, 0.45, 8, 'kb'); p.cylY(x, -half - 0.45, r, r, 0.45, 8, 'kb'); } };
  const cab = (tone: Tone = 'kb') => { p.box(-2.4, -1.2, 0.5, 2.4, 2.4, 2.2, tone); p.box(-0.08, -1.1, 1.4, 0.08, 2.2, 1, 'g'); };
  const tank = (x0: number, len: number, r: number, z: number, tone: Tone) => { const ring: [number, number, number][] = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; ring.push([x0, r * Math.cos(a), z + r * Math.sin(a)]); } p.extrude(ring, [len, 0, 0], tone, { seams: false }); };
  const chassis = (x0: number, x1: number) => p.box(x0, -1.1, 0.5, x1 - x0, 2.2, 0.5, 'kb');
  switch (kind) {
    case 'dump': cab(); chassis(-12, -2.4); p.extrude([[-12, -1.25, 1.0], [-2.6, -1.25, 1.0], [-2.6, -1.25, 3.4], [-12, -1.25, 3.0]], [0, 2.5, 0], 'k'); p.box(-11.4, -1.0, 3.0, 8.2, 2.0, 0.6, 's'); wheels([-1.6, -8.4, -10.8]); break;
    case 'hopper': cab(); chassis(-13.4, -2.4); p.extrude([[-13, -1.25, 1.6], [-3, -1.25, 1.6], [-2.4, -1.25, 3.6], [-13.4, -1.25, 3.6]], [0, 2.5, 0], 'k'); wheels([-1.6, -10.4, -12]); break;
    case 'tanker': cab(); chassis(-13, -2.4); tank(-13, 10.4, 1.25, 2.3, 'k'); wheels([-1.6, -10.4, -12]); break;
    case 'reefer': cab(); p.box(-13, -1.25, 1.1, 10.2, 2.5, 2.9, 'w'); p.box(-13, -1.27, 1.1, 10.2, 2.54, 0.5, 'kb'); p.box(-3.1, -0.8, 2.2, 0.3, 1.6, 1.4, 'k'); wheels([-1.6, -10.4, -12]); break;
    case 'box': cab(); p.box(-12, -1.25, 1, 9.4, 2.5, 2.8, 'k'); wheels([-1.6, -8.6, -10.6]); break;
    case 'container': cab(); chassis(-13, -2.4); p.box(-13, -1.25, 1.1, 10.2, 2.5, 2.6, 'a'); wheels([-1.6, -10.4, -12]); break;
    case 'van': p.box(-4.8, -1, 0.4, 4.8, 2, 2.1, 'k'); p.box(-0.06, -0.9, 1.2, 0.06, 1.8, 0.8, 'g'); wheels([-0.9, -3.8], 1, 0.4); break;
    case 'bus': p.box(-12, -1.25, 0.5, 12, 2.5, 2.9, 'kb'); p.box(-11.8, -1.27, 1.7, 11.6, 2.54, 0.9, 'g'); wheels([-1.8, -9.4]); break;
    // the return truck: a skip on a hook-lift, in the loop's own tone (the grass slope's, the recovery colour)
    case 'loop': cab(); chassis(-12, -2.4); p.extrude([[-12, -1.25, 1.1], [-2.8, -1.25, 1.1], [-2.8, -1.25, 3.3], [-11.2, -1.25, 3.3]], [0, 2.5, 0], 'gs'); wheels([-1.6, -8.6, -10.6]); break;
    case 'walker': p.box(-0.2, -0.2, 0, 0.4, 0.4, 0.9, 'nb'); p.box(-0.26, -0.26, 0.9, 0.52, 0.52, 0.7, 'kb'); p.box(-0.16, -0.16, 1.6, 0.32, 0.32, 0.3, 'nb'); break;
    case 'coin': p.cylZ(0, 0, 0.8, 0.9, 0.3, 10, 'l'); break;
  }
}

/** Anything the fleet draws: which kind, its slot in that kind's instances, and the entity a click on it finds. */
export interface FleetMember { fleetKind: FleetKind; slot: number; entity: Entity | null }

export interface Fleet {
  /** One group per layer the shell switches, holding that layer's instanced meshes. */
  group(kind: FleetKind): THREE.Group;
  add(m: FleetMember): void;
  remove(m: FleetMember): void;
  /** Stand a member at world (x, y), heading h (radians from +x toward +y), lifted by z; tint lightens it (an empty truck). */
  place(m: FleetMember, x: number, y: number, h: number, z?: number, tint?: number): void;
  /** Call once a step after placing: the meshes upload what changed. */
  commit(): void;
  count(kind: FleetKind): number;
  meshes(): THREE.InstancedMesh[];
  dispose(): void;
}

export function createFleet(ctx: EngineContext, parents: Record<FleetKind, THREE.Group>, capacity: Record<FleetKind, number>): Fleet {
  const meshes = new Map<FleetKind, THREE.InstancedMesh>();
  const members = new Map<FleetKind, FleetMember[]>();
  const dirty = new Set<FleetKind>();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), unit = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
  for (const kind of Object.keys(parents) as FleetKind[]) {
    // a vehicle turns: every face is kept, not only those facing the camera as built
    const p = new Part(ctx); p.cull = false; drawModel(p, kind);
    const geo = p.solidGeometry();
    if (kind !== 'coin') { geo.scale(VEHICLE_SCALE, VEHICLE_SCALE, VEHICLE_SCALE); geo.computeBoundingSphere(); geo.computeBoundingBox(); }
    const mesh = new THREE.InstancedMesh(geo, ctx.theme.solid, Math.max(1, capacity[kind]));
    mesh.name = `fleet-${kind}`; mesh.count = 0; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, col.setRGB(1, 1, 1));
    const list: FleetMember[] = []; members.set(kind, list);
    // a click on an instance finds its entity (PRD v2 §3.4: picking resolves instance ids to entities)
    mesh.userData.instanceOf = (i: number) => list[i]?.entity ?? null;
    meshes.set(kind, mesh); parents[kind].add(mesh);
  }
  return {
    group: (kind) => parents[kind],
    add(m) {
      const list = members.get(m.fleetKind)!, mesh = meshes.get(m.fleetKind)!;
      if (list.length >= mesh.instanceMatrix.count) return;
      m.slot = list.length; list.push(m); mesh.count = list.length; dirty.add(m.fleetKind);
    },
    remove(m) {
      const list = members.get(m.fleetKind)!, mesh = meshes.get(m.fleetKind)!, i = m.slot;
      if (i < 0 || list[i] !== m) return;
      const last = list.pop()!;
      if (last !== m) {
        // the last instance takes the freed slot, with its matrix and colour
        list[i] = last; last.slot = i;
        mesh.getMatrixAt(list.length, m4); mesh.setMatrixAt(i, m4);
        if (mesh.instanceColor) { mesh.getColorAt(list.length, col); mesh.setColorAt(i, col); }
      }
      m.slot = -1; mesh.count = list.length; dirty.add(m.fleetKind);
    },
    place(m, x, y, h, z = 0, tint = 1) {
      if (m.slot < 0) return;
      const mesh = meshes.get(m.fleetKind)!;
      pos.set(x, z, y); q.setFromAxisAngle(up, -h);
      m4.compose(pos, q, unit); mesh.setMatrixAt(m.slot, m4);
      mesh.setColorAt(m.slot, col.setRGB(tint, tint, tint));
      dirty.add(m.fleetKind);
    },
    commit() {
      for (const kind of dirty) {
        const mesh = meshes.get(kind)!;
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        // moved instances: the bounds a ray tests are recomputed when next asked for
        mesh.boundingSphere = null; mesh.boundingBox = null;
      }
      dirty.clear();
    },
    count: (kind) => members.get(kind)?.length ?? 0,
    meshes: () => [...meshes.values()],
    dispose() { for (const mesh of meshes.values()) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.dispose(); } meshes.clear(); members.clear(); },
  };
}
