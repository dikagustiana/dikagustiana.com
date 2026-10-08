/** FARM (PRD §7.8; a fallback until FSRE defines it): field or pond blocks, harvest collection, primary handling, despatch. */
import { TOP } from '../engine/kernel/iso';
import type { Part } from '../engine/kernel/part';
import type { Box } from '@/world/placement/types';
import { label, stationAt, type Interior, type Station } from './types';

export const STATIONS: readonly Station[] = [
  { id: 'blocks', label: 'Blocks', tags: ['field', 'fields', 'pond', 'ponds', 'block', 'blocks', 'hectares', 'ha', 'planting', 'seed', 'seeds', 'feed', 'fertiliser', 'fertilizer', 'stocking', 'fry', 'chicks', 'doc', 'cattle', 'trees', 'palms'], anchor: [0.2, 0.42] },
  { id: 'harvest', label: 'Harvest', tags: ['harvest', 'harvesting', 'collection', 'ffb', 'picking', 'labour', 'labor', 'workers', 'wages', 'yield'], anchor: [0.48, 0.65] },
  { id: 'handling', label: 'Primary handling', tags: ['mill', 'milling', 'hatchery', 'cold', 'room', 'processing', 'drying', 'extraction', 'oer', 'power', 'fuel', 'energy', 'slaughter', 'packing', 'grading'], anchor: [0.72, 0.3] },
  { id: 'despatch', label: 'Despatch', tags: ['despatch', 'dispatch', 'transport', 'delivery', 'freight', 'sold', 'sales', 'shipping', 'logistics'], anchor: [0.88, 0.78] },
];

export function build(p: Part, b: Box): void {
  const at = (id: string) => stationAt(b, STATIONS.find((s) => s.id === id)!);
  const [bx, by] = at('blocks'); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) p.fill2(TOP(bx - 1.6 + i * 1.7, by - 1.0 + j * 1.1, 0.02), 0, 0, 1.5, 0.9, 'grass', 0.02); label(p, TOP, bx, by + 1.0, 'Blocks');
  const [hx, hy] = at('harvest'); p.box(hx - 0.9, hy - 0.5, 0, 1.8, 1.0, 0.5, 'k'); label(p, TOP, hx, hy, 'Harvest');
  const [mx, my] = at('handling'); p.box(mx - 1.2, my - 0.8, 0, 2.4, 1.6, 1.4, 'n'); p.cylZ(mx + 0.6, my, 1.4, 0.3, 0.8, 8, 'n'); label(p, TOP, mx, my + 0.6, 'Handling');
  const [dx, dy] = at('despatch'); p.fill2(TOP(dx - 1.4, dy - 0.6, 0.02), 0, 0, 2.8, 1.2, 'road', 0.02); label(p, TOP, dx, dy, 'Despatch');
}

export const FARM: Interior = { archetype: 'FARM', STATIONS, build };
