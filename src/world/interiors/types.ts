/**
 * Archetype interiors (PRD §7.8): a handful of templates serve hundreds of
 * companies. Each archetype module exports its stations, with the tags a
 * cost line's physical unit is matched against, and a builder that draws
 * the stations inside a plot's section. Anchors are fractions of the box.
 */
import type { Part } from '../engine/kernel/part';
import type { Box } from '@/world/placement/types';
import type { Archetype } from '@/lib/world/registry/types';

export interface Station {
  id: string;
  /** The label drawn beside the station; never a figure. */
  label: string;
  /** Tags a cost line's physical unit and description are matched against (lower case, whole tokens). */
  tags: readonly string[];
  /** Where the station stands in the plot, as fractions of the box: x from the west wall, y from the north (back) wall. */
  anchor: readonly [number, number];
}

export interface Interior {
  archetype: Archetype;
  STATIONS: readonly Station[];
  /** Draws the stations inside the section's box. */
  build(part: Part, box: Box): void;
}

/** A station's floor position in a plot box. */
export const stationAt = (b: Box, s: Station): [number, number] => [b.x0 + (b.x1 - b.x0) * s.anchor[0], b.y0 + (b.y1 - b.y0) * s.anchor[1]];

/** A station's label on the floor beside it, small and in paint. */
export function label(part: Part, TOP: (x: number, y: number, z: number) => import('three').Matrix4, x: number, y: number, text: string): void {
  part.text(TOP(x - 1.2, y + 1.1, 0.03), text, 0, 0, 0.5, 'paint');
}
