/**
 * The value-chain highlight (PRD §7.9; mega prompt §7): selecting a building
 * or a company lights its chain. Upstream links are drawn as lines from the
 * supplier buildings into this one, downstream links out of it; a measured
 * link is solid in the live colour, an expected one dashed and labelled
 * "expected, not measured"; one level by default, the full connected chain
 * on request; everything not in the chain dims. Which links exist comes from
 * the registry's link register, which are measured from the data boundary's
 * flow classes; a weight never reaches this module (the card shows it).
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { EngineContext } from './context';
import type { Entity } from './types';
import type { FlowWeight } from '@/world/data/types';
import type { Link } from '@/lib/world/registry/types';
import type { Block } from '@/world/placement/types';
import { W } from './kernel/iso';

export const EXPECTED_LABEL = 'expected, not measured';
const LABEL_CAP = 12;
const DIM = 0.22;
const Z = 7;

export interface Chain {
  /** Light the chain of a building (a sub-industry code) or a company (its plot's code); null clears. */
  set(id: string | null, depth: 1 | 'all'): void;
  setFlows(flows: readonly FlowWeight[]): void;
  /** Codes in the lit chain, the selected one first; empty when nothing is lit. */
  codes(): string[];
  /** Links drawn, by class. */
  drawn(): { measured: number; expected: number };
  /** Entities dimmed. */
  dimmed(): number;
  update(zoom: number): void;
  dispose(): void;
}

type Dimmable = THREE.Mesh | LineSegments2;
const isDimmable = (o: THREE.Object3D): o is Dimmable => (o as THREE.Mesh).isMesh === true || (o as { isLineSegments2?: boolean }).isLineSegments2 === true;

function labelSprite(ctx: EngineContext, text: string): THREE.Sprite | null {
  if (!ctx.text2d) return null;
  const w = 256, h = 40, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); if (!g) return null;
  g.fillStyle = `#${ctx.theme.fill.lamp.color.getHexString()}`; g.fillRect(0, 0, w, h);
  g.fillStyle = `#${ctx.theme.textColor('paint').getHexString()}`; g.font = `500 22px ${ctx.font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.anisotropy = ctx.gfx.aniso; t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.renderOrder = 9; s.userData.px = [w / 2, h / 2];
  return s;
}

export function createChain(ctx: EngineContext, links: readonly Link[]): Chain {
  const theme = ctx.theme;
  const group = new THREE.Group(); group.name = 'chain'; ctx.scene.add(group);
  const labels = new THREE.Group(); labels.name = 'chain-labels'; ctx.sky.add(labels);
  const mkLine = (m: LineMaterial) => { const l = new LineSegments2(new LineSegmentsGeometry(), m); l.raycast = () => {}; l.frustumCulled = false; l.visible = false; group.add(l); return l; };
  const solid = mkLine(theme.line.live), dashed = mkLine(theme.line.line);
  let flows = new Map<string, FlowWeight['cls']>();
  let lit: string[] = [], counts = { measured: 0, expected: 0 }, zoom = 1;
  // dimming: shared theme materials are swapped for translucent clones on everything outside the chain
  const dims = new Map<THREE.Material, THREE.Material>();
  const swapped = new Map<Dimmable, THREE.Material | THREE.Material[]>();
  const dimOf = (m: THREE.Material): THREE.Material => {
    let d = dims.get(m);
    if (!d) { d = m.clone(); d.transparent = true; d.opacity = DIM; d.depthWrite = false; dims.set(m, d); }
    return d;
  };
  const refreshDims = () => {
    for (const [m, d] of dims) {
      if ((m as THREE.MeshBasicMaterial).color && (d as THREE.MeshBasicMaterial).color) (d as THREE.MeshBasicMaterial).color.copy((m as THREE.MeshBasicMaterial).color);
      if ((m as LineMaterial).isLineMaterial) { (d as LineMaterial).resolution.copy((m as LineMaterial).resolution); (d as LineMaterial).linewidth = (m as LineMaterial).linewidth; }
    }
  };
  const flowKey = (a: string, b: string) => `${a}>${b}`;
  const codeOf = (ent: Entity): string | null => ent.kind === 'building' ? ent.id : ent.kind === 'company' ? ((ent as Entity & { code?: string }).code ?? null) : null;
  const centre = (code: string): THREE.Vector3 | null => {
    const e = ctx.entities.find((x) => x.kind === 'building' && x.id === code) as (Entity & { block?: Block }) | undefined;
    if (!e?.block) return null; const b = e.block.box; return W((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, Z);
  };

  function clearDraw() {
    solid.visible = dashed.visible = false;
    for (const s of [...labels.children] as THREE.Sprite[]) { labels.remove(s); s.material.map?.dispose(); s.material.dispose(); }
    for (const [o, m] of swapped) o.material = m as THREE.Material; swapped.clear();
    lit = []; counts = { measured: 0, expected: 0 };
  }
  function set(id: string | null, depth: 1 | 'all') {
    clearDraw();
    if (!id) return;
    const start = ctx.entities.find((e) => e.id === id); const code = start ? codeOf(start) : null;
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
    const sPts: number[] = [], dPts: number[] = []; let labelled = 0;
    for (const l of edges) {
      const a = centre(l.from), b = centre(l.to); if (!a || !b) continue;
      const measured = (flows.get(flowKey(l.from, l.to)) ?? 'expected') !== 'expected';
      if (measured) { counts.measured++; sPts.push(a.x, a.y, a.z, b.x, b.y, b.z); continue; }
      counts.expected++;
      const n = Math.max(2, Math.round(a.distanceTo(b) / 6));
      for (let i = 0; i < n; i++) { const p = a.clone().lerp(b, i / n), q = a.clone().lerp(b, (i + 0.5) / n); dPts.push(p.x, p.y, p.z, q.x, q.y, q.z); }
      if (labelled < LABEL_CAP) { const s = labelSprite(ctx, EXPECTED_LABEL); if (s) { s.position.copy(a).lerp(b, 0.5); labels.add(s); labelled++; } }
    }
    if (sPts.length) { solid.geometry.dispose(); solid.geometry = new LineSegmentsGeometry().setPositions(sPts); solid.visible = true; }
    if (dPts.length) { dashed.geometry.dispose(); dashed.geometry = new LineSegmentsGeometry().setPositions(dPts); dashed.visible = true; }
    // dim what is not in the chain: buildings, plots and the estate's fixtures, gates and signposts; vehicles and marks keep moving
    for (const e of ctx.entities) {
      if (e.kind === 'mark' || e.isPerson || !['building', 'company', 'fixture', 'thinktank', 'gate', 'signpost'].includes(e.kind)) continue;
      const c = codeOf(e); if (c && codes.has(c)) continue;
      for (const g of e.groups) g.traverse((o) => { if (o.userData.entity && o.userData.entity !== e) return; if (isDimmable(o) && !swapped.has(o)) { swapped.set(o, o.material); o.material = Array.isArray(o.material) ? o.material.map(dimOf) as unknown as THREE.Material : dimOf(o.material); } });
    }
    update(zoom);
  }
  function update(z: number) {
    zoom = z;
    if (swapped.size) refreshDims();
    // a label is drawn at twice its size on screen for crisp text: 128 × 20 CSS px at any zoom
    for (const s of labels.children as THREE.Sprite[]) { const [hw, hh] = s.userData.px as [number, number]; s.scale.set(hw / z, hh / z, 1); }
  }
  return {
    set, setFlows: (f) => { flows = new Map(f.map((x) => [flowKey(x.from, x.to), x.cls])); }, codes: () => [...lit], drawn: () => ({ ...counts }), dimmed: () => swapped.size, update,
    dispose: () => { clearDraw(); for (const l of [solid, dashed]) { group.remove(l); l.geometry.dispose(); } for (const d of dims.values()) d.dispose(); dims.clear(); ctx.scene.remove(group); ctx.sky.remove(labels); },
  };
}
