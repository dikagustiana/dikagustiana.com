/**
 * The chain, as Finance in Action reads it: nothing but the chain map's own
 * data (constraint 6). Stages come from STAGES in the reading order of
 * COLUMNS; the distribution and retail nodes from NODES and RETAIL, in the
 * same order; the two spanning layers from BANDS; addresses on the map from
 * SLUGS through the map's own URL contract (useChainUrl.ts).
 */
import { BANDS, COLUMNS, NODES, RETAIL, RETAIL_GROUP, STAGES, slugOf } from '@/data/industryChain';
import { CHAIN_PARAM } from '@/components/industry-chain/useChainUrl';
import { CHAIN_NODE_IDS, SPANNING_LAYER_IDS } from './contract/validate';

export interface ChainPosition {
  id: string;
  label: string;
  kind: 'stage' | 'node' | 'layer';
  /** For a layer: where it runs, in the map's own words. */
  span?: string;
  /** For a node: the group the index draws it in. */
  group?: { id: string; label: string };
}

/** The index's group for the distribution and retail nodes, between manufacturing and consumption. */
export const DISTRIBUTION_GROUP = { id: 'group-distribution-retail', label: 'Distribution and retail' } as const;

/** A position's column on the chain map; a retail format reads at its group's column. */
const columnOf = (id: string): number =>
  COLUMNS.indexOf(RETAIL.some((r) => r.id === id) ? RETAIL_GROUP.id : id);

export const CHAIN_STAGES: ChainPosition[] = [...STAGES]
  .sort((a, b) => COLUMNS.indexOf(a.id) - COLUMNS.indexOf(b.id))
  .map((s) => ({ id: s.id, label: s.label, kind: 'stage' }));

export const CHAIN_NODES: ChainPosition[] = CHAIN_NODE_IDS.map((id) => {
  const node = [...NODES, ...RETAIL].find((n) => n.id === id);
  if (!node) throw new Error(`The chain map has no node ${id}`);
  return { id: node.id, label: node.label, kind: 'node', group: { ...DISTRIBUTION_GROUP } };
});

export const SPANNING_LAYERS: ChainPosition[] = SPANNING_LAYER_IDS.map((id) => {
  const band = BANDS.find((b) => b.id === id);
  if (!band) throw new Error(`The chain map has no layer ${id}`);
  return { id: band.id, label: band.label, kind: 'layer', span: band.spanLabel };
});

/** The stages and the nodes, in the map's reading order. */
export const ALONG_THE_CHAIN: ChainPosition[] = [...CHAIN_STAGES, ...CHAIN_NODES].sort((a, b) => columnOf(a.id) - columnOf(b.id));

export const CHAIN_POSITIONS: ChainPosition[] = [...ALONG_THE_CHAIN, ...SPANNING_LAYERS];

export const positionOf = (id: string): ChainPosition | undefined => CHAIN_POSITIONS.find((p) => p.id === id);

/**
 * The element on the chain map, read at the finance distance. The map lives
 * on the homepage since About was removed (owner decision, 2026-10-10). A
 * spanning layer is a door, so its reading opens. A stage is not a door
 * unless an overlay marks it, and this address names no overlay, so the map
 * drops the stage (ChainPlate's canOpen) and opens at the finance distance
 * with nothing selected, as it did on About.
 */
export function chainMapHref(positionId?: string): string {
  const params = new URLSearchParams();
  params.set(CHAIN_PARAM.lens, 'finance');
  if (positionId) params.set(CHAIN_PARAM.node, slugOf(positionId));
  return `/?${params.toString()}`;
}

/**
 * The index anchor of a chain position, and of a sub-industry. Chain view
 * (PROMPT-site §3.1): a stage's section is `stage-<stage id>`, a spanning
 * layer's `band-<band id>` and a node's `node-<node id>`, so
 * `#stage-stage-extraction`, `#band-band-energy` and
 * `#node-node-distributor`. Chosen once, here; the index, its stage pills,
 * the breadcrumbs and the homepage chain map all read it through this helper.
 */
export const positionAnchor = (id: string): string => {
  const kind = positionOf(id)?.kind;
  return kind === 'layer' ? `band-${id}` : kind === 'node' ? `node-${id}` : `stage-${id}`;
};
export const subIndustryAnchor = (code: string): string => `sub-${code}`;
