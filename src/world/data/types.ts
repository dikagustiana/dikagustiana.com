/**
 * The shapes that cross the data boundary into scene code
 * (docs/world/PRD-kawasan-industri.md §9.3.4; mega prompt §8.1). Scene
 * builders and the simulation receive these and nothing else: no rupiah
 * figure, no unit, no percentage ever reaches them. The implementation,
 * src/world/data/boundary.ts, is the only module under src/world/ that
 * imports the Finance in Action data layer.
 */
import type { Archetype } from '@/lib/world/registry/types';

export type ModelState = 'published' | 'none' | 'unavailable';

export interface ModelStatus {
  ticker: string;
  state: ModelState;
  period?: string;
  archetype?: Archetype;
  packageVersion?: string;
}

export type FlowClass = 'measured-heavy' | 'measured-light' | 'expected';

export interface FlowWeight {
  from: string;
  to: string;
  cls: FlowClass;
}

/** A cost line bound to a station in an archetype interior; null means the whiteboard only. */
export interface StationBinding {
  lineId: string;
  /** The line's label, shown on the station marker; never a figure. */
  label: string;
  stationId: string | null;
}
