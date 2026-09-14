/**
 * The industry chain — content layer.
 *
 * One chain, read at two distances. Step back and it is an economy; step in
 * and it is a single unit of goods whose price is sliced at every joint. This
 * file holds WHAT is on the map — its anatomy, and, under a shift, the
 * owner's reading of its CONDITION: where each marked element stands, what
 * holds it, which of the three levers moves it, and who finances that.
 *
 * WHERE things sit is the generator's job
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
 * the financial statements carries it — never its size. Standard identifiers
 * belong in the audit sources, not among the public labels.
 *
 * Four categories, four forms, never mixed:
 *   transformation stage   changes the form of the goods; conversion margin
 *   intermediary node      takes title, transforms nothing; revenue gross; spread
 *   enabling layer         capacity, inputs or rules supporting the goods
 *   physical return        goods moving back up the chain
 * plus two non-physical flows, money and information, each running both ways.
 * Control is assessed for the specified good OR service. A service provider
 * can be principal for its own service without owning its customer's goods.
 * These functional categories are not a gross/net accounting decision tree.
 *
 * Two controls sit over the same map, and they compose:
 *   distance   ECONOMY or FINANCE. The map does not change; the unit of
 *              reading does. Every joint carries two readings, one for each
 *              distance, and the chip on the joint shows the one that is on.
 *   shift      none (the resting state), REINDUSTRIALISATION or GREEN
 *              TRANSITION. A shift is an overlay: it highlights the joints and
 *              layers it moves and adds arrows; it never redraws the chain.
 *              The two shifts are exclusive in this interface so their
 *              mechanisms can be examined separately, including tensions.
 *
 * The division of labour between them is strict: the SHIFT decides which
 * elements are marked, and the DISTANCE decides only what a mark then says.
 * Move the distance control and the marks stay exactly where they were.
 *
 * The condition layer is the reason the map exists. The resting map is
 * descriptive anatomy; a shift adds the owner's reading on top of it, and the
 * two are kept visibly apart: a mark, a status and a panel belong to the
 * reading, never to the anatomy. Every marked element carries a STATUS that is
 * read without a click — stuck, moving, or unpriced — told by form, not
 * colour, and four lines that are read on a click, in one voice at a time:
 * where it stands, what holds it, the lever and what it does here, and who
 * finances it. The four lines are the owner's to write; `UNWRITTEN` marks the
 * slots that are still empty and the panel simply omits them.
 *
 * Two more things live here because they are content, not layout:
 *   SLUGS      one permanent public address per element. Displayed numbers
 *              are a reading order and change with the overlay; a slug never
 *              does, so it is what an essay links to and what the URL holds.
 *   articles   the essays that read a target under a shift. Owner-filled.
 */

/* ── Distance: the two readings of every joint ───────────────────────────── */

export type LensId = 'economy' | 'finance';

/** One reading of a joint at one distance: the word on its chip, and the sentence behind it. */
export interface Reading {
  /** Short — it sits on the chain. Two or three words. */
  chip: string;
  note: string;
}

export type LensReading = Record<LensId, Reading>;
/** A reading with no chip: for a layer, a shift, a target inside a shift. */
export type LensNote = Record<LensId, string>;

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
  /** Activities and scope, shown at reading size in the column and reference. */
  detail?: string;
}

export const STAGES: Stage[] = [
  {
    id: 'stage-biological',
    label: 'Biological primary production',
    lanes: ['Genetics and breeding', 'Cultivation', 'Livestock', 'Capture fisheries'],
    origin: true,
  },
  { id: 'stage-extraction', label: 'Geological extraction', lanes: ['Fossil energy', 'Minerals and ores'], origin: true },
  { id: 'stage-processing', label: 'Primary processing', detail: 'Basic industry: refining, petrochemicals, milling and slaughtering.' },
  { id: 'stage-packaging', label: 'Packaging manufacture', detail: 'A parallel manufacturing input into the finished good.' },
  { id: 'stage-manufacturing', label: 'Finished-goods manufacturing', detail: 'Components, assembly and finishing can repeat through successive manufacturing tiers.' },
  {
    id: 'stage-consumption',
    label: 'Consumption and use',
    demand: ['Households', 'Government and institutions', 'Abroad'],
    detail: 'Use and demand destinations, not an additional conversion margin. Abroad can also receive intermediate goods; this is not a full expenditure account.',
  },
  { id: 'stage-recovery', label: 'Recovery', detail: 'Collection, sorting and reprocessing; outputs return to the appropriate material chain.' },
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

/** Stock-holding retail formats: one node, five formats. Drawn as one group. */
export const RETAIL: Node[] = [
  { id: 'node-retail-general', label: 'Warung / general trade' },
  { id: 'node-retail-modern', label: 'Modern trade' },
  { id: 'node-retail-ecommerce', label: 'E-commerce, first party' },
  { id: 'node-retail-quick', label: 'Quick commerce' },
  { id: 'node-retail-horeca', label: 'Horeca' },
];

/** The retail formats as one node, where a flow, a joint or a span reads them together. */
export const RETAIL_GROUP = { id: 'node-retail', label: 'Retail', note: 'stock-holding' } as const;

/**
 * The columns of the chain in reading order. A span and a joint both refer to
 * these ids; the retail formats collapse into RETAIL_GROUP here.
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
  /** How the kind reads on the plate without colour: the form of the joint mark on the flow. */
  mark: 'filled-diamond' | 'open-diamond' | 'square';
  /** The token's border in the panel: the same three forms, at text size. */
  form: 'solid' | 'dashed' | 'filled';
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
    mark: 'filled-diamond',
    form: 'solid',
    means:
      'The return from converting inputs into goods, driven by yield, processing cost and capacity utilisation. Gross profit and national-accounts value added use different cost boundaries.',
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
    mark: 'open-diamond',
    form: 'dashed',
    means:
      'The gap between buying price and selling price, plus the reward for carrying credit, stock and reach. Title passes; the form does not change.',
    test: 'A principal controls the goods before transfer and recognises the whole sale as revenue, with purchase costs recorded separately. An agent arranges a transfer it does not control and recognises a commission. Legal title is evidence, not a substitute for assessing control.',
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
    mark: 'square',
    form: 'filled',
    means:
      'Payment for a service or capacity. The fee is revenue, not the provider’s profit margin: labour, fuel, rent and other operating inputs still have to be paid.',
    test: 'The principal–agent control test applies to the specified good or service. A provider recognises the fee for its own service gross when it controls that service before transfer, even if it never owns the customer’s goods. An agent arranging another provider’s service recognises its commission net. Energy purchases and financing require their own treatment; neither is automatically an agency fee.',
    lines: [
      'Service revenue, gross for a principal; commission revenue, net for an agent',
      'Freight, rent, tolling, energy or finance cost — at the user, in cost of sales, operating expense or finance cost',
    ],
  },
};

/* ── Joints: where title transfers or goods move between two functions ───── */

/**
 * Every place the chain can be read close. Each joint carries the slice cut
 * at that transfer — the margin of the function that SELLS there — names the
 * lines of the financial statements where that slice shows, and carries its
 * two readings: what the joint is from far, as a piece of the economy, and
 * from close, as a margin with its drivers. The curriculum mapping table
 * (src/data/chainCurriculumMap.ts) attaches modules to these ids and to no
 * others.
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
  /** The two readings: the joint from far and from close. */
  read: LensReading;
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
    note: 'The producer realises a selling price here. Purchased inputs and production costs determine how much is value added and how much is profit.',
    lines: [
      'Gross profit — production',
      'Advances from the aggregator, or receivables from it: the first credit on the chain, running either way',
    ],
    read: {
      economy: {
        chip: 'Inflation enters',
        note: 'The gate price values output; subtract intermediate inputs to obtain value added. Input prices, yields, wages and subsidies affect production costs, while downstream prices can absorb or pass on changes.',
      },
      finance: {
        chip: 'Makes the material',
        note: "What is done here: land, labour and purchased inputs become a material the next stage can use. Yield against input cost is what the gate price then measures, and the aggregator's advance often finances the wait.",
      },
    },
  },
  {
    id: 'j-extraction-processing',
    label: 'Extraction → processing',
    from: 'stage-extraction',
    to: 'stage-processing',
    margin: 'conversion',
    note: 'Extraction realises its selling price here. The illustrated export route leaves before processing; production costs, taxes and resource rents determine who retains the proceeds.',
    lines: ['Gross profit — extraction', 'Royalties, inside cost of sales'],
    read: {
      economy: {
        chip: 'Export · FX',
        note: 'This export cut illustrates raw goods leaving before processing. Export receipts, imported inputs and foreign-currency liabilities determine the exchange-rate effect; royalties are one possible fiscal claim on extraction.',
      },
      finance: {
        chip: 'Lifts the deposit',
        note: 'What is done here: a deposit in the ground becomes a material that can be moved and processed. Deposit quality, extraction cost, commodity price and royalties shape what that is worth. Resource rent is the residual after the relevant costs and required returns; it is not automatically the whole conversion margin.',
      },
    },
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
    read: {
      economy: {
        chip: 'First mark-up',
        note: "The first mark-up on the chain — the aggregator's spread — is the first step of inflation's pass-through, and much of the trade's informal labour sits in this node.",
      },
      finance: {
        chip: 'Bulks the lots',
        note: "What is done here: many small lots become one consignment of known quality, ready when a processor wants it, and the producer is settled with long before the processor settles. The spread is what that service earns; the working-capital gap is the business.",
      },
    },
  },
  {
    id: 'j-processing-trader',
    label: 'Processing → trader / importer',
    from: 'stage-processing',
    to: 'node-trader',
    margin: 'conversion',
    note: 'Processing realises a conversion margin here. Yield, energy use and fixed cost per unit shape it; the by-product leaves for another chain.',
    lines: [
      'Gross profit — processing',
      'Yield: the by-product credit inside cost of sales',
      'Tolling fee, where a contract processor did the work',
    ],
    read: {
      economy: {
        chip: 'Producer prices',
        note: "Producer prices are set here: basic industry's value added is the capital-intensive middle of the chain, where energy intensity peaks and the by-product leaves for another sector's account.",
      },
      finance: {
        chip: 'Refines the input',
        note: "What is done here: a raw material becomes an industrial input of a specified grade. A fixed plant cost is spread over volume, so utilisation and yield decide the margin that measures it; the by-product credit sits inside cost of sales.",
      },
    },
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
    read: {
      economy: {
        chip: 'Import · FX',
        note: 'The import line crosses here: the import share of intermediate inputs and of capital goods is read at this joint, and the exchange rate lands in landed cost before manufacturing has added anything.',
      },
      finance: {
        chip: 'Lands the goods',
        note: "What is done here: a supply that exists abroad becomes stock available here, cleared and on hand against a lead time. The spread sits over landed cost — freight, duty and the exchange rate inside cost of sales — with import finance in finance cost.",
      },
    },
  },
  {
    id: 'j-packaging-manufacturing',
    label: 'Packaging → manufacturing',
    from: 'stage-packaging',
    to: 'stage-manufacturing',
    margin: 'conversion',
    note: 'Packaging realises its conversion margin here; its selling price becomes a component cost for the next manufacturer.',
    lines: ['Gross profit — packaging', "Component cost, inside the finished good's bill of materials"],
    read: {
      economy: {
        chip: 'Input–output link',
        note: "An input–output link between two branches of manufacturing: packaging's output is manufacturing's input, counted gross in each branch's output and only once in value added.",
      },
      finance: {
        chip: 'Makes the pack',
        note: "What is done here: the good gains something that protects it, carries it and identifies it on a shelf. Packaging's conversion margin is cut here and attaches to the unit as a component cost in the finished good's bill of materials.",
      },
    },
  },
  {
    id: 'j-manufacturing-distribution',
    label: 'Manufacturing → distribution',
    from: 'stage-manufacturing',
    to: 'node-distributor',
    margin: 'conversion',
    note: 'Manufacturing realises its conversion margin here. Where it extends trade credit, receivables connect that margin to working-capital funding.',
    lines: [
      'Gross profit — manufacturing',
      'Trade receivables · DSO — the credit the maker gives the distributor',
      "Trade promotion and rebates — consideration payable to a customer, netted from the seller's revenue",
    ],
    read: {
      economy: {
        chip: 'Excise · credit',
        note: 'Product taxes depend on the goods and jurisdiction; excise is relevant only where applicable. Trade-credit terms are one route through which financing conditions reach production and distribution.',
      },
      finance: {
        chip: 'Finishes the good',
        note: "What is done here: components become a good a buyer can use, and the maker lets the distributor sell it before paying for it. Receivables days, trade promotion and rebates netted from revenue — the working-capital modules read it here.",
      },
    },
    alt: {
      margin: 'node-spread',
      when: 'where the brand owner sells goods a toller made for it under makloon: the principal books the sale gross and holds the inventory, while the plant behind it earns a tolling fee for machine hours and never a margin on the goods',
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
    read: {
      economy: {
        chip: 'Trade margin',
        note: "Distribution’s trade margin is its output measure; purchased services and other intermediate inputs are deducted to obtain value added. Informal activity is within the national-accounts production boundary even when it is difficult to measure.",
      },
      finance: {
        chip: 'Reaches the trade',
        note: "What is done here: one national supply becomes stock inside a territory, within reach of buyers the maker never meets, financed on both sides. The spread pays for that, after the principal's rebates — who finances whom, read as DSO against DPO.",
      },
    },
  },
  {
    id: 'j-wholesale-retail',
    label: 'Wholesale → retail',
    from: 'node-wholesaler',
    to: 'node-retail',
    margin: 'node-spread',
    note: "The wholesaler's spread, cut into ever smaller drops — the cost to serve rises as the drops shrink.",
    lines: ['Revenue, gross', 'Gross profit as a trade margin, with cost to serve beneath it', 'DSO · DIO · DPO — who finances whom'],
    read: {
      economy: {
        chip: 'Cycle · inventory',
        note: 'The business cycle runs right to left through node inventories from here: a slower shelf shows first as stock at the wholesaler, then as smaller orders up the chain.',
      },
      finance: {
        chip: 'Breaks the bulk',
        note: "What is done here: a pallet becomes a case, and a case becomes what one shop can pay for today. Cost to serve rises as the drops shrink, and the credit extended to small retail is the risk in the receivable.",
      },
    },
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
    read: {
      economy: {
        chip: 'Final demand · CPI',
        note: 'Retail connects the chain to final household demand and consumer prices. Government and institutional purchases, and exports, may follow other routes; consumer prices also depend on taxes, services and demand conditions.',
      },
      finance: {
        chip: 'Holds the shelf',
        note: "What is done here: the good waits within arm's reach of whoever wants it, at the moment they want it. The shelf margin pays for that and differs by channel, with shrink and cost to serve beneath it; the consumer pays at once, so the chain behind the shelf finances the retailer.",
      },
    },
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
    read: {
      economy: {
        chip: 'Recovery economics',
        note: 'Discard can be bought for its material value, collected for a fee, or left with costs that no transaction covers. Producer responsibility can change who pays; recovery is not universally unpaid or absent from the accounts.',
      },
      finance: {
        chip: 'Takes the discard',
        note: 'What is done here: what the user has finished with is taken away and sorted into something a chain can use again. Recovery is paid a collection or gate fee to take what has no value; where the discard still has value it buys instead, and its conversion margin is realised later on the return flows.',
      },
    },
    alt: {
      margin: 'conversion',
      when: 'where what is discarded still has value: recovery buys it, money runs against the goods as at every other joint, and the slice is the conversion margin on what recovery sells back up the return flows',
    },
  },
];

export const JOINT_LABELS = Object.fromEntries(JOINTS.map((j) => [j.id, j.label])) as Record<JointId, string>;
export const JOINT_BY_ID = Object.fromEntries(JOINTS.map((j) => [j.id, j])) as Record<JointId, Joint>;

/* ── Spanning layers: take no title, earn a fee or set the terms ─────────── */

export type BandAttach = 'joints' | 'stages' | 'none';

export interface Band {
  id: string;
  label: string;
  /** The local terms, kept: cold chain, trade credit. */
  note?: string;
  /** First and last column the band runs under, by id (COLUMNS order). */
  span: [string, string];
  /** The span in words, for a screen that cannot draw it. */
  spanLabel: string;
  /** The margin kind of a layer that earns a fee. Absent where the layer earns nothing itself. */
  margin?: MarginKind;
  /**
   * Where the layer touches the chain, so the plate can tick it there instead
   * of pinning one chip to the far end of the band: a service that attaches
   * at every MOVE ticks the joints; an input into every CONVERSION ticks the
   * stages; rules attach everywhere and are ticked nowhere.
   */
  attaches: BandAttach;
  means: string;
  lines: string[];
  /** The layer read from far and from close. */
  read: LensNote;
  /**
   * Distinct shortages inside one layer, where reading the layer as a single
   * price would merge them. Only energy carries these today; the field sits on
   * the interface rather than being special-cased because any layer that is
   * really several constraints at once can use it.
   */
  shortages?: readonly { label: string; means: string }[];
}

export const BANDS: Band[] = [
  {
    id: 'band-logistics',
    label: 'Logistics and warehousing',
    note: 'ambient · every move',
    span: ['stage-biological', 'stage-recovery'],
    spanLabel: 'The whole chain',
    margin: 'service-fee',
    attaches: 'joints',
    means:
      'Moves and holds the goods without ever owning them, so the next function gets them in the right place, at the right time and at the right temperature. It attaches at every move and injects a cost, an energy use and an emission into each one \u2014 a floor under the unit that no single stage can remove, for a given fleet and drop pattern \u2014 and it weighs most where the drops are smallest and the cold chain is unbroken.',
    lines: [
      'Freight and warehousing service revenue — gross when the provider controls its service; net commission when acting as an agent',
      'Freight-out, warehouse rent and handling — at the user, inside cost to serve',
      'Right-of-use assets and lease liabilities, where the warehouse is leased',
    ],
    read: {
      economy:
        'Transport and storage are a sector of their own in the accounts, but on the chain they are a cost at every move — and where the drops are smallest, the widest wedge between farm gate and shelf.',
      finance:
        'What is sold here is capacity, speed and a temperature held to a standard. Freight-out, warehouse rent and handling sit inside cost to serve; right-of-use assets and lease liabilities where the warehouse is leased. Every touch adds its own charge, so the number of touches per unit is a cost driver in its own right.',
    },
  },
  {
    id: 'band-cold-chain',
    label: 'Cold chain',
    note: 'temperature held · decides which nodes can hold stock',
    span: ['stage-biological', 'stage-consumption'],
    spanLabel: 'Production → consumption, on the chains that need it',
    margin: 'service-fee',
    attaches: 'joints',
    means:
      'The part of logistics that holds a temperature as well as a place and a time. It is split out because it does more than add a fee: a node that cannot keep the cold cannot hold the stock, so the cold chain decides which intermediaries can exist on a chain at all, and every cold touch adds fuel and emission on top of the ambient move.',
    lines: [
      'Cold storage and reefer freight revenue — gross for the provider that controls the service',
      'Energy inside the freight and storage charge — at the user, inside cost to serve',
      'Shrink and spoilage — inside cost of sales, where the chain breaks',
    ],
    read: {
      economy:
        'Where a chain needs the cold, the cold decides its shape: fewer, larger nodes where refrigeration is scarce, and a wider wedge between farm gate and shelf. The fuel it burns is counted in transport, not in the food.',
      finance:
        'What is sold here is a temperature held to a standard between two hands. The charge carries its own fuel and emission; the node that cannot pay it cannot hold the goods, so the cold chain is a condition of being a node before it is a cost.',
    },
  },
  {
    id: 'band-credit',
    label: 'Working capital and trade credit',
    note: 'bridges a transfer · days, not years',
    span: ['stage-biological', 'stage-recovery'],
    spanLabel: 'The whole chain',
    margin: 'service-fee',
    attaches: 'joints',
    means:
      'Finances the gap between paying for the goods and being paid for them. A lender earns the fee for the line; when the chain finances itself, the credit is a position on the balance sheet, not a payment. It decides who can afford to be a node, and it is the channel through which monetary policy reaches the chain.',
    lines: [
      'Finance income and finance cost — the price of waiting',
      'Trade receivables and trade payables — read as DSO and DPO, together with DIO the cash conversion cycle',
      'Advances to suppliers at the raw end; trade credit downstream; cash at the shelf',
      'Early-payment discounts as variable consideration; derecognition of receivables on factoring',
    ],
    read: {
      economy:
        'The channel through which monetary policy reaches the chain: the policy rate becomes the price of waiting, and who can afford to wait decides who can be a node.',
      finance:
        'What is sold here is the wait: someone holds goods they have not been paid for, so the next function can trade before it settles. DSO, DIO and DPO — the cash conversion cycle — and finance cost as the price of the gap it leaves.',
    },
  },
  {
    id: 'band-capital',
    label: 'Asset and project finance',
    note: 'builds or changes what the chain runs on',
    span: ['stage-biological', 'stage-recovery'],
    spanLabel: 'The whole chain — wherever capacity is built or replaced',
    margin: 'service-fee',
    // Attaches at the STAGES, not the joints: this money builds the plant, the
    // fleet, the store and the sorting line. The band below it attaches at the
    // joints, because that money bridges a transfer. Same layer of the
    // drawing, two different attach points, two different questions — which
    // is the distinction a single "Finance" band could not have made.
    attaches: 'stages',
    means:
      'Funds the assets a function needs before it can trade at all, and funds replacing them when they wear out. Priced off what the asset earns across its life rather than off a trading cycle, so it is committed for years and cannot be withdrawn at a quarter’s notice. Who provides it, who pays for it over that life, and who bears the loss if it fails are three separate questions and usually three separate parties. An asset that ramps can miss debt service on sound lifetime returns; that is a timing problem and it needs a timing instrument — grace, sculpted amortisation, a reinvestment facility held outside senior maturity — not more subsidy. A guarantee or a concession moves who carries the risk of building; it does not make the risk disappear.',
    lines: [
      'Property, plant and equipment — and the depreciation that spreads it across the output it makes possible',
      'Long-term borrowings and equity; where the state participates, concessional or guaranteed capital',
      'Interest during construction — the cost of money before the asset earns anything',
    ],
    read: {
      economy:
        'Where capacity comes from. An economy can only run the functions somebody has already built, so the terms on which this money is available decide which parts of the chain can exist, and at what scale.',
      finance:
        'What is sold here is money committed for the life of an asset, priced off the coverage that asset will produce rather than off a trading cycle. It fails differently from the band above it: sound lifetime returns can still miss debt service while the asset ramps.',
    },
  },
  {
    id: 'band-energy',
    label: 'Energy',
    note: 'enters every stage from below · fuel · power · subsidy',
    span: ['stage-biological', 'stage-recovery'],
    spanLabel: 'The whole chain — an input into every stage',
    margin: 'service-fee',
    attaches: 'stages',
    means:
      'Fuel and power enter each function as purchased inputs or through self-supply — drawn as an input rising into every stage, because every conversion needs heat, motion and light and none makes them. This layer describes their cross-cutting role; it does not imply that energy cannot be owned or that its sale is a net commission. Market prices, tariffs and subsidies affect the cost.',
    lines: [
      'Energy cost — fuel and power inside cost of sales at every stage; heaviest in extraction and primary processing',
      'Energy revenue — at the utility or the fuel seller; the subsidy, where the state pays part of the price, on the fiscal line',
    ],
    read: {
      economy:
        'Energy intensity, stage by stage \u2014 heaviest in extraction and primary processing. Where the state pays part of the price, the subsidy is a fiscal line every stage draws on. Read as a price, this layer hides three different shortages: whether the electricity exists at all (generation), whether the network can carry it to where the plant is (network capacity), and whether the plant can attach to that network on a workable timetable (connection). Only the first is usually counted, and a stage can be short of the third while the first two are adequate.',
      finance:
        'What is sold here is heat, motion and light: every conversion needs them and none makes them. Fuel and power sit inside cost of sales at every stage, at a price set outside the chain, so a change is passed on or absorbed in the conversion margin. The exception is where a stage builds its own supply: a captive plant moves energy out of cost of sales and into the capital structure, sized to the process and contracted for its life, which is a different exposure with a different remedy.',
    },
    /**
     * The three shortages, named so a reading can say which one it means.
     * "Energy" used as one word lets a connection problem be answered with a
     * tariff, and a network problem with a subsidy.
     */
    shortages: [
      { label: 'Generation', means: 'The electricity does not exist, or not firm and not clean.' },
      { label: 'Network capacity', means: 'It exists but the network cannot carry it to where the demand is.' },
      { label: 'Connection', means: 'Both exist and the plant still cannot attach on a timetable its financing survives.' },
    ],
  },
  {
    id: 'band-governance',
    label: 'Principal–distributor contract governance',
    note: 'territory · exclusivity · trade terms · how an appointment ends',
    span: ['stage-manufacturing', RETAIL_GROUP.id],
    spanLabel: 'Manufacturing → retail',
    attaches: 'joints',
    means: 'The contract that sets the spreads either side of it: who may sell where, on what terms, and what happens when the appointment ends. It earns nothing itself; it decides who earns.',
    lines: [
      "Rebates, trade promotion and listing fees — consideration payable to a customer, netted from the principal's revenue",
      'Variable consideration — targets and returns that leave the price uncertain until the period closes',
      'Sales returns — a refund liability, and an asset for the goods expected back',
    ],
    read: {
      economy: 'The contract that decides how the trade margin is divided between principal and distributor — and how concentrated distribution becomes.',
      finance:
        'What this settles is the terms on which the next function may sell at all: territory, exclusivity and what happens when the appointment ends. Rebates, listing fees and trade promotion as variable consideration; sales returns as a refund liability and an asset for the goods expected back.',
    },
  },
  {
    id: 'band-regulation',
    label: 'Regulation and standards',
    span: ['stage-biological', 'stage-recovery'],
    spanLabel: 'The whole chain',
    attaches: 'none',
    means: 'Sets what may be sold, moved and claimed. It takes no title and earns no fee; its cost lands in every function it touches.',
    lines: [
      'Compliance cost — certification, testing and licensing, inside operating expense',
      'Excise, once, on release by the manufacturer or importer; VAT at each formal transfer of title — both collected, never earned; the fiscal reading in the economy lens',
    ],
    read: {
      economy: 'Excise, VAT, licensing and standards — collected or imposed, never earned: the fiscal reading of the chain, joint by joint.',
      finance:
        'What this provides is a good a buyer can rely on without testing it: what may be sold, moved and claimed. Compliance cost inside operating expense; excise once on release; VAT collected at each formal transfer and never revenue.',
    },
  },
];

export const BAND_BY_ID = Object.fromEntries(BANDS.map((b) => [b.id, b])) as Record<string, Band>;

/** The word on a layer's marker: its margin kind where it earns a fee, and nothing where it only sets the terms. */
export const bandChip = (band: Band): string => (band.margin ? MARGIN_KINDS[band.margin].chip : '');

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
    note: 'financing and commercial support with the goods. Trade credit defers cash settlement; it is not cash moving downstream. Promotion and rebates may reduce seller revenue, depending on the arrangement. Credit terms help determine who can hold stock',
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


/* ── Shifts: the chain in motion, as an overlay ──────────────────────────── */

/**
 * Three levers the map can DRAW, and they are not a theory of how industry
 * changes.
 *
 * Each of the three corresponds to something the drawing can show happening:
 * a cut moving along the chain, a price arriving at a joint that had none, a
 * price every stage pays changing at once. That is a property of the diagram,
 * not a claim about mechanisms, and the distinction matters because the field
 * expects a price answer to every question and the map would supply one.
 *
 * Things that move a chain and are NOT any of these three: building capacity
 * that does not exist, changing the terms of a contract that already exists,
 * changing who holds the right to operate an asset, and moving who bears a
 * risk. Each can change a price WITHOUT being a repricing, and forcing one of
 * them into `reprice-layer` mislabels the mechanism. `MECHANISMS` below names
 * them so a reading can say which one is actually at work; the lever stays as
 * the thing the map draws.
 *
 * A shift never redraws the chain: it marks the elements it moves, gives each
 * a status and a reading, adds an arrow where a cut moves or a price arrives,
 * and reads differently at each distance. The two shifts are exclusive in this
 * interface — hilirisasi and the green transition can compete for fiscal
 * space, energy and export earnings — so the map never shows them together,
 * which would imply the two are compatible. Where they pull against each
 * other, `TENSIONS` says so in words rather than by overlaying them.
 */
export type LeverId = 'move-border' | 'price-unpaid-joint' | 'reprice-layer';

export interface Lever {
  id: LeverId;
  label: string;
  means: string;
}

export const LEVERS: Record<LeverId, Lever> = {
  'move-border': {
    id: 'move-border',
    label: 'Move the border cut',
    means: 'Hilirisasi — downstreaming: a margin that was captured abroad is captured at home.',
  },
  'price-unpaid-joint': {
    id: 'price-unpaid-joint',
    label: 'Price a joint that was free',
    means: 'Producer responsibility, a carbon price, formal recycling: a transfer that carried no money now does.',
  },
  'reprice-layer': {
    id: 'reprice-layer',
    label: 'Re-price a layer',
    means: 'An energy subsidy comes off; the cost of capital for green assets is pushed down — one price that every stage pays changes at once.',
  },
};

/**
 * What is actually doing the work at an element, which is often not the lever
 * the map draws. `price` is the honest answer only when the thing that moves
 * is a price; the other four are what the three levers cannot express.
 */
export type MechanismId = 'price' | 'capacity' | 'contract' | 'operating-rights' | 'risk-allocation';

export const MECHANISMS: Record<MechanismId, { label: string; means: string }> = {
  price: { label: 'A price changes', means: 'The amount paid at this transfer, or for this layer, is what moves.' },
  capacity: {
    label: 'Capacity is built',
    means: 'The physical ability to produce, carry, store or connect does not exist at the required scale and has to be built. A price signal can prompt it; it cannot substitute for it.',
  },
  contract: {
    label: 'A contract is renegotiated',
    means: 'The asset and the price exist, but the terms binding them — tenor, take-or-pay, exclusivity, dispatch priority — prevent the change. Inflexibility is not scarcity.',
  },
  'operating-rights': {
    label: 'Operating rights move',
    means: 'Who is permitted to run, connect to or sell from an asset changes. The asset need not change at all.',
  },
  'risk-allocation': {
    label: 'Risk moves to another party',
    means: 'A guarantee, an offtake or a subordinated tranche moves who bears a loss. The risk does not disappear; the party holding it changes, and so does the price of capital.',
  },
};

export type ShiftId = 'reindustrialisation' | 'green';

/* ── Condition: where a marked element stands ────────────────────────────── */

/**
 * Three statuses — and they are NOT three positions on one dial.
 *
 * Stuck reads an obstacle, Moving reads activity, Unpriced reads a payment
 * condition. Those are three different dimensions, and an element can be more
 * than one at once: a joint can carry no price AND have an investment under
 * way, and one that is moving can still be what holds the shift back. So a
 * mark does not report a measurement. It shows THE ONE CONDITION THE AUTHOR
 * JUDGED MOST DECISIVE for this shift at this element, and the panel says
 * which dimension that is and on what basis the judgment was made.
 *
 * Told by FORM — a filled disc, an open disc, a dashed disc on the mark; a
 * heavy, a plain, a dashed outline on the element — and never by colour
 * alone. The words are the brief's: macet, sedang bergerak, belum berharga.
 */
export type ConditionStatus = 'stuck' | 'moving' | 'unpriced';

export interface StatusInfo {
  id: ConditionStatus;
  label: string;
  /** One line: what the status claims about the element. */
  means: string;
  /** Which dimension it reads on. Three dimensions, not three values of one. */
  reads: string;
  /** The form of the mark and the outline, so the status reads without colour. */
  form: 'filled' | 'open' | 'dashed';
}

export const STATUS: Record<ConditionStatus, StatusInfo> = {
  stuck: {
    id: 'stuck',
    label: 'Stuck',
    means: 'Of the things that could hold this shift back here, this element is the one the author judges decisive.',
    reads: 'Obstacle. It does not claim nothing is happening here, and an element can be stuck and moving at once.',
    form: 'filled',
  },
  moving: {
    id: 'moving',
    label: 'Moving',
    means: 'A policy or an investment is already under way at this element.',
    reads: 'Activity, and activity has a direction. Moving does not mean moving the right way, and it does not mean the element has stopped being a constraint.',
    form: 'open',
  },
  unpriced: {
    id: 'unpriced',
    label: 'Unpriced',
    means: 'No money changes hands at this transfer, so nothing here is measured as a transaction.',
    reads:
      'A payment condition, not an existence claim. Unpriced activity is real, it is within the national-accounts production boundary, and it is often someone\u2019s livelihood \u2014 it is simply not counted where a price would be.',
    form: 'dashed',
  },
};

/**
 * The one thing a status does NOT say, said once rather than three times.
 */
export const STATUS_NOTE =
  'These three read different things \u2014 an obstacle, an activity, a payment condition \u2014 so they are not exclusive and not a scale. A mark shows the condition selected as most decisive for this shift at this element, not a measurement of it.';

/**
 * How a status was arrived at.
 *
 * `scenario` is the default and the honest label for most of this map: the
 * status was set from the brief’s own worked examples and from the reading
 * already written for the element, not from evidence about a present
 * condition. `assessed` is reserved for an element whose four lines are
 * written and whose claim can be checked against a named source.
 *
 * The distinction is the whole point. A status that implies an empirical
 * present condition needs evidence appropriate to that claim, and a map that
 * cannot tell the two apart makes sixteen scenarios look like sixteen
 * findings.
 */
export type ConditionBasis = 'assessed' | 'scenario';

export const BASIS: Record<ConditionBasis, { label: string; means: string }> = {
  assessed: {
    label: 'Assessed',
    means: 'Read against a specific case, with the essay that carries the evidence linked below.',
  },
  scenario: {
    label: 'Scenario',
    means:
      'A worked illustration of how this element would behave under the shift, not a finding about where it stands today. Nothing has been checked against a source, and the lines the reading would need are unwritten.',
  },
};

/** When the condition layer’s readings were last reviewed. An undated standing claim is undated, not timeless. */
export const CONDITION_AS_OF = '2026-09-14';

/** A slot the owner has not written yet. The panel omits it; `grep UNWRITTEN` lists the work. */
export const UNWRITTEN: LensNote = { economy: '', finance: '' };

/**
 * The owner's reading of one marked element under one shift. Every line is
 * written in ONE voice at a time — the economy voice and the finance voice
 * are two slots, and the panel shows only the one the distance control has
 * on. The four lines, in the order the panel keeps:
 *
 *   now     where it stands today
 *   holds   what is still missing, what holds it
 *   lever   which of the three levers moves it, and what that lever does HERE
 *   funds   who finances the move
 *
 * The status is what the map shows before anything is clicked; it is the
 * one field a mark cannot do without. The lines are the owner's diagnosis:
 * nothing here is inferred, and an empty slot is left empty (`UNWRITTEN`)
 * rather than filled with a placeholder the reader could see.
 */
export interface Condition {
  status: ConditionStatus;
  /**
   * Whether this is a finding or an illustration. REQUIRED: the field exists
   * so that the answer cannot be left to the reader's assumption, and the
   * assumption a mark invites is "assessed".
   */
  basis: ConditionBasis;
  now: LensNote;
  holds: LensNote;
  lever: LeverId;
  /**
   * What is actually doing the work here, when it is not the lever the map
   * draws. Omitted means `price` — the lever and the mechanism agree.
   */
  mechanism?: MechanismId;
  /** What the lever does at this element. */
  action: LensNote;
  /**
   * Who finances the move. Three different roles, and they are usually
   * different parties: who provides the capital, who pays for it over the
   * asset's life, and who bears the loss if it fails. A reading that names
   * only the first has answered the easiest third of the question.
   */
  funds: LensNote;
}

/**
 * An essay that reads one target under one shift. The owner fills these in;
 * nothing is inferred from a title. `/essays/:slug` resolves for every
 * published essay and redirects to the canonical URL where one exists, so a
 * row needs no placement fields to be a working link.
 */
export interface ShiftArticle {
  /** essays.slug — the essay itself, never a module. */
  slug: string;
  /** How the title should read in the panel. */
  title: string;
}

/**
 * A joint, layer, stage, node, border or return the shift moves, and the
 * owner's reading of its condition.
 *
 * A target carries a numbered mark on the map only where it has a condition
 * — the mark is a promise of a status and a panel, and an empty panel is
 * worse than no mark. Leaving `condition` out is therefore how a target is
 * parked: listed here, absent from the map, and no hole where it would have
 * been. The set of marks is the same at both distances by construction, so
 * moving the distance control re-reads the marks instead of renumbering
 * them.
 */
export interface ShiftTarget {
  id: string;
  condition?: Condition;
  /** Owner-maintained. Empty until an essay actually reads this target. */
  articles?: readonly ShiftArticle[];
}

/**
 * An arrow drawn on the overlay. A `cut` moves from one place on the chain to
 * another — the border pushed right. A `price` arrives at a joint that had
 * none — the arrow comes up to the joint from below, where money runs.
 */
export type ShiftMove =
  | { id: string; kind: 'cut'; from: string; to: string; label: string }
  | { id: string; kind: 'price'; at: string; label: string };

/** A short label pinned to a target on the overlay. */
export interface ShiftCallout {
  id: string;
  at: string;
  label: string;
}

export interface ShiftCriterion {
  label: string;
  means: string;
  /** An evidenced or clearly-labelled hypothetical case where the shift succeeds on the map and fails on the motive. */
  counterexample: string;
  /** The author decision this shift forces and that nothing here settles. */
  unresolved: string;
}

export interface Shift {
  id: ShiftId;
  label: string;
  /** The word in the sentence that is the control. */
  word: string;
  levers: LeverId[];
  /** What the shift is FOR, where that is not the same as what the map measures. */
  criterion?: ShiftCriterion;
  /**
   * The shift as a whole, read from far and from close. Not drawn under the
   * About plate any more — nothing is — but kept as the frame text the
   * Green Transition section can set around the same component.
   */
  read: LensNote;
  targets: ShiftTarget[];
  moves: ShiftMove[];
  callouts: ShiftCallout[];
}

/*
 * STATUSES ARE PROVISIONAL. Each was set from the brief's own examples
 * (logistics and warehousing set the floor: stuck; formal recovery is not yet
 * priced: unpriced; a policy or investment under way: moving) and from the
 * reading already written for the target. The owner confirms or flips them;
 * the table in the pull request lists every one. The `action` line of each
 * target is the earlier "what moves here" reading, kept because that is what
 * it always described: the lever's work at this element. `now`, `holds` and
 * `funds` are UNWRITTEN until the owner writes them.
 */
export const SHIFTS: Shift[] = [
  {
    id: 'reindustrialisation',
    label: 'Reindustrialisation',
    word: 'reindustrialisation',
    levers: ['move-border'],
    read: {
      economy:
        'Follow a downstreaming scenario: more processing takes place before export, bringing domestic value added into view. Imported equipment and inputs can offset foreign-exchange gains, especially while plants are built. The result depends on domestic capability, energy use and demand for the processed product. Note what this overlay can and cannot show: moving the border cut is ONE mechanism of reindustrialisation, and reindustrialisation is a wider agenda \u2014 industrial capability, diversification, productivity, better work \u2014 that a border cut does not stand in for.',
      finance:
        'Does the domestic processing margin justify capex and the working capital required? Test utilisation, input costs, selling prices and cost of capital together. Fixed assets need long-term funding; inventories and receivables still need working-capital finance.',
    },
    /**
     * WHY THIS SHIFT IS WANTED, kept beside it because the map otherwise
     * measures it by domestic value added alone — and value added, private
     * profitability and employment are three different outcomes that a
     * downstreaming scenario can move in three different directions.
     */
    criterion: {
      label: 'Employment through reindustrialisation',
      means:
        'The stated motive is durable formal work, with decarbonisation as a vehicle rather than the goal. So a border cut that raises domestic value added has not yet shown anything about the motive. Four distinctions the map cannot draw and a reading must make: construction employment against employment once the plant runs; gross jobs against net of what the change displaces; the quality and formality of the work; and the public cost per job, counted against what the same money would have bought elsewhere.',
      counterexample:
        'A hypothetical that makes the gap concrete, and it is labelled hypothetical because no sourced Indonesian estimate is used here: a capital-intensive smelter can raise domestic value added, be privately profitable at a supported power price, employ fewer people per unit of output than the trade it replaced, and still cost the state more per durable job than the fiscal support it consumed. Every arrow on this overlay would point the right way.',
      /**
       * The trade-off the author has to settle, prepared rather than
       * answered. A map that resolved it silently would be inventing a moral
       * priority.
       */
      unresolved:
        'Where the two objectives conflict \u2014 a configuration with more near-term jobs and higher emissions or higher public cost, against a cleaner one with fewer \u2014 which constraint governs? Naming it as a binding constraint (an emissions ceiling, a minimum durable-jobs threshold, a maximum public cost per job) is a decision, and it is not made here.',
    },
    targets: [
      {
        id: 'border-export',
        condition: {
          status: 'moving',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'move-border',
          action: {
            economy: 'The cut moves right: what crosses here is processed, not raw.',
            finance: 'The export price becomes a processed price: a conversion margin is captured before the border.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'j-extraction-processing',
        condition: {
          status: 'moving',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'move-border',
          action: {
            economy: 'More material is processed domestically before export; tax and royalty effects depend on the policy and pricing arrangements.',
            finance: 'A domestic buyer changes pricing, offtake risk and payment terms; a domestic sale is not necessarily an intra-group transfer.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'stage-processing',
        condition: {
          status: 'moving',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'move-border',
          action: {
            economy: "The capacity built here is the reindustrialisation: basic industry's share of value added.",
            finance: 'Capex, cost of capital, utilisation — the three things the conversion margin has to cover.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'j-processing-trader',
        condition: {
          status: 'moving',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'move-border',
          action: {
            economy: 'Processed goods leave here now: the external balance is read one joint further right.',
            finance: "Processing's conversion margin is the return on the smelter; the by-product finds a market or becomes a cost.",
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'border-import',
        condition: {
          status: 'stuck',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'move-border',
          action: {
            economy: 'The import share of intermediates falls; capital goods imports rise while the plants are built.',
            finance: 'Less landed cost and less exchange-rate exposure in cost of sales — after a capex that is itself mostly imported.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'node-trader',
        condition: {
          status: 'stuck',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'move-border',
          action: {
            economy: 'Import intermediation can shrink where competitive domestic inputs replace landed inputs; trading functions can also adapt.',
            finance: 'The spread on landed inputs is the margin domestic processing has to beat.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'j-trader-manufacturing',
        condition: {
          status: 'stuck',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'move-border',
          action: {
            economy: 'Domestic intermediates replace imported ones behind manufacturing.',
            finance: 'Input cost moves from landed cost to domestic conversion cost; import finance gives way to supplier credit.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'stage-manufacturing',
        condition: {
          status: 'stuck',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'move-border',
          action: {
            economy: 'Domestic inputs can reduce import content; imported equipment, energy and components still matter.',
            finance: 'Compare a domestic input with landed alternatives. Domestic prices can remain linked to foreign exchange and international commodity prices.',
          },
          funds: UNWRITTEN,
        },
      },
    ],
    moves: [{ id: 'move-export-cut', kind: 'cut', from: 'border-export', to: 'j-processing-trader', label: 'The export cut moves right' }],
    callouts: [{ id: 'callout-import-share', at: 'border-import', label: 'Domestic input option' }],
  },
  {
    id: 'green',
    label: 'Green transition',
    word: 'green transition',
    levers: ['price-unpaid-joint', 'reprice-layer'],
    read: {
      economy:
        'Follow a transition scenario through energy, credit and recovery. Energy-subsidy reform and carbon pricing can change production costs and fiscal balances. Producer responsibility can fund collection and recovery. Fossil-export receipts, imported clean equipment and avoided fuel imports pull the external balance in different directions.',
      finance:
        'Test project cash flows together with financing terms. Performance, utilisation, energy use and offtake determine operating economics; guarantees or concessional capital can change risk allocation and funding cost. Producer responsibility can support a recovery revenue line where collection costs were previously unfunded.',
    },
    targets: [
      /*
       * THE ONE WORKED READING. Every other mark on this map is a scenario;
       * this one is assessed, against a bounded case — Indonesian nickel
       * downstreaming, the RKEF and HPAL plants commissioned between 2025 and
       * 2035, and the captive generation built alongside them. It is here, and
       * not on a more obvious element, for two reasons: it is the element the
       * one completed argument on this site is actually about, and it is where
       * the three-lever vocabulary breaks usefully. The map can only draw a
       * repricing. What moves this element is a contract.
       *
       * The status is `moving` and that is not good news. Investment IS under
       * way here; its direction is the whole problem. A status that could only
       * mean progress would have been unable to say so.
       */
      {
        id: 'band-energy',
        condition: {
          status: 'moving',
          basis: 'assessed',
          lever: 'reprice-layer',
          mechanism: 'contract',
          now: {
            economy:
              'Power for new processing capacity is being decided plant by plant rather than by the grid. Captive generation is built alongside the smelter, sized to it and contracted for its life, so the electricity a plant will still be using decades from now is chosen in the same decision that approves the plant. The regulation restricting new coal generation carries an exception for integrated industrial and nationally strategic projects, conditional on a commitment to cut emissions within a fixed period and to stop operating by a stated date \u2014 so the exception permits captive coal to accompany processing. The article, the threshold and the dates are in the essay.',
            finance:
              'A capital-structure fact before it is an energy fact. The captive plant, the smelter it powers, the offtake behind them and the security package over both are one financing, and the power contract runs the life of the asset. That is what separates this exposure from a fuel price: a fuel price can be traded out later, and there is no counterparty to trade with when the generation is yours and the contract is your own.',
          },
          holds: {
            economy:
              'Clean firm power at industrial-estate scale, and the network to move it. Installed variable renewable capacity here is far behind the nearest regional comparator; the figures are in the essay. The electricity supply plan, the long-term development plan, the coal-generation regulation and the finance ministry\u2019s carbon-pricing work each touch part of this, and none of them is addressed to industrial-estate power specifically. Generation, network capacity and a connection at the plant gate are three different shortages, and only the first is usually counted.',
            finance:
              'Not, in general, money. The headline transition-finance commitment mixes pledges, approvals, contracted finance and disbursement, so the total says little about what has reached a connection. Where finance does bind, it usually binds on TIMING rather than on lifetime returns: an early-stage clean asset can have sound economics across its life and still fail debt-service coverage in its first years. Treating a timing failure as inadequate returns spends the subsidy on the wrong problem.',
          },
          action: {
            economy:
              'Repricing energy \u2014 subsidy reform, a carbon price \u2014 changes what power costs every stage at once, which is what this map can draw. It is not what moves this element. A captive plant already under construction is choosing a vintage, not responding to a price. What changes it is clean firm power that exists where the plant is, and a power contract that can be separated from the plant\u2019s own financing.',
            finance:
              'Price the liability into the vintage rather than into the tariff. Screen the asset and structure its debt around one transition path: grace matched to ramp-up, amortisation sculpted to cash available for debt service, and major reinvestment \u2014 a furnace reline, a battery replacement \u2014 held outside senior maturity instead of being allowed to break coverage inside it. Extending tenor without that makes coverage worse, not better.',
          },
          funds: {
            economy:
              'Three roles, usually three different parties. Capital comes from sponsors and their lenders, and increasingly from state balance sheets: a new public allocator was established by statute at the moment this vintage is being set. Payment over the asset\u2019s life comes from the buyer of the processed product through the price, and from the public wherever a guarantee or a concession is granted. The loss, if the liability arrives, falls on whoever still holds the asset \u2014 and where that is a state entity, on the public a second time.',
            finance:
              'Capital provider: sponsor equity, senior lenders, and concessional or state capital where it enters. Payer over life: the offtaker through the contracted price, over a tenor set by the power contract rather than by the working-capital cycle this layer normally carries. Loss bearer: a guarantee moves a defined risk to the guarantor \u2014 grid completion, delay \u2014 and lowers the cost of capital because of that transfer. It does not remove the risk, and a guarantee written over commodity losses, or over indefinite coal dependence, has moved the wrong one.',
          },
        },
        articles: [
          {
            slug: 'indonesias-reindustrialization-bet',
            title: 'Indonesia\u2019s Reindustrialization Bet',
          },
        ],
      },
      {
        id: 'band-logistics',
        condition: {
          status: 'stuck',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'reprice-layer',
          action: {
            economy:
              'An improvement made at a stage does not travel with the goods: each touch adds its own energy and its own emission, so the unit carries a burden no single stage can remove on its own. Hold the fleet and the drop pattern constant \u2014 diesel road transport, tiered trade, an archipelago\u2019s touches per unit \u2014 and that burden behaves like a floor, and it is a high one. It is a floor under THAT configuration, not a minimum across all technologies: change the fleet, the drop density or the number of touches and the floor moves.',
            finance:
              'Two questions this layer invites you to merge. Cost: the fee is revenue to the provider and an operating cost to whoever buys the service. Emissions: the GHG Protocol\u2019s transport-and-distribution guidance counts fuel, purchased electricity AND refrigerant, and a purchased third-party service carries the provider\u2019s direct and purchased-energy emissions into the buyer\u2019s indirect account. Which account they land in is decided by the reporting boundary, not by whether the provider books revenue gross or net \u2014 the gross-and-net question at a node is about control of the goods and answers nothing here. Lowering the emission means fewer touches, denser drops or a different fleet, and each is a capital decision with its own payback.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'band-cold-chain',
        condition: {
          status: 'stuck',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'reprice-layer',
          action: {
            economy:
              'A second burden on top of the first, and not the same burden. Holding a temperature costs energy continuously rather than per kilometre, and the refrigerant itself leaks \u2014 an emission with no fuel behind it. A cold store on the grid follows the grid\u2019s intensity; a reefer on a vehicle burns fuel. The drops that need cold most are often the smallest and the farthest, so the cost per unit is highest exactly where the margin is thinnest.',
            finance:
              'What is priced here is a temperature held between two hands. The fee, the energy and the emission do not travel together: the energy is grid electricity or vehicle fuel depending on where the cold is held, and refrigerant loss sits outside both. Which nodes can hold stock at all is decided by who can afford the cold, so this layer sets the shape of the chain as much as its cost.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'band-credit',
        condition: {
          status: 'moving',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'reprice-layer',
          action: {
            economy:
              'A different instrument from the one this layer carries at rest. The credit riding on the chain normally is working capital \u2014 receivables, inventory, payables, a cycle measured in days. What a transition needs here is asset finance against a plant that must run for decades, and guarantees over the risks that stop it being built. Concessional capital and guarantees can lower the cost of capital for green assets; they do it by changing who bears which risk, not by removing the risk.',
            finance:
              'Read the change in tenor before anything else. A working-capital facility is priced off a cash conversion cycle; project debt against a processing asset is priced off coverage across the asset\u2019s life, and the two fail differently. Debt-service coverage \u2014 cash available for debt service over scheduled service \u2014 can fail in the first years on a project whose lifetime returns are sound, while loan-life coverage tests something else entirely. A timing failure needs a different instrument from inadequate returns. And a guarantee moves a defined risk to the guarantor: it lowers funding cost because of that transfer, and written over commodity losses it has not removed a risk, it has bought one.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'j-consumption-recovery',
        condition: {
          status: 'unpriced',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'price-unpaid-joint',
          action: {
            economy: 'Producer responsibility or a deposit can fund collection; carbon pricing charges emissions where policy places the obligation, not necessarily at disposal.',
            finance: 'Collection and gate fee become revenue at recovery; the producer books the levy as a cost of the unit it sold.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'stage-recovery',
        condition: {
          status: 'unpriced',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'price-unpaid-joint',
          action: {
            economy: 'More recovery can become viable and measurable; existing informal production is already within the national-accounts boundary.',
            finance: 'Recovered-material revenue against a virgin-input price.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'return-postconsumer-material',
        condition: {
          status: 'unpriced',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'price-unpaid-joint',
          action: {
            economy: 'The loop is formalised: recyclate re-enters as an industrial input, and is counted.',
            finance: 'A secondary input priced against virgin material; the collection cost is what it competes on.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'return-postconsumer-organic',
        condition: {
          status: 'unpriced',
          basis: 'scenario',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'price-unpaid-joint',
          action: {
            economy: 'Compost re-enters as a farm input; the organic loop closes inside the count.',
            finance: 'A farm input priced against fertiliser.',
          },
          funds: UNWRITTEN,
        },
      },
    ],
    moves: [{ id: 'move-recovery-price', kind: 'price', at: 'j-consumption-recovery', label: 'A price arrives here' }],
    callouts: [{ id: 'callout-new-price', at: 'j-consumption-recovery', label: 'Who pays for recovery?' }],
  },
];

/**
 * Where the two shifts pull against each other.
 *
 * Showing two scenarios one at a time keeps their mechanisms separable, which
 * is why this interface does that. What it does NOT do is explain a conflict,
 * and a reader who sees each overlay alone can come away believing both can
 * be run at once at full strength. These are the places they compete for the
 * same thing, written out rather than drawn, because a second overlay would
 * imply they compose.
 */
export interface Tension {
  id: string;
  /** The element both shifts touch. */
  at: string;
  label: string;
  note: LensNote;
}

export const TENSIONS: Tension[] = [
  {
    id: 'tension-energy',
    at: 'band-energy',
    label: 'The same electricity',
    note: {
      economy:
        'Both shifts land on this layer and want opposite things from it. Reindustrialisation wants power that is abundant, firm and cheap at the plant gate, soon enough to justify the plant; the green transition wants power that is clean, which today means less firm and, at industrial-estate scale, not yet built. The conflict is not about ambition. It is about which one gets the electricity that exists, and about who pays for the gap while the rest is built \u2014 and a plant approved before that is settled has answered the question by default.',
      finance:
        'One asset, two incompatible financings. Cheap firm power contracted for the life of a smelter is what makes the processing margin bankable; the same contract is what makes the asset\u2019s carbon liability un-tradeable. Concessional capital aimed at the second can end up lowering the cost of capital for a configuration that locks in the first. The instrument that resolves this is not a subsidy on either side but a contract that can be separated from the plant it powers.',
    },
  },
];

export const SHIFT_BY_ID = Object.fromEntries(SHIFTS.map((s) => [s.id, s])) as Record<ShiftId, Shift>;

/**
 * A target earns a mark on the map only when it has a condition — a status
 * to show before the click and a panel to open on it. This is what keeps the
 * marked set identical at economy and at finance: the shift control decides
 * WHICH elements are marked, the distance control decides only what a mark
 * then says.
 */
export const isMarked = (target: ShiftTarget): boolean => target.condition !== undefined;

/** The marked targets of a shift, in the order this file happens to list them — NOT reading order. */
export const markedTargets = (shift: ShiftId): ShiftTarget[] => SHIFT_BY_ID[shift].targets.filter(isMarked);

/** The target record for an id under a shift, or nothing when the shift does not move it. */
export function shiftTarget(shift: ShiftId | null, id: string): ShiftTarget | undefined {
  if (!shift) return undefined;
  return SHIFT_BY_ID[shift].targets.find((t) => t.id === id);
}

/** The status of an element under a shift, or nothing when it carries no mark there. */
export function targetStatus(shift: ShiftId | null, id: string): ConditionStatus | undefined {
  return shiftTarget(shift, id)?.condition?.status;
}

/** True when a line of the condition has been written at this distance. */
export const isWritten = (note: LensNote | undefined, lens: LensId): boolean => !!note && note[lens].trim() !== '';

/* ── Identity: a permanent slug per element ──────────────────────────────── */

/**
 * What a number is NOT. A mark on the map shows a number, and the number is
 * a position in a reading order that is renumbered every time the overlay
 * changes. Identity is this table instead: one permanent slug per element,
 * never shown as a number, never changed when an overlay changes, and never
 * reused for a different element.
 *
 * It is what an essay links to and what the URL carries
 * (`?lens=green&distance=finance&node=energy`), so a slug here is a public
 * address: rename one and every link written against it breaks. The unit
 * test pins the whole table verbatim for exactly that reason.
 */
export const SLUGS: Record<string, string> = {
  // Transformation stages
  'stage-biological': 'biological-production',
  'stage-extraction': 'extraction',
  'stage-processing': 'processing',
  'stage-packaging': 'packaging',
  'stage-manufacturing': 'manufacturing',
  'stage-consumption': 'consumption',
  'stage-recovery': 'recovery',
  // Intermediary nodes
  'node-aggregation': 'aggregation',
  'node-trader': 'trader',
  'node-principal': 'principal',
  'node-distributor': 'distributor',
  'node-wholesaler': 'wholesaler',
  'node-retail': 'retail',
  'node-retail-general': 'retail-general-trade',
  'node-retail-modern': 'retail-modern-trade',
  'node-retail-ecommerce': 'retail-ecommerce',
  'node-retail-quick': 'retail-quick-commerce',
  'node-retail-horeca': 'retail-horeca',
  // Enabling layers
  'band-logistics': 'logistics',
  'band-cold-chain': 'cold-chain',
  'band-capital': 'capital-finance',
  'band-credit': 'credit',
  'band-energy': 'energy',
  'band-governance': 'governance',
  'band-regulation': 'regulation',
  // Borders
  'border-export': 'border-export',
  'border-import': 'border-import',
  // Joints
  'j-production-aggregation': 'production-aggregation',
  'j-extraction-processing': 'extraction-processing',
  'j-aggregation-processing': 'aggregation-processing',
  'j-processing-trader': 'processing-trader',
  'j-trader-manufacturing': 'trader-manufacturing',
  'j-packaging-manufacturing': 'packaging-manufacturing',
  'j-manufacturing-distribution': 'manufacturing-distribution',
  'j-distributor-wholesaler': 'distributor-wholesaler',
  'j-wholesale-retail': 'wholesale-retail',
  'j-retail-consumption': 'retail-consumption',
  'j-consumption-recovery': 'consumption-recovery',
  // Physical returns, and the branch that is not one
  'return-scrap': 'return-scrap',
  'return-commercial': 'return-commercial',
  'return-packaging': 'return-packaging',
  'return-postconsumer-material': 'return-postconsumer-material',
  'return-postconsumer-organic': 'return-postconsumer-organic',
  'return-secondary': 'return-secondary',
  'branch-byproduct': 'byproduct',
};

const ID_BY_SLUG: Record<string, string> = Object.fromEntries(Object.entries(SLUGS).map(([id, slug]) => [slug, id]));

/** The public address of an element, or its id where the table has none. */
export const slugOf = (id: string): string => SLUGS[id] ?? id;
/** The element a public address names, or nothing when the address is unknown. */
export const idOfSlug = (slug: string): string | undefined => ID_BY_SLUG[slug];

/* ── The short version: a view over the same records ─────────────────────── */

/* ── The overview: one drawing, two levels of grouping ───────────────── */

/**
 * WHAT CHANGED, AND WHY IT IS NOT A SECOND MODEL.
 *
 * The landing page used to carry a TASTER: a short plate with no doors, no
 * chips and no marks, whose controls could not act, and whose meaning only
 * arrived after pressing "See the full chain". That is the wrong shape for a
 * map that is the site's primary object rather than an illustration after a
 * manifesto.
 *
 * The overview is now the SAME DRAWING at a coarser grouping. One layout
 * function in scripts/build-chain-plate.mjs emits both levels from these
 * records, so the two cannot disagree about what exists, what connects to
 * what, or where a mark sits. `detail` does one thing: it un-groups. It does
 * not add a relation, start a tutorial, or change the distance.
 *
 * WHAT SURVIVES THE GROUPING, checked rather than assumed: every enabling
 * layer, every border, every non-physical flow, every return with its own
 * destination, and every element either shift marks. Ten of the eleven joints
 * are drawn; the eleventh is internal to a group and named below. So the
 * distance control has chips to re-word and both overlays have marks to
 * raise — at the overview, without expanding anything.
 *
 * GROUPING MUST NOT CHANGE MEANING. Four traps, each guarded by a test:
 *   - aggregation feeds from BIOLOGICAL only; extraction reaches processing
 *     directly, and a grouped drawing must not imply otherwise;
 *   - packaging is a PARALLEL INPUT to manufacturing, never a stage after it;
 *   - recovery does not send everything back to one place — which is why the
 *     returns are NOT grouped (see RETURNS_UNGROUPED below);
 *   - putting two functions in one box does not make their margins addable.
 */

/**
 * The two levels of grouping the one drawing is emitted at. `overview` is the
 * resting level of the landing page; `detail` un-groups. There is no third.
 */
export type ChainLevel = 'overview' | 'detail';

export interface OverviewGroup {
  id: string;
  label: string;
  /** The source records this one box stands for. */
  members: readonly string[];
  /** What stays true of those members while they share a box. */
  keeps: string;
  /** What `detail` puts back. */
  opens: string;
}

export const OVERVIEW_GROUPS: Record<string, OverviewGroup> = {
  'group-distribution': {
    id: 'group-distribution',
    label: 'Distribution and wholesale',
    members: ['node-distributor', 'node-wholesaler'],
    keeps:
      'Both take title and transform nothing, and both sell into retail. The transfer between them is real and is still a joint — it is simply internal to this box at this level. Their spreads are two spreads and do not add into one.',
    opens: 'The distributor and the wholesaler as separate nodes, the joint between them, and the sub-distributor recursion.',
  },
  'group-retail': {
    id: 'group-retail',
    label: 'Retail',
    members: ['node-retail-general', 'node-retail-modern', 'node-retail-ecommerce', 'node-retail-quick', 'node-retail-horeca'],
    keeps:
      'One stock-holding intermediary function. The five formats differ in shelf margin, cost to serve and who can afford to supply them; grouping them says they share a function, not a margin.',
    opens: 'The five formats as rows.',
  },
};

/** The joints that exist but are internal to an overview group, so are drawn only on detail. */
export const OVERVIEW_INTERNAL_JOINTS = ['j-distributor-wholesaler'] as const;

/**
 * Everything the overview does not draw as its own element. Of these only the
 * joint is a DOOR, so it is the only one an address can name — but the test
 * reads this list rather than that fact, so a change of grouping cannot
 * quietly strand a link.
 */
export const OVERVIEW_HIDES: readonly string[] = [
  ...OVERVIEW_INTERNAL_JOINTS,
  ...OVERVIEW_GROUPS['group-distribution'].members,
  ...OVERVIEW_GROUPS['group-retail'].members,
];

/** True when the overview draws this element under its own id. */
export const drawnAtOverview = (id: string): boolean => !OVERVIEW_HIDES.includes(id);

/**
 * Detail that the overview leaves out, named so the reduction is inspectable
 * rather than a matter of taste. Nothing here is a RELATION; every one is an
 * example, a sub-format or a note.
 */
export const OVERVIEW_OMITS = [
  { what: 'The example lanes fanning into the two origins', why: 'They are examples of a function, not links in the chain.' },
  { what: 'The three demand components inside consumption', why: 'They divide a destination; they do not add a transfer.' },
  { what: 'The five retail formats', why: 'Grouped into the retail node, which keeps the function and the joint.' },
  { what: 'The distributor\u2019s sub-distributor recursion', why: 'A note on how deep one node can nest, not another node.' },
] as const;

/**
 * The returns are NOT grouped, deliberately.
 *
 * Grouping them was available and was declined: the six returns have five
 * different destinations, and any grouping that fits on one arrow would have
 * to pick one. "Everything comes back to processing" is exactly the false
 * claim the brief warns about — and it is what the old taster drew, with a
 * single "Returns → Primary processing" arrow standing for all six.
 */
export const RETURNS_UNGROUPED =
  'Six returns, five destinations. Recyclate and compost leave recovery for different chains; a commercial return goes back to the distributor and a packaging return to the manufacturer. One arrow cannot say that.';

/* ── Copy ────────────────────────────────────────────────────────────────── */

/**
 * There is no legend. Every category is told by its own form, and the
 * definition a legend would have carried is read on the element itself, on
 * hover or focus. These are those one-line definitions, in the words the
 * legend used to hold.
 */
export const DEFINE = {
  stage: 'Transformation stage — changes the form of the goods; its margin is a conversion margin',
  origin: 'Origin stage — where a chain starts; the fan on its left lists examples of the function',
  node: 'Intermediary node — takes title, transforms nothing; revenue gross; its margin is a spread',
  retail: 'Stock-holding retail format — a node: takes title, transforms nothing; revenue gross; its margin is the shelf spread',
  layerFee: 'Enabling layer — takes no title; sells capacity or a service for a fee, and adds its own cost, energy and emission at every touch',
  layerTerms: 'Enabling layer — takes no title and earns nothing itself; it sets the terms the functions trade on',
  joint: 'Joint — a transfer of goods or title; the margin cut here belongs to the function that sells',
  return: 'Physical return — goods moving back up the chain',
  byproduct: 'By-product — leaves processing forward into another chain; not a return',
  border: 'Border — where the chain crosses the external sector',
  economy: 'Economy — every joint read from far, as the place a macro variable enters the chain',
  finance: 'Finance — every joint read from close, as the process that makes the good worth more to the next hand; the margin measures it',
  /** The tick on a layer band: where the service attaches and its fee is paid. */
  tick: 'attaches here',
} as const;

export const CHAIN_COPY = {
  /**
   * A TITLE, NOT A HEADLINE. This is the page's own heading on the landing
   * page now that nothing precedes the map, so it names the object rather
   * than making a claim about it. The claim it used to make — "Every joint in
   * this chain is a margin" — and the correction under it about margins not
   * aggregating into value added were both doing work, and neither is lost:
   * the margin kind is on every joint's panel and `basis` below carries the
   * value-added distinction into the Economy reading.
   */
  title: 'The industry chain',
  /** The owner's line, once, as a short line under the title. */
  standfirst: 'Nothing here is complicated. It only looks that way from the wrong distance.',
  /** The distance control is this sentence: the two lens names in it are the two positions. */
  lead: {
    before: 'Read the chain as an ',
    economy: 'economy',
    middle: ', or inspect its margins through ',
    finance: 'finance',
    after: '.',
  },
  /**
   * The shift control is this sentence: the two shift words in it are the two
   * overlays; neither on is the resting state. The sentence also draws the
   * line the brief insists on — what a shift shows is a reading, not anatomy.
   */
  shiftLead: {
    before: 'Then follow ',
    middle: ' or the ',
    after: ' — one at a time, over the same chain. What a shift marks is my reading of where the chain stands, not part of its anatomy.',
  },
  /**
   * WHAT OPENS, said once in the introduction rather than drawn as a legend.
   *
   * The plate has a hundred shapes and four of them are doors. A sighted
   * reader with a mouse discovers which by moving the pointer around until
   * something reacts; a reader using a keyboard or a touchscreen has no such
   * sweep, and a prominent box reads as the main doorway when the small
   * diamond beside it is the one carrying the reading. So the doors are named.
   *
   * The last clause is a limitation stated rather than papered over: the
   * static geometry explains itself on hover and there is no equivalent for a
   * pointer that does not hover. Putting a hundred decorative paths into the
   * tab order is not the fix, and neither is pretending every box is a button.
   */
  doorsLead:
    'Two things open: a diamond on the chain, and a band beneath it \u2014 each gives the margin cut there, read at the distance that is on. Under a shift, a numbered disc opens my reading of what that shift does to the element it sits on. The rest of the plate names itself under the pointer.',
  /** One line over the map, in place of the footnote it replaces. */
  scopeLead:
    'Functions, not firms: one company can occupy several. Control of the goods, not legal title, decides principal from agent. Routes are illustrative across sectors.',
  scope: 'Functions, not firms. Routes can skip intermediaries or repeat manufacturing. Border cuts illustrate possible crossings; imports and exports can occur at other stages.',
  basis: 'Value added is output less intermediate consumption. It includes labour income and operating surplus; it is not gross profit. Economy-wide domestic value added, plus product taxes less subsidies, contributes to GDP. This goods-chain map does not cover the entire economy.',
  mobileFlows: 'Payments and demand travel upstream. Trade credit, rebates and specifications travel downstream. Physical returns have their own destinations.',
  lensName: { economy: 'Economy', finance: 'Finance' } as const,
  /** Title and description for each drawing; the title names it, the description walks it. */
  aria: {
    wide: {
      title: 'The industry chain, in detail',
      desc: 'Left to right: two origins, primary processing, packaging and finished-goods manufacturing, then distribution, wholesale and retail into consumption and recovery. Intermediary nodes are dashed pills between the stages. Every joint is a mark on the flow — a filled diamond where a stage sells, an open diamond where a node sells, a square where a fee is paid — with a chip that reads it at the chosen distance, as an economy or as finance, and opens the margin cut there. Seven enabling layers run as bands directly beneath the chain, ticked where each attaches — working capital at the joints it bridges, asset and project finance at the stages it builds; energy rises into every stage from below; money and information run both ways under the bands; two dashed border lines mark where goods are exported and imported. A shift, when one is chosen, marks the elements it moves with a numbered disc whose form is its status — filled for stuck, open for moving, dashed for unpriced — numbered in reading order, left to right and then top to bottom.',
    },
    compact: {
      title: 'The industry chain, overview',
      desc: 'The same chain at a coarser grouping. Two origins, primary processing, packaging and finished-goods manufacturing, then one box for distribution and wholesale, one for retail, into consumption and recovery. Ten of the eleven joints are marks on the flow, each with its chip and each opening the margin cut there; the eleventh, the transfer between the distributor and the wholesaler, is inside their shared box and is drawn when the detail is shown. All seven enabling layers, both border lines, every return with its own destination and both money and information rails are here, and a chosen shift marks the same elements it marks on the detail.',
    },
    column: 'The industry chain, top to bottom',
  },
  /** The status line, spoken and shown in the header: what is on. */
  status: {
    marks: (n: number) => `${n} ${n === 1 ? 'mark' : 'marks'}`,
  },
  /**
   * What a number on a mark is, said where the marks are. It is a position in
   * a reading order computed from where the mark lands on the drawing — left
   * to right, then top to bottom, layers last because they are the bottom row.
   * It renumbers when the overlay changes, which is exactly why it cannot be a
   * ranking. Identity is the slug, which never moves.
   */
  markOrderNote:
    'The numbers are where a mark sits on the drawing, read left to right and then top to bottom, with the layers last. They are not a priority, a sequence or an argument order, and they renumber when the overlay changes.',
  /** The heading over the written-out conflict between the two shifts. */
  tensionsHeading: 'Where the two shifts pull against each other',
  /** Said once, over the condition layer. */
  conditionNote: (asOf: string) =>
    `What a shift marks is a reading of where the chain stands, reviewed ${asOf}. Most marks are scenarios rather than findings; each says which it is.`,
  panel: {
    jointKicker: 'At this joint',
    bandKicker: 'Enabling layer',
    /** The kicker over the owner's reading of a marked element, followed by the shift and the distance. */
    readingKicker: 'Reading',
    marginHeading: 'The margin that sits here',
    whenHeading: 'Read the other way',
    linesHeading: 'Where it shows in the financial statements',
    /**
     * THE LAYERS ON A JOINT, IN TWO GROUPS, because they are not the same
     * kind of thing. A layer that attaches at JOINTS cuts its fee at this
     * transfer: the freight, the cold, the working capital that bridges it,
     * the contract terms it happens under. A layer that attaches at STAGES
     * or nowhere — asset finance, energy, the rules — takes nothing at this
     * transfer and is still the reason it can happen at all.
     *
     * One list would have said asset finance is charged on a move. It is
     * not: it built the warehouse and the fleet the move runs on, and it
     * is priced off what those earn over their life. That is the whole
     * distinction splitting the old single finance band was for, so the
     * panel a reader actually opens should not collapse it again.
     */
    layersHeading: 'Layers charged at this transfer',
    layersBehindHeading: 'Layers standing behind it',
    layersBehindNote: 'These take nothing at this transfer. They are what makes it possible.',
    spanHeading: 'Spans',
    ridesHeading: 'Rides on',
    /** The four lines of a condition, in the order they are read. */
    now: 'Where it stands',
    holds: 'What holds it',
    lever: 'The lever',
    funds: 'Who finances it',
    /** Three roles, and they are usually three parties. */
    fundsRoles:
      'Capital provider, payer over the asset\u2019s life, and loss bearer are three roles and usually three parties. A guarantee moves the third; it does not remove it.',
    /** Where one layer is really several constraints. */
    shortagesHeading: 'Three different shortages inside this layer',
    /**
     * THE WAY DEEPER IS AN ESSAY, and it sits directly under the card rather
     * than at the bottom of four hundred words. A reader who opens an element
     * gets what it is, in a breath, and a door into the piece that argues it.
     */
    articlesHeading: 'Read this at length',
    articlesNone: 'No essay reads this yet.',
    /**
     * What the card holds back, named so the fold is a promise rather than a
     * mystery. The reading is the owner's diagnosis of where this element
     * stands: four lines in a fixed order, what the lever cannot do, and who
     * pays. Its basis and its status are NOT behind this — a mark that
     * promises a diagnosis must say on the card what kind of claim it is.
     */
    readingDisclosure: 'The reading in full',
    /** The anatomy of a joint or a layer, folded under its reading while a shift is on. */
    anatomyJoint: 'The joint itself',
    anatomyLayer: 'The layer itself',
    curriculumHeading: 'Read this joint in the curriculum',
    published: 'Published',
    /** Same word as the curriculum uses; see src/data/curriculumContract.ts. */
    comingSoon: 'Planned',
    close: 'Close',
  },
  /** The numbered marks a shift puts on the map. */
  mark: {
    /** Between a mark's number and its title, for a screen reader. */
    aria: 'Mark',
    /** Follows the title on hover: "· one essay" / "· three essays". */
    essayOne: 'essay',
    essayMany: 'essays',
    essayNone: 'no essay yet',
  },
  controls: {
    noShift: 'No shift',
    seeFull: 'Show the detail',
    seeCompact: 'Back to the overview',
    /**
     * What the level control does, and the two things it does not do, in one
     * line. It used to list the four things detail un-groups; a reader finds
     * that out by pressing the control, and the list was a third grey
     * paragraph standing between them and the drawing. The GUARANTEE is what
     * cannot be found out by pressing, so the guarantee is what stays.
     */
    levelNote: 'Detail un-groups. It adds no relation, and changes neither the distance nor the scenario.',
    /**
     * Above the two distance words inside the narrow reading sheet. On a phone
     * the reading is a modal sheet and the distance control sat outside it, so
     * comparing the two readings of one element meant closing the reading,
     * finding the control and finding the element again — the interface
     * interrupting the operation the map exists to demonstrate.
     */
    sheetDistance: 'Read this as',
    returns: 'Return flows',
    nonPhysical: 'Money and information',
    layers: 'Enabling layers',
    origin: 'Origin',
    alongside: 'alongside',
    back: 'back to',
    /** The lane label beside the joint chips, by distance. */
    readingLane: 'Reading',
    /** The switch at the left end of a layer band. */
    layerShow: 'Show layer',
    layerHide: 'Hide layer',
    /** Inside an isolated reading at the finance distance. */
    isolated: 'The rest of the chain has stepped back. Close the reading to bring it back.',
    /**
     * Said beside the controls while any layer is switched off, with the one
     * thing a faded band must never be read as meaning. Hiding a layer thins
     * the DRAWING so two layers can be compared; it does not say the service
     * has stopped being bought, or that the constraint on it has gone.
     */
    layersHidden: (n: number) =>
      `${n === 1 ? 'One layer is' : `${n} layers are`} hidden from the drawing \u2014 which changes what is drawn, not whether the service is bought or whether its constraint has gone.`,
    showAllLayers: 'Show every layer',
  },
} as const;
