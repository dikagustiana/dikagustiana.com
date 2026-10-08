/**
 * Archetype interiors (PRD §7.8): a handful of templates serve hundreds of
 * companies. Each archetype module exports its stations, with the tags a
 * cost line's physical unit is matched against, and a builder that draws
 * the stations inside a plot's section. Anchors are fractions of the box.
 */
import type { Part } from '../engine/kernel/part';
import type { Box } from '@/world/placement/types';
import type { Archetype } from '@/lib/world/registry/types';
import type { Station } from './stations';

export type { Station } from './stations';
export { stationAt } from './stations';

export interface Interior {
  archetype: Archetype;
  STATIONS: readonly Station[];
  /** Draws the stations inside the section's box. */
  build(part: Part, box: Box): void;
}


/** A station's label on the floor beside it, small and in paint. */
export function label(part: Part, TOP: (x: number, y: number, z: number) => import('three').Matrix4, x: number, y: number, text: string): void {
  part.text(TOP(x - 1.2, y + 1.1, 0.03), text, 0, 0, 0.5, 'paint');
}
