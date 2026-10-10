/**
 * The chain, as Finance in Action reads it: nothing but the chain map's own
 * data (constraint 6). Stages come from STAGES in the reading order of
 * COLUMNS; the two spanning layers from BANDS; addresses on the map from
 * SLUGS through the map's own URL contract (useChainUrl.ts).
 */
import { BANDS, COLUMNS, STAGES, slugOf } from '@/data/industryChain';
import { CHAIN_PARAM } from '@/components/industry-chain/useChainUrl';
import { SPANNING_LAYER_IDS } from './contract/validate';

export interface ChainPosition {
  id: string;
  label: string;
  kind: 'stage' | 'layer';
  /** For a layer: where it runs, in the map's own words. */
  span?: string;
}

export const CHAIN_STAGES: ChainPosition[] = [...STAGES]
  .sort((a, b) => COLUMNS.indexOf(a.id) - COLUMNS.indexOf(b.id))
  .map((s) => ({ id: s.id, label: s.label, kind: 'stage' }));

export const SPANNING_LAYERS: ChainPosition[] = SPANNING_LAYER_IDS.map((id) => {
  const band = BANDS.find((b) => b.id === id);
  if (!band) throw new Error(`The chain map has no layer ${id}`);
  return { id: band.id, label: band.label, kind: 'layer', span: band.spanLabel };
});

export const CHAIN_POSITIONS: ChainPosition[] = [...CHAIN_STAGES, ...SPANNING_LAYERS];

export const positionOf = (id: string): ChainPosition | undefined => CHAIN_POSITIONS.find((p) => p.id === id);

/**
 * The element on the chain map, read at the finance distance. The map lives
 * on the homepage since About was removed (owner decision, 2026-10-10); an
 * address that names an element the overview folds away opens the detail.
 */
export function chainMapHref(positionId?: string): string {
  const params = new URLSearchParams();
  params.set(CHAIN_PARAM.lens, 'finance');
  if (positionId) params.set(CHAIN_PARAM.node, slugOf(positionId));
  return `/?${params.toString()}`;
}

/** The index anchor of a chain position, and of a sub-industry. */
export const positionAnchor = (id: string): string => id;
export const subIndustryAnchor = (code: string): string => `sub-${code}`;
