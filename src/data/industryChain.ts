/**
 * The industry chain — content layer.
 *
 * One chain, read at two distances. Step back and it is an economy; step in
 * and it is a single unit of goods whose price is sliced at every joint. This
 * file holds WHAT is on the map. WHERE it sits is the generator's job
 * (scripts/build-chain-plate.mjs), which imports this file directly.
 *
 * Three properties hold everywhere here:
 *   - Generic across sectors. Sectors appear only as examples of a function.
 *   - The unit of analysis is the FUNCTION, not the firm.
 *   - Descriptive, not normative. Nothing here says a link should exist.
 *
 * And one rule with no exceptions: NO FIGURES. No percentages, no amounts,
 * no magnitudes, illustrative or otherwise. The map carries the anatomy of a
 * slice — what attaches at a joint and which way the cost moves — never its
 * size. A made-up number on a page with the author's name on it does more
 * damage than no number at all.
 *
 * Four categories, four forms, never mixed: transformation stages, intermediary
 * nodes (take title, transform nothing), spanning layers (take no title), and
 * physical flows back up the chain. Energy is drawn perpendicular into every
 * stage; money runs against the goods.
 */

/* ── Stages: the functions that change the goods ─────────────────────────── */

export interface Stage {
  id: string;
  label: string;
  /** Example lanes fanning into an origin stage; how the wide end gets wide. */
  lanes?: string[];
  /** The three demand components inside consumption. */
  demand?: string[];
}

export const STAGES: Stage[] = [
  {
    id: 'stage-biological',
    label: 'Biological primary production',
    lanes: ['Genetics and breeding', 'Cultivation', 'Livestock', 'Capture fisheries'],
  },
  { id: 'stage-extraction', label: 'Geological extraction', lanes: ['Fossil energy', 'Minerals and ores'] },
  { id: 'stage-processing', label: 'Primary processing' },
  { id: 'stage-packaging', label: 'Packaging manufacture' },
  { id: 'stage-manufacturing', label: 'Finished-goods manufacturing' },
  {
    id: 'stage-consumption',
    label: 'Consumption and use',
    demand: ['Households', 'Government and institutions', 'Abroad'],
  },
  { id: 'stage-recovery', label: 'Recovery' },
];

/* ── Nodes: take title, transform nothing ────────────────────────────────── */

export interface Node {
  id: string;
  label: string;
  /** A node type that nests inside itself. */
  recursion?: string;
}

export const NODES: Node[] = [
  { id: 'node-aggregation', label: 'Aggregation' },
  { id: 'node-trader', label: 'Trader / importer' },
  { id: 'node-principal', label: 'Brand owner / principal' },
  { id: 'node-distributor', label: 'Distributor', recursion: 'sub-distributor · regional agent' },
  { id: 'node-wholesaler', label: 'Wholesaler' },
];

/** Stock-holding retail formats: the wide end of the flare. */
export const RETAIL: Node[] = [
  { id: 'node-retail-general', label: 'Warung / general trade' },
  { id: 'node-retail-modern', label: 'Modern trade' },
  { id: 'node-retail-ecommerce', label: 'E-commerce, first party' },
  { id: 'node-retail-quick', label: 'Quick commerce' },
  { id: 'node-retail-horeca', label: 'Horeca' },
];

/* ── Joints: where title transfers or goods move between two functions ───── */

/**
 * Every place the chain can be read close. The curriculum mapping table
 * (src/data/chainCurriculumMap.ts) attaches modules to these ids and to no
 * others; a joint that appears there with a chain-located module becomes
 * highlightable under the unit-economics lens, and nothing else does.
 */
export const JOINT_IDS = [
  'j-production-aggregation',
  'j-extraction-processing',
  'j-aggregation-processing',
  'j-processing-trader',
  'j-trader-manufacturing',
  'j-packaging-manufacturing',
  'j-manufacturing-distribution',
  'j-distributor-wholesaler',
  'j-wholesale-retail',
  'j-retail-consumption',
  'j-consumption-recovery',
] as const;

export type JointId = (typeof JOINT_IDS)[number];

export const JOINT_LABELS: Record<JointId, string> = {
  'j-production-aggregation': 'Production → aggregation',
  'j-extraction-processing': 'Extraction → processing',
  'j-aggregation-processing': 'Aggregation → processing',
  'j-processing-trader': 'Processing → trader / importer',
  'j-trader-manufacturing': 'Trader / importer → manufacturing',
  'j-packaging-manufacturing': 'Packaging → manufacturing',
  'j-manufacturing-distribution': 'Manufacturing → distribution',
  'j-distributor-wholesaler': 'Distributor → wholesaler',
  'j-wholesale-retail': 'Wholesale → retail',
  'j-retail-consumption': 'Retail → consumption',
  'j-consumption-recovery': 'Consumption → recovery',
};

/* ── Spanning layers: the only two visible at rest ───────────────────────── */

export interface Band {
  id: string;
  label: string;
  note?: string;
}

export const BANDS: Band[] = [
  { id: 'band-logistics', label: 'Logistics and warehousing', note: 'ambient · cold chain' },
  { id: 'band-regulation', label: 'Regulation and standards' },
];

/**
 * An attribute of ONE joint, not a layer along the chain. Visible only while a
 * lens is on or the joint is highlighted; never at rest.
 */
export const JOINT_ATTRIBUTES: { joint: JointId; label: string; note: string }[] = [
  {
    joint: 'j-manufacturing-distribution',
    label: 'Principal–distributor contract governance',
    note: 'territory · exclusivity · trade terms · how an appointment ends',
  },
];

/* ── Flows against the goods ─────────────────────────────────────────────── */

export interface ReturnFlow {
  id: string;
  label: string;
  from: string;
  to: string;
}

export const RETURNS: ReturnFlow[] = [
  { id: 'return-scrap', label: 'Scrap and reject', from: 'stage-manufacturing', to: 'stage-processing' },
  { id: 'return-commercial', label: 'Commercial returns', from: 'node-retail', to: 'node-distributor' },
  { id: 'return-packaging', label: 'Reusable packaging', from: 'node-retail', to: 'stage-manufacturing' },
  { id: 'return-postconsumer', label: 'Post-consumer', from: 'stage-recovery', to: 'stage-processing' },
  { id: 'return-secondary', label: 'Secondary market and refurbishment', from: 'stage-consumption', to: 'stage-consumption' },
];

/** Leaves processing FORWARD, into another chain. Not a return. */
export const BYPRODUCT = { id: 'branch-byproduct', label: 'By-product → another chain' };

export const MONEY = { id: 'flow-money', label: 'Money — payment, against the goods' };
export const ENERGY = { id: 'flow-energy', label: 'Energy' };

/* ── Lens 1 — ECONOMY (step back) ────────────────────────────────────────── */

/**
 * Each item is anchored to a stage, node or joint. Nothing floats. The
 * generator decides which side of the anchor the label sits on; this file
 * decides only what it says.
 */
export interface EconomyItem {
  id: string;
  anchor: string;
  label: string;
  note: string;
}

export const ECONOMY_LENS: EconomyItem[] = [
  {
    id: 'econ-inflation',
    anchor: 'j-aggregation-processing',
    label: 'Inflation',
    note: 'enters at the raw end · travels right through each mark-up',
  },
  { id: 'econ-fx-cost', anchor: 'node-trader', label: 'Exchange rate', note: 'a cost, in landed inputs' },
  { id: 'econ-fx-windfall', anchor: 'stage-extraction', label: 'Exchange rate', note: 'a windfall, on exports' },
  { id: 'econ-labour', anchor: 'stage-biological', label: 'Labour', note: 'concentrated here and in the informal nodes' },
  { id: 'econ-cycle', anchor: 'j-wholesale-retail', label: 'Business cycle', note: 'runs right to left through node inventory' },
  { id: 'econ-growth', anchor: 'stage-consumption', label: 'Growth', note: 'demand components land here' },
  { id: 'econ-external-export', anchor: 'j-extraction-processing', label: 'External balance', note: 'export leaves at extraction' },
  { id: 'econ-external-import', anchor: 'j-processing-trader', label: 'External balance', note: 'import enters before manufacturing' },
  { id: 'econ-monetary', anchor: 'j-manufacturing-distribution', label: 'Monetary policy', note: 'transmits through trade credit between nodes' },
  { id: 'econ-fiscal-royalty', anchor: 'stage-extraction', label: 'Fiscal', note: 'royalty' },
  { id: 'econ-fiscal-excise', anchor: 'stage-manufacturing', label: 'Fiscal', note: 'excise · VAT at every formal transfer of title' },
  { id: 'econ-fiscal-subsidy', anchor: 'stage-biological', label: 'Fiscal', note: 'subsidy, on inputs and energy' },
  { id: 'econ-capital-goods', anchor: 'j-trader-manufacturing', label: 'Capital goods', note: 'imported into manufacturing' },
  { id: 'econ-import-share', anchor: 'j-processing-trader', label: 'Import share', note: 'of intermediate inputs' },
  { id: 'econ-energy', anchor: 'flow-energy', label: 'Energy intensity', note: 'stage by stage' },
];

/* ── Lens 2 — UNIT ECONOMICS (step in) ───────────────────────────────────── */

/**
 * One unit travels left to right and its price is sliced at every joint. The
 * slices are drawn as a build-up that follows the chain; their thickness
 * follows the hourglass — cost per unit falls to processing because of scale,
 * and rises after distribution because drops get smaller and more frequent.
 * `column` names the chain position the slice sits under.
 */
export interface Slice {
  id: string;
  column: string;
  label: string;
  note?: string;
}

export const UNIT_LENS: Slice[] = [
  { id: 'slice-production', column: 'stage-biological', label: 'Value added — production' },
  { id: 'slice-aggregation', column: 'node-aggregation', label: "Aggregator's margin", note: 'who waits for payment' },
  { id: 'slice-processing', column: 'stage-processing', label: 'Value added — processing', note: 'scale lowers cost per unit' },
  { id: 'slice-trader', column: 'node-trader', label: "Trader's margin", note: 'FX lands in cost · DIO' },
  { id: 'slice-manufacturing', column: 'stage-manufacturing', label: 'Value added — manufacturing', note: 'packaging attaches' },
  { id: 'slice-distribution', column: 'node-distributor', label: "Distributor's margin", note: 'DSO · DPO — who finances whom' },
  { id: 'slice-retail', column: 'node-retail', label: 'Cost to serve, per channel', note: 'smaller drops, more of them' },
  { id: 'slice-consumption', column: 'stage-consumption', label: 'Contribution margin' },
];

/** Logistics attaches at every movement; heaviest where drops are smallest. */
export const UNIT_LOGISTICS = { id: 'slice-logistics', label: 'Logistics cost attaches at every move' };

/* ── Copy ────────────────────────────────────────────────────────────────── */

export const CHAIN_COPY = {
  /** Verbatim. Not to be rewritten, softened or lengthened. */
  headline: 'Nothing here is complicated. It only looks that way from the wrong distance.',
  /** The two lens names are the two buttons; the sentence is the control. */
  lead: {
    before: 'One chain at two distances: step back and it is an ',
    economy: 'economy',
    middle: '; step in and it is a single unit of goods, its price sliced at every joint — its ',
    unit: 'unit economics',
    after: '.',
  },
  lensName: { economy: 'Economy', unit: 'Unit economics' } as const,
  panel: {
    heading: 'Read this joint in the curriculum',
    published: 'Published',
    comingSoon: 'Coming soon',
    close: 'Close',
    hint: 'Select a highlighted joint to see the modules that read it.',
  },
} as const;

export type LensId = 'economy' | 'unit';
