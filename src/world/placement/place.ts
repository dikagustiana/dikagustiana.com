/**
 * The placement algorithm (PRD §9.4; mega prompt §6.1): the registry in, the
 * generated layout out. Region templates are fixed; blocks are allocated by
 * zone, sized by family, laid out on each region's grid; two plots per block.
 * Deterministic for a given registry and seed, and committed as
 * layout.generated.ts so every change is a reviewable diff.
 *
 * Coordinates: +x east, +y south, +z up, one unit a metre. The estate is the
 * narrow waist at the centre; the ring arcs lie north-west (geological) and
 * south-west (biological) of the ring road; the gateway strip is east of the
 * ring; the town grid beyond it; the recovery yard at the town's north edge
 * with a road back to the estate's north gate; the hill north-east of the
 * town.
 */
import type { BuildingFamily, Registry, SubIndustry, Zone } from '../../lib/world/registry/types.ts';
import { createRng } from '../engine/kernel/math.ts';
import type { Block, Box, Fixture, Gate, GeneratedLayout, Label, Plot, Pt, Region, RegionId, Road, Signpost } from './types.ts';

/** Footprints by family: width along x, depth along y, in metres. */
export const FAMILY_SIZE: Record<BuildingFamily, readonly [number, number]> = {
  pit: [90, 70], 'well-pad': [60, 50], quarry: [80, 60], stockpile: [60, 40], 'plantation-block': [110, 80], field: [90, 70], pond: [90, 70], 'forest-block': [110, 80],
  'process-plant': [70, 50], factory: [44, 32], 'packaging-plant': [44, 32], 'power-plant': [64, 50], 'water-plant': [44, 40], warehouse: [80, 40], 'cold-store': [44, 40],
  'operator-office': [30, 24], quay: [140, 40], apron: [120, 60], interchange: [70, 70], 'rail-yard': [120, 44], '3pl-shed': [70, 40], depot: [50, 36], 'market-hall': [44, 34],
  supermarket: [36, 28], minimarket: [20, 16], 'department-store': [40, 30], shop: [24, 20], dealership: [36, 28], hotel: [30, 30], restaurant: [24, 20], cinema: [30, 26],
  school: [36, 30], hospital: [44, 34], clinic: [24, 20], lab: [30, 24], 'office-tower': [28, 28], 'bank-tower': [30, 30], exchange: [40, 34], 'recycling-plant': [70, 50],
  'scrap-yard': [50, 40], 'compost-site': [50, 40], 'telecom-tower': [20, 20], 'construction-site': [44, 44], 'think-tank': [60, 40],
};

/** Which region each zone's blocks land in. */
export const ZONE_REGION: Record<Zone, RegionId | null> = {
  'ring-geological': 'ring-geological', 'ring-biological': 'ring-biological',
  'estate-primary': 'estate', 'estate-manufacturing': 'estate', 'estate-utilities': 'estate', 'estate-operator': 'estate', 'estate-warehousing': 'estate',
  gateway: 'gateway', 'town-distribution': 'town', 'town-retail': 'town', 'town-services': 'town', 'town-health': 'town', 'town-business': 'town', 'town-financial': 'town',
  infrastructure: null, recovery: 'recovery', unplaced: null,
};

export const WORLD: Box = { x0: -760, x1: 1700, y0: -720, y1: 720 };
const ESTATE: Box = { x0: -290, x1: 290, y0: -220, y1: 220 };
const RING = { x0: -450, x1: 450, y0: -370, y1: 370, r: 110 };
const GATEWAY: Box = { x0: 500, x1: 780, y0: -330, y1: 330 };
const TOWN: Box = { x0: 830, x1: 1660, y0: -170, y1: 190 };
const RECOVERY: Box = { x0: 860, x1: 1000, y0: -560, y1: -450 };
const HILL = { centre: [1480, -540] as Pt, radius: 110, height: 42 };
const WATER: Box = { x0: 500, x1: 780, y0: 400, y1: 720 };

const box = (x0: number, y0: number, w: number, d: number): Box => ({ x0, y0, x1: x0 + w, y1: y0 + d });
const rect = (b: Box): Pt[] => [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
const centre = (b: Box): Pt => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
export const overlaps = (a: Box, b: Box): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** The ring road: a rounded rectangle round the estate, as points every few metres. */
export function ringRoad(): Pt[] {
  const { x0, x1, y0, y1, r } = RING, pts: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  corner(x1 - r, y0 + r, -Math.PI / 2); corner(x1 - r, y1 - r, 0); corner(x0 + r, y1 - r, Math.PI / 2); corner(x0 + r, y0 + r, Math.PI);
  return pts;
}

/** Lay boxes of given sizes on a grid inside a region, row by row from the top-left, with a street between. */
function gridPack(items: { id: string; size: readonly [number, number] }[], area: Box, street: number, rowHeight?: number): Map<string, Box> {
  const out = new Map<string, Box>();
  let x = area.x0, y = area.y0, rowH = 0;
  for (const it of items) {
    const [w, d] = it.size;
    if (x + w > area.x1 + 1e-6 && x > area.x0) { x = area.x0; y += (rowHeight ?? rowH) + street; rowH = 0; }
    out.set(it.id, box(x, y, w, d));
    x += w + street; rowH = Math.max(rowH, d);
  }
  return out;
}

/** Points along an arc of the ring road's outer side, for the ring zones. */
function arcSlots(n: number, a0: number, a1: number, offset: number): { at: Pt; heading: number }[] {
  const slots: { at: Pt; heading: number }[] = [];
  const cx = (RING.x0 + RING.x1) / 2, cy = (RING.y0 + RING.y1) / 2, rx = (RING.x1 - RING.x0) / 2 + offset, ry = (RING.y1 - RING.y0) / 2 + offset;
  for (let i = 0; i < n; i++) { const a = a0 + ((i + 0.5) / n) * (a1 - a0); slots.push({ at: [cx + rx * Math.cos(a), cy + ry * Math.sin(a)], heading: a }); }
  return slots;
}

function plotsFor(id: string, b: Box, front: 's' | 'e'): Plot[] {
  // two plots on the front face, each with its sign on the kerb
  const depth = 14, margin = 3;
  if (front === 's') {
    const w = (b.x1 - b.x0 - margin * 3) / 2;
    return [0, 1].map((i) => { const x0 = b.x0 + margin + i * (w + margin); const pb = box(x0, b.y1 - depth - margin, w, depth); return { id: `${id}-plot-${i + 1}`, slot: i, box: pb, sign: [pb.x0 + 1.5, pb.y1 + 1] }; });
  }
  const d = (b.y1 - b.y0 - margin * 3) / 2;
  return [0, 1].map((i) => { const y0 = b.y0 + margin + i * (d + margin); const pb = box(b.x1 - depth - margin, y0, depth, d); return { id: `${id}-plot-${i + 1}`, slot: i, box: pb, sign: [pb.x1 + 1, pb.y0 + 1.5] }; });
}

export function placeWorld(registry: Registry, seed = 20261004, registrySha256 = ''): GeneratedLayout {
  const rng = createRng(seed);
  const placed = registry.subIndustries.filter((s) => s.zone !== 'unplaced');
  const byZone = (z: Zone) => placed.filter((s) => s.zone === z);
  const blocks: Block[] = [];
  const labels: Label[] = [];
  const mk = (s: SubIndustry, b: Box, region: RegionId, front: 's' | 'e' = 's'): Block => ({
    id: s.code, code: s.code, zone: s.zone, region, family: s.buildingFamily, box: b, front, plots: plotsFor(s.code, b, front), anchor: [centre(b)[0], b.y0 - 4],
  });

  // ---- the estate: primary processing along the north, utilities and the operator's office along the west and the
  // east gate, manufacturing in the middle on a grid, warehousing fixtures along the south ----
  const estateInner = box(ESTATE.x0 + 16, ESTATE.y0 + 16, ESTATE.x1 - ESTATE.x0 - 32, ESTATE.y1 - ESTATE.y0 - 32);
  const primary = byZone('estate-primary'), manuf = byZone('estate-manufacturing'), util = byZone('estate-utilities'), oper = byZone('estate-operator');
  const primaryBoxes = gridPack(primary.map((s) => ({ id: s.code, size: FAMILY_SIZE[s.buildingFamily] })), box(estateInner.x0, estateInner.y0, estateInner.x1 - estateInner.x0, 130), 12);
  for (const s of primary) blocks.push(mk(s, primaryBoxes.get(s.code)!, 'estate'));
  const primaryBottom = Math.max(...[...primaryBoxes.values()].map((b) => b.y1)) + 14;
  const utilBoxes = gridPack(util.map((s) => ({ id: s.code, size: FAMILY_SIZE[s.buildingFamily] })), box(estateInner.x0, primaryBottom, 80, estateInner.y1 - primaryBottom), 12);
  for (const s of util) blocks.push(mk(s, utilBoxes.get(s.code)!, 'estate', 'e'));
  const manufArea = box(estateInner.x0 + 96, primaryBottom, estateInner.x1 - estateInner.x0 - 96, estateInner.y1 - primaryBottom - 50);
  const manufBoxes = gridPack(manuf.map((s) => ({ id: s.code, size: FAMILY_SIZE[s.buildingFamily] })), manufArea, 10, 32);
  for (const s of manuf) blocks.push(mk(s, manufBoxes.get(s.code)!, 'estate'));
  for (const s of oper) blocks.push(mk(s, box(ESTATE.x1 - 46, -12, 30, 24), 'estate', 'e'));
  const fixtures: Fixture[] = [
    { id: 'estate-warehouse', kind: 'warehouse', box: box(estateInner.x0 + 96, estateInner.y1 - 40, 80, 40), region: 'estate' },
    { id: 'estate-cold-store', kind: 'cold-store', box: box(estateInner.x0 + 190, estateInner.y1 - 40, 44, 40), region: 'estate' },
  ];

  // ---- the ring: the geological arc north and north-west, the biological arc south and south-west ----
  const geo = byZone('ring-geological'), bio = byZone('ring-biological');
  const geoSlots = arcSlots(geo.length, Math.PI * 0.95, Math.PI * 1.75, 150);
  geo.forEach((s, i) => { const [w, d] = FAMILY_SIZE[s.buildingFamily], [cx, cy] = geoSlots[i].at; blocks.push(mk(s, box(cx - w / 2, cy - d / 2, w, d), 'ring-geological')); });
  const bioSlots = arcSlots(bio.length, Math.PI * 0.55, Math.PI * 1.0, 160);
  bio.forEach((s, i) => { const [w, d] = FAMILY_SIZE[s.buildingFamily], [cx, cy] = bioSlots[i].at; blocks.push(mk(s, box(cx - w / 2, cy - d / 2, w, d), 'ring-biological')); });

  // ---- the gateway strip: the port's quay at the south end on the water, the apron at the north end, the rest in
  // between on a grid ----
  const gw = byZone('gateway');
  const quayCodes = gw.filter((s) => s.buildingFamily === 'quay'), apronCodes = gw.filter((s) => s.buildingFamily === 'apron'), rest = gw.filter((s) => !['quay', 'apron'].includes(s.buildingFamily));
  quayCodes.forEach((s, i) => blocks.push(mk(s, box(GATEWAY.x0 + 20 + i * 150, WATER.y0 - 50, 140, 40), 'gateway')));
  apronCodes.forEach((s, i) => blocks.push(mk(s, box(GATEWAY.x0 + 20 + i * 130, GATEWAY.y0, 120, 60), 'gateway')));
  const restBoxes = gridPack(rest.map((s) => ({ id: s.code, size: FAMILY_SIZE[s.buildingFamily] })), box(GATEWAY.x0 + 20, GATEWAY.y0 + 80, GATEWAY.x1 - GATEWAY.x0 - 40, 240), 14);
  for (const s of rest) blocks.push(mk(s, restBoxes.get(s.code)!, 'gateway'));

  // ---- the town: six districts on one grid, west to east: distribution, retail, services, health, business, financial ----
  const districts: Zone[] = ['town-distribution', 'town-retail', 'town-services', 'town-health', 'town-business', 'town-financial'];
  let tx = TOWN.x0;
  for (const z of districts) {
    const items = byZone(z).map((s) => ({ id: s.code, size: FAMILY_SIZE[s.buildingFamily] }));
    // districts stand taller than wide so the town reads as one grid: three or four columns each
    const cols = items.length <= 3 ? 1 : items.length <= 8 ? 2 : 3;
    const colW = Math.max(...items.map((i) => i.size[0])) + 12;
    const area = box(tx, TOWN.y0, cols * colW, TOWN.y1 - TOWN.y0);
    const bs = gridPack(items, area, 12);
    for (const s of byZone(z)) blocks.push(mk(s, bs.get(s.code)!, 'town'));
    tx = area.x0 + cols * colW + 24;
  }

  // ---- the recovery yard, the infrastructure towers and sites, the hill ----
  for (const s of byZone('recovery')) blocks.push(mk(s, box(RECOVERY.x0 + 10, RECOVERY.y0 + 20, 70, 50), 'recovery'));
  const infra = byZone('infrastructure');
  const towerSpots: Pt[] = [[-330, -330], [960, -230], [1600, 240], [330, 300]];
  let ti = 0, si = 0;
  for (const s of infra) {
    if (s.buildingFamily === 'telecom-tower') { const [x, y] = towerSpots[ti++ % towerSpots.length]; blocks.push(mk(s, box(x, y, 20, 20), 'town')); }
    else { blocks.push(mk(s, box(ESTATE.x1 + 30 + si++ * 60, -300, 44, 44), 'estate')); }
  }
  fixtures.push({ id: 'think-tank', kind: 'think-tank', box: box(HILL.centre[0] - 30, HILL.centre[1] - 20, 60, 40), region: 'hill' });
  fixtures.push({ id: 'port-quay', kind: 'quay', box: box(GATEWAY.x0, WATER.y0 - 10, GATEWAY.x1 - GATEWAY.x0, 10), region: 'gateway' });

  // ---- roads ----
  const ring = ringRoad();
  const northGate: Pt = [0, ESTATE.y0], southGate: Pt = [0, ESTATE.y1], westGate: Pt = [ESTATE.x0, 0], eastGate: Pt = [ESTATE.x1, 0];
  const roads: Road[] = [
    { id: 'ring', kind: 'ring', points: ring, closed: true, width: 12, dashed: false },
    { id: 'radial-north', kind: 'radial', points: [[0, RING.y0], northGate], closed: false, width: 9, dashed: false },
    { id: 'radial-south', kind: 'radial', points: [[0, RING.y1], southGate], closed: false, width: 9, dashed: false },
    { id: 'radial-west', kind: 'radial', points: [[RING.x0, 0], westGate], closed: false, width: 9, dashed: false },
    { id: 'main', kind: 'main', points: [eastGate, [RING.x1, 0], [GATEWAY.x0 + 10, 0], [(GATEWAY.x0 + GATEWAY.x1) / 2, 0], [TOWN.x0 - 10, 0], [TOWN.x1, 0]], closed: false, width: 12, dashed: false },
    { id: 'raw-export', kind: 'raw-export', points: [[geoSlots[Math.floor(geo.length / 2)].at[0], geoSlots[Math.floor(geo.length / 2)].at[1] + 40], [-120, RING.y0 - 90], [RING.x1 + 20, RING.y0 - 90], [GATEWAY.x1 + 20, RING.y0 - 60], [GATEWAY.x1 + 20, WATER.y0 - 60], [GATEWAY.x0 + 80, WATER.y0 - 60]], closed: false, width: 8, dashed: true },
    { id: 'recovery', kind: 'recovery', points: [[RECOVERY.x0 + 40, RECOVERY.y1], [RECOVERY.x0 + 40, -400], [0, -400], [0, RING.y0]], closed: false, width: 8, dashed: false },
    { id: 'haul-geo', kind: 'haul', points: [[RING.x0 - 150, RING.y0 - 40], [RING.x0 + 20, RING.y0 - 40], [RING.x0 + 20, RING.y0]], closed: false, width: 8, dashed: false },
    { id: 'estate-spine', kind: 'estate', points: [[0, ESTATE.y0], [0, ESTATE.y1]], closed: false, width: 10, dashed: false },
    { id: 'estate-cross', kind: 'estate', points: [[ESTATE.x0, primaryBottom - 7], [ESTATE.x1, primaryBottom - 7]], closed: false, width: 10, dashed: false },
    { id: 'gateway-spine', kind: 'town', points: [[(GATEWAY.x0 + GATEWAY.x1) / 2, GATEWAY.y0], [(GATEWAY.x0 + GATEWAY.x1) / 2, WATER.y0 - 60]], closed: false, width: 9, dashed: false },
  ];
  // the town grid: a street between every district column and two cross streets
  const townCols = new Set<number>(); for (const b of blocks.filter((b) => b.region === 'town' && b.zone.startsWith('town-'))) townCols.add(b.box.x0 - 6);
  let k = 0; for (const x of [...townCols].sort((a, b) => a - b)) roads.push({ id: `town-street-${++k}`, kind: 'town', points: [[x, TOWN.y0 - 10], [x, TOWN.y1 + 10]], closed: false, width: 8, dashed: false });
  for (const y of [TOWN.y0 - 10, TOWN.y1 + 10]) roads.push({ id: `town-cross-${++k}`, kind: 'town', points: [[TOWN.x0 - 10, y], [TOWN.x1 + 10, y]], closed: false, width: 8, dashed: false });
  roads.push({ id: 'hill-road', kind: 'town', points: [[TOWN.x1 - 100, TOWN.y0 - 10], [TOWN.x1 - 100, -300], [HILL.centre[0] - 60, HILL.centre[1] + 60]], closed: false, width: 6, dashed: false });

  // ---- gates with weighbridges on every road leaving the estate ----
  const gates: Gate[] = [
    { id: 'gate-north', road: 'radial-north', at: [0, ESTATE.y0 - 10], heading: Math.PI / 2, weighbridge: true, jointId: 'j-extraction-processing' },
    { id: 'gate-south', road: 'radial-south', at: [0, ESTATE.y1 + 10], heading: -Math.PI / 2, weighbridge: true, jointId: 'j-aggregation-processing' },
    { id: 'gate-west', road: 'radial-west', at: [ESTATE.x0 - 10, 0], heading: 0, weighbridge: true, jointId: 'j-packaging-manufacturing' },
    { id: 'gate-east', road: 'main', at: [ESTATE.x1 + 10, 0], heading: Math.PI, weighbridge: true, jointId: 'j-manufacturing-distribution' },
    { id: 'gate-port', road: 'gateway-spine', at: [(GATEWAY.x0 + GATEWAY.x1) / 2, WATER.y0 - 70], heading: -Math.PI / 2, weighbridge: true, jointId: 'j-processing-trader' },
  ];
  // ---- the economy signposts (PRD §7.4), by joint ----
  const signposts: Signpost[] = [
    { id: 'sign-inflation', jointId: 'j-production-aggregation', at: [-60, RING.y1 - 20] },
    { id: 'sign-producer-prices', jointId: 'j-processing-trader', at: [ESTATE.x1 + 24, -24] },
    { id: 'sign-first-markup', jointId: 'j-aggregation-processing', at: [24, ESTATE.y1 + 24] },
    { id: 'sign-export', jointId: 'j-extraction-processing', at: [GATEWAY.x0 + 40, WATER.y0 - 80] },
    { id: 'sign-import', jointId: 'j-trader-manufacturing', at: [GATEWAY.x1 - 40, WATER.y0 - 80] },
    { id: 'sign-excise', jointId: 'j-retail-consumption', at: [ESTATE.x1 + 24, 24] },
    { id: 'sign-final-demand', jointId: 'j-retail-consumption', at: [(TOWN.x0 + TOWN.x1) / 2, TOWN.y1 + 30] },
  ];

  const regions: Region[] = [
    { id: 'ring-geological', label: 'Geological arc', polygon: [[RING.x0 - 220, RING.y0 - 220], [RING.x1, RING.y0 - 220], [RING.x1, RING.y0 - 20], [RING.x0 - 20, RING.y0 - 20], [RING.x0 - 220, 60]], anchor: [RING.x0 - 60, RING.y0 - 140] },
    { id: 'ring-biological', label: 'Biological arc', polygon: [[RING.x0 - 220, 60], [RING.x0 - 20, RING.y1 + 20], [RING.x1 - 100, RING.y1 + 20], [RING.x1 - 100, RING.y1 + 240], [RING.x0 - 220, RING.y1 + 240]], anchor: [RING.x0 - 60, RING.y1 + 120] },
    { id: 'estate', label: 'Estate', polygon: rect(ESTATE), anchor: [0, ESTATE.y0 - 30] },
    { id: 'gateway', label: 'Gateway', polygon: rect({ ...GATEWAY, y1: WATER.y0 }), anchor: [(GATEWAY.x0 + GATEWAY.x1) / 2, GATEWAY.y0 - 30] },
    { id: 'town', label: 'Town', polygon: rect({ x0: TOWN.x0 - 20, x1: TOWN.x1 + 20, y0: TOWN.y0 - 30, y1: TOWN.y1 + 60 }), anchor: [(TOWN.x0 + TOWN.x1) / 2, TOWN.y0 - 50] },
    { id: 'recovery', label: 'Recovery yard', polygon: rect(RECOVERY), anchor: [(RECOVERY.x0 + RECOVERY.x1) / 2, RECOVERY.y0 - 20] },
    { id: 'hill', label: 'Think tank', polygon: rect({ x0: HILL.centre[0] - HILL.radius, x1: HILL.centre[0] + HILL.radius, y0: HILL.centre[1] - HILL.radius, y1: HILL.centre[1] + HILL.radius }), anchor: [HILL.centre[0], HILL.centre[1] - HILL.radius - 20] },
  ];
  for (const r of regions) labels.push({ id: `label-${r.id}`, text: r.label, at: r.anchor, level: 'far' });
  for (const b of blocks) { const s = registry.subIndustries.find((x) => x.code === b.code)!; labels.push({ id: `label-${b.id}`, text: s.nameEn, at: b.anchor, level: 'middle' }); }

  // a little scatter for the ring arcs so they do not read as a machine's row (the rng is the only randomness)
  for (const b of blocks) if (b.region.startsWith('ring')) { const dx = Math.round(rng.rand(-6, 6)), dy = Math.round(rng.rand(-6, 6)); b.box = { x0: b.box.x0 + dx, x1: b.box.x1 + dx, y0: b.box.y0 + dy, y1: b.box.y1 + dy }; b.plots = plotsFor(b.id, b.box, b.front); b.anchor = [centre(b.box)[0], b.box.y0 - 4]; }

  return {
    world: WORLD, seed, registrySha256, regions, blocks, roads, gates, signposts, labels, fixtures,
    rail: { points: [[GATEWAY.x0 + 20, GATEWAY.y0 - 40], [GATEWAY.x1 - 20, GATEWAY.y0 - 40]], yard: box(GATEWAY.x0 + 20, GATEWAY.y0 - 60, GATEWAY.x1 - GATEWAY.x0 - 40, 44) },
    port: { quay: box(GATEWAY.x0, WATER.y0 - 10, GATEWAY.x1 - GATEWAY.x0, 10), apron: box(GATEWAY.x0, WATER.y0 - 60, GATEWAY.x1 - GATEWAY.x0, 50), water: WATER },
    hill: HILL,
  };
}
