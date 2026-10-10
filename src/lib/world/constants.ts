/**
 * The world's lists, each written once (mega prompt rule 12): places and
 * their keys, layers and the bands they come from, overlays and the shifts
 * they come from, the status vocabulary, the routes.
 */
import type { LayerName, OverlayName, ViewName } from '@/world/engine/types';
import type { ShiftId } from '@/data/industryChain';
import type { Goods } from '@/lib/world/registry/types';

/** What a link carries (PRD v2 Appendix A): the registry's list, read here by the shell. */
export { GOODS, type Goods } from '@/lib/world/registry/types';
/** The six stories (PRD v2 §3.10, Appendix B), the owner's, from docs/world/sources/stories.tsv. */
export { STORIES, storyById } from '@/lib/world/registry/stories.generated';

/** How a card names a link's goods class next to a supplier or a customer (PRD v2 §3.11). */
export const GOODS_WORD: Record<Goods, string> = {
  bulk: 'bulk', liquid: 'liquid', cold: 'chilled', boxed: 'boxed', parcel: 'parcels', people: 'people', none: 'no goods: money or information',
};

/** The place buttons (PRD v2 §3.1): Whole is the map; the hero, the home view, is H and the distance control's 0. */
export const PLACES: readonly { view: ViewName; label: string; key: string }[] = [
  { view: 'ring', label: 'Ring', key: '1' },
  { view: 'estate', label: 'Estate', key: '2' },
  { view: 'gateway', label: 'Gateway', key: '3' },
  { view: 'town', label: 'Town', key: '4' },
  { view: 'thinktank', label: 'Hill', key: '5' },
  { view: 'whole', label: 'Whole', key: '0' },
];
/** The home view's key (PRD v2 §3.1). */
export const HERO_KEY = 'H';

/** The enabling layers as layer toggles, each the band it comes from in src/data/industryChain.ts. */
export const LAYERS: readonly { layer: LayerName; bandId: string; label: string }[] = [
  { layer: 'logistics', bandId: 'band-logistics', label: 'Logistics' },
  { layer: 'cold-chain', bandId: 'band-cold-chain', label: 'Cold chain' },
  { layer: 'credit', bandId: 'band-credit', label: 'Credit' },
  { layer: 'energy', bandId: 'band-energy', label: 'Energy' },
  { layer: 'governance', bandId: 'band-governance', label: 'Contract governance' },
  { layer: 'regulation', bandId: 'band-regulation', label: 'Regulation' },
];
/** The asset-finance band rides with the credit layer as its second strand (gate 0, item Q). */
export const CAPITAL_BAND_LAYER: LayerName = 'credit';
/** The layers a visitor finds on: logistics, the rest off. */
export const DEFAULT_LAYERS: Readonly<Record<LayerName, boolean>> = { logistics: true, 'cold-chain': false, credit: false, energy: false, governance: false, regulation: false };

export const OVERLAYS: readonly { overlay: OverlayName; shift: ShiftId | null; label: string }[] = [
  { overlay: 'none', shift: null, label: 'No shift' },
  { overlay: 'reindustrialisation', shift: 'reindustrialisation', label: 'Reindustrialisation' },
  { overlay: 'green-transition', shift: 'green', label: 'Green transition' },
];

/** Status vocabulary (PRD Appendix C): glyph and word always together. */
export const STATUS_VOCAB = {
  published: { glyph: '■', word: 'Published' },
  none: { glyph: '□', word: 'No model yet' },
  'no-issuer': { glyph: '⬚', word: 'No listed issuer' },
  unavailable: { glyph: '⊟', word: 'Status unavailable' },
  measured: { glyph: '—', word: 'Measured' },
  expected: { glyph: '- -', word: 'Expected, not measured' },
  thesis: { glyph: '▢', word: 'Thesis' },
  'model-based': { glyph: '▣', word: 'Model-based' },
} as const;

export const WORLD_PATH = '/finance/kawasan';
export const boardPath = (ticker: string): string => `${WORLD_PATH}/${ticker.toLowerCase()}`;
export const TOTAL_PLACED = 125;
export const TITLE = 'The industry chain';
/** The coverage line beside the frame's title: what the published index says, or that it is being read. */
export const coverageLine = (state: 'loading' | 'ok' | 'outage', covered: number): string =>
  state === 'loading' ? 'Reading the published models…' : state === 'outage' ? 'Model status unavailable' : `${covered} of ${TOTAL_PLACED} sub-industries have a published model`;
/** The one line above the schematic when the reader's system asks for reduced motion. */
export const REDUCED_NOTE = 'A living version of this map exists; it is not shown while your system asks for reduced motion.';
export const CANVAS_DESCRIPTION = 'An isometric industrial estate, live. Primary resources ring it, processing and manufacturing stand in the estate at the centre, a gateway with a port leads east to a town of distributors, shops, services and banks, and a think tank stands on the hill. Every company is a building of its own with its ticker on a sign; marks on the kerb say which sub-industries have a published model. Drag to pan, scroll or pinch to zoom, point at anything for its name, click it for its card. Keys: H returns to the opening view, 1 to 5 jump to the ring, estate, gateway, town and hill, 0 shows the whole map, [ and ] step through the companies, Shift with [ and ] through the sub-industries, Enter opens the card, Escape closes it, + and − zoom, the arrows pan, S lights the stories in turn, F follows a selected vehicle; while following, Space moves on from a stop and Escape lets go.';

/** The full board's eight sections, in the PRD's order (PRD Appendix B). */
export const SECTION_ORDER = ['Header', 'Main drivers', 'Unit economics', 'Performance vs peer', 'What the model contains', 'Limits of the filing', 'Chain', 'Related analyses'] as const;
export const NO_MODEL = 'No model yet';
export const TREE_UNAVAILABLE = 'Driver tree not available for this model';

/** Where a region's mark takes the camera (the strip's click on a stage or node mark). */
export const REGION_VIEW: Record<string, ViewName> = { 'ring-geological': 'ring', 'ring-biological': 'ring', estate: 'estate', gateway: 'gateway', town: 'town', recovery: 'town', hill: 'thinktank' };

/**
 * The energy mark's drill-down, v0 (discovery item D): the schematic has no
 * electricity chain to open, so the card lists the energy band's own three
 * lines and links to the two Capital in Motion conditions on PLN, by number.
 */
export const ENERGY_DRILLDOWN = { bandId: 'band-energy', layer: 'energy' as LayerName, conditions: [12, 17] as const, label: 'Drill-down v0: opens in Capital in Motion' };
