/** PROC, the process plant (PRD §7.8): receiving, preparation, the main line with its fuel and power feeds, packing, the store, despatch. */
import { TOP } from '../engine/kernel/iso';
import type { Part } from '../engine/kernel/part';
import type { Box } from '@/world/placement/types';
import { label, stationAt, type Interior, type Station } from './types';
import { STATIONS_BY_ARCHETYPE } from './stations';

export const STATIONS: readonly Station[] = STATIONS_BY_ARCHETYPE.PROC;

export function build(p: Part, b: Box): void {
  const at = (id: string) => stationAt(b, STATIONS.find((s) => s.id === id)!);
  const [rx, ry] = at('receiving'); p.box(rx - 1.4, ry - 0.8, 0, 2.8, 1.6, 0.5, 'n'); label(p, TOP, rx, ry, 'Receiving');
  const [px, py] = at('preparation'); p.cylZ(px, py, 0, 0.9, 1.6, 10, 'n'); label(p, TOP, px, py, 'Preparation');
  const [lx, ly] = at('line'); p.cylY(lx, ly - 2.1, 0.9, 0.8, 4.2, 10, 'k'); p.box(lx - 2.4, ly - 0.5, 0, 0.6, 1.0, 0.9, 'n'); p.box(lx + 1.8, ly - 0.5, 0, 0.6, 1.0, 0.9, 'n'); label(p, TOP, lx, ly + 0.6, 'Main line');
  const [kx, ky] = at('packing'); p.box(kx - 1.0, ky - 0.6, 0, 2.0, 1.2, 0.8, 'n'); label(p, TOP, kx, ky, 'Packing');
  const [sx, sy] = at('store'); for (let i = 0; i < 3; i++) p.box(sx - 1.2 + i * 0.9, sy - 0.6, 0, 0.7, 1.2, 0.6 + (i % 2) * 0.3, 'n'); label(p, TOP, sx, sy, 'Store');
  const [dx, dy] = at('despatch'); p.fill2(TOP(dx - 1.4, dy - 0.7, 0.02), 0, 0, 2.8, 1.4, 'road', 0.02); label(p, TOP, dx, dy, 'Despatch');
}

export const PROC: Interior = { archetype: 'PROC', STATIONS, build };
