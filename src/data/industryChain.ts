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
  /** How the marker is drawn, so the kind reads without colour: the chip's border. */
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
        chip: 'Yield · gate price',
        note: "The producer's conversion margin: yield against input cost, realised at the gate price — and often financed by the aggregator's advance, the first credit on the chain.",
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
        chip: 'Rent · royalty',
        note: 'Deposit quality, extraction cost, commodity price and royalties shape the margin. Resource rent is the residual after the relevant costs and required returns; it is not automatically the whole conversion margin.',
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
        chip: 'Spread · DSO/DPO',
        note: "The aggregator's spread: bought in small lots, sold in one, and it paid the producer before the processor paid it — the working-capital gap is the business.",
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
        chip: 'Basic industry',
        note: "Basic industry's value added — the capital-intensive middle of the chain, where energy intensity peaks and the by-product leaves for another sector's account.",
      },
      finance: {
        chip: 'Fixed cost · yield',
        note: "Processing's conversion margin: a fixed plant cost spread over volume, so utilisation and yield decide it; the by-product credit sits inside cost of sales.",
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
        chip: 'Landed cost · DIO',
        note: "The trader's spread over landed cost — freight, duty and the exchange rate inside cost of sales — with inventory carried against a lead time and import finance in finance cost.",
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
        chip: 'Intermediate input',
        note: "Intermediate consumption between two branches of manufacturing: packaging's output is manufacturing's input, counted gross in each branch's output and only once in value added.",
      },
      finance: {
        chip: 'Component cost',
        note: "Packaging's conversion margin is cut here and attaches to the unit as a component cost in the finished good's bill of materials.",
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
        chip: 'Trade credit · DSO',
        note: "Manufacturing's conversion margin, and the joint where trade credit is extended: receivables days, trade promotion and rebates netted from revenue — the working-capital modules read it here.",
      },
    },
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
    read: {
      economy: {
        chip: 'Trade margin',
        note: "Distribution’s trade margin is its output measure; purchased services and other intermediate inputs are deducted to obtain value added. Informal activity is within the national-accounts production boundary even when it is difficult to measure.",
      },
      finance: {
        chip: 'Spread · reach',
        note: "The distributor's spread for reach, stock and the credit it carries on both sides, after the principal's rebates — who finances whom, read as DSO against DPO.",
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
        chip: 'Cost to serve',
        note: "The wholesaler's spread cut into ever smaller drops: cost to serve rises as the drops shrink, and the credit extended to small retail is the risk in the receivable.",
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
        chip: 'Shelf margin · DPO',
        note: "Retail's shelf margin, different by channel, with shrink and cost to serve beneath it. The consumer pays at once, so the chain behind the shelf finances the retailer: stock on the shelf, paid for by suppliers.",
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
        chip: 'Gate fee',
        note: 'Recovery is paid a collection or gate fee to take what has no value; where the discard still has value it buys instead, and its conversion margin is realised later on the return flows.',
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

export interface Band {
  id: string;
  label: string;
  /** The local terms, kept: makloon, cold chain, trade credit. */
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
  /** The layer read from far and from close. */
  read: LensNote;
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
      'Freight and warehousing service revenue — gross when the provider controls its service; net commission when acting as an agent',
      'Freight-out, warehouse rent and handling — at the user, inside cost to serve',
      'Right-of-use assets and lease liabilities, where the warehouse is leased',
    ],
    read: {
      economy:
        'Transport and storage are a sector of their own in the accounts, but on the chain they are a cost at every move — and where the drops are smallest, the widest wedge between farm gate and shelf.',
      finance: 'Freight-out, warehouse rent and handling inside cost to serve; right-of-use assets and lease liabilities where the warehouse is leased.',
    },
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
    read: {
      economy:
        'The channel through which monetary policy reaches the chain: the policy rate becomes the price of waiting, and who can afford to wait decides who can be a node.',
      finance: 'DSO, DIO and DPO — the cash conversion cycle — and finance cost as the price of the gap it leaves.',
    },
  },
  {
    id: 'band-energy',
    label: 'Energy',
    note: 'fuel · power · subsidy',
    span: ['stage-biological', 'stage-recovery'],
    spanLabel: 'The whole chain',
    margin: 'service-fee',
    means:
      'Fuel and power enter each function as purchased inputs or through self-supply. This layer describes their cross-cutting role; it does not imply that energy cannot be owned or that its sale is a net commission. Market prices, tariffs and subsidies affect the cost.',
    lines: [
      'Energy cost — fuel and power inside cost of sales at every stage; heaviest in extraction and primary processing',
      'Energy revenue — at the utility or the fuel seller; the subsidy, where the state pays part of the price, on the fiscal line',
    ],
    read: {
      economy:
        'Energy intensity, stage by stage — heaviest in extraction and primary processing. Where the state pays part of the price, the subsidy is a fiscal line every stage draws on.',
      finance: 'Fuel and power inside cost of sales at every stage; a price set outside the chain, so it is passed on or absorbed in the conversion margin.',
    },
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
      'Tolling service revenue — gross at a toller that controls its service; customer-owned material is excluded from its revenue and inventory',
      'Conversion cost purchased — at the owner, inside cost of sales; the work in progress stays on its balance sheet',
      'Capacity utilisation — the toller lives in the fixed cost it absorbs',
    ],
    read: {
      economy:
        'Manufacturing capacity separated from the ownership of the goods: output counted at the toller, value added split between the plant and the brand.',
      finance: 'Tolling service revenue and operating costs at the toller; conversion cost purchased at the owner. Utilisation, yield and operating efficiency drive the toller’s margin.',
    },
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
    read: {
      economy: 'The contract that decides how the trade margin is divided between principal and distributor — and how concentrated distribution becomes.',
      finance: 'Rebates, listing fees and trade promotion as variable consideration; sales returns as a refund liability and an asset for the goods expected back.',
    },
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
    read: {
      economy: 'Excise, VAT, licensing and standards — collected or imposed, never earned: the fiscal reading of the chain, joint by joint.',
      finance: 'Compliance cost inside operating expense; excise once on release; VAT collected at each formal transfer and never revenue.',
    },
  },
];

export const BAND_BY_ID = Object.fromEntries(BANDS.map((b) => [b.id, b])) as Record<string, Band>;

/** The word on a layer's marker: its margin kind where it earns a fee, its own word where it only sets the terms. */
export const bandChip = (band: Band): string => (band.margin ? MARGIN_KINDS[band.margin].chip : band.chip ?? '');

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
 * the map pull them. A shift never redraws the chain: it highlights the
 * joints and layers it moves, adds an arrow where a cut moves, and reads
 * differently at each distance. The two shifts are exclusive — hilirisasi
 * and the green transition can compete for fiscal space, energy and export
 * earnings. Separate overlays are a reading convention, not a claim that
 * the policies can never coexist.
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

/** A joint, layer, stage, node, border or return the shift moves, and what moves there at each distance. */
export interface ShiftTarget {
  id: string;
  read: LensNote;
}

/** An arrow drawn on the overlay: a cut that moves from one place on the chain to another. */
export interface ShiftMove {
  id: string;
  from: string;
  to: string;
  label: string;
}

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
  /** The shift as a whole, read from far and from close — the caption. */
  read: LensNote;
  targets: ShiftTarget[];
  moves: ShiftMove[];
  callouts: ShiftCallout[];
}

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
        read: {
          economy: 'The cut moves right: what crosses here is processed, not raw.',
          finance: 'The export price becomes a processed price: a conversion margin is captured before the border.',
        },
      },
      {
        id: 'j-extraction-processing',
        read: {
          economy: 'More material is processed domestically before export; tax and royalty effects depend on the policy and pricing arrangements.',
          finance: 'A domestic buyer changes pricing, offtake risk and payment terms; a domestic sale is not necessarily an intra-group transfer.',
        },
      },
      {
        id: 'stage-processing',
        read: {
          economy: "The capacity built here is the reindustrialisation: basic industry's share of value added.",
          finance: 'Capex, cost of capital, utilisation — the three things the conversion margin has to cover.',
        },
      },
      {
        id: 'j-processing-trader',
        read: {
          economy: 'Processed goods leave here now: the external balance is read one joint further right.',
          finance: "Processing's conversion margin is the return on the smelter; the by-product finds a market or becomes a cost.",
        },
      },
      {
        id: 'border-import',
        read: {
          economy: 'The import share of intermediates falls; capital goods imports rise while the plants are built.',
          finance: 'Less landed cost and less exchange-rate exposure in cost of sales — after a capex that is itself mostly imported.',
        },
      },
      {
        id: 'node-trader',
        read: {
          economy: 'Import intermediation can shrink where competitive domestic inputs replace landed inputs; trading functions can also adapt.',
          finance: 'The spread on landed inputs is the margin domestic processing has to beat.',
        },
      },
      {
        id: 'j-trader-manufacturing',
        read: {
          economy: 'Domestic intermediates replace imported ones behind manufacturing.',
          finance: 'Input cost moves from landed cost to domestic conversion cost; import finance gives way to supplier credit.',
        },
      },
      {
        id: 'stage-manufacturing',
        read: {
          economy: 'Domestic inputs can reduce import content; imported equipment, energy and components still matter.',
          finance: 'Compare a domestic input with landed alternatives. Domestic prices can remain linked to foreign exchange and international commodity prices.',
        },
      },
    ],
    moves: [{ id: 'move-export-cut', from: 'border-export', to: 'j-processing-trader', label: 'The export cut moves right' }],
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
        read: {
          economy: 'Subsidy reform and carbon pricing can alter energy prices, fiscal costs and price transmission across the chain.',
          finance: 'Energy price and energy use per unit both matter; efficiency can offset a price increase, with the remainder absorbed or passed on.',
        },
      },
      {
        id: 'band-credit',
        read: {
          economy: 'Where the transition is financed: concessional and blended capital, guarantees — the cost of capital for green assets is pushed down here.',
          finance: 'Performance and offtake risk affect funding terms; guarantees and concessional capital can help a viable project reach financial close.',
        },
      },
      {
        id: 'j-consumption-recovery',
        read: {
          economy: 'Producer responsibility or a deposit can fund collection; carbon pricing charges emissions where policy places the obligation, not necessarily at disposal.',
          finance: 'Collection and gate fee become revenue at recovery; the producer books the levy as a cost of the unit it sold.',
        },
      },
      {
        id: 'stage-recovery',
        read: {
          economy: 'More recovery can become viable and measurable; existing informal production is already within the national-accounts boundary.',
          finance: 'Recovered-material revenue against a virgin-input price.',
        },
      },
      {
        id: 'return-postconsumer-material',
        read: {
          economy: 'The loop is formalised: recyclate re-enters as an industrial input, and is counted.',
          finance: 'A secondary input priced against virgin material; the collection cost is what it competes on.',
        },
      },
      {
        id: 'return-postconsumer-organic',
        read: {
          economy: 'Compost re-enters as a farm input; the organic loop closes inside the count.',
          finance: 'A farm input priced against fertiliser.',
        },
      },
    ],
    moves: [],
    callouts: [{ id: 'callout-new-price', at: 'j-consumption-recovery', label: 'Who pays for recovery?' }],
  },
];

export const SHIFT_BY_ID = Object.fromEntries(SHIFTS.map((s) => [s.id, s])) as Record<ShiftId, Shift>;

/** The target record for an id under a shift, or nothing when the shift does not move it. */
export function shiftTarget(shift: ShiftId | null, id: string): ShiftTarget | undefined {
  if (!shift) return undefined;
  return SHIFT_BY_ID[shift].targets.find((t) => t.id === id);
}

/* ── Legend: the forms, told in words ────────────────────────────────────── */

export type LegendSwatch =
  | 'stage'
  | 'node'
  | 'layer'
  | 'return'
  | 'money'
  | 'information'
  | 'border'
  | 'joint'
  | 'conversion'
  | 'spread'
  | 'fee'
  | 'shift';

export interface LegendItem {
  id: LegendSwatch;
  label: string;
  note: string;
}

export const LEGEND: LegendItem[] = [
  { id: 'stage', label: 'Transformation stage', note: 'solid box · production and recovery; consumption marks use, not another earned margin' },
  { id: 'node', label: 'Intermediary node', note: 'takes title, transforms nothing · revenue gross · spread' },
  { id: 'layer', label: 'Enabling layer', note: 'spanning band · services, energy, financing or terms; not an automatic net-revenue classification' },
  { id: 'return', label: 'Physical return', note: 'goods moving back up the chain' },
  { id: 'joint', label: 'Joint', note: 'a hand-off of goods or a service attachment; select it to inspect the price and cost boundary' },
  { id: 'conversion', label: 'Conversion margin', note: 'a solid chip: the transforming function’s margin, realised at sale' },
  { id: 'spread', label: 'Node spread', note: 'a dashed chip: cut through a node' },
  { id: 'fee', label: 'Service fee', note: 'a filled chip: cut through a layer' },
  { id: 'money', label: 'Money', note: 'payment against the goods; credit and promotion with them' },
  { id: 'information', label: 'Information', note: 'demand told back; specification told forward' },
  { id: 'border', label: 'Border', note: 'where the chain crosses the external sector' },
  { id: 'shift', label: 'Shift', note: 'under reindustrialisation or the green transition, the joints and layers that move are ringed; the rest recedes' },
];

export const LEGEND_NOTE =
  'The unit is a function, not a company. A company can occupy several functions, and routes can skip intermediaries. Control of the specified good or service determines principal versus agent; ownership of the customer’s goods alone does not determine gross or net service revenue.';

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

export const CHAIN_COPY = {
  headline: 'One chain. Two distances.',
  /** The distance control is this sentence: the two lens names in it are the two positions. */
  lead: {
    before: 'Read the chain as an ',
    economy: 'economy',
    middle: ', or inspect its margins through ',
    finance: 'finance',
    after: '.',
  },
  /** The shift control is this sentence: the two shift words in it are the two overlays; neither on is the resting state. */
  shiftLead: {
    before: 'Follow ',
    middle: ' or ',
    after: ' — one at a time, over the same chain.',
  },
  scopeLead: 'Functions, not firms. Illustrative routes across sectors.',
  scope: 'Functions, not firms. Routes can skip intermediaries or repeat manufacturing. Border cuts illustrate possible crossings; imports and exports can occur at other stages.',
  basis: 'Value added is output less intermediate consumption. It includes labour income and operating surplus; it is not gross profit. Economy-wide domestic value added, plus product taxes less subsidies, contributes to GDP. This goods-chain map does not cover the entire economy.',
  reference: {
    heading: 'Read the chain at text size',
    joints: 'Connections and margins',
    functions: 'Functions and routes',
    layers: 'Services, inputs and terms',
    returns: 'Physical returns and destinations',
    flows: 'Money and information',
    basis: 'How the two distances relate',
    hint: 'The same records as the map, with explicit margin names and full labels.',
  },
  mobileFlows: 'Payments and demand travel upstream. Trade credit, rebates and specifications travel downstream. Physical returns have their own destinations.',
  lensName: { economy: 'Economy', finance: 'Finance' } as const,
  /** The two distances, as the panel names them. */
  distance: { economy: 'From far — as an economy', finance: 'From close — as finance' } as const,
  /** Title and description for each drawing; the title names it, the description walks it. */
  aria: {
    wide: {
      title: 'The industry chain, in full',
      desc: 'Left to right: two origins, primary processing, packaging and finished-goods manufacturing, then distribution, wholesale and retail into consumption and recovery. Intermediary nodes are dashed pills between the stages. Every joint is a diamond on the flow with a chip that reads it at the chosen distance — as an economy or as finance — and opens the margin cut there. Six enabling layers run beneath the chain, money and information run both ways under it, and two dashed border lines mark where goods are exported and imported. A shift, when one is chosen, rings the joints and layers it moves.',
    },
    compact: {
      title: 'The industry chain, in short',
      desc: 'Primary production, aggregation, processing, manufacturing, distribution, retail, consumption and recovery, a diamond at every join, with logistics and credit running beneath and one return arrow above.',
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
    readHeading: 'Two distances',
    /** Followed by the shift's name: "Under reindustrialisation". */
    shiftHeading: 'Under',
    curriculumHeading: 'Read this joint in the curriculum',
    published: 'Published',
    comingSoon: 'Coming soon',
    close: 'Close',
    hint: 'Select a joint to read the margin cut there, and the line of the accounts that carries it.',
  },
  shift: {
    leverKicker: 'Lever',
    movesHeading: 'What moves',
    hint: 'Select a ringed joint or layer to read what moves there.',
  },
  controls: {
    noShift: 'No shift',
    seeFull: 'See the full chain',
    seeCompact: 'Back to the short version',
    returns: 'Return flows',
    nonPhysical: 'Money and information',
    layers: 'Enabling layers',
    legend: 'How to read the map',
    origin: 'Origin',
    alongside: 'alongside',
    back: 'back to',
    /** The lane label beside the joint chips, by distance. */
    readingLane: 'Reading',
  },
} as const;
