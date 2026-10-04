/**
 * The words of Finance in Action, in one place. British English.
 *
 * OWNER-REPLACEABLE marks draft copy the owner is expected to rewrite (open
 * item 1 of the brief: the H1 should carry the owner's own thesis).
 */
export const COPY = {
  section: 'Section 06',
  /** OWNER-REPLACEABLE: draft H1 from brief §5.1. */
  title: 'The chain, read one company at a time',
  /** OWNER-REPLACEABLE: draft subhead from brief §5.1. */
  subhead:
    "Each model rebuilds a listed company's operation from its own filings: volumes, capacity, cost per unit. Two companies per sub-industry, ordered along the chain from extraction to end users, so a weak link can be compared with its neighbours rather than guessed at.",
  seoTitle: 'Finance in Action',
  seoDescription: "Company models of IDX-listed companies, rebuilt from their own filings and ordered along the industry chain.",
  alongTheChain: 'Models along the chain',
  openChainMap: 'Open the chain map',
  connectionsOn: 'Connections on',
  connectionsOff: 'Connections off',
  noModels: 'No models yet.',
  noMatches: 'No models match these filters.',
  findCompany: 'Find a company',
  findPlaceholder: 'Ticker or name',
  conditionFilter: 'Capital in Motion condition',
  allConditions: 'All conditions',
  statusLegend: 'Status',
  syntheticBanner:
    'Preview build. Companies marked SYNTHETIC are invented, in round numbers, to exercise the viewer; no company and no filing stands behind their figures. The real companies listed are planned, with nothing built yet.',
  syntheticBadge: 'SYNTHETIC',
  notStartedNoPage: 'Planned; no model yet.',
  notYetModelled: 'not yet modelled',
  notAvailable: 'not yet available',
  feeds: 'Feeds',
  fedBy: 'Fed by',
  // Model page
  download: 'Download .xlsx',
  downloading: 'Preparing the workbook…',
  howItMakesMoney: 'How the business makes money',
  whyThisLinkMatters: 'Why this link matters',
  theModel: 'The model',
  workpaper: 'Workpaper record',
  peerEmpty: 'The band appears once two companies in this sub-industry are published.',
  noComparator: 'no comparator',
  // Unit economics
  ueIntro: (units: string) =>
    `Each bar is a line from the cost-of-revenue note divided by ${units} sold, so companies can be compared. The line under each bar names the physical driver that moves it.`,
  ueRounding: 'Per-unit figures are rounded; subtotals are worked before rounding.',
  ueNotAvailable: 'Not available: volumes not disclosed',
  // Connections
  directionReported:
    'The left-hand column is read out of the statements, so revenue per tonne is revenue divided by volume.',
  directionForecast: 'The same arrows run forward, from operation to money.',
  showFullChain: 'Show full chain',
  showOneLevel: 'Show one level',
  reset: 'Reset',
  whatChanged: 'What changed',
  viewerOnly: 'Worked in the viewer only. Published models do not change.',
  expectedNotMeasured: 'expected, not measured',
} as const;
