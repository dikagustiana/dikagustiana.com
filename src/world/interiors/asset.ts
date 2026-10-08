/** ASSET, the asset-heavy network (PRD §7.8): the asset itself, the maintenance yard, the operations centre, the customer or traffic entry. */
import { TOP } from '../engine/kernel/iso';
import type { Part } from '../engine/kernel/part';
import type { Box } from '@/world/placement/types';
import { label, stationAt, type Interior, type Station } from './types';
import { STATIONS_BY_ARCHETYPE } from './stations';

export const STATIONS: readonly Station[] = STATIONS_BY_ARCHETYPE.ASSET;

export function build(p: Part, b: Box): void {
  const at = (id: string) => stationAt(b, STATIONS.find((s) => s.id === id)!);
  const [ax, ay] = at('asset'); p.cylZ(ax - 1.6, ay, 0, 0.6, 3.0, 10, 'n'); p.cylZ(ax + 1.6, ay, 0, 0.6, 3.0, 10, 'n'); p.box(ax - 2.2, ay - 1.0, 0, 4.4, 2.0, 0.5, 'n'); label(p, TOP, ax, ay + 0.9, 'The asset');
  const [mx, my] = at('maintenance'); p.fill2(TOP(mx - 1.4, my - 0.7, 0.02), 0, 0, 2.8, 1.4, 'sand', 0.02); p.box(mx - 0.4, my - 0.3, 0, 0.8, 0.6, 0.5, 'k'); label(p, TOP, mx, my, 'Maintenance');
  const [ox, oy] = at('operations'); p.box(ox - 1.0, oy - 0.7, 0, 2.0, 1.4, 1.2, 'n'); p.fill2(TOP(ox - 0.7, oy - 0.4, 1.22), 0, 0, 1.4, 0.8, 'screen', 0.02); label(p, TOP, ox, oy + 0.3, 'Operations');
  const [ex, ey] = at('entry'); p.box(ex - 1.2, ey - 0.2, 0, 2.4, 0.4, 1.0, 'n'); p.rect2(TOP(ex - 1.2, ey - 0.9, 0.02), 0, 0, 2.4, 0.5, 'detail', 0.02); label(p, TOP, ex, ey, 'Entry');
}

export const ASSET: Interior = { archetype: 'ASSET', STATIONS, build };
