/**
 * The argument, in the order it should be read.
 *
 * WHAT THIS IS. A stranger who arrives with three minutes needs one bounded
 * position, its scope, and a completed piece of evidence they can inspect.
 * The sections list gives them six doors and no argument; the curriculum gives
 * them 161 planned questions and two written answers. This file is the third
 * thing: a short, explicitly ordered path through work that actually exists,
 * where every step says why the next one follows.
 *
 * THREE RULES IT HOLDS.
 *
 *   1. Only real destinations are links. A step with a slug is resolved
 *      against the database at render time and dropped to an honest "not
 *      written" row if that essay is not published. Nothing here manufactures
 *      a page, and no step is a link to a plan.
 *   2. The order is editorial, not chronological. Publishing a newer,
 *      unrelated essay must not reshuffle it. That is the whole reason this
 *      is a repository-owned list rather than a query ordered by date.
 *   3. Gaps are shown as gaps. Where the argument has a step nobody has
 *      written, the step stays visible and says what is missing. Hiding it
 *      would make an unfinished argument look finished, which is the exact
 *      failure this file exists to prevent.
 *
 * WHY A REPOSITORY LIST AND NOT A SCHEMA CHANGE. `essays.is_selected` already
 * marks what is worth promoting; what it cannot carry is an ORDER and a REASON
 * for each next reading, and those are prose, versioned with the code that
 * renders them. A new column would need a migration, a writer control and a
 * production change to express three sentences. Revisit that only if the path
 * outgrows one screen.
 */

/**
 * The four conceptual links the author's argument runs through. They are
 * labelled so a reader can see which ones a given essay actually carries —
 * and, just as importantly, which one nothing carries yet.
 *
 * The arrows in the author's own summary (public policy -> infrastructure ->
 * finance -> carbon tax) are an ORDER OF EXPOSITION, not a timetable and not a
 * causal chain. Finance does not begin after infrastructure is finished, and
 * carbon pricing is itself public policy. The labels below are kept as reading
 * positions for exactly that reason.
 */
export type ConceptualLink = 'policy' | 'infrastructure' | 'finance' | 'carbon-price';

export const LINK_LABEL: Record<ConceptualLink, string> = {
  policy: 'Public policy',
  infrastructure: 'Infrastructure',
  finance: 'Finance',
  'carbon-price': 'Carbon pricing',
};

export interface ReadingStep {
  /** `essays.slug`. Omitted when this step has not been written. */
  slug?: string;
  /** How the step should read here, which need not be the essay's own title. */
  title: string;
  /** Which of the four links this step carries. One essay may carry several. */
  links: ConceptualLink[];
  /** Why this reading follows the one before it. */
  why: string;
  /** What a reader can check for themselves once they have read it. */
  establishes: string;
  /** For an unwritten step: what is missing, stated plainly. */
  missing?: string;
}

/**
 * The frame around the path: the bounded case, stated before anything is read.
 *
 * Every field here exists because a claim without it is not assessable. The
 * `limits` field is not modesty furniture — the flagship essay itself says its
 * evidence is largely not Indonesian, and a frame that omitted that would
 * overstate the work it is introducing.
 */
export const ARGUMENT = {
  /** When this framing was last reviewed. A standing claim with no date is undated, not timeless. */
  asOf: '2026-09-14',

  kicker: 'The argument',

  question:
    'Indonesia is approving heavy-industry capital right now that will still be producing in the 2050s. Is that capital configured for the market it will have to sell into?',

  /** The case the argument is actually made on. Not "Indonesia", not "the transition". */
  caseStudy:
    'Indonesian nickel downstreaming: RKEF and HPAL plants, and the captive coal generation built alongside them, commissioned between 2025 and 2035.',

  claim:
    'The carbon liability of these assets is fixed at the moment the plant and its electricity are chosen together, because captive generation is sized to the smelter and contracted for its life. That vintage decision, not a future carbon price, is what decides whether the asset keeps its market.',

  /**
   * The comparative test. The author's summary proposes that energy
   * distribution infrastructure, rather than carbon-pricing readiness, is
   * Indonesia's binding constraint. The essay below does not assert that in
   * general, and the general form does not survive contact with the evidence:
   * the IEA found in 2022 that Java-Bali and Sumatra could accommodate a 10%
   * solar share in a 2025 scenario through operating changes, with contractual
   * inflexibility rather than physical capacity the live problem. So the claim
   * that survives is narrower and it is a test, not a doctrine.
   */
  comparativeTest:
    'Insufficient capacity, restricted access, inflexible contracts and unacceptable risk allocation are four different constraints, and they need different instruments. Holding the asset, the location and the horizon fixed, the question is which one actually binds — and for a given plant the answer can be finance rather than infrastructure.',

  strongestObjection:
    'Option value of delay. If clean technology falls in cost faster than carbon constraints tighten, waiting is cheaper than paying a clean premium now. The reply is that a plant already under construction with a coal contract is not waiting; it is choosing a vintage.',

  wouldChangeIt:
    'CBAM weakening or narrowing; the United States not following; China and India not pricing embodied carbon in imports; EU battery rules failing to change procurement; retrofit turning out unexpectedly cheap. Any of these and the premium is paid for a liability that never arrives.',

  limits:
    'The mechanisms are general; the Indonesian magnitudes are not. The grid-intensity thresholds come from studies calibrated to other regions and process temperatures, the asset-life figures from steel, cement and chemicals rather than nickel, and no sourced greenfield-versus-retrofit differential exists for Indonesian RKEF or HPAL. Two of the essay’s quantitative illustrations are explicitly stylised and uncalibrated.',
} as const;

/**
 * The path. Three written steps and two named gaps, in reading order.
 *
 * The first step carries three of the four conceptual links on its own. That
 * is said out loud rather than papered over with three more entries: four
 * steps invented for symmetry would be four promises, and only one of them
 * would be kept.
 */
export const READING_PATH: ReadingStep[] = [
  {
    slug: 'indonesias-reindustrialization-bet',
    title: 'Indonesia’s Reindustrialization Bet',
    links: ['policy', 'infrastructure', 'finance'],
    why: 'Start here. It is the one completed piece that states a position, bounds it to a case, names its strongest objection and says what would make it wrong.',
    establishes:
      'That the carbon liability is set when the plant and its power are chosen together; that CBAM and the EU Batteries Regulation reach the higher-value rungs Indonesia is aiming at more than the trade it does today; and that whether infrastructure or finance binds is an empirical question about a specific asset, not a doctrine about a country.',
  },
  {
    slug: 'macro-scenario-construction-for-cfos',
    title: 'Macro Scenario Construction for CFOs',
    links: ['finance'],
    why: 'The bet above pays above a break-even probability, and that number is only as good as the states it is computed over. This is the method behind those states — and the argument against the three-constants scenario pack that would make the break-even meaningless.',
    establishes:
      'That a scenario is useful only when its movements are jointly plausible and crossing a threshold changes a decision, which is the standard the reindustrialisation argument has to meet to be more than an assertion about probabilities.',
  },
  {
    slug: 'driver-tree-construction',
    title: 'Driver Tree Construction',
    links: ['finance'],
    why: 'The essay’s prescription is to find whether the binding constraint is power, demand ramp, refinancing, technology or economics, and then attach support to that. Doing it requires connecting an operating assumption to a financial line and to a person who can change it.',
    establishes:
      'That attribution is only decision infrastructure when every node has an equation, a dimension, a lineage and an owner — the discipline that separates "identify the binding constraint" from a diagram.',
  },
  {
    title: 'The carbon tax I argued for, and why I stopped',
    links: ['carbon-price'],
    why: 'The fourth link is the one the written work does not carry. The author reports having argued as an undergraduate for the highest feasible carbon tax and having reversed that position; nothing published states the original argument, the assumption that failed, or what remains uncertain.',
    establishes: '',
    /*
     * The public form of a checked claim, not a softer one. The earlier
     * wording reported the check as an operation on the database — "all 165
     * essay records, published and draft" — which tells a reader about the
     * tooling rather than about what they can go and read. The check itself
     * stands and its trail is in the response record
     * (docs/response-2026-09-14/, and the v3 note); what belongs on the page is
     * what the reader can inspect and when it was last true.
     */
    missing:
      'Not written. As of 14 September 2026 nothing published on this site states the original argument, the assumption that failed, or what remains uncertain. Until it exists, the sequence that ends in carbon pricing is a claim about the author’s thinking that a reader cannot inspect.',
  },
  {
    title: 'Which constraint binds on one Indonesian corridor',
    links: ['infrastructure', 'finance'],
    why: 'The test above is stated but never run on a named place. Running it once — one corridor, one outcome, one horizon, with capacity, access, contract and risk allocation compared against each other — is what would turn the comparative test from a framing into a finding.',
    establishes: '',
    missing:
      'Not written. The flagship essay says which question to ask and says explicitly that the parameters to answer it have not been assembled in public literature. That is a research agenda, and it is named here rather than implied.',
  },
];

/** The slugs the path needs resolved, in order, ignoring the gaps. */
export const READING_PATH_SLUGS: string[] = READING_PATH.flatMap((step) => (step.slug ? [step.slug] : []));
