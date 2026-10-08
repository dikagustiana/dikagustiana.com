/** MINE (PRD §7.8; planned by FSRE, used when the package names it): pit or well pad, haul road, crusher or wash plant, stockpile, load-out. */
import { TOP } from '../engine/kernel/iso';
import type { Part } from '../engine/kernel/part';
import type { Box } from '@/world/placement/types';
import { label, stationAt, type Interior, type Station } from './types';
import { STATIONS_BY_ARCHETYPE } from './stations';

export const STATIONS: readonly Station[] = STATIONS_BY_ARCHETYPE.MINE;

export function build(p: Part, b: Box): void {
  const at = (id: string) => stationAt(b, STATIONS.find((s) => s.id === id)!);
  const [px, py] = at('pit'); p.fill2(TOP(px - 1.6, py - 1.0, 0.02), 0, 0, 3.2, 2.0, 'road', 0.02); p.rect2(TOP(px - 1.1, py - 0.6, 0.03), 0, 0, 2.2, 1.2, 'detail', 0.02); label(p, TOP, px, py + 0.4, 'Pit');
  const [hx, hy] = at('haul'); p.fill2(TOP(hx - 2.6, hy - 0.35, 0.02), 0, 0, 5.2, 0.7, 'sand', 0.02); label(p, TOP, hx, hy, 'Haul road');
  const [cx, cy] = at('plant'); p.box(cx - 0.8, cy - 0.8, 0, 1.6, 1.6, 1.6, 'n'); p.cylZ(cx, cy, 1.6, 0.5, 0.8, 8, 'n'); label(p, TOP, cx, cy + 0.6, 'Crusher');
  const [sx, sy] = at('stockpile'); p.cylZ(sx, sy, 0, 1.3, 0.9, 10, 'k'); label(p, TOP, sx, sy + 0.8, 'Stockpile');
  const [lx, ly] = at('loadout'); p.box(lx - 1.4, ly - 0.3, 0, 2.8, 0.6, 1.2, 'n', { seams: false }); label(p, TOP, lx, ly, 'Load-out');
}

export const MINE: Interior = { archetype: 'MINE', STATIONS, build };
