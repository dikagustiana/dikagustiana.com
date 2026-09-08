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
      'Moves and holds the goods without ever owning them, so the next function gets them in the right place, at the right time and at the right temperature. It attaches at every move and injects a cost, an energy use and an emission into each one — a floor under the unit that no single stage can remove — and it weighs most where the drops are smallest and the cold chain is unbroken.',
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
    label: 'Credit and working capital',
    note: 'trade credit · inventory finance · who waits for payment',
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
        'Energy intensity, stage by stage — heaviest in extraction and primary processing. Where the state pays part of the price, the subsidy is a fiscal line every stage draws on.',
      finance:
        'What is sold here is heat, motion and light: every conversion needs them and none makes them. Fuel and power sit inside cost of sales at every stage, at a price set outside the chain, so a change is passed on or absorbed in the conversion margin.',
    },
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
 * There are exactly three levers that move the chain, and the two shifts on
 * the map pull them. A shift never redraws the chain: it marks the elements
 * it moves, gives each a status and a reading, adds an arrow where a cut
 * moves or a price arrives, and reads differently at each distance. The two
 * shifts are exclusive — hilirisasi and the green transition can compete for
 * fiscal space, energy and export earnings — so the map never shows them
 * together, which would imply the two are compatible.
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

export type ShiftId = 'reindustrialisation' | 'green';

/* ── Condition: where a marked element stands ────────────────────────────── */

/**
 * Three statuses, and only three. A status is read without a click, so it is
 * told by FORM — a filled disc, an open disc, a dashed disc on the mark; a
 * heavy, a plain, a dashed outline on the element — and never by colour
 * alone. The words are the brief's: macet, sedang bergerak, belum berharga.
 */
export type ConditionStatus = 'stuck' | 'moving' | 'unpriced';

export interface StatusInfo {
  id: ConditionStatus;
  label: string;
  /** One line: what the status claims about the element. */
  means: string;
  /** The form of the mark and the outline, so the status reads without colour. */
  form: 'filled' | 'open' | 'dashed';
}

export const STATUS: Record<ConditionStatus, StatusInfo> = {
  stuck: { id: 'stuck', label: 'Stuck', means: 'This element is what holds the shift back.', form: 'filled' },
  moving: { id: 'moving', label: 'Moving', means: 'A policy or an investment is already under way here.', form: 'open' },
  unpriced: { id: 'unpriced', label: 'Unpriced', means: 'This joint carries no price yet; economically it does not exist.', form: 'dashed' },
};

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
  now: LensNote;
  holds: LensNote;
  lever: LeverId;
  /** What the lever does at this element. */
  action: LensNote;
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

export interface Shift {
  id: ShiftId;
  label: string;
  /** The word in the sentence that is the control. */
  word: string;
  levers: LeverId[];
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
        'Follow a downstreaming scenario: more processing takes place before export, bringing domestic value added into view. Imported equipment and inputs can offset foreign-exchange gains, especially while plants are built. The result depends on domestic capability, energy use and demand for the processed product.',
      finance:
        'Does the domestic processing margin justify capex and the working capital required? Test utilisation, input costs, selling prices and cost of capital together. Fixed assets need long-term funding; inventories and receivables still need working-capital finance.',
    },
    targets: [
      {
        id: 'border-export',
        condition: {
          status: 'moving',
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
      {
        id: 'band-energy',
        condition: {
          status: 'moving',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'reprice-layer',
          action: {
            economy: 'Subsidy reform and carbon pricing can alter energy prices, fiscal costs and price transmission across the chain.',
            finance: 'Energy price and energy use per unit both matter; efficiency can offset a price increase, with the remainder absorbed or passed on.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'band-logistics',
        condition: {
          status: 'stuck',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'reprice-layer',
          action: {
            economy:
              'Cleaner power and tighter plants do not reach here. The layer injects its own fuel and emissions at every touch, so it sets a floor under the unit that no stage can remove on its own; where the geography is an archipelago and the trade is tiered, the touches per unit are many and that floor is high.',
            finance:
              "One physical fact, booked in two places: the fleet's fuel is the provider's own direct emission and the brand owner's indirect, purchased one — the same split the gross-and-net line makes at a node. Lowering it means fewer touches, denser drops or a different fleet, and each of those is a capital decision with its own payback.",
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'band-cold-chain',
        condition: {
          status: 'stuck',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'reprice-layer',
          action: {
            economy:
              'A second floor on top of the first: every cold touch burns fuel to hold a standard, and the drops that need it most are the smallest and the farthest.',
            finance:
              'What is re-priced here is a temperature held between two hands. The fee, the fuel and the emission travel together, and which nodes can hold stock at all is decided by who can afford the cold.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'band-credit',
        condition: {
          status: 'moving',
          now: UNWRITTEN,
          holds: UNWRITTEN,
          lever: 'reprice-layer',
          action: {
            economy: 'Where the transition is financed: concessional and blended capital, guarantees — the cost of capital for green assets is pushed down here.',
            finance: 'Performance and offtake risk affect funding terms; guarantees and concessional capital can help a viable project reach financial close.',
          },
          funds: UNWRITTEN,
        },
      },
      {
        id: 'j-consumption-recovery',
        condition: {
          status: 'unpriced',
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
 * Six transformation stages, three node groups, two layers, one return arrow,
 * and a diamond at every join so the joints read as the motif they are.
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
  headline: 'Every joint in this chain is a margin.',
  /** The thesis, between the headline and the two controls. */
  standfirst: 'Add them up and you have an economy; take one apart and you have a driver tree.',
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
      title: 'The industry chain, in full',
      desc: 'Left to right: two origins, primary processing, packaging and finished-goods manufacturing, then distribution, wholesale and retail into consumption and recovery. Intermediary nodes are dashed pills between the stages. Every joint is a mark on the flow — a filled diamond where a stage sells, an open diamond where a node sells, a square where a fee is paid — with a chip that reads it at the chosen distance, as an economy or as finance, and opens the margin cut there. Six enabling layers run as bands directly beneath the chain, ticked where each attaches; energy rises into every stage from below; money and information run both ways under the bands; two dashed border lines mark where goods are exported and imported. A shift, when one is chosen, marks the elements it moves with a numbered disc whose form is its status — filled for stuck, open for moving, dashed for unpriced — numbered in reading order, left to right and then top to bottom.',
    },
    compact: {
      title: 'The industry chain, in short',
      desc: 'Primary production, aggregation, processing, manufacturing, distribution, retail, consumption and recovery, a diamond at every join, with logistics and credit running beneath and one return arrow above.',
    },
    column: 'The industry chain, top to bottom',
  },
  /** The status line, spoken and shown in the header: what is on. */
  status: {
    marks: (n: number) => `${n} ${n === 1 ? 'mark' : 'marks'}`,
  },
  panel: {
    jointKicker: 'At this joint',
    bandKicker: 'Enabling layer',
    /** The kicker over the owner's reading of a marked element, followed by the shift and the distance. */
    readingKicker: 'Reading',
    marginHeading: 'The margin that sits here',
    whenHeading: 'Read the other way',
    linesHeading: 'Where it shows in the financial statements',
    layersHeading: 'Layers riding on this move',
    spanHeading: 'Spans',
    ridesHeading: 'Rides on',
    /** The four lines of a condition, in the order they are read. */
    now: 'Where it stands',
    holds: 'What holds it',
    lever: 'The lever',
    funds: 'Who finances it',
    articlesHeading: 'Read this in the essays',
    articlesNone: 'No essay reads this yet.',
    /** The anatomy of a joint or a layer, folded under its reading while a shift is on. */
    anatomyJoint: 'The joint itself',
    anatomyLayer: 'The layer itself',
    curriculumHeading: 'Read this joint in the curriculum',
    published: 'Published',
    comingSoon: 'Coming soon',
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
    seeFull: 'See the full chain',
    seeCompact: 'Back to the short version',
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
  },
} as const;
