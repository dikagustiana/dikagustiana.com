/**
 * Driver placement (PRD §7.8; mega prompt §9.2): on exposeCompany the engine
 * lights each bound station of the company's plot with a small marker that
 * carries the cost line's label, never a figure, and links it to the line.
 * The board lights a station by line id while a driver is hovered or
 * focused; the markers are drawn in the sky at a constant size on screen.
 */
import * as THREE from 'three';
import type { EngineContext } from './context';
import type { StationBinding } from '@/world/data/types';
import type { Archetype } from '@/lib/world/registry/types';
import type { Box } from '@/world/placement/types';
import { INTERIORS, stationAt } from '@/world/interiors';
import { W } from './kernel/iso';

const PX_H = 18;

export interface Stations {
  expose(archetype: Archetype, box: Box, bindings: readonly StationBinding[]): void;
  clear(): void;
  /** Light the marker of a line, or none. */
  light(lineId: string | null): void;
  lit(): string | null;
  /** The markers drawn: line id → station id. */
  placed(): Map<string, string>;
  update(zoom: number): void;
  dispose(): void;
}

function markerSprite(ctx: EngineContext, text: string): THREE.Sprite {
  let map: THREE.Texture | null = null, w = 160, h = 36;
  if (ctx.text2d) {
    const c = document.createElement('canvas'); const g = c.getContext('2d');
    if (g) {
      g.font = `600 22px ${ctx.font}`; w = Math.ceil(g.measureText(text).width) + 28; c.width = w; c.height = h;
      g.fillStyle = `#${ctx.theme.fill.lamp.color.getHexString()}`; g.fillRect(0, 0, w, h);
      g.strokeStyle = `#${ctx.theme.textColor('ink').getHexString()}`; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
      g.fillStyle = `#${ctx.theme.textColor('ink').getHexString()}`; g.font = `600 22px ${ctx.font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 1);
      map = new THREE.CanvasTexture(c); map.anisotropy = ctx.gfx.aniso; map.colorSpace = THREE.SRGBColorSpace;
    }
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial(map ? { map, transparent: true, depthTest: false } : { color: ctx.theme.textColor('ink'), depthTest: false }));
  s.renderOrder = 11; s.userData.px = [w, h];
  return s;
}

export function createStations(ctx: EngineContext): Stations {
  const group = new THREE.Group(); group.name = 'stations'; ctx.sky.add(group);
  let zoom = 1, litId: string | null = null;
  const byLine = new Map<string, { sprite: THREE.Sprite; stationId: string }>();
  function clear() { for (const { sprite } of byLine.values()) { group.remove(sprite); sprite.material.map?.dispose(); sprite.material.dispose(); } byLine.clear(); litId = null; }
  function expose(archetype: Archetype, box: Box, bindings: readonly StationBinding[]) {
    clear();
    const stations = INTERIORS[archetype].STATIONS;
    const perStation = new Map<string, number>();
    for (const b of bindings) {
      if (!b.stationId) continue;
      const st = stations.find((s) => s.id === b.stationId); if (!st) continue;
      ctx.guard?.(b.label);
      const n = perStation.get(st.id) ?? 0; perStation.set(st.id, n + 1);
      const [x, y] = stationAt(box, st);
      const s = markerSprite(ctx, b.label); s.position.copy(W(x, y, 2.6 + n * 0.9)); s.userData.lineId = b.lineId;
      group.add(s); byLine.set(b.lineId, { sprite: s, stationId: st.id });
    }
    update(zoom);
  }
  function light(lineId: string | null) {
    litId = lineId;
    for (const [id, { sprite }] of byLine) { const on = id === lineId; sprite.material.color.copy(on ? ctx.theme.fill.livef.color : new THREE.Color(1, 1, 1)); sprite.userData.lit = on; }
    update(zoom);
  }
  function update(z: number) {
    zoom = z;
    for (const { sprite } of byLine.values()) { const [w, h] = sprite.userData.px as [number, number]; const k = (sprite.userData.lit ? 1.25 : 1) * (PX_H / h); sprite.scale.set((w * k) / z, (h * k) / z, 1); }
  }
  return { expose, clear, light, lit: () => litId, placed: () => new Map([...byLine].map(([k, v]) => [k, v.stationId])), update, dispose: () => { clear(); ctx.sky.remove(group); } };
}
