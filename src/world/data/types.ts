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

/**
 * The in-world whiteboard (PRD §7.7; mega prompt §9.3), the one place the
 * scene shows figures: pre-formatted strings the shell wrote with the house
 * formatter, labels of at most twelve characters, bar lengths as fractions.
 * The engine draws them with Part.note, which the development guard does
 * not check; everything else in scene code goes through Part.text.
 */
export interface WhiteboardContent {
  ticker: string;
  period: string;
  /** The top three cost drivers by share of cost of revenue: label (≤ 12 chars) and figure. */
  drivers: { label: string; figure: string }[];
  /** The miniature waterfall: label (≤ 12 chars), figure, and the bar's extent as fractions of the scale. */
  waterfall: { label: string; figure: string; from: number; to: number; role: 'revenue' | 'cost' | 'unsplit' | 'subtotal' }[];
  /** The peer position: two marks on one scale, or a band with the median, as fractions; null when there is no peer. */
  peer: { heading: string; metric: string; self: number; other?: number; min?: number; max?: number; median?: number } | null;
}
