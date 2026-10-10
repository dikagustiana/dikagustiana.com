/**
 * The value-chain highlight (PRD v2 §3.9, §3.10; mega prompt §6 D1, D3):
 * selecting a building or a company lights its chain on the roads its goods
 * take. Each link's routes, from a supplier's lot to a customer's, show
 * travelling dashes in the direction of the goods (towards the customer), in
 * the live tone: long dashes for a measured link, short ones for an expected
 * one. The linked lots get a raised outline; everything else dims as v1 did.
 * One level by default, the whole connected chain on request. A selected
 * vehicle lights its own route, ahead and behind, and its two lots; a story
 * lights every hop end to end. No route carries a label: the words "expected,
 * not measured" are said once, in the card (§3.9), and a hovered route shows
 * its link's note. Which links exist comes from the registry's link register,
 * measured from the data boundary's flow classes; a weight never reaches
 * this module (the card shows it).
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { EngineContext } from './context';
import type { Entity, EntityInfo } from './types';
import type { FlowWeight } from '@/world/data/types';
import type { Goods, Link } from '@/lib/world/registry/types';
import type { Box, Pt } from '@/world/placement/types';
import { subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import { W } from './kernel/iso';

const DIM = 0.22;
/** The routes' height over the road, and how wide a route is to the pointer, in metres. */
const Z = 0.7, PICK = 7;
/** How fast the dashes travel, in metres per second of the frame's clock; a measured link's dashes are long. */
const DASH_SPEED = 9, MEASURED = { dash: 12, gap: 3 }, EXPECTED = { dash: 4, gap: 6 };
/** The raised outline's height over a lot's form. */
const RAISE = 1.5;

/** A link's way on the roads, from a supplier's lot to a customer's (sim/flows.ts gives them). */
export interface ChainRoute { from: string; to: string; pts: readonly Pt[]; gates: readonly string[] }
export interface ChainSource {
  /** The roads a link's goods take: every supplier lot to every customer lot. */
  routesOf(from: string, to: string): readonly ChainRoute[];
  /** The lot entity ids of a sub-industry. */
  lotsOf(code: string): readonly string[];
}
/** A story as the chain lights it (src/lib/world/registry/stories.generated.ts). */
export interface ChainStory { id: string; hops: readonly string[]; goods: readonly Goods[]; direction: 'downstream' | 'upstream'; with: readonly string[] }
/** A story's hop as lit: its link's ends in the order the story reads them, its goods, the gates its routes cross. */
export interface StoryHop { from: string; to: string; goods: Goods; gates: string[]; measured: boolean; box: Box | null }

export interface Chain {
  /** Light the chain of a building (a sub-industry code), a company (its lot) or a vehicle (its route); null clears. */
  set(id: string | null, depth: 1 | 'all'): void;
  /** Light a story end to end, and return its hops; null clears. */
  story(s: ChainStory | null): StoryHop[];
  /** The lit story's hops as drawn now (a measured class arriving redraws them). */
  hops(): StoryHop[];
  /** The boundary's flow classes; whatever is lit is drawn again with them. */
  setFlows(flows: readonly FlowWeight[]): void;
  /** Codes in the lit chain, the selected one first; empty when nothing is lit. */
  codes(): string[];
  /** Links drawn, by class; the routes drawn for them; the lots outlined. */
  drawn(): { measured: number; expected: number; routes: number; outlined: number };
  /** Entities dimmed. */
  dimmed(): number;
  /** The ground the lit set covers, for the camera to frame. */
  bounds(): Box | null;
  /** How far the dashes have travelled (the shader's offset), for the tests. */
  offset(): number;
  update(zoom: number, dt?: number): void;
  dispose(): void;
}

type Dimmable = THREE.Mesh | LineSegments2;
const isDimmable = (o: THREE.Object3D): o is Dimmable => (o as THREE.Mesh).isMesh === true || (o as { isLineSegments2?: boolean }).isLineSegments2 === true;
const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const nameOf = (code: string) => subIndustryByCode(code)?.nameEn ?? code;

/** A lit route under the pointer: its hover label is its link's note (PRD v2 §3.9). */
class RouteEntity implements Entity {
  readonly kind = 'route';
  readonly groups: THREE.Object3D[];
  readonly pick: readonly [number, number, number];
  constructor(readonly id: string, private readonly link: Link | null, private readonly ends: [string, string], private readonly measured: boolean, mesh: THREE.Object3D, mid: Pt) {
    this.groups = [mesh]; mesh.userData.entity = this; this.pick = [mid[0], mid[1], Z];
  }
  label(): string { return this.link?.note ? capital(this.link.note) : `${nameOf(this.ends[0])} to ${nameOf(this.ends[1])}`; }
  readout(): string { return this.label(); }
  info(): EntityInfo {
    return {
      kind: 'Route', title: this.label(), status: this.measured ? 'measured by a published model' : 'expected, not measured',
      rows: [['From', nameOf(this.ends[0])], ['To', nameOf(this.ends[1])], ...(this.link ? [['Goods', this.link.goods] as [string, string]] : [])],
    };
  }
}

export function createChain(ctx: EngineContext, links: readonly Link[], source: ChainSource): Chain {
  const theme = ctx.theme;
  const group = new THREE.Group(); group.name = 'chain'; ctx.scene.add(group);
  const marks = new THREE.Group(); marks.name = 'chain-outlines'; ctx.sky.add(marks);
  // the dashes: the live tone, each class its own pattern; the outlines over everything, in the sky
  const dashMat = (p: { dash: number; gap: number }) => {
    const m = theme.line.live.clone() as LineMaterial;
    m.dashed = true; m.dashSize = p.dash; m.gapSize = p.gap; m.linewidth = 3; m.needsUpdate = true;
    return m;
  };
  const mats = { measured: dashMat(MEASURED), expected: dashMat(EXPECTED), outline: theme.line.live.clone() as LineMaterial };
  mats.outline.depthTest = false; mats.outline.depthWrite = false; mats.outline.linewidth = 2;
  const mkLine = (m: LineMaterial, parent: THREE.Object3D) => { const l = new LineSegments2(new LineSegmentsGeometry(), m); l.raycast = () => {}; l.frustumCulled = false; l.visible = false; l.renderOrder = 10; parent.add(l); return l; };
  const lines = { measured: mkLine(mats.measured, group), expected: mkLine(mats.expected, group), outline: mkLine(mats.outline, marks) };
  // a route's pick ribbon is never drawn (its material is invisible), only hit
  const pickMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }); pickMat.name = 'chain-pick';
  const routes: RouteEntity[] = [];

  let flows = new Map<string, FlowWeight['cls']>();
  let lit: string[] = [], counts = { measured: 0, expected: 0 }, routeCount = 0, outlined = 0, zoom = 1, offset = 0, box: Box | null = null;
  /** What is lit, to draw again when the flow classes change: a selection's chain, or a story and its hops. */
  let shown: { id: string; depth: 1 | 'all' } | { story: ChainStory; hops: StoryHop[] } | null = null;
  // dimming: shared theme materials are swapped for translucent clones on everything outside the chain
  const dims = new Map<THREE.Material, THREE.Material>();
  const swapped = new Map<Dimmable, THREE.Material | THREE.Material[]>();
  const dimOf = (m: THREE.Material): THREE.Material => {
    let d = dims.get(m);
    // a translucent material (the cast shadow) dims from its own opacity, not from full
    if (!d) { d = m.clone(); d.transparent = true; d.opacity = DIM * (m.transparent ? m.opacity : 1); d.depthWrite = false; dims.set(m, d); }
    return d;
  };
  const refresh = () => {
    for (const [m, d] of dims) {
      if ((m as THREE.MeshBasicMaterial).color && (d as THREE.MeshBasicMaterial).color) (d as THREE.MeshBasicMaterial).color.copy((m as THREE.MeshBasicMaterial).color);
      if ((m as LineMaterial).isLineMaterial) { (d as LineMaterial).resolution.copy((m as LineMaterial).resolution); (d as LineMaterial).linewidth = (m as LineMaterial).linewidth; }
    }
    for (const m of Object.values(mats)) { m.resolution.copy(theme.line.live.resolution); m.color.copy(theme.line.live.color); }
  };
  const flowKey = (a: string, b: string) => `${a}>${b}`;
  const isMeasured = (l: Link) => l.state === 'measured' || (flows.get(flowKey(l.from, l.to)) ?? 'expected') !== 'expected';
  const codeOf = (ent: Entity): string | null => ent.kind === 'building' ? ent.id : ent.kind === 'company' ? ((ent as Entity & { code?: string }).code ?? null) : null;
  const byId = (id: string) => ctx.entities.find((e) => e.id === id) ?? null;

  function clearDraw() {
    for (const l of Object.values(lines)) l.visible = false;
    for (const r of routes) { ctx.hooks.forget(r); const i = ctx.entities.indexOf(r); if (i >= 0) ctx.entities.splice(i, 1); r.groups[0].removeFromParent(); (r.groups[0] as THREE.Mesh).geometry.dispose(); }
    routes.length = 0;
    for (const [o, m] of swapped) o.material = m as THREE.Material; swapped.clear();
    lit = []; counts = { measured: 0, expected: 0 }; routeCount = 0; outlined = 0; box = null;
  }
  const grow = (x: number, y: number) => { box = box ? { x0: Math.min(box.x0, x), x1: Math.max(box.x1, x), y0: Math.min(box.y0, y), y1: Math.max(box.y1, y) } : { x0: x, x1: x, y0: y, y1: y }; };

  /** Draw the lit set: routes (each a polyline the dashes run along, from its first point to its last), outlines, dims. */
  function draw(paths: { pts: readonly Pt[]; measured: boolean; link: Link | null; ends: [string, string] }[], lots: Set<string>, codes: Set<string>) {
    const seg = { measured: [] as number[], expected: [] as number[] };
    for (const p of paths) {
      if (p.pts.length < 2) continue;
      const out = p.measured ? seg.measured : seg.expected;
      for (let i = 0; i + 1 < p.pts.length; i++) { const a = W(p.pts[i][0], p.pts[i][1], Z), b = W(p.pts[i + 1][0], p.pts[i + 1][1], Z); out.push(a.x, a.y, a.z, b.x, b.y, b.z); }
      for (const q of p.pts) grow(q[0], q[1]);
      // the pointer's ribbon along it, for the hover's note
      const pos: number[] = [];
      for (let i = 0; i + 1 < p.pts.length; i++) {
        const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1], L = Math.hypot(bx - ax, by - ay); if (L < 1e-6) continue;
        const nx = (-(by - ay) / L) * PICK / 2, ny = ((bx - ax) / L) * PICK / 2;
        const c = [W(ax + nx, ay + ny, Z), W(ax - nx, ay - ny, Z), W(bx - nx, by - ny, Z), W(bx + nx, by + ny, Z)];
        for (const k of [0, 1, 2, 0, 2, 3]) pos.push(c[k].x, c[k].y, c[k].z);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, pickMat); mesh.name = 'chain-route'; group.add(mesh);
      const mid = p.pts[Math.floor(p.pts.length / 2)];
      const r = new RouteEntity(`route:${p.ends[0]}>${p.ends[1]}:${routes.length}`, p.link, p.ends, p.measured, mesh, mid);
      routes.push(r); ctx.entities.push(r); routeCount++;
    }
    for (const k of ['measured', 'expected'] as const) {
      if (!seg[k].length) continue;
      const l = lines[k]; l.geometry.dispose(); l.geometry = new LineSegmentsGeometry().setPositions(seg[k]); l.computeLineDistances(); l.visible = true;
    }
    // raised outlines on the lit lots (a lot's box, from the ground to over its form)
    const opts: number[] = [];
    for (const id of lots) {
      const e = byId(id) as (Entity & { box?: Box }) | null; if (!e?.box) continue;
      const b = e.box, top = (e.bbox ? e.bbox.max.y : 4) + RAISE;
      const c = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]] as const;
      for (let i = 0; i < 4; i++) {
        const [ax, ay] = c[i], [bx, by] = c[(i + 1) % 4];
        for (const z of [0.3, top]) { const a = W(ax, ay, z), q = W(bx, by, z); opts.push(a.x, a.y, a.z, q.x, q.y, q.z); }
        const g0 = W(ax, ay, 0.3), g1 = W(ax, ay, top); opts.push(g0.x, g0.y, g0.z, g1.x, g1.y, g1.z);
      }
      grow(b.x0, b.y0); grow(b.x1, b.y1); outlined++;
    }
    if (opts.length) { const l = lines.outline; l.geometry.dispose(); l.geometry = new LineSegmentsGeometry().setPositions(opts); l.visible = true; }
    // dim what is not lit: buildings, lots and the estate's fixtures, gates and signposts; vehicles and marks keep moving
    for (const e of ctx.entities) {
      if (e.kind === 'mark' || e.isPerson || !['building', 'company', 'fixture', 'thinktank', 'gate', 'signpost'].includes(e.kind)) continue;
      if (e.kind === 'company' ? lots.has(e.id) || (codes.has(codeOf(e) ?? '') && !lots.size) : codes.has(codeOf(e) ?? '\u0000')) continue;
      for (const g of e.groups) g.traverse((o) => { if (o.userData.entity && o.userData.entity !== e) return; if (isDimmable(o) && !swapped.has(o)) { swapped.set(o, o.material); o.material = Array.isArray(o.material) ? o.material.map(dimOf) as unknown as THREE.Material : dimOf(o.material); } });
    }
    update(zoom);
  }
  /** A link's routes, drawn from the end the story or the goods start at. */
  const pathsOf = (l: Link, reverse = false) => source.routesOf(l.from, l.to).map((r) => ({ pts: reverse ? [...r.pts].reverse() : r.pts, measured: isMeasured(l), link: l, ends: (reverse ? [l.to, l.from] : [l.from, l.to]) as [string, string], gates: r.gates }));

  function set(id: string | null, depth: 1 | 'all') {
    clearDraw();
    shown = id ? { id, depth } : null;
    if (!id) return;
    const start = byId(id);
    if (start?.kind === 'vehicle') {
      // a vehicle lights its own route, ahead and behind, and its two lots (PRD v2 §3.9)
      const f = start.facts?.(), r = start.route?.();
      if (!f || !r?.path) return;
      const pts: Pt[] = []; for (let s = 0; s < r.path.length; s += 4) { const p = r.path.at(s); pts.push([p.x, p.y]); }
      const end = r.path.at(r.path.length); pts.push([end.x, end.y]);
      const [from, to] = [String(f.from), String(f.to)];
      const ends = [byId(from), byId(to)].map((e) => (e ? codeOf(e) : null)).filter((c): c is string => !!c);
      const link = links.find((l) => String(f.link) === flowKey(l.from, l.to)) ?? null;
      lit = ends;
      draw([{ pts, measured: link ? isMeasured(link) : false, link, ends: [ends[0] ?? from, ends[1] ?? to] }], new Set([from, to]), new Set(ends));
      return;
    }
    const code = start ? codeOf(start) : null;
    if (!code) return;
    // the chain: links one step from the code, or the whole component it belongs to
    const codes = new Set<string>([code]); const edges: Link[] = []; const seen = new Set<Link>();
    const frontier = [code];
    while (frontier.length) {
      const c = frontier.shift()!;
      for (const l of links) {
        if (l.from !== c && l.to !== c) continue;
        if (!seen.has(l)) { seen.add(l); edges.push(l); }
        const other = l.from === c ? l.to : l.from;
        if (!codes.has(other)) { codes.add(other); if (depth === 'all') frontier.push(other); }
      }
    }
    lit = [code, ...[...codes].filter((c) => c !== code)];
    const paths = [];
    for (const l of edges) { if (isMeasured(l)) counts.measured++; else counts.expected++; paths.push(...pathsOf(l)); }
    const lots = new Set<string>(); for (const c of codes) for (const x of source.lotsOf(c)) lots.add(x);
    draw(paths, lots, codes);
  }
  function story(s: ChainStory | null): StoryHop[] {
    clearDraw();
    shown = null;
    if (!s) return [];
    const hops: StoryHop[] = [], paths = [];
    const codes = new Set<string>([...s.hops, ...s.with]);
    for (let i = 0; i + 1 < s.hops.length; i++) {
      const a = s.hops[i], b = s.hops[i + 1], up = s.direction === 'upstream';
      // an upstream story reads against the goods: money runs back up the link (PRD v2 Appendix B, 6)
      const l = links.find((x) => (up ? x.from === b && x.to === a : x.from === a && x.to === b));
      if (!l) continue;
      const ps = pathsOf(l, up);
      if (isMeasured(l)) counts.measured++; else counts.expected++;
      paths.push(...ps);
      // the hop's own ground, for the strip's button to frame: its routes and its two ends' lots
      let hb: Box | null = null;
      const add = (x: number, y: number) => { hb = hb ? { x0: Math.min(hb.x0, x), x1: Math.max(hb.x1, x), y0: Math.min(hb.y0, y), y1: Math.max(hb.y1, y) } : { x0: x, x1: x, y0: y, y1: y }; };
      for (const p of ps) for (const q of p.pts) add(q[0], q[1]);
      for (const c of [a, b]) for (const id of source.lotsOf(c)) { const e = byId(id) as (Entity & { box?: Box }) | null; if (e?.box) { add(e.box.x0, e.box.y0); add(e.box.x1, e.box.y1); } }
      hops.push({ from: a, to: b, goods: s.goods[i] ?? l.goods, gates: [...new Set(ps.flatMap((p) => p.gates))], measured: isMeasured(l), box: hb });
    }
    lit = [...codes];
    const lots = new Set<string>(); for (const c of codes) for (const x of source.lotsOf(c)) lots.add(x);
    draw(paths, lots, codes);
    shown = { story: s, hops };
    return hops;
  }
  function update(z: number, dt = 0) {
    zoom = z;
    // the dashes travel towards the end each route was drawn to (the shader shows a dash where distance + offset falls in it)
    offset -= dt * DASH_SPEED;
    if (offset < -1e4) offset += 1e4;
    mats.measured.dashOffset = offset; mats.expected.dashOffset = offset;
    if (swapped.size || routes.length) refresh();
  }
  return {
    set, story,
    hops: () => (shown && 'story' in shown ? [...shown.hops] : []),
    setFlows: (f) => {
      flows = new Map(f.map((x) => [flowKey(x.from, x.to), x.cls]));
      // a class that arrives after something was lit (the published data loads after the first paint) redraws it
      if (shown && 'story' in shown) story(shown.story); else if (shown) set(shown.id, shown.depth);
    },
    codes: () => [...lit], drawn: () => ({ ...counts, routes: routeCount, outlined }), dimmed: () => swapped.size, bounds: () => (box ? { ...box } : null), offset: () => offset, update,
    dispose: () => {
      clearDraw();
      for (const l of Object.values(lines)) { l.removeFromParent(); l.geometry.dispose(); }
      for (const m of Object.values(mats)) m.dispose();
      pickMat.dispose();
      for (const d of dims.values()) d.dispose(); dims.clear();
      ctx.scene.remove(group); ctx.sky.remove(marks);
    },
  };
}
