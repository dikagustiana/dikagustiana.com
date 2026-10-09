/**
 * The placement algorithm (PRD §9.4; PRD v2 §3.2, §3.5, §4.1): the registry
 * in, the generated layout out. Region templates are fixed; blocks are
 * allocated by zone, sized by family (grown where two company lots would not
 * fit), laid out on each region's grid; two company lots per block, each with
 * its bays and a driveway to the nearest road. Deterministic for
 * a given registry and seed, and committed as layout.generated.ts so every
 * change is a reviewable diff.
 *
 * Coordinates: +x east, +y south, +z up, one unit a metre. The estate is the
 * waist at the centre inside the ring road; the geological arc runs along the
 * ring's north side and the top of its west side, the biological arc down the
 * rest of the west side; the gateway abuts the estate's east gate with the
 * port's water south of it; the town is a grid east of the gateway, the
 * recovery yard at its south edge with a road back to the ring, the hill at
 * its north side. The world's slab is the content's extent plus a margin.
 */
import type { BuildingFamily, Registry, SubIndustry, Zone } from '../../lib/world/registry/types.ts';
import { createRng } from '../engine/kernel/math.ts';
import type { Block, Box, Fixture, Gate, GeneratedLayout, Label, Lot, Pt, Region, RegionId, Road, Signpost } from './types.ts';

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

/**
 * The regions (PRD v2 §3.2, D-V2-2): packed round the estate so the whole map reads at the district band. The ring
 * road sits 50 m outside the estate; the ring's arcs stand 20 m outside the ring road (the geological arc along its
 * north side and the top of its west side, the biological arc down the rest of the west side); the gateway abuts the
 * estate's east gate; the town begins 50 m east of the gateway; the recovery yard sits at the town's south edge with
 * its road back to the ring; the hill stands at the town's north side.
 */
const ESTATE: Box = { x0: -290, x1: 290, y0: -220, y1: 220 };
const RING = { x0: -340, x1: 340, y0: -270, y1: 270, r: 60 };
/** How far an arc block's near edge stands from the ring road's centreline. */
const ARC_GAP = 20;
const GATEWAY: Box = { x0: 380, x1: 680, y0: -280, y1: 160 };
const WATER: Box = { x0: 380, x1: 680, y0: 160, y1: 318 };
const TOWN_X0 = 730;
const RECOVERY: Box = { x0: 752, x1: 892, y0: 262, y1: 334 };
const HILL = { centre: [858, -352] as Pt, radius: 86, height: 42 };
/** The empty slab kept round the content on every side (PRD v2 §3.2). */
export const MARGIN = 80;

const box = (x0: number, y0: number, w: number, d: number): Box => ({ x0, y0, x1: x0 + w, y1: y0 + d });
const rect = (b: Box): Pt[] => [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
const centre = (b: Box): Pt => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
const pad = (b: Box, m: number): Box => ({ x0: b.x0 - m, x1: b.x1 + m, y0: b.y0 - m, y1: b.y1 + m });
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

/** The bounding box of points. */
function bounds(pts: readonly Pt[]): Box {
  return { x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])) };
}

/**
 * Families whose form cannot shrink to a lot (PRD v2 §3.5, owner decision 1): the block draws the shared form once,
 * and each company gets an office unit and a sign at the block's front instead of a lot of its own.
 */
export const LARGE_FAMILIES: readonly BuildingFamily[] = ['pit', 'quarry', 'plantation-block', 'field', 'pond', 'forest-block', 'quay', 'apron', 'interchange', 'rail-yard', 'power-plant'];
/** The smallest company lot (PRD v2 §3.5): 18 m along the block's front and 24 m deep, the generator's floor. */
export const LOT_MIN = { front: 18, depth: 24 } as const;
/** The office unit a company of a large family gets at the block's front. */
export const OFFICE_UNIT = { front: 10, depth: 8 } as const;
/** The margin round a lot inside its block, and the gap between the two lots where the block's signboard stands. */
export const LOT_MARGIN = 2, SIGN_GAP = 4;

/**
 * A block's footprint: its family's size, grown where two lots of the minimum size would not fit along its front
 * (the town's small families; PRD v2 §3.5). Sizes are width along x and depth along y; a block facing east puts its
 * front along y, so its two lots sit one above the other.
 */
export function blockSize(family: BuildingFamily, front: 's' | 'e' = 's'): readonly [number, number] {
  const [w, d] = FAMILY_SIZE[family];
  if (LARGE_FAMILIES.includes(family)) return [w, d];
  const along = 2 * LOT_MIN.front + SIGN_GAP + 2 * LOT_MARGIN, deep = LOT_MIN.depth + 2 * LOT_MARGIN;
  return front === 's' ? [Math.max(w, along), Math.max(d, deep)] : [Math.max(w, deep), Math.max(d, along)];
}

/**
 * The two lots along a block's front (PRD v2 §3.5): side by side for a block facing south, one above the other for one
 * facing east, the signboard's gap between them; for a large family, an office unit at each end of the front strip.
 */
export function lotBoxes(b: Box, family: BuildingFamily, front: 's' | 'e'): { box: Box; office: boolean }[] {
  const m = LOT_MARGIN, W = b.x1 - b.x0, D = b.y1 - b.y0;
  const { front: of, depth: od } = OFFICE_UNIT;
  if (LARGE_FAMILIES.includes(family)) {
    return [0, 1].map((i) => ({ office: true, box: front === 's' ? box(i === 0 ? b.x0 + m : b.x1 - m - of, b.y1 - m - od, of, od) : box(b.x1 - m - od, i === 0 ? b.y0 + m : b.y1 - m - of, od, of) }));
  }
  if (front === 's') { const w = (W - 2 * m - SIGN_GAP) / 2; return [0, 1].map((i) => ({ office: false, box: box(b.x0 + m + i * (w + SIGN_GAP), b.y0 + m, w, D - 2 * m) })); }
  const d = (D - 2 * m - SIGN_GAP) / 2;
  return [0, 1].map((i) => ({ office: false, box: box(b.x0 + m, b.y0 + m + i * (d + SIGN_GAP), W - 2 * m, d) }));
}

/** The point of a segment nearest to p. */
function nearestOn(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return [a[0] + dx * t, a[1] + dy * t];
}
/** Whether a segment passes through the inside of a box (Liang–Barsky). */
export function segmentCrosses(a: Pt, b: Pt, x: Box): boolean {
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - x.x0], [dx, x.x1 - a[0]], [-dy, a[1] - x.y0], [dy, x.y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; t0 = Math.max(t0, r); } else { if (r < t0) return false; t1 = Math.min(t1, r); }
  }
  return t1 - t0 > 1e-9;
}
const round = (p: Pt): Pt => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];

/**
 * A lot's driveway and bays: from the middle of its front straight to the nearest point of a road centreline that it
 * can reach without passing through another block or lot; the despatch bay at the lot's front, the receiving bay a
 * few metres out on the same driveway.
 */
function driveway(lot: Box, front: 's' | 'e', own: Box, roads: readonly Road[], others: readonly Box[]): { driveway: Pt[]; bays: Lot['bays'] } {
  const f: Pt = front === 's' ? [(lot.x0 + lot.x1) / 2, lot.y1] : [lot.x1, (lot.y0 + lot.y1) / 2];
  const candidates: { at: Pt; d: number; score: number }[] = [];
  // a road in front of the lot wins over a nearer one behind it, so goods leave by the front
  const n: Pt = front === 's' ? [0, 1] : [1, 0];
  for (const r of roads) {
    const pts = r.closed ? [...r.points, r.points[0]] : r.points;
    for (let i = 0; i + 1 < pts.length; i++) {
      const at = nearestOn(f, pts[i], pts[i + 1]), d = Math.hypot(at[0] - f[0], at[1] - f[1]);
      candidates.push({ at, d, score: d + ((at[0] - f[0]) * n[0] + (at[1] - f[1]) * n[1] < -0.5 ? 200 : 0) });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  const shrink = (x: Box): Box => ({ x0: x.x0 + 0.25, x1: x.x1 - 0.25, y0: x.y0 + 0.25, y1: x.y1 - 0.25 });
  const clear = candidates.find((c) => !others.some((o) => o !== own && segmentCrosses(f, c.at, shrink(o)))) ?? candidates[0];
  const len = clear.d, k = len > 0 ? Math.min(4, len / 2) / len : 0;
  const receiving: Pt = [f[0] + (clear.at[0] - f[0]) * k, f[1] + (clear.at[1] - f[1]) * k];
  return { driveway: [round(f), round(clear.at)], bays: { despatch: round(f), receiving: round(receiving) } };
}

export function placeWorld(registry: Registry, seed = 20261004, registrySha256 = ''): GeneratedLayout {
  const rng = createRng(seed);
  const placed = registry.subIndustries.filter((s) => s.zone !== 'unplaced');
  const byZone = (z: Zone) => placed.filter((s) => s.zone === z);
  const blocks: Block[] = [];
  const labels: Label[] = [];
  const size = (s: SubIndustry, front: 's' | 'e' = 's') => blockSize(s.buildingFamily, front);
  // the block's label and status mark stand at its front centre, on the kerb (PRD v2 §3.5)
  const anchorOf = (b: Box, front: 's' | 'e'): Pt => (front === 's' ? [centre(b)[0], b.y1 + 4] : [b.x1 + 4, centre(b)[1]]);
  const mk = (s: SubIndustry, b: Box, region: RegionId, front: 's' | 'e' = 's'): Block => ({
    id: s.code, code: s.code, zone: s.zone, region, family: s.buildingFamily, box: b, front, lots: [], anchor: anchorOf(b, front),
  });
  const roads: Road[] = [];
  const road = (id: string, kind: Road['kind'], points: Pt[], width: number, dashed = false, closed = false) => { roads.push({ id, kind, points, closed, width, dashed }); };

  // ---- the estate: primary processing along the north in two halves either side of the spine, the utilities down
  // the west side facing a lane, manufacturing on a grid in two halves with a street in front of every row, the
  // operator's office by the east gate, the warehousing fixtures along the south ----
  const inner = pad(ESTATE, -16), SPINE_GAP = 8;
  const westHalf = (x0: number) => ({ x0, x1: -SPINE_GAP }), eastHalf = (x1: number) => ({ x0: SPINE_GAP, x1 });
  const primary = byZone('estate-primary'), manuf = byZone('estate-manufacturing'), util = byZone('estate-utilities'), oper = byZone('estate-operator');
  const half = <T,>(xs: T[]): [T[], T[]] => [xs.slice(0, Math.ceil(xs.length / 2)), xs.slice(Math.ceil(xs.length / 2))];
  const [pw, pe] = half(primary);
  const pack = (items: SubIndustry[], area: Box, street: number, rowHeight?: number, front: 's' | 'e' = 's') => gridPack(items.map((s) => ({ id: s.code, size: size(s, front) })), area, street, rowHeight);
  const pwB = pack(pw, { ...westHalf(inner.x0), y0: inner.y0, y1: inner.y0 + 130 }, 12), peB = pack(pe, { ...eastHalf(inner.x1), y0: inner.y0, y1: inner.y0 + 130 }, 12);
  for (const s of primary) blocks.push(mk(s, (pwB.get(s.code) ?? peB.get(s.code))!, 'estate'));
  const primaryRows = [...new Set([...pwB.values(), ...peB.values()].map((b) => b.y1))].sort((a, b) => a - b);
  const primaryBottom = primaryRows[primaryRows.length - 1] + 14;
  const utilB = pack(util, box(inner.x0, primaryBottom, 80, inner.y1 - primaryBottom), 12, undefined, 'e');
  for (const s of util) blocks.push(mk(s, utilB.get(s.code)!, 'estate', 'e'));
  const utilEast = Math.max(...[...utilB.values()].map((b) => b.x1));
  // manufacturing rows: blocks face south onto a street in the 14 m gap below each row
  const ROW = 32, ROW_GAP = 14, operW = 30;
  const mw = { x0: utilEast + 16, x1: -SPINE_GAP }, me = { x0: SPINE_GAP, x1: inner.x1 - operW - 14 };
  const perRow = (a: { x0: number; x1: number }) => Math.max(1, Math.floor((a.x1 - a.x0 + 10) / (blockSize('factory')[0] + 10)));
  const nw = perRow(mw), ne = perRow(me);
  const mB = new Map<string, Box>();
  manuf.forEach((s, i) => {
    const row = Math.floor(i / (nw + ne)), k = i % (nw + ne), [w, d] = size(s);
    const x = k < nw ? mw.x0 + k * (w + 10) : me.x0 + (k - nw) * (w + 10);
    mB.set(s.code, box(x, primaryBottom + row * (ROW + ROW_GAP), w, d));
  });
  for (const s of manuf) blocks.push(mk(s, mB.get(s.code)!, 'estate'));
  const manufRows = [...new Set([...mB.values()].map((b) => b.y1))].sort((a, b) => a - b);
  for (const s of oper) { const [w, d] = size(s, 'e'); blocks.push(mk(s, box(inner.x1 - w, -d / 2, w, d), 'estate', 'e')); }
  const fixtures: Fixture[] = [
    { id: 'estate-warehouse', kind: 'warehouse', box: box(mw.x0, inner.y1 - 40, 80, 40), region: 'estate' },
    { id: 'estate-cold-store', kind: 'cold-store', box: box(mw.x0 + 94, inner.y1 - 40, 44, 40), region: 'estate' },
  ];

  // ---- the ring's arcs: the geological arc along the ring road's north side, the rest of the ring down its west
  // side, every block 24 m off the ring road and facing it ----
  const geo = byZone('ring-geological'), bio = byZone('ring-biological');
  const WEST_GEO = 2;
  const column = [...bio, ...geo.slice(0, WEST_GEO)];
  const colX1 = RING.x0 - ARC_GAP;
  let cy = RING.y1;
  const colBoxes = new Map<string, Box>();
  for (const s of column) { const [w, d] = size(s, 'e'); colBoxes.set(s.code, box(colX1 - w, cy - d, w, d)); cy -= d + 14; }
  for (const s of column) blocks.push(mk(s, colBoxes.get(s.code)!, s.zone === 'ring-biological' ? 'ring-biological' : 'ring-geological', 'e'));
  const northY1 = RING.y0 - ARC_GAP - 6;
  let nx = colX1 - 76;
  const northBoxes = new Map<string, Box>();
  for (const s of geo.slice(WEST_GEO)) { const [w, d] = size(s); northBoxes.set(s.code, box(nx, northY1 - d, w, d)); nx += w + 12; }
  for (const s of geo.slice(WEST_GEO)) blocks.push(mk(s, northBoxes.get(s.code)!, 'ring-geological'));

  // ---- the gateway: the aprons along its north edge, the rest either side of its spine, the quays on the water ----
  const gw = byZone('gateway');
  const gx = (GATEWAY.x0 + GATEWAY.x1) / 2;
  const byFamily = (f: string) => gw.filter((s) => s.buildingFamily === f);
  const aprons = byFamily('apron'), quays = byFamily('quay'), rest = gw.filter((s) => !['quay', 'apron'].includes(s.buildingFamily));
  aprons.forEach((s, i) => { const [w, d] = size(s); blocks.push(mk(s, box(i === 0 ? GATEWAY.x0 : GATEWAY.x1 - w, GATEWAY.y0, w, d), 'gateway')); });
  quays.forEach((s, i) => { const [w, d] = size(s); blocks.push(mk(s, box(i === 0 ? GATEWAY.x0 : GATEWAY.x1 - w, WATER.y0 - 10 - d, w, d), 'gateway')); });
  // the rest: the interchange and the sheds east of the spine, the rail yard, depots and stockpiles west of it, each
  // side packed from the apron row down to the main road
  const restTop = GATEWAY.y0 + 74;
  const EAST_FAMILIES: readonly BuildingFamily[] = ['interchange', '3pl-shed', 'warehouse', 'cold-store'];
  const eastSide = rest.filter((s) => EAST_FAMILIES.includes(s.buildingFamily)), westSide = rest.filter((s) => !EAST_FAMILIES.includes(s.buildingFamily));
  const gwB = new Map([...pack(westSide, box(GATEWAY.x0, restTop, gx - 10 - GATEWAY.x0, -restTop - 20), 14), ...pack(eastSide, box(gx + 16, restTop, GATEWAY.x1 - gx - 16, -restTop - 20), 14)]);
  for (const s of rest) blocks.push(mk(s, gwB.get(s.code)!, 'gateway'));

  // ---- the town: one grid of five columns either side of the main road, the districts in order column by column
  // (distribution, retail, services, health, business, financial), every block facing south onto a street ----
  const districts: Zone[] = ['town-distribution', 'town-retail', 'town-services', 'town-health', 'town-business', 'town-financial'];
  const townItems = districts.flatMap((z) => byZone(z));
  const ROWS = 5, PITCH = 46, COLS = Math.ceil(townItems.length / (2 * ROWS));
  const townBoxes = new Map<string, Box>();
  let tx = TOWN_X0;
  const townCols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    const col = townItems.slice(c * 2 * ROWS, (c + 1) * 2 * ROWS);
    if (!col.length) break;
    const colW = Math.max(...col.map((s) => size(s)[0]));
    townCols.push(tx);
    col.forEach((s, i) => {
      const [w, d] = size(s), north = i < ROWS, k = north ? i : i - ROWS;
      // north of the main road a row hangs from its front street; south of it a row stands on its back
      townBoxes.set(s.code, north ? box(tx, -16 - k * PITCH - d, w, d) : box(tx, 16 + k * PITCH, w, d));
    });
    tx += colW + 10;
  }
  for (const s of townItems) blocks.push(mk(s, townBoxes.get(s.code)!, 'town'));
  const TOWN = bounds([...townBoxes.values()].flatMap(rect));

  // ---- the recovery yard, the infrastructure towers and site, the hill ----
  for (const s of byZone('recovery')) { const [w, d] = size(s); blocks.push(mk(s, box(RECOVERY.x0 + 12, RECOVERY.y0 + 6, w, d), 'recovery')); }
  const infra = byZone('infrastructure');
  // spots for the towers: by the ring's north-east corner, at the gateway's south-west, beside the recovery yard
  const towerSpots: [Pt, RegionId][] = [[[196, -346], 'estate'], [[384, 24], 'gateway'], [[RECOVERY.x1 + 14, RECOVERY.y0], 'town']];
  let ti = 0;
  for (const s of infra) {
    if (s.buildingFamily === 'telecom-tower') { const [[x, y], region] = towerSpots[ti++ % towerSpots.length]; const [w, d] = size(s); blocks.push(mk(s, box(x, y, w, d), region)); }
    else { const [w, d] = size(s); blocks.push(mk(s, box(HILL.centre[0] + HILL.radius + 8, HILL.centre[1] + 32, w, d), 'town')); }
  }
  fixtures.push({ id: 'think-tank', kind: 'think-tank', box: box(HILL.centre[0] - 30, HILL.centre[1] - 20, 60, 40), region: 'hill' });
  fixtures.push({ id: 'port-quay', kind: 'quay', box: box(GATEWAY.x0, WATER.y0 - 10, GATEWAY.x1 - GATEWAY.x0, 10), region: 'gateway' });

  // ---- roads: the ring, the radials and the main road; the raw-export road from the geological arc to the port;
  // the recovery road back to the ring; the lanes every block's front faces ----
  const northGate: Pt = [0, ESTATE.y0], southGate: Pt = [0, ESTATE.y1], westGate: Pt = [ESTATE.x0, 0], eastGate: Pt = [ESTATE.x1, 0];
  const TOWN_X1 = TOWN.x1 + 5;
  road('ring', 'ring', ringRoad(), 12, false, true);
  road('radial-north', 'radial', [[0, RING.y0], northGate], 9);
  road('radial-south', 'radial', [[0, RING.y1], southGate], 9);
  road('radial-west', 'radial', [[RING.x0, 0], westGate], 9);
  road('main', 'main', [eastGate, [RING.x1, 0], [GATEWAY.x0, 0], [gx, 0], [TOWN_X0 - 5, 0], [TOWN_X1, 0]], 12);
  // the raw-export road leaves the ring through a gap in the geological arc's row and runs north of it to the port
  const north = [...northBoxes.values()].sort((a, b) => a.x0 - b.x0), mid = Math.floor(north.length / 2);
  const rawX = (north[mid - 1].x1 + north[mid].x0) / 2, rawY = Math.min(...north.map((b) => b.y0)) - 16, rawE = GATEWAY.x1 + 22;
  road('raw-export', 'raw-export', [[rawX, RING.y0], [rawX, rawY], [rawE, rawY], [rawE, WATER.y0 - 60], [GATEWAY.x0 + 80, WATER.y0 - 60]], 8, true);
  road('recovery', 'recovery', [[RECOVERY.x0 - 8, TOWN.y1 + 10], [RECOVERY.x0 - 8, WATER.y1 + 16], [RING.x1 - 90, WATER.y1 + 16], [RING.x1 - 90, RING.y1]], 8);
  road('haul-geo', 'haul', [[colX1 - 76, northY1 + 14], [RING.x0 + RING.r, northY1 + 14], [RING.x0 + RING.r + 20, RING.y0]], 8);
  road('estate-spine', 'estate', [[0, ESTATE.y0], [0, ESTATE.y1]], 10);
  road('estate-cross', 'estate', [[ESTATE.x0, primaryBottom - 7], [ESTATE.x1, primaryBottom - 7]], 10);
  road('gateway-spine', 'town', [[gx, GATEWAY.y0], [gx, WATER.y0 - 60]], 9);
  // the lanes: in front of every row of the estate, the gateway and the town, and down the estate's utilities
  for (const [i, y] of primaryRows.slice(0, -1).entries()) road(`estate-street-${i + 1}`, 'estate', [[inner.x0, y + 6], [inner.x1, y + 6]], 8);
  for (const [i, y] of manufRows.entries()) road(`estate-row-${i + 1}`, 'estate', [[utilEast + 8, y + 7], [me.x1 + 7, y + 7]], 8);
  road('estate-utilities', 'estate', [[utilEast + 8, primaryBottom - 7], [utilEast + 8, manufRows[manufRows.length - 1] + 7]], 8);
  const gwRows = (side: SubIndustry[], x0: number, x1: number, tag: string) => {
    const ys = [...new Set(side.map((s) => gwB.get(s.code)!.y1))].sort((a, b) => a - b);
    ys.forEach((y, i) => road(`gateway-lane-${tag}${i + 1}`, 'town', [[x0, y + 7], [x1, y + 7]], 7));
  };
  road('gateway-apron', 'town', [[GATEWAY.x0, GATEWAY.y0 + 67], [GATEWAY.x1, GATEWAY.y0 + 67]], 7);
  gwRows(westSide, GATEWAY.x0, gx, 'w'); gwRows(eastSide, gx, GATEWAY.x1, 'e');
  road('port-lane', 'town', [[GATEWAY.x0, WATER.y0 - 60], [GATEWAY.x1, WATER.y0 - 60]], 8);
  let k = 0;
  for (const x of townCols) road(`town-street-${++k}`, 'town', [[x - 5, TOWN.y0 - 10], [x - 5, TOWN.y1 + 10]], 8);
  road(`town-street-${++k}`, 'town', [[TOWN_X1, TOWN.y0 - 10], [TOWN_X1, TOWN.y1 + 10]], 8);
  for (let r = 1; r < ROWS; r++) { road(`town-street-${++k}`, 'town', [[TOWN_X0 - 5, -16 - r * PITCH + 6], [TOWN_X1, -16 - r * PITCH + 6]], 7); road(`town-street-${++k}`, 'town', [[TOWN_X0 - 5, 16 + r * PITCH - 6], [TOWN_X1, 16 + r * PITCH - 6]], 7); }
  for (const y of [TOWN.y0 - 10, TOWN.y1 + 10]) road(`town-cross-${++k}`, 'town', [[TOWN_X0 - 5, y], [TOWN_X1, y]], 8);
  road('hill-road', 'town', [[HILL.centre[0], TOWN.y0 - 10], [HILL.centre[0], HILL.centre[1] + 30]], 6);

  // ---- the lots, now the roads are known: two per block, each with its sign, bays and driveway ----
  const lotList = blocks.flatMap((b) => lotBoxes(b.box, b.family, b.front).map((l) => ({ block: b, ...l })));
  const obstacles = [...blocks.map((b) => b.box), ...fixtures.map((f) => f.box)];
  for (const b of blocks) {
    const own = lotList.filter((l) => l.block === b);
    // a lot's driveway may cross its own block (a quay's office faces the water) but no other block, fixture or lot
    const others = [...obstacles.filter((o) => o !== b.box), ...own.slice(1).map((l) => l.box)];
    b.lots = own.map((l, i): Lot => {
      const sign: Pt = b.front === 's' ? [l.box.x0 + 1.5, b.box.y1 + 1] : [b.box.x1 + 1, l.box.y0 + 1.5];
      const route = driveway(l.box, b.front, b.box, roads, i === 0 ? others : [...obstacles.filter((o) => o !== b.box), own[0].box]);
      return { id: `${b.code}-lot-${i + 1}`, slot: i, box: l.box, office: l.office, sign, ...route };
    });
  }

  // ---- gates with weighbridges on every road leaving the estate ----
  const gates: Gate[] = [
    { id: 'gate-north', road: 'radial-north', at: [0, ESTATE.y0 - 10], heading: Math.PI / 2, weighbridge: true, jointId: 'j-extraction-processing' },
    { id: 'gate-south', road: 'radial-south', at: [0, ESTATE.y1 + 10], heading: -Math.PI / 2, weighbridge: true, jointId: 'j-aggregation-processing' },
    { id: 'gate-west', road: 'radial-west', at: [ESTATE.x0 - 10, 0], heading: 0, weighbridge: true, jointId: 'j-packaging-manufacturing' },
    { id: 'gate-east', road: 'main', at: [ESTATE.x1 + 10, 0], heading: Math.PI, weighbridge: true, jointId: 'j-manufacturing-distribution' },
    { id: 'gate-port', road: 'gateway-spine', at: [gx, WATER.y0 - 70], heading: -Math.PI / 2, weighbridge: true, jointId: 'j-processing-trader' },
  ];
  // ---- the economy signposts (PRD §7.4), by joint ----
  const signposts: Signpost[] = [
    { id: 'sign-inflation', jointId: 'j-production-aggregation', at: [RING.x0 - 12, 40] },
    { id: 'sign-producer-prices', jointId: 'j-processing-trader', at: [ESTATE.x1 + 24, -24] },
    { id: 'sign-first-markup', jointId: 'j-aggregation-processing', at: [24, ESTATE.y1 + 24] },
    { id: 'sign-export', jointId: 'j-extraction-processing', at: [GATEWAY.x0 + 60, WATER.y0 - 80] },
    { id: 'sign-import', jointId: 'j-trader-manufacturing', at: [GATEWAY.x1 - 40, WATER.y0 - 80] },
    { id: 'sign-excise', jointId: 'j-retail-consumption', at: [ESTATE.x1 + 24, 24] },
    { id: 'sign-final-demand', jointId: 'j-retail-consumption', at: [TOWN_X0 + 40, TOWN.y1 + 22] },
  ];

  // ---- the regions: each the tone of its ground, drawn round what stands in it ----
  const gn = pad(bounds([...northBoxes.values()].flatMap(rect)), 10), gwb = pad(bounds(geo.slice(0, WEST_GEO).map((s) => colBoxes.get(s.code)!).flatMap(rect)), 10);
  // the geological arc is one L: its west arm reaches up to the north arm, and the biological arc starts below it
  const geoNorth: Box = { ...gn, x0: Math.min(gn.x0, gwb.x0) }, geoWest: Box = { ...gwb, y0: gn.y1 };
  const bioBox: Box = { ...pad(bounds(bio.map((s) => colBoxes.get(s.code)!).flatMap(rect)), 10), y0: geoWest.y1 };
  const regions: Region[] = [
    { id: 'ring-geological', label: 'Geological arc', polygon: [[geoNorth.x0, geoNorth.y0], [geoNorth.x1, geoNorth.y0], [geoNorth.x1, geoNorth.y1], [geoWest.x1, geoNorth.y1], [geoWest.x1, geoWest.y1], [geoWest.x0, geoWest.y1]], anchor: [(geoNorth.x0 + geoNorth.x1) / 2, geoNorth.y0 - 18] },
    { id: 'ring-biological', label: 'Biological arc', polygon: rect(bioBox), anchor: [bioBox.x0 - 6, (bioBox.y0 + bioBox.y1) / 2] },
    { id: 'estate', label: 'Estate', polygon: rect(ESTATE), anchor: [0, ESTATE.y0 - 30] },
    { id: 'gateway', label: 'Gateway', polygon: rect({ ...GATEWAY, y0: GATEWAY.y0 - 10 }), anchor: [gx, GATEWAY.y0 - 30] },
    { id: 'town', label: 'Town', polygon: rect(pad(TOWN, 10)), anchor: [(TOWN.x0 + TOWN.x1) / 2, TOWN.y0 - 34] },
    { id: 'recovery', label: 'Recovery yard', polygon: rect(RECOVERY), anchor: [(RECOVERY.x0 + RECOVERY.x1) / 2, RECOVERY.y1 + 22] },
    { id: 'hill', label: 'Think tank', polygon: rect({ x0: HILL.centre[0] - HILL.radius, x1: HILL.centre[0] + HILL.radius, y0: HILL.centre[1] - HILL.radius, y1: HILL.centre[1] + HILL.radius }), anchor: [HILL.centre[0], HILL.centre[1] - HILL.radius - 20] },
  ];
  for (const r of regions) labels.push({ id: `label-${r.id}`, text: r.label, at: r.anchor, level: 'far' });
  for (const b of blocks) { const s = registry.subIndustries.find((x) => x.code === b.code)!; labels.push({ id: `label-${b.id}`, text: s.nameEn, at: b.anchor, level: 'middle' }); }

  // the ring's blocks keep a seeded tone step only (the rng is the only randomness); their places are fixed so
  // every lot keeps its driveway to the ring road
  rng.next();

  // ---- the slab: the content's extent and a margin all round (PRD v2 §3.2) ----
  const rail = { points: [[GATEWAY.x0 + 20, GATEWAY.y0 - 40], [GATEWAY.x1 - 20, GATEWAY.y0 - 40]] as Pt[], yard: box(GATEWAY.x0 + 20, GATEWAY.y0 - 60, GATEWAY.x1 - GATEWAY.x0 - 40, 44) };
  const hillBox: Box = { x0: HILL.centre[0] - HILL.radius, x1: HILL.centre[0] + HILL.radius, y0: HILL.centre[1] - HILL.radius * 0.8, y1: HILL.centre[1] + HILL.radius * 0.8 };
  const content = bounds([
    ...regions.flatMap((r) => r.polygon), ...blocks.flatMap((b) => rect(b.box)), ...fixtures.flatMap((f) => rect(f.box)),
    ...roads.flatMap((r) => r.points.flatMap(([x, y]): Pt[] => [[x - r.width / 2, y - r.width / 2], [x + r.width / 2, y + r.width / 2]])),
    ...rect(WATER), ...rect(hillBox), ...rect(rail.yard),
  ]);
  const world: Box = pad(content, MARGIN);

  return {
    world, seed, registrySha256, regions, blocks, roads, gates, signposts, labels, fixtures,
    rail,
    port: { quay: box(GATEWAY.x0, WATER.y0 - 10, GATEWAY.x1 - GATEWAY.x0, 10), apron: box(GATEWAY.x0, WATER.y0 - 60, GATEWAY.x1 - GATEWAY.x0, 50), water: WATER },
    hill: HILL,
  };
}
