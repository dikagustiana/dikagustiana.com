/**
 * The world's builders (mega prompt §6.2): regions, roads, blocks and their
 * plots, gates, signposts, labels and fixtures, from the generated layout,
 * with the engine's Part and its draw-call discipline: static things are
 * merged per zone, repeated things share a part, and the plots are one
 * group the far view hides. Every clickable thing is an Entity registered
 * on the context.
 *
 * Scene code receives nothing from the data layer but statuses, flow
 * classes and station bindings through the handle; this module imports the
 * registry's sub-industries (names, codes, companies) and the chain data
 * file's labels, never a figure.
 */
import * as THREE from 'three';
import { JOINT_BY_ID, type JointId } from '@/data/industryChain';
import { REGISTRY, subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import type { SubIndustry } from '@/lib/world/registry/types';
import type { Box, Block, GeneratedLayout, Lot, Pt, RegionId, Road } from '@/world/placement/types';
import type { FillKey, Tone } from '../engine/theme';
import type { ModelStatus } from '@/world/data/types';
import type { EngineContext } from '../engine/context';
import { FRONT, TOP, W } from '../engine/kernel/iso';
import { Part, pose } from '../engine/kernel/part';
import { Path } from '../engine/kernel/path';
import type { Entity, EntityInfo, Peek, WorldAction } from '../engine/types';
import { dashes, pine, shadow, tree } from '../engine/world/ground';
import { buildCut } from '../interiors/base';
import { INTERIORS, archetypeForZone } from '../interiors';
import { drawWhiteboard } from '../engine/whiteboard';
import { buildRooms } from '../interiors/thinktank';
import type { WhiteboardContent } from '@/world/data/types';
import type { Archetype } from '@/lib/world/registry/types';
import { FAMILY_BUILDERS, blockYard, drawFamily, kerbSign, officeUnit, sharedBox, signboard, statusBar, type Anchors, type WindowRect } from './families';
import type { BuildingFamily } from '@/lib/world/registry/types';
import { LARGE_FAMILIES, LOT_MARGIN, OFFICE_UNIT } from '@/world/placement/place';
import { createRng } from '../engine/kernel/math';

export const STATUS_WORD = { published: 'Published', none: 'No model yet', unavailable: 'Status unavailable', 'no-issuer': 'No listed issuer' } as const;
/** Each region's ground tone (PRD v2 §3.2). */
export const REGION_TONE: Record<RegionId, FillKey> = { 'ring-geological': 'dust', 'ring-biological': 'meadow', estate: 'pale', gateway: 'sand', town: 'deck', recovery: 'dust', hill: 'meadow' };
/** How far one building's tone may step from its neighbour's, either way (PRD v2 §3.2). */
const TONE_STEP = 0.025;
/** The side of a block's status mark on its kerb, in metres: a glyph read at the district band (PRD v2 §3.5). */
const MARK = 5;
export type StatusKey = keyof typeof STATUS_WORD;
export const TRAFFIC_LINE = 'Illustrative traffic; see the model for figures';

export interface BuildingEntity extends Entity {
  kind: 'building';
  sub: SubIndustry;
  block: Block;
  /** The block's footprint, for the chain's routes and the highlight. */
  box: Box;
  statusKey(): StatusKey;
}
/** A company's lot (PRD v2 §3.5): drawn in its zone's part, picked through the zone's resolver, opened as a section. */
export interface LotEntity extends Entity {
  kind: 'company';
  code: string;
  ticker: string | null;
  slot: number;
  lot: Lot;
  /** The lot's footprint, where its section and station markers go. */
  box: Box;
  /** The whiteboard's content from the shell; null draws "No model yet". Redrawn at once if the section is open. */
  setWhiteboard(content: WhiteboardContent | null): void;
}

export interface WorldScene {
  buildings: Map<string, BuildingEntity>;
  /** Lots by entity id: the ticker, or the lot's id where no company is proposed. */
  lots: Map<string, LotEntity>;
  /** The archetype a company's lot is drawn with: the published model's, else its zone's fallback. */
  archetypeOf(ticker: string): Archetype | null;
  /** What the street band adds (PRD v2 §3.3): the lots' kerb signs with their tickers. The district band hides it. */
  nearGroup: THREE.Group;
  /** Statuses by ticker; an outage arrives as every ticker 'unavailable' (the boundary never says 'none' for an outage). */
  setStatuses(statuses: Map<string, ModelStatus>): void;
  /** The published-model statuses as last set, by ticker. */
  statuses(): Map<string, ModelStatus>;
  /** Where activity happens (PRD v2 §3.7): every drawn form's anchors, by lot, shared form, office unit or fixture. */
  sites: readonly ActivitySite[];
}

/** One drawn form's activity: what its family is, where it stands, the block it belongs to, and its anchors. */
export interface ActivitySite {
  /** The lot's id, the block's code for a large family's shared form, `<lot>:office` for an office unit, or the fixture's id. */
  id: string;
  /** The block's code, or null for a fixture. */
  code: string | null;
  family: BuildingFamily;
  box: Box;
  act: Anchors;
}

/** A stable number from a string, for a block's own seeded generator (its look never changes when its zone redraws). */
function hashOf(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }

const polyStrip = (p: Part, pts: readonly Pt[], width: number, closed: boolean, k: 'road' | 'glass' = 'road', z = 0.02, dashed = false) => {
  const path = new Path(pts, 14, closed), L = path.length, step = 2;
  for (let s = 0; s < L; s += step) {
    if (dashed && Math.floor(s / 8) % 2 === 1) continue;
    const a = path.at(s), b = path.at(Math.min(s + step, closed ? s + step : L));
    const nx = -Math.sin(a.h) * width / 2, ny = Math.cos(a.h) * width / 2, mx = -Math.sin(b.h) * width / 2, my = Math.cos(b.h) * width / 2;
    p.poly(k, [W(a.x - nx, a.y - ny, z), W(a.x + nx, a.y + ny, z), W(b.x + mx, b.y + my, z), W(b.x - mx, b.y - my, z)]);
  }
};

function roadsPart(ctx: EngineContext, roads: readonly Road[]): THREE.Group {
  const p = new Part(ctx), G = TOP(0, 0, 0);
  for (const r of roads) {
    polyStrip(p, r.points, r.width, r.closed, 'road', 0.02, r.dashed);
    if (!r.dashed && r.width >= 9) { const path = new Path(r.points, 14, r.closed); for (let s = 0; s < path.length; s += 24) { const a = path.at(s), b = path.at(Math.min(s + 6, path.length)); p.draw(G, [a.x, a.y, b.x, b.y], 'line', 0.05); } }
    if (r.dashed) { const path = new Path(r.points, 14, false); for (let s = 0; s < path.length; s += 16) { const a = path.at(s), b = path.at(Math.min(s + 8, path.length)); p.draw(G, [a.x, a.y, b.x, b.y], 'line', 0.06); } }
  }
  const g = p.build('roads'); g.traverse((o) => { o.raycast = () => {}; }); return g;
}

function regionsPart(ctx: EngineContext, layout: GeneratedLayout): THREE.Group {
  const p = new Part(ctx), G = TOP(0, 0, 0.01), rng = ctx.rng;
  for (const r of layout.regions) {
    const pts = r.polygon.map(([x, y]) => W(x, y, 0.01));
    // each region its ground's tone (PRD v2 §3.2), its edge a faint seam
    p.poly(REGION_TONE[r.id], pts);
    for (let i = 0; i < pts.length; i++) p.seg('detail', pts[i], pts[(i + 1) % pts.length]);
    p.text(TOP(r.anchor[0], r.anchor[1], 0.05), r.label.toUpperCase(), 0, 0, 9, 'paint', 'middle', 0.05);
  }
  // the port's water and the quay's edge
  if (layout.port) {
    // the water lies on the slab's top (a fill below it would be hidden by the slab), its edge a lighter rim where it
    // meets the quay and the land
    const wb = layout.port.water, RIM = 4;
    p.fill2(TOP(wb.x0, wb.y0, 0), 0, 0, wb.x1 - wb.x0, wb.y1 - wb.y0, 'sea', 0.012);
    p.fill2(TOP(wb.x0, wb.y0, 0), 0, 0, wb.x1 - wb.x0, RIM, 'rim', 0.016); p.fill2(TOP(wb.x0, wb.y0, 0), 0, RIM, RIM, wb.y1 - wb.y0 - RIM, 'rim', 0.016); p.fill2(TOP(wb.x1 - RIM, wb.y0, 0), 0, RIM, RIM, wb.y1 - wb.y0 - RIM, 'rim', 0.016);
    p.extrude([[wb.x0, wb.y0, -0.6], [wb.x1, wb.y0, -0.6], [wb.x1, wb.y0, 0], [wb.x0, wb.y0, 0]], [0, 0.4, 0]);
  }
  // the hill: three terraces rising to the think tank, pines on the lower slopes
  if (layout.hill) { const { centre: [cx, cy], radius, height } = layout.hill; for (let k = 0; k < 3; k++) { const r = radius * (1 - k * 0.28), z = (height / 3) * k, ring: [number, number, number][] = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; ring.push([cx + r * Math.cos(a), cy + r * 0.8 * Math.sin(a), z]); } p.extrude(ring, [0, 0, height / 3], 'gs', { seams: false }); }
    for (let i = 0; i < 24; i++) { const a = rng.rand(0, Math.PI * 2), rr = rng.rand(radius * 0.75, radius * 0.98); pine(p, rng, cx + rr * Math.cos(a), cy + rr * 0.8 * Math.sin(a), rng.rand(0.9, 1.3), 0); } }
  // trees along the ring road's verges and in the town's squares
  for (let i = 0; i < 90; i++) { const a = rng.rand(0, Math.PI * 2), x = 470 * Math.cos(a), y = 395 * Math.sin(a); if (Math.abs(x) < 40 || Math.abs(y) < 40 || x > 380) { rng.next(); continue; } tree(p, rng, x, y, rng.rand(0.8, 1.2)); }
  void G;
  const g = p.build('regions'); g.traverse((o) => { o.raycast = () => {}; }); return g;
}

/** A zone's windows as one mesh per material: the unlit glass and the lit windows of published companies. */
function windowsPart(ctx: EngineContext, unlit: readonly WindowRect[], lit: readonly WindowRect[], name: string): THREE.Group {
  const p = new Part(ctx);
  for (const r of unlit) p.fill2(r.M, r.x, r.y, r.w, r.h, 'glass', 0.03);
  for (const r of lit) p.fill2(r.M, r.x, r.y, r.w, r.h, 'window', 0.03);
  const g = p.build(name); g.traverse((o) => { o.raycast = () => {}; });
  return g;
}

export function buildWorldScene(ctx: EngineContext, layout: GeneratedLayout, onAction: (a: WorldAction) => void): WorldScene {
  const { scene, theme, rng } = ctx;
  scene.add(regionsPart(ctx, layout), roadsPart(ctx, layout.roads));
  const buildings = new Map<string, BuildingEntity>(), lots = new Map<string, LotEntity>();
  let statuses = new Map<string, ModelStatus>();
  const archetypeFor = (ticker: string | null, zone: SubIndustry['zone']): Archetype => (ticker ? statuses.get(ticker)?.archetype : undefined) ?? archetypeForZone(zone);
  const outageFor = (tickers: string[]) => tickers.some((t) => statuses.get(t)?.state === 'unavailable');
  const companyOf = (b: Block, slot: number) => subIndustryByCode(b.code)?.companies[slot] ?? null;
  const lotStatus = (ticker: string | null): StatusKey => { const st = ticker ? statuses.get(ticker) : undefined; return st?.state === 'unavailable' ? 'unavailable' : st?.state === 'published' ? 'published' : ticker ? 'none' : 'no-issuer'; };

  // ---- the blocks of each zone: one merged part per zone, every company's lot drawn with its family's form (a large
  // family's shared form once, an office unit per company), the block's signboard between them, every building's cast
  // shadow; redrawn without a lot while that lot is open as its section (PRD v2 §3.5, D-V2-4) ----
  const zones = [...new Set(layout.blocks.map((b) => b.zone))];
  interface Zone { id: string; blocks: Block[]; container: THREE.Group; part: THREE.Group | null; windows: THREE.Group | null; rects: Map<string, WindowRect[]>; tops: Map<string, number>; skip: Set<string> }
  const zoneOf = new Map<string, Zone>();
  const OFFICE_STRIP = OFFICE_UNIT.depth + 2 * LOT_MARGIN;
  // the activity sites, recorded the first time each form is drawn (a zone redrawn round an open lot draws them again)
  const sites = new Map<string, ActivitySite>();
  const site = (id: string, code: string | null, family: BuildingFamily, box: Box, act: Anchors | undefined) => { if (!sites.has(id)) sites.set(id, { id, code, family, box, act: act ?? {} }); };
  function drawBlock(p: Part, z: Zone, b: Block) {
    // every block draws from its own generator, so a zone redrawn later looks exactly as it did
    const r = createRng(hashOf(`${ctx.rng.seed}:${b.code}`));
    p.tint = 1 + r.rand(-TONE_STEP, TONE_STEP);
    blockYard(p, b.family, b.box);
    if (LARGE_FAMILIES.includes(b.family)) {
      const shared = sharedBox(b.box, b.entry, OFFICE_STRIP), d = FAMILY_BUILDERS[b.family](p, shared, r);
      shadow(p, shared, d.top); z.rects.set(b.code, d.windows); z.tops.set(b.code, d.top); site(b.code, b.code, b.family, shared, d.act);
      for (const l of b.lots) { if (z.skip.has(l.id)) continue; const o = officeUnit(p, l.box); shadow(p, l.box, o.top); z.rects.set(l.id, o.windows); z.tops.set(l.id, o.top); site(`${l.id}:office`, b.code, 'operator-office', l.box, o.act); }
    } else {
      let top = 0;
      for (const l of b.lots) {
        if (z.skip.has(l.id)) continue;
        p.tint = 1 + r.rand(-TONE_STEP, TONE_STEP);
        const d = FAMILY_BUILDERS[b.family](p, l.box, r); shadow(p, l.box, d.top);
        z.rects.set(l.id, d.windows); z.tops.set(l.id, d.top); top = Math.max(top, d.top); site(l.id, b.code, b.family, l.box, d.act);
      }
      if (!z.tops.has(b.code)) z.tops.set(b.code, top);
    }
    p.tint = 1;
    signboard(p, b.box, b.front);
  }
  /** A part going away: its text meshes leave the registry the view hides small text through, then it is disposed. */
  function discard(g: THREE.Object3D) {
    const meshes = ctx.texts.meshes;
    g.traverse((o) => { const i = meshes.indexOf(o as THREE.Mesh); if (i >= 0) meshes.splice(i, 1); disposeMesh(o); });
  }
  function drawZone(z: Zone) {
    if (z.part) { z.container.remove(z.part); discard(z.part); }
    z.rects.clear();
    const p = new Part(ctx);
    for (const b of z.blocks) drawBlock(p, z, b);
    z.part = p.build(`zone-part-${z.id}`); z.container.add(z.part);
    drawWindows(z);
  }
  function drawWindows(z: Zone) {
    if (z.windows) { scene.remove(z.windows); discard(z.windows); }
    const unlit: WindowRect[] = [], lit: WindowRect[] = [];
    for (const b of z.blocks) {
      const s = subIndustryByCode(b.code)!;
      // the shared form of a large family lights with any published company; a lot with its own company
      (s.companies.some((c) => lotStatus(c.ticker) === 'published') ? lit : unlit).push(...(z.rects.get(b.code) ?? []));
      b.lots.forEach((l, i) => (lotStatus(companyOf(b, i)?.ticker ?? null) === 'published' ? lit : unlit).push(...(z.rects.get(l.id) ?? [])));
    }
    z.windows = windowsPart(ctx, unlit, lit, `windows-${z.id}`); scene.add(z.windows);
  }
  for (const id of zones) {
    const container = new THREE.Group(); container.name = `zone-${id}`; scene.add(container);
    const z: Zone = { id, blocks: layout.blocks.filter((b) => b.zone === id), container, part: null, windows: null, rects: new Map(), tops: new Map(), skip: new Set() };
    zoneOf.set(id, z); drawZone(z);
  }

  // ---- the status of every block and lot: the block's mark (glyph and word) on its kerb, each lot's bar along its
  // front in its status's tone; one part per zone, redrawn when statuses arrive ----
  const marksByZone = new Map<string, THREE.Group>();
  const BAR_TONE: Record<StatusKey, Tone> = { published: 'a', none: 'k', unavailable: 'g', 'no-issuer': 'g' };
  const rebuildMarks = () => {
    for (const id of zones) {
      const old = marksByZone.get(id); if (old) { scene.remove(old); discard(old); }
      const p = new Part(ctx);
      for (const b of zoneOf.get(id)!.blocks) {
        const ent = buildings.get(b.code)!, key = ent.statusKey(), [ax, ay] = b.anchor, M = TOP(ax - MARK / 2, ay - MARK / 2, 0.08);
        if (key === 'published') p.fill2(M, 0, 0, MARK, MARK, 'livef', 0.02);
        else if (key === 'no-issuer') { const q = MARK / 4, segs: number[] = []; for (let i = 0; i < 4; i++) segs.push(i * q, 0, i * q + q / 2, 0, MARK, i * q, MARK, i * q + q / 2, MARK - i * q, MARK, MARK - i * q - q / 2, MARK, 0, MARK - i * q, 0, MARK - i * q - q / 2); p.draw(M, segs, 'line', 0.02); }
        else { p.rect2(M, 0, 0, MARK, MARK, 'line', 0.02); if (key === 'unavailable') { p.draw(M, [0, MARK, MARK, 0, MARK / 2, MARK, MARK, MARK / 2, 0, MARK / 2, MARK / 2, 0], 'line', 0.02); } }
        p.text(TOP(ax + MARK / 2 + 1, ay + 0.8, 0.08), STATUS_WORD[key], 0, 0, 2.2, 'paint', 'start', 0.05);
        b.lots.forEach((l, i) => statusBar(p, l.box, b.front, BAR_TONE[lotStatus(companyOf(b, i)?.ticker ?? null)]));
      }
      const g = p.build(`marks-${id}`); g.traverse((o) => { o.raycast = () => {}; }); marksByZone.set(id, g); scene.add(g);
    }
  };

  // ---- the entities: a building per block, a company per lot; the zone's resolver maps a hit to the lot whose
  // footprint holds the point, else the block (its signboard, its yard, a large family's shared form) ----
  const registryOrder = new Map(REGISTRY.subIndustries.map((x, i) => [x.code, i]));
  for (const b of layout.blocks) {
    const s = subIndustryByCode(b.code)!, z = zoneOf.get(b.zone)!, top = z.tops.get(b.code) ?? 8, order = registryOrder.get(b.code) ?? 0;
    const [cx, cy] = [(b.box.x0 + b.box.x1) / 2, (b.box.y0 + b.box.y1) / 2];
    const ent: BuildingEntity = {
      kind: 'building', id: b.code, sub: s, block: b, box: b.box, groups: [z.container], pick: b.front === 's' ? [cx, b.box.y1 - 1.5, 4.5] : [b.box.x1 - 1.5, cy, 4.5],
      tags: [b.code, s.chainNodeId, ...s.companies.map((c) => c.ticker)], order,
      bbox: new THREE.Box3(W(b.box.x0, b.box.y0, 0), W(b.box.x1, b.box.y1, Math.max(4, top))),
      resolve: () => ent,
      statusKey() {
        if (outageFor(s.companies.map((c) => c.ticker))) return 'unavailable';
        if (s.companies.some((c) => statuses.get(c.ticker)?.state === 'published')) return 'published';
        if (s.listed.n === 0) return 'no-issuer';
        return 'none';
      },
      info(): EntityInfo {
        const key = this.statusKey();
        return {
          kind: 'Sub-industry', title: s.nameEn, status: STATUS_WORD[key],
          rows: [['Code', s.code], ['Indonesian name', s.nameId], ['Sector', s.sector.name], ['Sub-sector', s.subSector.name], ['Chain', `${s.chainStage} · ${s.chainNodeId}`], ['Zone', s.zone],
            ['Listed issuers', s.listed.n === null ? 'not yet counted' : String(s.listed.n)], ['Placement', s.review.placedBy]],
          actions: [['Open in Finance in Action index', () => onAction({ type: 'open-index', code: s.code })]],
        };
      },
      label: () => s.nameEn,
      readout: () => `${s.nameEn} · ${STATUS_WORD[ent.statusKey()]}`,
    };
    buildings.set(b.code, ent); ctx.entities.push(ent);

    b.lots.forEach((l, i) => {
      const company = companyOf(b, i), ticker = company?.ticker ?? null;
      const g = new THREE.Group(); g.name = l.id; scene.add(g);
      const lotTop = z.tops.get(l.id) ?? 6;
      const [lx, ly] = [(l.box.x0 + l.box.x1) / 2, (l.box.y0 + l.box.y1) / 2];
      const lotEnt: LotEntity = {
        kind: 'company', id: ticker ?? l.id, code: b.code, ticker, slot: i, lot: l, box: l.box, groups: [g],
        // the lot's middle, low: whatever is drawn there (its building, else its yard) is inside its footprint
        pick: [lx, ly, Math.min(2, lotTop / 2)],
        bbox: new THREE.Box3(W(l.box.x0, l.box.y0, 0), W(l.box.x1, l.box.y1, Math.max(3, lotTop))),
        tags: ticker ? [ticker, b.code] : [b.code], order: order * 2 + i,
        setWhiteboard(content) {
          whiteboard = content;
          // an exposed company's section exists at once (the view only opens it), so the whiteboard is there before the next frame
          if (!peek.cut && peek.section) { const sec = peek.section(); sec.cut.visible = sec.inside.visible = false; g.add(sec.cut, sec.inside); peek.cut = sec.cut; peek.inside = sec.inside; }
          else redraw();
        },
        info(): EntityInfo {
          const st = ticker ? statuses.get(ticker) : undefined;
          const status = st?.state === 'unavailable' ? STATUS_WORD.unavailable : st?.state === 'published' ? STATUS_WORD.published : STATUS_WORD.none;
          const rows: [string, string][] = [['Sub-industry', s.nameEn], ['Lot', `${i + 1} of ${b.lots.length}`]];
          if (company) rows.push(['Ticker', company.ticker], ['Pair status', company.status]); else rows.push(['Company', 'not yet proposed']);
          if (st?.period) rows.push(['Latest period', st.period]);
          return { kind: 'Company', title: company?.name ?? `${s.nameEn}: lot ${i + 1}`, status, rows,
            actions: ticker ? [['Open board', () => onAction({ type: 'open-board', ticker })], ['Look inside', () => ctx.hooks.lookInside(lotEnt)]] : [['Look inside', () => ctx.hooks.lookInside(lotEnt)]] };
        },
        label: () => (company ? `${company.ticker} · ${company.name}` : `Vacant lot · ${s.nameEn}`),
        readout: () => `${ticker ?? l.id} · ${s.nameEn}`,
        // while the lot is open as its section, its zone is drawn without it
        // (another lot of the zone may open or close in the same frame: each lot adds or removes only itself)
        peeked(on) { const had = z.skip.has(l.id); if (on) z.skip.add(l.id); else z.skip.delete(l.id); if (had !== on) drawZone(z); },
      };
      // the section is drawn the first time it opens, with the interior of the archetype the published model names, else the zone's fallback (PRD §7.8)
      let whiteboard: WhiteboardContent | null = null, board: THREE.Group | null = null, insideG: THREE.Group | null = null, wall: { x0: number; x1: number; y: number; z: number } | null = null;
      // the whiteboard is redrawn whenever its content changes; its group is an entity (clicking it opens the board), listed while it exists
      const redraw = () => {
        if (!insideG || !wall) return;
        if (board) { const old = board.userData.entity as Entity | undefined; if (old) { ctx.hooks.forget(old); const k = ctx.entities.indexOf(old); if (k >= 0) ctx.entities.splice(k, 1); } insideG.remove(board); board = null; }
        board = drawWhiteboard(ctx, wall, b.front, whiteboard, ticker, onAction); insideG.add(board);
        if (board.userData.entity) ctx.entities.push(board.userData.entity as Entity);
      };
      const shell = new THREE.Group(); shell.name = `${l.id}-shell`; g.add(shell);
      const peek: Peek = { shell, box: [l.box.x0, l.box.x1, l.box.y0, l.box.y1], z: [0, 5], section: () => { const c = buildCut(ctx, l.box, b.front, 4.2, (inside, bb) => INTERIORS[archetypeFor(ticker, s.zone)].build(inside, bb)); insideG = c.inside as THREE.Group; wall = c.backWall; redraw(); return { cut: c.cut, inside: c.inside }; } };
      g.userData.peek = peek; g.userData.entity = lotEnt;
      ctx.peeks.push([g, lotEnt]); lots.set(lotEnt.id, lotEnt); ctx.entities.push(lotEnt);
    });
  }
  for (const z of zoneOf.values()) {
    const blocksIn = z.blocks;
    const resolver: Entity = { kind: 'zone', id: `zone-${z.id}`, groups: [z.container], info: () => ({ kind: 'Zone', title: z.id, status: '', rows: [] }), readout: () => z.id,
      resolve: (pt) => {
        const at = (x: Box) => pt.x >= x.x0 && pt.x <= x.x1 && pt.z >= x.y0 && pt.z <= x.y1;
        const b = blocksIn.find((x) => at(x.box)); if (!b) return resolver;
        const i = b.lots.findIndex((l) => at(l.box));
        return i >= 0 ? lots.get(companyOf(b, i)?.ticker ?? b.lots[i].id)! : buildings.get(b.code)!;
      } };
    z.container.userData.entity = resolver;
  }

  // ---- the street band's kerb signs: every lot's ticker on a post in front of it, one part (PRD v2 §3.3) ----
  const nearGroup = new THREE.Group(); nearGroup.name = 'near'; scene.add(nearGroup);
  { const p = new Part(ctx); for (const b of layout.blocks) b.lots.forEach((l, i) => kerbSign(p, l.sign, b.front, companyOf(b, i)?.ticker ?? 'Vacant')); const g = p.build('kerb-signs'); g.traverse((o) => { o.raycast = () => {}; }); nearGroup.add(g); }

  // ---- gates with weighbridges, signposts, fixtures ----
  const gatesPart = new Part(ctx);
  for (const gt of layout.gates) {
    const [x, y] = gt.at, c = Math.cos(gt.heading), sn = Math.sin(gt.heading);
    // a booth, a boom, the weighbridge plate across the road, a sign
    gatesPart.box(x - sn * 7 - 1.5, y + c * 7 - 1.5, 0, 3, 3, 3.2); gatesPart.box(x - sn * 7 - 1.7, y + c * 7 - 1.7, 3.2, 3.4, 3.4, 0.2);
    gatesPart.box(x - sn * 5 - 0.2, y + c * 5 - 0.2, 0, 0.4, 0.4, 1.1); gatesPart.seg('line', W(x - sn * 5, y + c * 5, 1.1), W(x + sn * 5, y - c * 5, 1.1));
    // the weighbridge's plate is drawn with the gate's own small part below, so pointing at it finds the gate
    const L = 8, Wd = 3.4;
    if (gt.weighbridge) gatesPart.rect2(TOP(0, 0, 0.08), x - L, y - Wd, 2 * L, 2 * Wd, 'line', 0.02);
    const joint = JOINT_BY_ID[gt.jointId as JointId];
    const ent: Entity = { kind: 'gate', id: gt.id, groups: [], pick: [x, y, 0.5], bbox: new THREE.Box3(W(x - 9, y - 9, 0), W(x + 9, y + 9, 3.4)),
      info: () => ({ kind: 'Gate · weighbridge', title: joint?.label ?? gt.id, status: 'transfer of title', rows: [['Joint', gt.jointId], ['Weighbridge', gt.weighbridge ? 'yes: every vehicle crossing stops on it' : 'no'], ['Road', gt.road], ...(ctx.flowsAt ? [['Flows', ctx.flowsAt(gt.id)] as const] : [])] }), label: () => joint?.label ?? gt.id, readout: () => `${gt.id} · ${joint?.label ?? ''}` };
    ctx.entities.push(ent); (ent as { gateId?: string }).gateId = gt.id;
    gatesPart.text(TOP(x - 6, y + 10, 0.1), joint?.label ?? gt.id, 0, 0, 1.8, 'paint');
    // a small group per gate so it can be hit
    const hitPart = new Part(ctx); hitPart.box(x - 1.5 - sn * 7, y - 1.5 + c * 7, 0, 3, 3, 3.2);
    if (gt.weighbridge) hitPart.poly('kob', [W(x - c * L - sn * Wd, y - sn * L + c * Wd, 0.06), W(x + c * L - sn * Wd, y + sn * L + c * Wd, 0.06), W(x + c * L + sn * Wd, y + sn * L - c * Wd, 0.06), W(x - c * L + sn * Wd, y - sn * L - c * Wd, 0.06)]);
    const hg = hitPart.build(`gate-${gt.id}`); hg.userData.entity = ent; ent.groups.push(hg); scene.add(hg);
  }
  const gatesG = gatesPart.build('gates'); gatesG.traverse((o) => { o.raycast = () => {}; }); scene.add(gatesG);

  for (const sp of layout.signposts) {
    const joint = JOINT_BY_ID[sp.jointId as JointId], chip = joint?.read.economy.chip ?? sp.jointId, [x, y] = sp.at;
    const p = new Part(ctx); p.box(x - 0.15, y - 0.15, 0, 0.3, 0.3, 5); p.box(x - 0.3, y - 0.2, 5, 6.5, 0.4, 1.6); p.text(FRONT(x - 0.1, y + 0.21, 6.3), chip, 0, 0.1, 1.1, 'ink');
    const g = p.build(`signpost-${sp.id}`); scene.add(g);
    const ent: Entity = { kind: 'signpost', id: sp.id, groups: [g], pick: [x, y, 5], info: () => ({ kind: 'Economy signpost', title: chip, status: joint?.label ?? '', rows: [['Joint', sp.jointId], ['Reads', joint?.read.economy.note ?? '']] }), readout: () => `${chip}` };
    g.userData.entity = ent; ctx.entities.push(ent); (ent as { jointId?: string }).jointId = sp.jointId;
  }

  for (const f of layout.fixtures) {
    const p = new Part(ctx);
    const fam = f.kind === 'warehouse' ? 'warehouse' : f.kind === 'cold-store' ? 'cold-store' : f.kind === 'think-tank' ? 'think-tank' : f.kind === 'quay' ? 'quay' : f.kind;
    const label = { warehouse: 'Estate warehouse', 'cold-store': 'Cold store', 'think-tank': 'Think tank', quay: 'Port', apron: 'Apron', interchange: 'Interchange', 'rail-yard': 'Rail yard', 'power-plant': 'Power plant', 'water-plant': 'Water plant', 'operator-office': 'Operator', 'telecom-tower': 'Telecom tower', 'construction-site': 'Construction site' }[f.kind];
    const z0 = f.kind === 'think-tank' && layout.hill ? layout.hill.height : 0;
    const bx = { ...f.box };
    if (f.kind === 'quay') { p.extrude([[bx.x0, bx.y0, -0.6], [bx.x1, bx.y0, -0.6], [bx.x1, bx.y1, -0.6], [bx.x0, bx.y1, -0.6]], [0, 0, 0.6]); for (let x = bx.x0 + 6; x < bx.x1; x += 12) p.box(x, bx.y1 - 1.2, 0, 0.6, 0.6, 0.9, 'k'); }
    else {
      const d = drawFamily(p, fam, bx, rng, label);
      // a fixture's activity stands where it does (the think tank on its hill)
      const lift = (a: readonly [number, number, number]) => [a[0], a[1], a[2] + z0] as const;
      const act: Anchors = z0 && d.act?.door ? { ...d.act, door: d.act.door.map(lift) } : d.act ?? {};
      site(f.id, null, fam as BuildingFamily, bx, act);
    }
    const shell = p.build(`fixture-${f.id}`); const g = new THREE.Group(); g.name = `fixture-${f.id}`; g.add(shell); if (z0) g.position.y = z0; scene.add(g);
    // the think tank's card lists its rooms, the registry's research programmes that are on (PRD §7.10)
    const rooms = f.kind === 'think-tank' ? REGISTRY.rooms.filter((r) => r.on).map((r) => ({ id: r.id, label: r.label })) : [];
    const ent: Entity = { kind: f.kind === 'think-tank' ? 'thinktank' : 'fixture', id: f.id, groups: [g], pick: [(bx.x0 + bx.x1) / 2, bx.y1, 3 + z0],
      info: () => ({ kind: label, title: label, status: f.kind === 'think-tank' ? 'rooms inside' : 'estate fixture', rows: [['Region', f.region], ...rooms.map((r): [string, string] => ['Room', r.label])], actions: f.kind === 'think-tank' ? [['Open the think tank', () => onAction({ type: 'open-thinktank' })]] : undefined }), readout: () => label };
    g.userData.entity = ent; ctx.entities.push(ent);
    if (f.kind === 'think-tank') {
      // the section drawing: one room per programme, drawn the first time the building opens (selected, or the camera close over it)
      const peek: Peek = { shell, box: [bx.x0, bx.x1, bx.y0, bx.y1], z: [z0, z0 + 8], near: true, section: () => { const c = buildCut(ctx, bx, 's', 7, (inside, b) => { buildRooms(inside, b, rooms); }); return { cut: c.cut, inside: c.inside }; } };
      g.userData.peek = peek; ctx.peeks.push([g, ent]);
    }
  }

  // block labels at the street band: the sub-industry's name painted flat on the kerb beside its status mark
  const labelsPart = new Part(ctx);
  for (const l of layout.labels.filter((x) => x.level === 'middle')) labelsPart.text(TOP(l.at[0] - MARK / 2, l.at[1] + MARK / 2 + 3, 0.06), l.text, 0, 0, 2.2, 'ink', 'start', 0.05);
  const labelsG = labelsPart.build('labels'); labelsG.traverse((o) => { o.raycast = () => {}; }); scene.add(labelsG);
  // the road paint's dashes are drawn with the roads; the far-view region labels with the regions
  void dashes; void pose;

  rebuildMarks();
  return {
    buildings, lots, nearGroup,
    sites: [...sites.values()],
    archetypeOf(ticker) { const l = lots.get(ticker.toUpperCase()); return l ? archetypeFor(l.ticker, subIndustryByCode(l.code)?.zone ?? 'unplaced') : null; },
    setStatuses(next) {
      statuses = next;
      for (const z of zoneOf.values()) drawWindows(z);
      rebuildMarks();
    },
    statuses: () => statuses,
  };
}

function disposeMesh(o: THREE.Object3D) {
  const m = o as THREE.Mesh;
  if (m.geometry) m.geometry.dispose();
  const mat = m.material as THREE.Material | THREE.Material[] | undefined;
  // the theme's shared materials outlive a part; only a text page's own material and its texture go with it
  if (mat && !Array.isArray(mat) && (mat as THREE.MeshBasicMaterial).map) { (mat as THREE.MeshBasicMaterial).map!.dispose(); mat.dispose(); }
}
