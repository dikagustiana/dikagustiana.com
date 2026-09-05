/**
 * The industry chain — content layer.
 *
 * One chain, read at two distances. Step back and it is an economy; step in
 * and it is a single unit of goods whose price is sliced at every joint. This
 * file holds WHAT is on the map. WHERE it sits is the generator's job
 * (scripts/build-chain-plate.mjs) for the two wide-screen plates, and the
 * column's job (src/components/industry-chain/ChainColumn.tsx) for a narrow
 * screen. Both read this file and nothing else; the short version on the
 * landing page is a VIEW over the same records (COMPACT, at the bottom), never
 * a second copy of them.
 *
 * Three properties hold everywhere here:
 *   - Generic across sectors. Sectors appear only as examples of a function.
 *   - The unit of analysis is the FUNCTION, not the firm.
 *   - Descriptive, not normative. Nothing here says a link should exist, and
 *     nothing here claims a shape: a geological chain funnels, a biological
 *     chain fragments, and the map draws neither.
 *
 * And one rule with no exceptions: NO FIGURES. No percentages, no amounts,
 * no magnitudes, illustrative or otherwise. The map carries the anatomy of a
 * slice — what attaches at a joint, which way the cost moves, which line of
 * the financial statements carries it — never its size. The one number that
 * appears is the standard's own name, PSAK 72, and the test allows exactly
 * that token.
 *
 * Four categories, four forms, never mixed:
 *   transformation stage   changes the form of the goods; conversion margin
 *   intermediary node      takes title, transforms nothing; revenue gross; spread
 *   enabling layer         takes no title; revenue net; a fee on capacity
 *   physical return        goods moving back up the chain
 * plus two non-physical flows, money and information, each running both ways.
 * Node or layer is the PSAK 72 principal–agent test: whoever controls the
 * goods books the sale gross; whoever only serves them books the fee, net.
 */

/* ── Stages: the functions that change the goods ─────────────────────────── */

export interface Stage {
  id: string;
  label: string;
  /** Example lanes fanning into an origin stage. */
  lanes?: string[];
  /** The three demand components inside consumption. */
  demand?: string[];
  /** True for the two origins; drawn with a small marker, never a different fill. */
  origin?: boolean;
}

export const STAGES: Stage[] = [
  {
    id: 'stage-biological',
    label: 'Biological primary production',
    lanes: ['Genetics and breeding', 'Cultivation', 'Livestock', 'Capture fisheries'],
    origin: true,
  },
  { id: 'stage-extraction', label: 'Geological extraction', lanes: ['Fossil energy', 'Minerals and ores'], origin: true },
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

/** Stock-holding retail formats. Drawn as one group of pills. */
export const RETAIL: Node[] = [
  { id: 'node-retail-general', label: 'Warung / general trade' },
  { id: 'node-retail-modern', label: 'Modern trade' },
  { id: 'node-retail-ecommerce', label: 'E-commerce, first party' },
  { id: 'node-retail-quick', label: 'Quick commerce' },
  { id: 'node-retail-horeca', label: 'Horeca' },
];

/** The retail formats as one column, where a flow, a slice or a span reads them together. */
export const RETAIL_GROUP = { id: 'node-retail', label: 'Retail' } as const;

/**
 * The columns of the chain in reading order. A span, a slice and a joint all
 * refer to these ids; the retail formats collapse into RETAIL_GROUP here.
 */
export const COLUMNS: string[] = [
  'stage-biological',
  'stage-extraction',
  'node-aggregation',
  'stage-processing',
  'node-trader',
  'stage-packaging',
  'stage-manufacturing',
  'node-principal',
  'node-distributor',
  'node-wholesaler',
  RETAIL_GROUP.id,
  'stage-consumption',
  'stage-recovery',
];

/* ── Margin kinds: the three answers to "what is cut here" ───────────────── */

export type MarginKind = 'conversion' | 'node-spread' | 'service-fee';

export interface MarginKindInfo {
  id: MarginKind;
  label: string;
  /** The word on the small marker. */
  chip: string;
  /** One sentence: what the margin is earned on. */
  means: string;
  /** The control test that puts a function in this class. */
  test: string;
  /** The lines of the financial statements that carry it, in general. */
  lines: string[];
}

export const MARGIN_KINDS: Record<MarginKind, MarginKindInfo> = {
  conversion: {
    id: 'conversion',
    label: 'Conversion margin',
    chip: 'Conversion',
    means:
      'Value added by changing the form of the goods. It is earned on yield, processing cost and capacity — on what the plant does, not on what it holds.',
    test: 'Owns the goods and transforms them: revenue is gross, and the margin is the gap between the price of what leaves and the cost of what came in.',
    lines: [
      'Gross profit per stage — revenue less cost of sales',
      'Conversion cost — direct labour and factory overhead, inside cost of sales',
      'Yield and scrap, inside cost of sales; capacity, in the fixed overhead each unit absorbs',
    ],
  },
  'node-spread': {
    id: 'node-spread',
    label: 'Node spread',
    chip: 'Spread',
    means:
      'The gap between buying price and selling price, plus the reward for carrying credit, stock and reach. Title passes; the form does not change.',
    test: 'PSAK 72 principal: the node controls the goods before it transfers them, so it books revenue gross — the whole sale, not a fee. An intermediary that fails the control test is an agent: its spread is a commission, and it belongs among the layers.',
    lines: [
      'Revenue, gross — the whole sale, with cost of sales beneath it',
      'Gross profit as a trade margin — purchase cost net of supplier rebates',
      'DSO · DIO · DPO — receivables, inventory and payables days: the cash conversion cycle, and who finances whom',
    ],
  },
  'service-fee': {
    id: 'service-fee',
    label: 'Service fee',
    chip: 'Fee',
    means:
      'Net revenue on capacity — a truck, a warehouse, a credit line, a machine hour — never on the goods themselves.',
    test: 'The layer never controls the goods, so their value never passes through its revenue: it books the fee for its own service, and under PSAK 72 it is the principal for that service. The PSAK 72 agent proper is the intermediary that fails the control test — a commission marketplace — whose spread is a fee for the same reason. On the other side of the same line, the user of the layer books an expense.',
    lines: [
      'Service revenue, net — at the provider',
      'Freight, rent, tolling or finance cost — at the user, in operating expense or finance cost',
    ],
  },
};

/* ── Joints: where title transfers or goods move between two functions ───── */

/**
 * Every place the chain can be read close. Each joint carries the slice cut
 * at that transfer — the margin of the function that SELLS there — and names
 * the lines of the financial statements where that slice shows. The
 * curriculum mapping table (src/data/chainCurriculumMap.ts) attaches modules
 * to these ids and to no others.
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

export interface Joint {
  id: JointId;
  label: string;
  from: string;
  to: string;
  /** The kind of margin cut at this transfer. */
  margin: MarginKind;
  /** Whose slice it is, and what is particular about this joint. */
  note: string;
  /** The lines of the financial statements that carry THIS joint's slice. */
  lines: string[];
  /** The other reading, where title sits with someone else at the same joint. */
  alt?: { margin: MarginKind; when: string };
}

export const JOINTS: Joint[] = [
  {
    id: 'j-production-aggregation',
    label: 'Production → aggregation',
    from: 'stage-biological',
    to: 'node-aggregation',
    margin: 'conversion',
    note: "The producer's value added is cut here — what the crop, the herd or the catch fetches at the gate.",
    lines: [
      'Gross profit — production',
      'Advances from the aggregator, or receivables from it: the first credit on the chain, running either way',
    ],
  },
  {
    id: 'j-extraction-processing',
    label: 'Extraction → processing',
    from: 'stage-extraction',
    to: 'stage-processing',
    margin: 'conversion',
    note: "Extraction's value added is cut here. The export line crosses the chain at this joint, so part of the flow leaves before it is processed.",
    lines: ['Gross profit — extraction', 'Royalties, inside cost of sales'],
  },
  {
    id: 'j-aggregation-processing',
    label: 'Aggregation → processing',
    from: 'node-aggregation',
    to: 'stage-processing',
    margin: 'node-spread',
    note: "The aggregator's spread: it bought in small lots, sells in one, and waited for its money in between.",
    lines: [
      'Revenue, gross — the aggregator sells the goods, not a service',
      'Gross profit as a trade margin',
      'DSO · DPO — the aggregator pays the producer before the processor pays it',
    ],
  },
  {
    id: 'j-processing-trader',
    label: 'Processing → trader / importer',
    from: 'stage-processing',
    to: 'node-trader',
    margin: 'conversion',
    note: "Processing's value added — where a fixed plant cost is spread over volume — is cut here, and the by-product leaves for another chain.",
    lines: [
      'Gross profit — processing',
      'Yield: the by-product credit inside cost of sales',
      'Tolling fee, where a contract processor did the work',
    ],
  },
  {
    id: 'j-trader-manufacturing',
    label: 'Trader / importer → manufacturing',
    from: 'node-trader',
    to: 'stage-manufacturing',
    margin: 'node-spread',
    note: "The trader's spread. The import line crosses here, so the exchange rate lands in the buy price.",
    lines: [
      'Revenue, gross, with landed cost beneath it — freight, duty and exchange rate inside cost of sales',
      'DIO — inventory carried against a lead time',
      'Import finance and letters of credit, in finance cost',
    ],
  },
  {
    id: 'j-packaging-manufacturing',
    label: 'Packaging → manufacturing',
    from: 'stage-packaging',
    to: 'stage-manufacturing',
    margin: 'conversion',
    note: "Packaging's value added is cut here and attaches to the unit as a component cost.",
    lines: ['Gross profit — packaging', "Component cost, inside the finished good's bill of materials"],
  },
  {
    id: 'j-manufacturing-distribution',
    label: 'Manufacturing → distribution',
    from: 'stage-manufacturing',
    to: 'node-distributor',
    margin: 'conversion',
    note: "Manufacturing's value added is cut here — and this is the joint where trade credit is extended, so the working-capital modules read it.",
    lines: [
      'Gross profit — manufacturing',
      'Trade receivables · DSO — the credit the maker gives the distributor',
      "Trade promotion and rebates — consideration payable to a customer, netted from the seller's revenue",
    ],
    alt: {
      margin: 'node-spread',
      when: 'where the brand owner sells goods a toller made for it: the principal books the sale gross and holds the inventory, and the plant behind it earns a tolling fee in the contract-capacity layer',
    },
  },
  {
    id: 'j-distributor-wholesaler',
    label: 'Distributor → wholesaler',
    from: 'node-distributor',
    to: 'node-wholesaler',
    margin: 'node-spread',
    note: "The distributor's spread — for reach, stock and the credit it carries on both sides.",
    lines: [
      'Revenue, gross',
      "Gross profit as a trade margin, after the principal's rebates",
      'DSO · DIO · DPO — who finances whom',
    ],
  },
  {
    id: 'j-wholesale-retail',
    label: 'Wholesale → retail',
    from: 'node-wholesaler',
    to: 'node-retail',
    margin: 'node-spread',
    note: "The wholesaler's spread, cut into ever smaller drops — the cost to serve rises as the drops shrink.",
    lines: ['Revenue, gross', 'Gross profit as a trade margin, with cost to serve beneath it', 'DSO · DIO · DPO — who finances whom'],
  },
  {
    id: 'j-retail-consumption',
    label: 'Retail → consumption',
    from: 'node-retail',
    to: 'stage-consumption',
    margin: 'node-spread',
    note: "Retail's spread: the shelf margin, which differs by channel. The consumer pays at once, so the chain behind the shelf finances the retailer.",
    lines: [
      'Revenue, gross — or a commission, net, where a marketplace never takes title',
      'Gross profit per channel, with shrink and cost to serve beneath it',
      'DIO and DPO — stock on the shelf, financed by suppliers; trade promotion income from the principal',
    ],
  },
  {
    id: 'j-consumption-recovery',
    label: 'Consumption → recovery',
    from: 'stage-consumption',
    to: 'stage-recovery',
    margin: 'service-fee',
    note: 'Where what is discarded has no value, recovery is paid to take it — a collection or gate fee from the party discarding it — so money runs with the goods here. Its conversion margin comes later, when recyclate or compost is sold on the return flows.',
    lines: [
      'Collection and gate fee revenue — at recovery; disposal cost — at the discarding party',
      'Recovered-material revenue, later, on the return flows',
    ],
    alt: {
      margin: 'conversion',
      when: 'where what is discarded still has value: recovery buys it, money runs against the goods as at every other joint, and the slice is the conversion margin on what recovery sells back up the return flows',
    },
  },
];

export const JOINT_LABELS = Object.fromEntries(JOINTS.map((j) => [j.id, j.label])) as Record<JointId, string>;
export const JOINT_BY_ID = Object.fromEntries(JOINTS.map((j) => [j.id, j])) as Record<JointId, Joint>;

/* ── Spanning layers: take no title, earn a fee or set the terms ─────────── */

export interface Band {
  id: string;
  label: string;
  note?: string;
  /** First and last column the band runs under, by id (COLUMNS order). */
  span: [string, string];
  /** The span in words, for a screen that cannot draw it. */
  spanLabel: string;
  /** The margin kind of a layer that earns a fee. Absent where the layer earns nothing itself. */
  margin?: MarginKind;
  /** The word on the marker for a layer with no margin of its own. */
  chip?: string;
  means: string;
  lines: string[];
}

export const BANDS: Band[] = [
  {
    id: 'band-logistics',
    label: 'Logistics and warehousing',
    note: 'ambient · cold chain',
    span: ['stage-biological', 'stage-recovery'],
    spanLabel: 'The whole chain',
    margin: 'service-fee',
    means: 'Moves and holds the goods without ever owning them. Attaches at every move, and weighs most where the drops are smallest.',
    lines: [
      'Freight and warehousing revenue, net — at the provider',
      'Freight-out, warehouse rent and handling — at the user, inside cost to serve',
      'Right-of-use assets and lease liabilities, where the warehouse is leased',
    ],
  },
  {
    id: 'band-credit',
    label: 'Credit and working capital',
    note: 'trade credit · inventory finance · who waits for payment',
    span: ['stage-biological', 'stage-recovery'],
    spanLabel: 'The whole chain',
    margin: 'service-fee',
    means:
      'Finances the gap between paying for the goods and being paid for them. A lender earns the fee for the line; when the chain finances itself, the credit is a position on the balance sheet, not a payment. It decides who can afford to be a node, and it is the channel through which monetary policy reaches the chain.',
    lines: [
      'Finance income and finance cost — the price of waiting',
      'Trade receivables and trade payables — read as DSO and DPO, together with DIO the cash conversion cycle',
      'Advances to suppliers at the raw end; trade credit downstream; cash at the shelf',
      'Early-payment discounts as variable consideration; derecognition of receivables on factoring',
    ],
  },
  {
    id: 'band-contract-capacity',
    label: 'Contract capacity',
    note: 'makloon · toll manufacturing',
    span: ['stage-processing', 'stage-manufacturing'],
    spanLabel: 'Primary processing → finished-goods manufacturing',
    margin: 'service-fee',
    means: "A plant that converts someone else's material for a fee. The owner of the material keeps title; the toller sells machine hours.",
    lines: [
      'Tolling fee revenue, net — at the toller; the material never enters its inventory',
      'Conversion cost purchased — at the owner, inside cost of sales; the work in progress stays on its balance sheet',
      'Capacity utilisation — the toller lives in the fixed cost it absorbs',
    ],
  },
  {
    id: 'band-governance',
    label: 'Principal–distributor contract governance',
    note: 'territory · exclusivity · trade terms · how an appointment ends',
    span: ['stage-manufacturing', RETAIL_GROUP.id],
    spanLabel: 'Manufacturing → retail',
    chip: 'Terms',
    means: 'The contract that sets the spreads either side of it: who may sell where, on what terms, and what happens when the appointment ends. It earns nothing itself; it decides who earns.',
    lines: [
      "Rebates, trade promotion and listing fees — consideration payable to a customer, netted from the principal's revenue",
      'Variable consideration — targets and returns that leave the price uncertain until the period closes',
      'Sales returns — a refund liability, and an asset for the goods expected back',
    ],
  },
  {
    id: 'band-regulation',
    label: 'Regulation and standards',
    span: ['stage-biological', 'stage-recovery'],
    spanLabel: 'The whole chain',
    chip: 'Rules',
    means: 'Sets what may be sold, moved and claimed. It takes no title and earns no fee; its cost lands in every function it touches.',
    lines: [
      'Compliance cost — certification, testing and licensing, inside operating expense',
      'Excise, once, on release by the manufacturer or importer; VAT at each formal transfer of title — both collected, never earned; the fiscal reading in the economy lens',
    ],
  },
];

export const BAND_BY_ID = Object.fromEntries(BANDS.map((b) => [b.id, b])) as Record<string, Band>;

/** The column a joint end belongs to: a retail format reads as the retail column. */
const columnOf = (id: string) => (RETAIL.some((r) => r.id === id) ? RETAIL_GROUP.id : id);

/** The joints a band rides on: those whose both ends lie inside the band's span. */
export function bandJoints(band: Band): JointId[] {
  const lo = COLUMNS.indexOf(band.span[0]);
  const hi = COLUMNS.indexOf(band.span[1]);
  const inside = (id: string) => {
    const i = COLUMNS.indexOf(columnOf(id));
    return i >= lo && i <= hi;
  };
  return JOINTS.filter((j) => inside(j.from) && inside(j.to)).map((j) => j.id);
}

/** The layers that ride on one joint, in band order. */
export function jointLayers(joint: JointId): Band[] {
  return BANDS.filter((b) => bandJoints(b).includes(joint));
}

/* ── Borders: where the chain crosses the external sector ────────────────── */

export interface Border {
  id: string;
  label: string;
  /** The joint the line cuts through. */
  at: JointId;
  direction: 'out' | 'in';
  note: string;
}

export const BORDERS: Border[] = [
  {
    id: 'border-export',
    label: 'Export',
    at: 'j-extraction-processing',
    direction: 'out',
    note: 'raw goods leave the chain here, before processing; finished goods leave through the demand component abroad',
  },
  {
    id: 'border-import',
    label: 'Import',
    at: 'j-trader-manufacturing',
    direction: 'in',
    note: 'goods enter the chain here, landed by the trader, before manufacturing',
  },
];

/* ── Flows against the goods ─────────────────────────────────────────────── */

export interface ReturnFlow {
  id: string;
  label: string;
  from: string;
  to: string;
  note?: string;
}

export const RETURNS: ReturnFlow[] = [
  { id: 'return-scrap', label: 'Scrap and reject', from: 'stage-manufacturing', to: 'stage-processing' },
  { id: 'return-commercial', label: 'Commercial returns', from: 'node-retail', to: 'node-distributor' },
  { id: 'return-packaging', label: 'Reusable packaging', from: 'node-retail', to: 'stage-manufacturing' },
  {
    id: 'return-postconsumer-material',
    label: 'Post-consumer material',
    from: 'stage-recovery',
    to: 'stage-processing',
    note: 'recyclate re-enters as an industrial input',
  },
  {
    id: 'return-postconsumer-organic',
    label: 'Post-consumer organic',
    from: 'stage-recovery',
    to: 'stage-biological',
    note: 'compost re-enters as a farm input',
  },
  {
    id: 'return-secondary',
    label: 'Secondary market and refurbishment',
    from: 'stage-consumption',
    to: 'stage-consumption',
  },
];

/** Leaves processing FORWARD, into another chain. Not a return. */
export const BYPRODUCT = { id: 'branch-byproduct', label: 'By-product → another chain' };

export const ENERGY = { id: 'flow-energy', label: 'Energy', note: 'enters every stage from the side' };

/* ── Non-physical flows: money and information, each both ways ───────────── */

export type FlowKind = 'money' | 'information';
export type FlowDirection = 'upstream' | 'downstream';

export interface NonPhysicalFlow {
  id: string;
  kind: FlowKind;
  /** Upstream runs against the goods (right to left); downstream runs with them. */
  direction: FlowDirection;
  label: string;
  note: string;
}

export const NON_PHYSICAL: NonPhysicalFlow[] = [
  {
    id: 'flow-money-payment',
    kind: 'money',
    direction: 'upstream',
    label: 'Payment for the goods',
    note: 'money against the goods, at every transfer of title — except where recovery is paid to take what has no value',
  },
  {
    id: 'flow-money-credit',
    kind: 'money',
    direction: 'downstream',
    label: 'Trade credit · trade promotion · rebates',
    note: 'money with the goods. Credit is a position — a receivable that waits; promotion and rebates are payments that reduce the seller’s revenue. Together they decide who can afford to be a node',
  },
  {
    id: 'flow-info-demand',
    kind: 'information',
    direction: 'upstream',
    label: 'Demand signal',
    note: 'orders, sell-out and stock on hand, told back up the chain',
  },
  {
    id: 'flow-info-spec',
    kind: 'information',
    direction: 'downstream',
    label: 'Specifications and standards',
    note: 'what the goods must be, told forward',
  },
];

export const FLOW_KIND_LABELS: Record<FlowKind, string> = { money: 'Money', information: 'Information' };

/* ── Legend: the forms, told in words ────────────────────────────────────── */

export type LegendSwatch = 'stage' | 'node' | 'layer' | 'return' | 'money' | 'information' | 'border' | 'joint';

export interface LegendItem {
  id: LegendSwatch;
  label: string;
  note: string;
}

export const LEGEND: LegendItem[] = [
  { id: 'stage', label: 'Transformation stage', note: 'changes the form of the goods · conversion margin' },
  { id: 'node', label: 'Intermediary node', note: 'takes title, transforms nothing · revenue gross · spread' },
  { id: 'layer', label: 'Enabling layer', note: 'takes no title · revenue net · a fee, or the terms' },
  { id: 'return', label: 'Physical return', note: 'goods moving back up the chain' },
  { id: 'money', label: 'Money', note: 'payment against the goods; credit and promotion with them' },
  { id: 'information', label: 'Information', note: 'demand told back; specification told forward' },
  { id: 'border', label: 'Border', note: 'where the chain crosses the external sector' },
  { id: 'joint', label: 'Joint', note: 'a transfer of title — select it to read the margin cut there' },
];

export const LEGEND_NOTE =
  'Node or layer is the PSAK 72 principal–agent test: whoever controls the goods books the sale gross; whoever only serves them books the fee, net.';

/* ── Lens 1 — ECONOMY (step back) ────────────────────────────────────────── */

/**
 * Each item is anchored to a stage, node or joint. Nothing floats. The
 * layout decides which side of the anchor the label sits on; this file
 * decides only what it says. The two external-balance readings sit on the
 * same joints as the two border lines, so the lens and the base never
 * disagree about where the border is.
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
  { id: 'econ-external-import', anchor: 'j-trader-manufacturing', label: 'External balance', note: 'import enters before manufacturing' },
  { id: 'econ-monetary', anchor: 'j-manufacturing-distribution', label: 'Monetary policy', note: 'transmits through trade credit between nodes' },
  { id: 'econ-fiscal-royalty', anchor: 'stage-extraction', label: 'Fiscal', note: 'royalty' },
  { id: 'econ-fiscal-excise', anchor: 'stage-manufacturing', label: 'Fiscal', note: 'excise · VAT at every formal transfer of title' },
  { id: 'econ-fiscal-subsidy', anchor: 'stage-biological', label: 'Fiscal', note: 'subsidy, on inputs and energy' },
  { id: 'econ-capital-goods', anchor: 'j-trader-manufacturing', label: 'Capital goods', note: 'imported into manufacturing' },
  { id: 'econ-import-share', anchor: 'j-trader-manufacturing', label: 'Import share', note: 'of intermediate inputs' },
  { id: 'econ-energy', anchor: 'flow-energy', label: 'Energy intensity', note: 'stage by stage' },
];

/* ── Lens 2 — UNIT ECONOMICS (step in) ───────────────────────────────────── */

/**
 * One unit travels left to right and its price is sliced at every joint. The
 * slices are drawn as a build-up that follows the chain, one block per column
 * and all of one thickness: a thicker block would be a figure, and the map
 * carries none. `column` names the chain position the slice sits under.
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
  { id: 'slice-processing', column: 'stage-processing', label: 'Value added — processing', note: 'fixed plant cost spread over volume' },
  { id: 'slice-trader', column: 'node-trader', label: "Trader's margin", note: 'FX lands in cost · DIO' },
  { id: 'slice-manufacturing', column: 'stage-manufacturing', label: 'Value added — manufacturing', note: 'packaging attaches' },
  { id: 'slice-distribution', column: 'node-distributor', label: "Distributor's margin", note: 'DSO · DPO — who finances whom' },
  { id: 'slice-retail', column: 'node-retail', label: 'Cost to serve, per channel', note: 'smaller drops, more of them' },
  { id: 'slice-consumption', column: 'stage-consumption', label: 'Contribution margin' },
];

/** Logistics attaches at every movement; heaviest where drops are smallest. */
export const UNIT_LOGISTICS = { id: 'slice-logistics', label: 'Logistics cost attaches at every move' };

/* ── The short version: a view over the same records ─────────────────────── */

export type CompactStep =
  | { kind: 'stages'; ids: string[] }
  | {
      kind: 'group';
      id: string;
      label: string;
      members: string[];
      /** Which of the upstream stages feed this group; the rest bypass it. */
      from?: string[];
    };

/**
 * Six transformation stages, three node groups, two layers, one return arrow.
 * Readable in three seconds; every label is a record above. Packaging, the
 * trader and the principal are omitted here — the full plate has them.
 */
export const COMPACT = {
  sequence: [
    { kind: 'stages', ids: ['stage-biological', 'stage-extraction'] },
    { kind: 'group', id: 'group-aggregation', label: 'Aggregator', members: ['node-aggregation'], from: ['stage-biological'] },
    { kind: 'stages', ids: ['stage-processing'] },
    { kind: 'stages', ids: ['stage-manufacturing'] },
    { kind: 'group', id: 'group-distribution', label: 'Distribution / wholesale', members: ['node-distributor', 'node-wholesaler'] },
    { kind: 'group', id: 'group-retail', label: RETAIL_GROUP.label, members: RETAIL.map((r) => r.id) },
    { kind: 'stages', ids: ['stage-consumption'] },
    { kind: 'stages', ids: ['stage-recovery'] },
  ] as CompactStep[],
  bands: ['band-logistics', 'band-credit'],
  /** One arrow, no detail: goods come back. */
  returnArrow: { id: 'compact-return', label: 'Returns', from: 'stage-recovery', to: 'stage-processing' },
} as const;

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
  /** Title and description for each drawing; the title names it, the description walks it. */
  aria: {
    wide: {
      title: 'The industry chain, in full',
      desc: 'Left to right: two origins, primary processing, packaging and finished-goods manufacturing, then distribution, wholesale and retail into consumption and recovery. Intermediary nodes are dashed pills between the stages. Five enabling layers run beneath the chain, money and information run both ways under it, and two dashed border lines mark where goods are exported and imported. Every joint and every layer is a button that opens a reading of the margin cut there.',
    },
    compact: {
      title: 'The industry chain, in short',
      desc: 'Primary production, aggregation, processing, manufacturing, distribution, retail, consumption and recovery, with logistics and credit running beneath and one return arrow above.',
    },
    column: 'The industry chain, top to bottom',
  },
  panel: {
    jointKicker: 'At this joint',
    bandKicker: 'Enabling layer',
    marginHeading: 'The margin that sits here',
    whenHeading: 'Read the other way',
    linesHeading: 'Where it shows in the financial statements',
    layersHeading: 'Layers riding on this move',
    spanHeading: 'Spans',
    ridesHeading: 'Rides on',
    curriculumHeading: 'Read this joint in the curriculum',
    published: 'Published',
    comingSoon: 'Coming soon',
    close: 'Close',
    hint: 'Select a joint to read the margin cut there, and the line of the accounts that carries it.',
  },
  controls: {
    seeFull: 'See the full chain',
    seeCompact: 'Back to the short version',
    returns: 'Return flows',
    nonPhysical: 'Money and information',
    layers: 'Enabling layers',
    legend: 'How to read the map',
    origin: 'Origin',
    alongside: 'alongside',
    back: 'back to',
  },
} as const;

export type LensId = 'economy' | 'unit';
