/**
 * Condition marks in the world (PRD §7.4, §7.5; mega prompt §7): the numbered
 * discs a shift places on the carrier of each marked schematic element, the
 * gate, signpost or region that carries the joint, border or stage. They are
 * drawn in the sky, after the scene and never cut off, at a constant size on
 * screen, and clicking one asks the shell for the condition card. The disc's
 * form is the condition's status: filled, open or dashed. The engine knows
 * nothing of the shift itself; the shell hands it the marks already placed.
 */
import * as THREE from 'three';
import type { EngineContext } from './context';
import type { Entity, WorldAction, WorldMark } from './types';
import { W } from './kernel/iso';

const PX = 22;

export interface Marks {
  set(marks: readonly WorldMark[]): void;
  /** Keep the discs the same size on screen whatever the zoom. */
  update(zoom: number): void;
  count(): number;
  dispose(): void;
}

function discTexture(ctx: EngineContext, mark: WorldMark): THREE.Texture | null {
  if (!ctx.text2d) return null;
  const s = 64, c = document.createElement('canvas'); c.width = s; c.height = s;
  const g = c.getContext('2d'); if (!g) return null;
  const ink = `#${ctx.theme.textColor('ink').getHexString()}`, paper = `#${ctx.theme.fill.lamp.color.getHexString()}`;
  g.clearRect(0, 0, s, s);
  g.lineWidth = 3; g.strokeStyle = ink; g.fillStyle = mark.form === 'filled' ? ink : paper;
  if (mark.form === 'dashed') g.setLineDash([4, 4]);
  g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2); g.fill(); g.stroke();
  g.setLineDash([]);
  g.fillStyle = mark.form === 'filled' ? paper : ink;
  g.font = `600 30px ${ctx.font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(mark.n), s / 2, s / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.anisotropy = ctx.gfx.aniso; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createMarks(ctx: EngineContext, onAction: (a: WorldAction) => void): Marks {
  const group = new THREE.Group(); group.name = 'marks'; ctx.sky.add(group);
  let sprites: THREE.Sprite[] = [], ents: Entity[] = [], zoom = 1;

  function clear() {
    for (const e of ents) { ctx.hooks.forget(e); const i = ctx.entities.indexOf(e); if (i >= 0) ctx.entities.splice(i, 1); }
    for (const s of sprites) { group.remove(s); s.material.map?.dispose(); s.material.dispose(); }
    sprites = []; ents = [];
  }
  function anchorOf(mark: WorldMark): THREE.Vector3 | null {
    if (mark.at.kind === 'entity') { const e = ctx.entities.find((x) => x.id === mark.at.id && x.kind !== 'mark'); if (!e?.pick) return null; return W(e.pick[0], e.pick[1], e.pick[2] + 9); }
    const r = ctx.layout.regions.find((x) => x.id === mark.at.id); if (!r) return null;
    return W(r.anchor[0], r.anchor[1], 12);
  }
  function set(marks: readonly WorldMark[]) {
    clear();
    // marks that would land on one spot (a stage and a node at one region's anchor, a gate beside it) sit side by side, not one under the other
    const clusters: { x: number; z: number; n: number }[] = [];
    for (const m of marks) {
      const at = anchorOf(m); if (!at) continue;
      // within 14 m of an earlier mark (a gate beside its region's anchor) counts as the same spot
      let c = clusters.find((k) => Math.abs(k.x - at.x) < 14 && Math.abs(k.z - at.z) < 14);
      if (!c) { c = { x: at.x, z: at.z, n: 0 }; clusters.push(c); }
      const slot = c.n++;
      const map = discTexture(ctx, m);
      const mat = new THREE.SpriteMaterial(map ? { map, transparent: true, depthTest: false } : { color: ctx.theme.textColor('ink'), depthTest: false });
      const s = new THREE.Sprite(mat); s.position.copy(at); s.renderOrder = 10; s.userData.base = at.clone(); s.userData.slot = slot;
      const ent: Entity = { kind: 'mark', id: `mark:${m.targetId}`, groups: [s], pick: [at.x, at.z, at.y],
        info: () => ({ kind: 'Condition mark', title: m.label, status: '', rows: [['Mark', String(m.n)], ['Target', m.targetId]], actions: [['Open the condition', () => onAction({ type: 'open-condition', targetId: m.targetId })]] }),
        readout: () => `mark ${m.n} · ${m.label}` };
      s.userData.entity = ent;
      group.add(s); sprites.push(s); ents.push(ent); ctx.entities.push(ent);
    }
    update(zoom);
  }
  function update(z: number) { zoom = z; const k = PX / Math.max(z, 1e-6); for (const s of sprites) { s.scale.set(k, k, 1); const slot = s.userData.slot as number; if (slot) s.position.copy(s.userData.base as THREE.Vector3).x += slot * k * 1.15; } }
  return { set, update, count: () => sprites.length, dispose: () => { clear(); ctx.sky.remove(group); } };
}
