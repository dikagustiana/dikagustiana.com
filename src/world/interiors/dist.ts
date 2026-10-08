/** DIST, distribution (PRD §7.8): inbound docks, racks, picking, loading docks, the office with its invoices and the capital clock. */
import { TOP } from '../engine/kernel/iso';
import type { Part } from '../engine/kernel/part';
import type { Box } from '@/world/placement/types';
import { label, stationAt, type Interior, type Station } from './types';
import { STATIONS_BY_ARCHETYPE } from './stations';

export const STATIONS: readonly Station[] = STATIONS_BY_ARCHETYPE.DIST;

export function build(p: Part, b: Box): void {
  const at = (id: string) => stationAt(b, STATIONS.find((s) => s.id === id)!);
  const [ix, iy] = at('inbound'); p.fill2(TOP(ix - 1.4, iy - 0.7, 0.02), 0, 0, 2.8, 1.4, 'road', 0.02); label(p, TOP, ix, iy, 'Inbound');
  const [rx, ry] = at('racks'); for (let i = 0; i < 4; i++) p.box(rx - 2.0 + i * 1.1, ry - 1.2, 0, 0.5, 2.4, 2.2, 'n', { seams: false }); label(p, TOP, rx, ry + 1.0, 'Racks');
  const [kx, ky] = at('picking'); p.box(kx - 1.0, ky - 0.5, 0, 2.0, 1.0, 0.7, 'n'); label(p, TOP, kx, ky, 'Picking');
  const [lx, ly] = at('loading'); p.fill2(TOP(lx - 1.4, ly - 0.7, 0.02), 0, 0, 2.8, 1.4, 'road', 0.02); p.box(lx - 0.3, ly - 0.3, 0, 0.6, 0.6, 0.4, 'k'); label(p, TOP, lx, ly, 'Loading');
  const [ox, oy] = at('office'); p.box(ox - 1.0, oy - 0.7, 0, 2.0, 1.4, 1.4, 'n'); p.rect2(TOP(ox - 0.6, oy - 0.3, 1.42), 0, 0, 1.2, 0.6, 'detail', 0.02); label(p, TOP, ox, oy + 0.3, 'Office');
}

export const DIST: Interior = { archetype: 'DIST', STATIONS, build };
