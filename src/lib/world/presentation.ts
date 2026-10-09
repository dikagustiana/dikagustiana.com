/**
 * Where the schematic's elements live in the world (PRD §7.4, §8.2; mega
 * prompt §7). The chain data file is read as is; this table only says which
 * world object carries each element's mark, signpost or layer. Nothing here
 * copies or edits the chain data.
 */
import { BANDS, BORDERS, JOINTS, RETURNS, STAGES, NODES, RETAIL_GROUP, type ShiftId, SHIFT_BY_ID, isMarked, type ShiftTarget } from '@/data/industryChain';
import { MARK_ORDER } from '@/components/industry-chain/chainMarkOrder';
import { LAYERS, CAPITAL_BAND_LAYER } from './constants';
import type { LayerName } from '@/world/engine/types';

export type Carrier =
  | { kind: 'gate'; id: string }
  | { kind: 'layer'; layer: LayerName }
  | { kind: 'region'; id: string }
  | { kind: 'signpost'; id: string }
  | { kind: 'vehicle'; label: string }
  | { kind: 'none' };

/** The gate each joint's transfer is read at (the layout's gates name their joint). */
export const JOINT_GATE: Record<string, string> = {
  'j-extraction-processing': 'gate-north',
  'j-aggregation-processing': 'gate-south',
  'j-production-aggregation': 'gate-south',
  'j-packaging-manufacturing': 'gate-west',
  'j-manufacturing-distribution': 'gate-east',
  'j-processing-trader': 'gate-port',
  'j-trader-manufacturing': 'gate-port',
  'j-distributor-wholesaler': 'gate-east',
  'j-wholesale-retail': 'gate-east',
  'j-retail-consumption': 'gate-east',
  'j-consumption-recovery': 'gate-north',
};
export const STAGE_REGION: Record<string, string> = {
  'stage-biological': 'ring-biological', 'stage-extraction': 'ring-geological', 'stage-processing': 'estate', 'stage-packaging': 'estate',
  'stage-manufacturing': 'estate', 'stage-consumption': 'town', 'stage-recovery': 'recovery',
  'node-aggregation': 'ring-biological', 'node-trader': 'gateway', 'node-principal': 'town', 'node-distributor': 'town', 'node-wholesaler': 'town', [RETAIL_GROUP.id]: 'town',
};
export const BORDER_SIGNPOST: Record<string, string> = { 'border-export': 'sign-export', 'border-import': 'sign-import' };

export function bandLayer(bandId: string): LayerName | null {
  if (bandId === 'band-capital') return CAPITAL_BAND_LAYER;
  return LAYERS.find((l) => l.bandId === bandId)?.layer ?? null;
}

/** Which world object carries a schematic element. */
export function carrierOf(id: string): Carrier {
  if (JOINT_GATE[id]) return { kind: 'gate', id: JOINT_GATE[id] };
  if (id.startsWith('band-')) { const layer = bandLayer(id); return layer ? { kind: 'layer', layer } : { kind: 'none' }; }
  if (STAGE_REGION[id]) return { kind: 'region', id: STAGE_REGION[id] };
  if (BORDER_SIGNPOST[id]) return { kind: 'signpost', id: BORDER_SIGNPOST[id] };
  const ret = RETURNS.find((r) => r.id === id); if (ret) return { kind: 'vehicle', label: ret.label };
  return { kind: 'none' };
}

export interface PlacedMark {
  /** The schematic element the mark sits on. */
  targetId: string;
  /** Its number in the shift's reading order, from one. */
  n: number;
  label: string;
  target: ShiftTarget;
  carrier: Carrier;
}

export function labelOf(id: string): string {
  return STAGES.find((s) => s.id === id)?.label ?? NODES.find((n) => n.id === id)?.label ?? (id === RETAIL_GROUP.id ? RETAIL_GROUP.label : undefined)
    ?? JOINTS.find((j) => j.id === id)?.label ?? BANDS.find((b) => b.id === id)?.label ?? BORDERS.find((b) => b.id === id)?.label ?? RETURNS.find((r) => r.id === id)?.label ?? id;
}

/** The marks a shift places, in the schematic's reading order, numbered from one, with where each sits in the world. */
export function marksFor(shift: ShiftId): PlacedMark[] {
  const s = SHIFT_BY_ID[shift];
  const marked = s.targets.filter(isMarked);
  const order = MARK_ORDER[shift];
  const sorted = [...marked].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return sorted.map((t, i) => ({ targetId: t.id, n: i + 1, label: labelOf(t.id), target: t, carrier: carrierOf(t.id) }));
}
