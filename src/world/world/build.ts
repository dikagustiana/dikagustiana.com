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
import { subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import type { SubIndustry } from '@/lib/world/registry/types';
import type { Box, Block, GeneratedLayout, Pt, Road } from '@/world/placement/types';
import type { ModelStatus } from '@/world/data/types';
import type { EngineContext } from '../engine/context';
import { FRONT, TOP, W } from '../engine/kernel/iso';
import { Part, pose } from '../engine/kernel/part';
import { Path } from '../engine/kernel/path';
import type { Entity, EntityInfo, Peek, WorldAction } from '../engine/types';
import { dashes, pine, tree } from '../engine/world/ground';
import { buildCut } from '../interiors/base';
import { INTERIORS, archetypeForZone } from '../interiors';
import { drawWhiteboard } from '../engine/whiteboard';
import type { WhiteboardContent } from '@/world/data/types';
import type { Archetype } from '@/lib/world/registry/types';
import { drawFamily, drawPlot, type WindowRect } from './families';

export const STATUS_WORD = { published: 'Published', none: 'No model yet', unavailable: 'Status unavailable', 'no-issuer': 'No listed issuer' } as const;
export type StatusKey = keyof typeof STATUS_WORD;
export const TRAFFIC_LINE = 'Illustrative traffic; see the model for figures';

export interface BuildingEntity extends Entity {
  kind: 'building';
  sub: SubIndustry;
  block: Block;
  statusKey(): StatusKey;
  setLit(on: boolean): void;
}
export interface PlotEntity extends Entity {
  kind: 'company';
  code: string;
  ticker: string | null;
  slot: number;
  /** The plot's footprint, where its section and station markers go. */
  box: Box;
  /** The whiteboard's content from the shell; null draws "No model yet". Redrawn at once if the section is open. */
  setWhiteboard(content: WhiteboardContent | null): void;
}

export interface WorldScene {
  buildings: Map<string, BuildingEntity>;
  plots: Map<string, PlotEntity>;
  /** The archetype a company's plot is drawn with: the published model's, else its zone's fallback. */
  archetypeOf(ticker: string): Archetype | null;
  /** The group the far view hides: plots and their signs. */
  nearGroup: THREE.Group;
  /** Statuses by ticker; an outage arrives as every ticker 'unavailable' (the boundary never says 'none' for an outage). */
  setStatuses(statuses: Map<string, ModelStatus>): void;
  /** The published-model statuses as last set, by ticker. */
  statuses(): Map<string, ModelStatus>;
}

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
    if (r.id === 'estate') p.poly('glass', pts); else if (r.id === 'gateway') p.poly('sand', pts); else if (r.id === 'town' || r.id === 'recovery') p.poly('deck', pts); else if (r.id !== 'hill') p.poly('grass', pts);
    for (let i = 0; i < pts.length; i++) p.seg('detail', pts[i], pts[(i + 1) % pts.length]);
    p.text(TOP(r.anchor[0], r.anchor[1], 0.05), r.label.toUpperCase(), 0, 0, 9, 'paint', 'middle', 0.05);
  }
  // the port's water and the quay's edge
  if (layout.port) { const wb = layout.port.water; p.fill2(TOP(wb.x0, wb.y0, -0.6), 0, 0, wb.x1 - wb.x0, wb.y1 - wb.y0, 'sea', 0.02); p.extrude([[wb.x0, wb.y0, -0.6], [wb.x1, wb.y0, -0.6], [wb.x1, wb.y0, 0], [wb.x0, wb.y0, 0]], [0, 0.4, 0]); }
  // the hill: three terraces rising to the think tank, pines on the lower slopes
  if (layout.hill) { const { centre: [cx, cy], radius, height } = layout.hill; for (let k = 0; k < 3; k++) { const r = radius * (1 - k * 0.28), z = (height / 3) * k, ring: [number, number, number][] = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; ring.push([cx + r * Math.cos(a), cy + r * 0.8 * Math.sin(a), z]); } p.extrude(ring, [0, 0, height / 3], 'gs', { seams: false }); }
    for (let i = 0; i < 24; i++) { const a = rng.rand(0, Math.PI * 2), rr = rng.rand(radius * 0.75, radius * 0.98); pine(p, rng, cx + rr * Math.cos(a), cy + rr * 0.8 * Math.sin(a), rng.rand(0.9, 1.3), 0); } }
  // trees along the ring road's verges and in the town's squares
  for (let i = 0; i < 90; i++) { const a = rng.rand(0, Math.PI * 2), x = 470 * Math.cos(a), y = 395 * Math.sin(a); if (Math.abs(x) < 40 || Math.abs(y) < 40 || x > 380) { rng.next(); continue; } tree(p, rng, x, y, rng.rand(0.8, 1.2)); }
  void G;
  const g = p.build('regions'); g.traverse((o) => { o.raycast = () => {}; }); return g;
}

function windowsPart(ctx: EngineContext, rects: WindowRect[]): THREE.Mesh | null {
  if (!rects.length) return null;
  const p = new Part(ctx);
  for (const r of rects) p.fill2(r.M, r.x, r.y, r.w, r.h, 'glass', 0.03);
  const g = p.build('windows');
  const m = g.children.find((o): o is THREE.Mesh => o instanceof THREE.Mesh) ?? null;
  if (m) { m.userData.fill = 'glass'; m.raycast = () => {}; }
  return m;
}

export function buildWorldScene(ctx: EngineContext, layout: GeneratedLayout, onAction: (a: WorldAction) => void): WorldScene {
  const { scene, theme, rng } = ctx;
  scene.add(regionsPart(ctx, layout), roadsPart(ctx, layout.roads));
  const buildings = new Map<string, BuildingEntity>(), plots = new Map<string, PlotEntity>();
  const nearGroup = new THREE.Group(); nearGroup.name = 'near'; scene.add(nearGroup);
  let statuses = new Map<string, ModelStatus>();
  const archetypeFor = (ticker: string | null, zone: SubIndustry['zone']): Archetype => (ticker ? statuses.get(ticker)?.archetype : undefined) ?? archetypeForZone(zone);
  const outageFor = (tickers: string[]) => tickers.some((t) => statuses.get(t)?.state === 'unavailable');

  // ---- blocks: one static part per zone for the buildings, a small lit-windows mesh per block, the status marks
  // rebuilt per zone when statuses arrive, the plots in the near group ----
  const zones = [...new Set(layout.blocks.map((b) => b.zone))];
  const marksByZone = new Map<string, THREE.Group>();
  const rebuildMarks = () => {
    for (const z of zones) {
      marksByZone.get(z)?.removeFromParent();
      const p = new Part(ctx);
      for (const b of layout.blocks.filter((x) => x.zone === z)) {
        const ent = buildings.get(b.code)!, key = ent.statusKey(), [ax, ay] = b.anchor, M = TOP(ax - 1.4, ay - 2.8, 0.08);
        if (key === 'published') p.fill2(M, 0, 0, 2.8, 2.8, 'livef', 0.02);
        else if (key === 'no-issuer') p.draw(M, [0, 0, 0.7, 0, 1.4, 0, 2.1, 0, 2.8, 0, 2.8, 0.7, 2.8, 1.4, 2.8, 2.1, 2.8, 2.8, 2.1, 2.8, 1.4, 2.8, 0.7, 2.8, 0, 2.8, 0, 2.1, 0, 1.4, 0, 0.7].flatMap((v, i, a) => (i % 4 === 0 ? [a[i], a[i + 1], a[i + 2], a[i + 3]] : [])), 'line', 0.02);
        else { p.rect2(M, 0, 0, 2.8, 2.8, 'line', 0.02); if (key === 'unavailable') p.draw(M, [0.4, 1.4, 2.4, 1.4], 'line', 0.02); }
        p.text(TOP(ax + 2.2, ay - 0.6, 0.08), STATUS_WORD[key], 0, 0, 2.2, 'paint', 'start', 0.05);
      }
      const g = p.build(`marks-${z}`); g.traverse((o) => { o.raycast = () => {}; }); marksByZone.set(z, g); scene.add(g);
    }
  };

  for (const z of zones) {
    const p = new Part(ctx);
    const inZone = layout.blocks.filter((b) => b.zone === z);
    const drawn = new Map<string, { windows: WindowRect[]; top: number }>();
    for (const b of inZone) { const s = subIndustryByCode(b.code)!; drawn.set(b.code, drawFamily(p, b.family, b.box, rng, s.nameEn)); }
    const g = p.build(`zone-${z}`); scene.add(g);
    for (const b of inZone) {
      const s = subIndustryByCode(b.code)!, d = drawn.get(b.code)!;
      const win = windowsPart(ctx, d.windows); if (win) scene.add(win);
      const ent: BuildingEntity = {
        kind: 'building', id: b.code, sub: s, block: b, groups: [g], pick: [(b.box.x0 + b.box.x1) / 2, b.box.y1, d.top / 2],
        tags: [b.code, s.chainNodeId, ...s.companies.map((c) => c.ticker)],
        bbox: new THREE.Box3(W(b.box.x0, b.box.y0, 0), W(b.box.x1, b.box.y1, d.top)),
        resolve: () => ent,
        statusKey() {
          if (outageFor(s.companies.map((c) => c.ticker))) return 'unavailable';
          if (s.companies.some((c) => statuses.get(c.ticker)?.state === 'published')) return 'published';
          if (s.listed.n === 0) return 'no-issuer';
          return 'none';
        },
        setLit(on) { if (win) win.material = on ? theme.fill.window : theme.fill.glass; },
        info(): EntityInfo {
          const key = this.statusKey();
          return {
            kind: 'Sub-industry', title: s.nameEn, status: STATUS_WORD[key],
            rows: [['Code', s.code], ['Indonesian name', s.nameId], ['Sector', s.sector.name], ['Sub-sector', s.subSector.name], ['Chain', `${s.chainStage} · ${s.chainNodeId}`], ['Zone', s.zone],
              ['Companies', s.companies.length ? s.companies.map((c) => `${c.ticker} (${c.status})`).join(' · ') : 'not yet proposed'],
              ['Listed issuers', s.listed.n === null ? 'not yet counted' : String(s.listed.n)], ['Placement', s.review.placedBy]],
            actions: [['Open in Finance in Action index', () => onAction({ type: 'open-index', code: s.code })]],
          };
        },
        readout: () => `${s.nameEn} · ${STATUS_WORD[ent.statusKey()]}`,
      };
      buildings.set(b.code, ent); ctx.entities.push(ent);
    }
  }
  // the parts drawn for many buildings resolve a hit to the block whose box holds the point
  for (const z of zones) { const g = scene.getObjectByName(`zone-${z}`)!; const inZone = layout.blocks.filter((b) => b.zone === z);
    const resolver: Entity = { kind: 'zone', id: `zone-${z}`, groups: [g], info: () => ({ kind: 'Zone', title: z, status: '', rows: [] }), readout: () => z,
      resolve: (pt) => { const b = inZone.find((x) => pt.x >= x.box.x0 && pt.x <= x.box.x1 && pt.z >= x.box.y0 && pt.z <= x.box.y1); return b ? buildings.get(b.code)! : resolver; } };
    g.userData.entity = resolver; }

  // ---- plots: each its own small group (it opens as a section drawing), all under the near group ----
  for (const b of layout.blocks) {
    const s = subIndustryByCode(b.code)!;
    b.plots.forEach((pl, i) => {
      const company = s.companies[i] ?? null, ticker = company?.ticker ?? null;
      const p = new Part(ctx); drawPlot(p, pl.box, b.front, ticker);
      const shell = p.build(`plot-${pl.id}`); const g = new THREE.Group(); g.name = pl.id; g.add(shell); nearGroup.add(g);
      const ent: PlotEntity = {
        kind: 'company', id: ticker ?? pl.id, code: b.code, ticker, slot: i, box: pl.box, groups: [g],
        setWhiteboard(content) {
          whiteboard = content;
          // an exposed company's section exists at once (the view only toggles it), so the whiteboard is there before the next frame
          if (!peek.cut && peek.section) { const sec = peek.section(); sec.cut.visible = sec.inside.visible = false; g.add(sec.cut, sec.inside); peek.cut = sec.cut; peek.inside = sec.inside; }
          else redraw();
        }, pick: [(pl.box.x0 + pl.box.x1) / 2, pl.box.y1, 2],
        info(): EntityInfo {
          const st = ticker ? statuses.get(ticker) : undefined;
          const status = st?.state === 'unavailable' ? STATUS_WORD.unavailable : st?.state === 'published' ? STATUS_WORD.published : STATUS_WORD.none;
          const rows: [string, string][] = [['Sub-industry', s.nameEn], ['Plot', `${i + 1} of ${b.plots.length}`]];
          if (company) rows.push(['Ticker', company.ticker], ['Pair status', company.status]); else rows.push(['Company', 'not yet proposed']);
          if (st?.period) rows.push(['Latest period', st.period]);
          return { kind: 'Company', title: company?.name ?? `${s.nameEn}: plot ${i + 1}`, status, rows,
            actions: ticker ? [['Open board', () => onAction({ type: 'open-board', ticker })], ['Look inside', () => ctx.hooks.lookInside(ent)]] : [['Look inside', () => ctx.hooks.lookInside(ent)]] };
        },
        readout: () => `${ticker ?? pl.id} · ${s.nameEn}`,
      };
      // the section is drawn the first time it opens, with the interior of the archetype the published model names, else the zone's fallback (PRD §7.8)
      let whiteboard: WhiteboardContent | null = null, board: THREE.Group | null = null, insideG: THREE.Group | null = null, wall: { x0: number; x1: number; y: number; z: number } | null = null;
      // the whiteboard is redrawn whenever its content changes; its group is an entity (clicking it opens the board), listed while it exists
      const redraw = () => {
        if (!insideG || !wall) return;
        if (board) { const old = board.userData.entity as Entity | undefined; if (old) { ctx.hooks.forget(old); const i = ctx.entities.indexOf(old); if (i >= 0) ctx.entities.splice(i, 1); } insideG.remove(board); board = null; }
        board = drawWhiteboard(ctx, wall, b.front, whiteboard, ticker, onAction); insideG.add(board);
        if (board.userData.entity) ctx.entities.push(board.userData.entity as Entity);
      };
      const peek: Peek = { shell, box: [pl.box.x0, pl.box.x1, pl.box.y0, pl.box.y1], z: [0, 5], section: () => { const c = buildCut(ctx, pl.box, b.front, 4.2, (inside, bb) => INTERIORS[archetypeFor(ticker, s.zone)].build(inside, bb)); insideG = c.inside as THREE.Group; wall = c.backWall; redraw(); return { cut: c.cut, inside: c.inside }; } };
      g.userData.peek = peek; g.userData.entity = ent;
      ctx.peeks.push([g, ent]); plots.set(ent.id, ent); ctx.entities.push(ent);
    });
  }

  // ---- gates with weighbridges, signposts, fixtures ----
  const gatesPart = new Part(ctx);
  for (const gt of layout.gates) {
    const [x, y] = gt.at, c = Math.cos(gt.heading), sn = Math.sin(gt.heading);
    // a booth, a boom, the weighbridge plate across the road, a sign
    gatesPart.box(x - sn * 7 - 1.5, y + c * 7 - 1.5, 0, 3, 3, 3.2); gatesPart.box(x - sn * 7 - 1.7, y + c * 7 - 1.7, 3.2, 3.4, 3.4, 0.2);
    gatesPart.box(x - sn * 5 - 0.2, y + c * 5 - 0.2, 0, 0.4, 0.4, 1.1); gatesPart.seg('line', W(x - sn * 5, y + c * 5, 1.1), W(x + sn * 5, y - c * 5, 1.1));
    if (gt.weighbridge) { const L = 8, Wd = 3.4; gatesPart.poly('kob', [W(x - c * L - sn * Wd, y - sn * L + c * Wd, 0.06), W(x + c * L - sn * Wd, y + sn * L + c * Wd, 0.06), W(x + c * L + sn * Wd, y + sn * L - c * Wd, 0.06), W(x - c * L + sn * Wd, y - sn * L - c * Wd, 0.06)]); gatesPart.rect2(TOP(0, 0, 0.08), x - L, y - Wd, 2 * L, 2 * Wd, 'line', 0.02); }
    const joint = JOINT_BY_ID[gt.jointId as JointId];
    const ent: Entity = { kind: 'gate', id: gt.id, groups: [], pick: [x, y, 2], bbox: new THREE.Box3(W(x - 9, y - 9, 0), W(x + 9, y + 9, 3.4)),
      info: () => ({ kind: 'Gate · weighbridge', title: joint?.label ?? gt.id, status: 'transfer of title', rows: [['Joint', gt.jointId], ['Weighbridge', gt.weighbridge ? 'yes' : 'no'], ['Road', gt.road]] }), readout: () => `${gt.id} · ${joint?.label ?? ''}` };
    ctx.entities.push(ent); (ent as { gateId?: string }).gateId = gt.id;
    gatesPart.text(TOP(x - 6, y + 10, 0.1), joint?.label ?? gt.id, 0, 0, 1.8, 'paint');
    // a small group per gate so it can be hit
    const hitPart = new Part(ctx); hitPart.box(x - 1.5 - sn * 7, y - 1.5 + c * 7, 0, 3, 3, 3.2); const hg = hitPart.build(`gate-${gt.id}`); hg.userData.entity = ent; ent.groups.push(hg); scene.add(hg);
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
    else { const d = drawFamily(p, fam, bx, rng, label); void d; }
    const g = p.build(`fixture-${f.id}`); if (z0) g.position.y = z0; scene.add(g);
    const ent: Entity = { kind: f.kind === 'think-tank' ? 'thinktank' : 'fixture', id: f.id, groups: [g], pick: [(bx.x0 + bx.x1) / 2, bx.y1, 3],
      info: () => ({ kind: label, title: label, status: f.kind === 'think-tank' ? 'rooms inside' : 'estate fixture', rows: [['Region', f.region]], actions: f.kind === 'think-tank' ? [['Open the think tank', () => onAction({ type: 'open-thinktank' })]] : undefined }), readout: () => label };
    g.userData.entity = ent; ctx.entities.push(ent);
  }

  // block labels at the middle view: one text each, drawn flat beside the status mark
  const labelsPart = new Part(ctx);
  for (const l of layout.labels.filter((x) => x.level === 'middle')) labelsPart.text(TOP(l.at[0] - 1.4, l.at[1] - 6.2, 0.06), l.text, 0, 0, 2.6, 'ink', 'start', 0.05);
  const labelsG = labelsPart.build('labels'); labelsG.traverse((o) => { o.raycast = () => {}; }); scene.add(labelsG);
  // the road paint's dashes are drawn with the roads; the far-view region labels with the regions
  void dashes; void pose;

  rebuildMarks();
  return {
    buildings, plots, nearGroup,
    archetypeOf(ticker) { const pl = plots.get(ticker.toUpperCase()); return pl ? archetypeFor(pl.ticker, subIndustryByCode(pl.code)?.zone ?? 'unplaced') : null; },
    setStatuses(next) {
      statuses = next;
      for (const ent of buildings.values()) ent.setLit(ent.statusKey() === 'published');
      rebuildMarks();
    },
    statuses: () => statuses,
  };
}
