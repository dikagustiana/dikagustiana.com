/** PROC, the process plant (PRD §7.8): receiving, preparation, the main line with its fuel and power feeds, packing, the store, despatch. */
import { TOP } from '../engine/kernel/iso';
import type { Part } from '../engine/kernel/part';
import type { Box } from '@/world/placement/types';
import { label, stationAt, type Interior, type Station } from './types';

export const STATIONS: readonly Station[] = [
  { id: 'receiving', label: 'Receiving', tags: ['raw', 'material', 'materials', 'receiving', 'limestone', 'ore', 'feed', 'feedstock', 'input', 'inputs', 'inbound', 'purchases'], anchor: [0.12, 0.25] },
  { id: 'preparation', label: 'Preparation', tags: ['crushing', 'crusher', 'preparation', 'grinding', 'mill', 'milling', 'mixing', 'blending'], anchor: [0.3, 0.6] },
  { id: 'line', label: 'Main line', tags: ['kiln', 'smelter', 'reactor', 'furnace', 'process', 'line', 'fuel', 'power', 'electricity', 'gas', 'coal', 'energy', 'clinker', 'heat', 'steam', 'produced', 'production', 'conversion', 'yield'], anchor: [0.5, 0.3] },
  { id: 'packing', label: 'Packing', tags: ['packing', 'packaging', 'bags', 'bagging', 'filling', 'bottling', 'cans'], anchor: [0.7, 0.65] },
  { id: 'store', label: 'Store', tags: ['store', 'finished', 'goods', 'inventory', 'stock', 'warehouse'], anchor: [0.85, 0.3] },
  { id: 'despatch', label: 'Despatch', tags: ['despatch', 'dispatch', 'loading', 'trucks', 'freight', 'delivery', 'distribution', 'sold', 'sales', 'shipping', 'logistics'], anchor: [0.88, 0.82] },
];

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
