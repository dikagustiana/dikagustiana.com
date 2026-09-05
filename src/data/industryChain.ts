/**
 * The industry chain map — data layer.
 *
 * One claim, two measurement systems. At the macro level, economic variables
 * enter the chain at specific points and travel through its structure. At the
 * micro level, the same points are lines in a set of financial statements.
 *
 * Three properties hold everywhere in this file:
 *   1. Generic across sectors. No sector is named as the subject; sectors
 *      appear only as examples of a function.
 *   2. Descriptive, not evaluative. Informal nodes are mapped like any other.
 *      Nothing here says a link should or should not exist.
 *   3. The unit of analysis is the FUNCTION, not the firm. One company may
 *      occupy several functions; a function is not a company.
 *
 * Four categories, and they never mix:
 *   A. stage    — transformation. Owns the goods AND changes them.
 *   B. node     — intermediary. Takes title, transforms nothing, gross revenue.
 *   C. layer    — enabling. No title, no transformation, sells capacity, net revenue.
 *   D. return   — physical backward flow.
 * Plus non-physical flows (money, information), the border, and the macro
 * entry points.
 *
 * The node/layer boundary is the principal-versus-agent test in PSAK 72: an
 * entity that controls the good before transfer reports gross, an entity that
 * arranges for another to provide it reports net. That is the same line, drawn
 * in an accounting standard.
 *
 * No figures, shares or statistics live here by design. The map carries
 * structure and mechanism only.
 *
 * Every element carries `essaySlugs`. Empty today; when a slug is added the
 * detail panel renders a link to `/essays/:slug`. No essay is created here.
 */

/** The four visual categories. Nothing outside this union is drawn as a chain element. */
export type ChainCategory = 'stage' | 'node' | 'layer' | 'return';

/** Vertical position within a chain column. `main` is the axis itself. */
export type ChainLane = 'upper' | 'main' | 'lower';

export interface Described {
  id: string;
  label: string;
  /** One sentence, shown at the top of the detail panel. */
  definition: string;
  /** Concrete instances of the function. Never a company name. */
  examples?: string[];
  /** Short text rendered on the element itself, not only in the panel. */
  marker?: string;
  /** Extra lines in the detail panel. */
  detail?: string[];
  /** Link slots. Empty is valid and expected. */
  essaySlugs: string[];
}

export interface ChainStage extends Described {
  /** 1-6 for the six transformation stages; null for a parallel branch. */
  ordinal: number | null;
  column: number;
  lane: ChainLane;
  /** Consumption is split three ways; nothing else has sub-labels. */
  subLabels?: Described[];
}

export interface ChainNode extends Described {
  groupId: string;
  column: number;
  lane: ChainLane;
  /** Order within a shared cell, left-to-right along the chain. */
  order: number;
  /** A node type that contains more of itself. */
  recursion?: string;
}

export interface ChainNodeGroup extends Described {
  column: number;
  lane: ChainLane;
  /** Node ids, in chain order. */
  members: string[];
}

export interface ChainLayer extends Described {
  /** Bands inside a band. Shown only when Detail is on. */
  subBands?: Described[];
}

export interface BoundaryCrossing {
  id: string;
  label: string;
  column: number;
  /** Which side of the column the vertical line is drawn on. */
  edge: 'start' | 'end';
  direction: 'out' | 'in';
}

export interface ChainBoundary extends Described {
  crossings: BoundaryCrossing[];
}

export interface ReturnFlow extends Described {
  /** Where the physical goods come from, and where they land. */
  from: string;
  to: string;
  /** `leftward` travels back up the chain; `loop` stays inside one stage. */
  shape: 'leftward' | 'loop';
}

/**
 * A by-product is NOT a return flow — it leaves processing forward, into a
 * different chain. It is typed separately so it can never be drawn as one.
 */
export interface ChainBranch extends Described {
  column: number;
  lane: ChainLane;
  to: string;
}

export interface NonPhysicalFlow extends Described {
  /** What travels toward the start of the chain. */
  leftward: string;
  /** What travels toward the end of it. */
  rightward: string;
}

export interface MacroEntry extends Described {
  /** One or two characters for the marker badge. */
  badge: string;
  /** Ids of the elements this variable touches. */
  highlights: string[];
  /** The same point, read off a set of financial statements. */
  micro: { label: string; description: string };
}

/* ── A. Transformation stages ─────────────────────────────────────────────
   Six on the axis, left to right, plus one parallel branch that merges into
   manufacturing. Biological production and geological extraction are two
   different beginnings, drawn in parallel; both feed primary processing. */

export const STAGES: ChainStage[] = [
  {
    id: 'stage-biological',
    ordinal: 1,
    column: 1,
    lane: 'upper',
    label: 'Biological primary production',
    definition:
      'Living systems are grown, raised or caught. Material enters the chain here for the first time.',
    examples: ['Genetics and breeding', 'Cultivation', 'Livestock', 'Capture fisheries'],
    detail: [
      'One of two beginnings. It runs parallel to geological extraction, not after it.',
      'Output feeds primary processing, usually through an aggregating node.',
    ],
    essaySlugs: [],
  },
  {
    id: 'stage-extraction',
    ordinal: 2,
    column: 1,
    lane: 'lower',
    label: 'Geological extraction',
    definition:
      'A non-renewable stock is removed from the ground. Material enters the chain here for the first time.',
    examples: ['Fossil energy', 'Minerals and ores'],
    detail: [
      'The second beginning, parallel to biological primary production.',
      'This is where the outbound border line crosses the chain.',
    ],
    essaySlugs: [],
  },
  {
    id: 'stage-processing',
    ordinal: 3,
    column: 3,
    lane: 'main',
    label: 'Primary processing and basic industry',
    definition: 'Raw material becomes intermediate material.',
    examples: ['Refining', 'Petrochemicals', 'Milling', 'Slaughtering and rendering'],
    detail: [
      'Both beginnings converge here.',
      'This is where the inbound border line crosses, and where recovered material re-enters.',
    ],
    essaySlugs: [],
  },
  {
    id: 'stage-manufacturing',
    ordinal: 4,
    column: 5,
    lane: 'main',
    label: 'Finished-goods manufacturing',
    definition: 'Intermediate material becomes a final product.',
    marker: 'Can repeat across several tiers',
    examples: ['Component manufacture', 'Sub-assembly', 'Final assembly', 'Filling and packing'],
    detail: [
      'A single box on the map, several tiers in practice: the output of one manufacturer is the input of the next.',
      'Packaging is manufactured on a parallel branch and joins the product here.',
    ],
    essaySlugs: [],
  },
  {
    id: 'stage-packaging',
    ordinal: null,
    column: 5,
    lane: 'upper',
    label: 'Packaging manufacture',
    definition:
      'A parallel manufacturing branch with its own upstream chain, joining the product at finished-goods manufacturing.',
    marker: 'Parallel branch, joins here',
    examples: ['Rigid and flexible packaging', 'Closures and labels', 'Secondary and transit packaging'],
    detail: ['Reusable formats leave on a return flow instead of ending at recovery.'],
    essaySlugs: [],
  },
  {
    id: 'stage-consumption',
    ordinal: 5,
    column: 8,
    lane: 'main',
    label: 'Consumption and use',
    definition: 'The product is used up, used, or held. The chain ends here for that unit of output.',
    subLabels: [
      {
        id: 'sub-households',
        label: 'Households',
        definition: 'Final use by resident households.',
        essaySlugs: [],
      },
      {
        id: 'sub-government',
        label: 'Government and institutions',
        definition: 'Final use by the state and by institutional buyers.',
        essaySlugs: [],
      },
      {
        id: 'sub-abroad',
        label: 'Abroad',
        definition: 'Final use outside the domestic economy; the chain crosses the border to reach it.',
        essaySlugs: [],
      },
    ],
    detail: ['A secondary market and refurbishment loop can run inside this stage before recovery.'],
    essaySlugs: [],
  },
  {
    id: 'stage-recovery',
    ordinal: 6,
    column: 9,
    lane: 'main',
    label: 'Recovery',
    definition: 'Used material is collected, sorted and reprocessed into material a chain can accept again.',
    marker: 'Output returns to processing, to primary production, or as reusable packaging',
    examples: ['Collection', 'Sorting', 'Reprocessing'],
    detail: [
      'The only stage whose output travels back up the chain rather than forward.',
      'Where it re-enters depends on what the material becomes, not on who recovered it.',
    ],
    essaySlugs: [],
  },
];

/* ── B. Intermediary nodes ────────────────────────────────────────────────
   Three groups at the top level. Every member takes title to the goods and
   transforms nothing, which is why it records gross revenue. */

export const NODE_DEFINITION =
  'Takes title to the goods and transforms nothing. Records gross revenue.';

export const NODE_GROUPS: ChainNodeGroup[] = [
  {
    id: 'group-aggregation',
    column: 2,
    lane: 'main',
    label: 'Aggregation',
    definition: NODE_DEFINITION,
    marker: 'Between production and processing',
    members: ['node-aggregator'],
    essaySlugs: [],
  },
  {
    id: 'group-distribution',
    column: 6,
    lane: 'main',
    label: 'Distribution and wholesale',
    definition: NODE_DEFINITION,
    marker: 'Between manufacturing and retail',
    members: ['node-trader', 'node-principal', 'node-distributor', 'node-wholesaler'],
    detail: [
      'Two members sit earlier on the axis than the group chip: the trader/importer between processing and manufacturing, and the brand owner alongside manufacturing. Detail draws each at its own position.',
    ],
    essaySlugs: [],
  },
  {
    id: 'group-retail',
    column: 7,
    lane: 'main',
    label: 'Stock-holding retail',
    definition: NODE_DEFINITION,
    marker: 'Last node before use',
    members: [
      'node-retail-general',
      'node-retail-modern',
      'node-retail-ecommerce',
      'node-retail-quick',
      'node-retail-horeca',
    ],
    detail: [
      'Stock-holding only. A marketplace that never takes title to the goods is an enabling layer, not a node.',
    ],
    essaySlugs: [],
  },
];

export const NODES: ChainNode[] = [
  {
    id: 'node-aggregator',
    groupId: 'group-aggregation',
    column: 2,
    lane: 'main',
    order: 1,
    label: 'Aggregator',
    definition: NODE_DEFINITION,
    examples: ['Collectors', 'Bandar (the Indonesian consolidating trader)'],
    detail: [
      'Consolidates many small production units into lots a processor can buy.',
      'Frequently informal: the function exists whether or not the entity is registered.',
    ],
    essaySlugs: [],
  },
  {
    id: 'node-trader',
    groupId: 'group-distribution',
    column: 4,
    lane: 'main',
    order: 1,
    label: 'Trader / importer of intermediate goods',
    definition: NODE_DEFINITION,
    marker: 'Exchange-rate entry point',
    detail: [
      'Sits between processing and manufacturing, sourcing intermediate material domestically or across the border.',
      'Where an imported input is bought, the exchange rate enters the chain here as a cost.',
    ],
    essaySlugs: [],
  },
  {
    id: 'node-principal',
    groupId: 'group-distribution',
    column: 5,
    lane: 'lower',
    order: 1,
    label: 'Brand owner / principal without a factory',
    definition: NODE_DEFINITION,
    detail: [
      'Owns the brand and the goods; buys the transformation as contracted capacity.',
      'A node, not a stage: it holds title without transforming. The transformation it buys is an enabling layer.',
    ],
    essaySlugs: [],
  },
  {
    id: 'node-distributor',
    groupId: 'group-distribution',
    column: 6,
    lane: 'main',
    order: 1,
    label: 'Distributor',
    definition: NODE_DEFINITION,
    recursion: 'Sub-distributor · Regional agent',
    detail: ['Recursive: a distributor can appoint sub-distributors, who can appoint regional agents.'],
    essaySlugs: [],
  },
  {
    id: 'node-wholesaler',
    groupId: 'group-distribution',
    column: 6,
    lane: 'main',
    order: 2,
    label: 'Wholesaler',
    definition: NODE_DEFINITION,
    detail: ['Buys from distribution and breaks bulk for retail; sits between the two.'],
    essaySlugs: [],
  },
  {
    id: 'node-retail-general',
    groupId: 'group-retail',
    column: 7,
    lane: 'main',
    order: 1,
    label: 'Warung / general trade',
    definition: NODE_DEFINITION,
    detail: [
      'Warung: the independent neighbourhood shop. General trade is the channel of such shops, as against organised chains.',
      'Often informal, and mapped here on the same footing as any other stock-holding retailer.',
    ],
    essaySlugs: [],
  },
  {
    id: 'node-retail-modern',
    groupId: 'group-retail',
    column: 7,
    lane: 'main',
    order: 2,
    label: 'Modern trade',
    definition: NODE_DEFINITION,
    detail: ['Organised chains buying centrally against listing and trade terms.'],
    essaySlugs: [],
  },
  {
    id: 'node-retail-ecommerce',
    groupId: 'group-retail',
    column: 7,
    lane: 'main',
    order: 3,
    label: 'E-commerce, first party',
    definition: NODE_DEFINITION,
    detail: [
      'The platform buys the stock and resells it, so it holds title.',
      'A marketplace that only lists a seller does not hold title and belongs in the enabling layers.',
    ],
    essaySlugs: [],
  },
  {
    id: 'node-retail-quick',
    groupId: 'group-retail',
    column: 7,
    lane: 'main',
    order: 4,
    label: 'Quick commerce',
    definition: NODE_DEFINITION,
    detail: ['Holds stock in forward locations so that delivery time, not assortment, is the offer.'],
    essaySlugs: [],
  },
  {
    id: 'node-retail-horeca',
    groupId: 'group-retail',
    column: 7,
    lane: 'main',
    order: 5,
    label: 'Horeca',
    definition: NODE_DEFINITION,
    detail: ['Hotels, restaurants and catering: buys stock and serves it as part of a prepared offer.'],
    essaySlugs: [],
  },
];

/* ── C. Enabling layers ───────────────────────────────────────────────────
   Bands running the length of the chain. None of them takes title; none of
   them transforms. They sell capacity, and they record net revenue. */

export const LAYER_DEFINITION =
  'Holds no title to the goods and transforms nothing. Sells capacity or service. Records net revenue.';

export const LAYERS: ChainLayer[] = [
  {
    id: 'layer-logistics',
    label: 'Logistics and warehousing',
    definition: LAYER_DEFINITION,
    marker: 'Ambient and cold chain',
    subBands: [
      {
        id: 'layer-logistics-ambient',
        label: 'Ambient',
        definition: 'Movement and storage at ambient temperature.',
        essaySlugs: [],
      },
      {
        id: 'layer-logistics-cold',
        label: 'Cold chain',
        definition:
          'Movement and storage under temperature control, unbroken from one end to the other.',
        essaySlugs: [],
      },
    ],
    detail: ['Two sub-bands, because a break in the second one destroys the goods and a break in the first does not.'],
    essaySlugs: [],
  },
  {
    id: 'layer-credit',
    label: 'Credit and working capital',
    definition: LAYER_DEFINITION,
    marker: 'Monetary transmission channel',
    detail: [
      'Carries both bank credit and trade credit between nodes.',
      'The chain is where a policy rate reaches the goods, one node at a time.',
    ],
    essaySlugs: [],
  },
  {
    id: 'layer-energy',
    label: 'Energy',
    definition: LAYER_DEFINITION,
    detail: ['Sold as a service to every stage, and priced by a schedule the chain does not set.'],
    essaySlugs: [],
  },
  {
    id: 'layer-regulation',
    label: 'Regulation, standards and fiscal status',
    definition: LAYER_DEFINITION,
    detail: [
      'Licensing, product standards, and the registration status that decides which fiscal obligations attach at all.',
      'Fiscal status is what separates a formal transfer of title from an informal one.',
    ],
    essaySlugs: [],
  },
  {
    id: 'layer-contract-capacity',
    label: 'Contract capacity',
    definition: LAYER_DEFINITION,
    marker: 'Makloon, toll manufacturing',
    detail: [
      'Makloon: the Indonesian term for manufacturing to order, on material owned by the customer and under the customer brand.',
      'The transformation is real; the title never moves, which is why this is a layer and not a stage.',
    ],
    essaySlugs: [],
  },
  {
    id: 'layer-governance',
    label: 'Principal and distributor contractual governance',
    definition: LAYER_DEFINITION,
    detail: [
      'Territory, exclusivity, trade terms, and the conditions under which an appointment ends.',
      'Sets what the distribution nodes above it are allowed to do.',
    ],
    essaySlugs: [],
  },
];

/**
 * The seventh enabling element, and the only one that is not a band: the
 * border cuts ACROSS the chain rather than running along it.
 */
export const BOUNDARY: ChainBoundary = {
  id: 'boundary-external',
  label: 'External sector and the border',
  definition:
    'Not a band. A vertical cut across the chain, at the points where goods leave the domestic economy or enter it.',
  detail: [
    'In Indonesia the outbound cut falls at geological extraction.',
    'The inbound cuts fall at primary processing, and again on capital goods entering manufacturing.',
  ],
  crossings: [
    { id: 'crossing-export', label: 'Export', column: 1, edge: 'end', direction: 'out' },
    { id: 'crossing-import-input', label: 'Import', column: 3, edge: 'start', direction: 'in' },
    { id: 'crossing-import-capital', label: 'Capital goods', column: 5, edge: 'start', direction: 'in' },
  ],
  essaySlugs: [],
};

/* ── D. Physical return flows ─────────────────────────────────────────────
   Backward along the chain. One arrow at the top level, four labels on it. */

export const RETURN_FLOWS: ReturnFlow[] = [
  {
    id: 'return-commercial',
    label: 'Commercial returns',
    definition: 'Unsold or rejected goods travelling back to whoever holds the commercial risk.',
    from: 'Retail',
    to: 'Distributor or principal',
    shape: 'leftward',
    essaySlugs: [],
  },
  {
    id: 'return-packaging',
    label: 'Reusable packaging',
    definition: 'Packaging designed to make the trip more than once.',
    from: 'Retail and use',
    to: 'Manufacturing or distributor',
    shape: 'leftward',
    essaySlugs: [],
  },
  {
    id: 'return-scrap',
    label: 'Scrap and reject',
    definition: 'Material that failed specification, re-entering upstream of where it failed.',
    from: 'Manufacturing',
    to: 'Inside manufacturing, or back to processing',
    shape: 'leftward',
    essaySlugs: [],
  },
  {
    id: 'return-postconsumer',
    label: 'Post-consumer',
    definition: 'Material collected after use and returned to a chain through recovery.',
    from: 'Consumption',
    to: 'Recovery, then processing or primary production',
    shape: 'leftward',
    essaySlugs: [],
  },
  {
    id: 'return-secondary',
    label: 'Secondary market and refurbishment',
    definition: 'A product changing hands again without leaving use.',
    from: 'Consumption',
    to: 'Consumption',
    shape: 'loop',
    essaySlugs: [],
  },
];

/**
 * The single backward arrow drawn at the top level. Detail replaces it with
 * the five flows above.
 */
export const RETURN_SUMMARY: Described = {
  id: 'return-summary',
  label: 'Physical return flows',
  definition:
    'Goods travelling back up the chain, against the direction of transformation. Four of them run backward along the axis; a fifth loops inside use.',
  detail: ['Turn on Detail to separate them, and to see where each one lands.'],
  essaySlugs: [],
};

/** Forward, into a different chain. Deliberately not a return flow. */
export const BYPRODUCT_BRANCH: ChainBranch = {
  id: 'branch-byproduct',
  column: 3,
  lane: 'lower',
  label: 'By-product',
  definition:
    'Material leaving processing forward, as an input to a different chain. It travels away from this chain, not back up it.',
  to: 'Another chain',
  detail: ['Drawn as a branch, never as a return arrow: the direction of travel is the whole difference.'],
  essaySlugs: [],
};

/* ── E. Non-physical flows ────────────────────────────────────────────────
   Two thin lines. Both run in both directions, carrying different things
   each way. */

export const NON_PHYSICAL_FLOWS: NonPhysicalFlow[] = [
  {
    id: 'flow-money',
    label: 'Money',
    definition: 'Runs both ways, and the two directions are not the same instrument.',
    leftward: 'Payment',
    rightward: 'Trade credit, trade promotion, rebates',
    detail: ['Payment travels back up the chain; the terms on which it may be delayed travel down it.'],
    essaySlugs: [],
  },
  {
    id: 'flow-information',
    label: 'Information',
    definition: 'Runs both ways, and the two directions are not the same content.',
    leftward: 'Demand signal',
    rightward: 'Specification and standard',
    detail: ['What is wanted travels up the chain; what is required travels down it.'],
    essaySlugs: [],
  },
];

/* ── F. Macro entry points, and their micro counterparts ──────────────────
   Each variable enters the chain somewhere specific. Each entry point is
   also a line in a set of financial statements. */

export const MACRO_ENTRIES: MacroEntry[] = [
  {
    id: 'macro-growth',
    badge: 'G',
    label: 'Growth',
    definition:
      'Value added accumulates from left to right; the components of demand land on the three sub-labels of consumption.',
    highlights: [
      'stage-biological',
      'stage-extraction',
      'stage-processing',
      'stage-manufacturing',
      'stage-consumption',
      'stage-recovery',
      'sub-households',
      'sub-government',
      'sub-abroad',
    ],
    micro: {
      label: 'Value added by stage',
      description: 'Revenue less purchased inputs at each stage; contribution margin by stage.',
    },
    essaySlugs: [],
  },
  {
    id: 'macro-inflation',
    badge: 'P',
    label: 'Inflation',
    definition:
      'Enters at the first three stages and travels right through the mark-up of each node. The length of the chain sets the lag.',
    highlights: [
      'stage-biological',
      'stage-extraction',
      'stage-processing',
      'group-aggregation',
      'group-distribution',
      'group-retail',
    ],
    micro: {
      label: 'Gross margin by stage, and price renegotiation lag',
      description:
        'Whether an input cost has reached the selling price yet, and how many nodes it still has to cross.',
    },
    essaySlugs: [],
  },
  {
    id: 'macro-monetary',
    badge: 'M',
    label: 'Monetary policy',
    definition:
      'Reaches the chain through the credit layer, and above all through the trade credit extended between nodes.',
    highlights: ['layer-credit', 'group-aggregation', 'group-distribution', 'group-retail', 'flow-money'],
    micro: {
      label: 'Node DSO, DIO and DPO',
      description: 'The cash conversion cycle each node finances, and who is financing whom.',
    },
    essaySlugs: [],
  },
  {
    id: 'macro-fx',
    badge: 'FX',
    label: 'Exchange rate',
    definition:
      'Enters at the trader and importer as a cost, and at geological extraction as a windfall. One shock, opposite signs.',
    highlights: ['node-trader', 'group-distribution', 'stage-extraction', 'boundary-external'],
    micro: {
      label: 'Foreign-exchange gain and loss',
      description: 'Translation and transaction differences, and the currency the input was actually bought in.',
    },
    essaySlugs: [],
  },
  {
    id: 'macro-external',
    badge: 'X',
    label: 'External balance',
    definition: 'Enters at the border lines, where goods leave the domestic economy or arrive in it.',
    highlights: ['boundary-external', 'stage-extraction', 'stage-processing', 'sub-abroad'],
    micro: {
      label: 'Export revenue, import cost and landed cost',
      description: 'The duty and freight that sit between a border price and the cost the chain records.',
    },
    essaySlugs: [],
  },
  {
    id: 'macro-fiscal',
    badge: 'F',
    label: 'Fiscal',
    definition:
      'Royalty at extraction, excise at manufacturing, value-added tax at every transfer of title between formal nodes, subsidy in the energy layer and at primary production.',
    highlights: [
      'stage-extraction',
      'stage-manufacturing',
      'stage-biological',
      'group-aggregation',
      'group-distribution',
      'group-retail',
      'layer-energy',
      'layer-regulation',
    ],
    micro: {
      label: 'Output VAT less input VAT, and excise payable',
      description:
        'Each transfer of title between formal nodes creates the pair; an informal node in the sequence breaks it.',
    },
    essaySlugs: [],
  },
  {
    id: 'macro-labour',
    badge: 'L',
    label: 'Labour',
    definition: 'Concentrated at primary production and at the informal nodes.',
    highlights: ['stage-biological', 'group-aggregation', 'node-aggregator', 'node-retail-general', 'group-retail'],
    micro: {
      label: 'Labour inside cost of goods sold',
      description: 'The wage share of conversion cost, and the part of it that never reaches a payroll record.',
    },
    essaySlugs: [],
  },
  {
    id: 'macro-cycle',
    badge: 'C',
    label: 'Business cycle',
    definition: 'Propagates right to left, through the inventory each node decides to hold.',
    highlights: ['group-retail', 'group-distribution', 'group-aggregation', 'stage-manufacturing', 'stage-processing'],
    micro: {
      label: 'Inventory to sales',
      description: 'The restocking and destocking swing, amplified by every node it passes through.',
    },
    essaySlugs: [],
  },
];

/* ── UI copy ──────────────────────────────────────────────────────────────
   Every string the map renders lives here. The presentation components
   contain no content. */

export const CHAIN_META = {
  heading: 'A map of the industry chain',
  intro:
    'One structure, two measurement systems. At the macro level, economic variables enter the chain at specific points and travel through it. At the micro level, the same points are lines in a set of financial statements. The map is generic across sectors, descriptive rather than evaluative, and its unit is the function, not the firm.',
  axisLabel: 'Physical flow',
  controls: {
    macroLens: 'Macro lens',
    macroLensHint: 'Show where each economic variable enters the chain',
    detail: 'Detail',
    detailHint: 'Open the nodes and the return flows',
    clear: 'Clear selection',
  },
  sections: {
    returnFlows: 'Physical return flows',
    nonPhysical: 'Non-physical flows',
    layers: 'Enabling layers',
    macro: 'Macro entry points',
    legend: 'How to read the map',
  },
  panel: {
    regionLabel: 'Details for the selected element',
    empty: 'Select any element on the map to read what it is.',
    emptyHint: 'Every element is reachable by keyboard.',
    definition: 'Definition',
    examples: 'Examples',
    recursion: 'Recursion',
    members: 'Contains',
    subBands: 'Sub-bands',
    crossings: 'Crossings',
    travels: 'Travels',
    leftward: 'Toward the start of the chain',
    rightward: 'Toward the end of the chain',
    micro: 'The same point, read off the financial statements',
    highlighted: 'Highlighted under this lens',
    underLens: 'Highlighted under the current lens',
    essays: 'Reading',
    subLabels: 'Splits into',
  },
  categories: [
    {
      id: 'stage' as const,
      label: 'Transformation stage',
      definition: 'Owns the goods and changes them. Drawn as a solid numbered box on the axis.',
    },
    {
      id: 'node' as const,
      label: 'Intermediary node',
      definition: NODE_DEFINITION + ' Drawn as a dashed pill between the boxes.',
    },
    {
      id: 'layer' as const,
      label: 'Enabling layer',
      definition: LAYER_DEFINITION + ' Drawn as a hatched band running the length of the chain.',
    },
    {
      id: 'return' as const,
      label: 'Physical return flow',
      definition: 'Goods travelling back up the chain. Drawn as a dashed line with a leftward head, above the chain.',
    },
  ],
  footnote:
    'The line between a node and a layer is the principal-versus-agent test in PSAK 72: control of the good before transfer means gross revenue, arranging for another party to provide it means net.',
} as const;
