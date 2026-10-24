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
  /** The direction caption is chosen by the period's kind, and names the package's own unit. */
  directionReported: (unit: string) =>
    `The left-hand column is read out of the statements, so revenue per ${unit} is revenue divided by volume.`,
  directionForecast: 'The same arrows run forward, from operation to money.',
  showFullChain: 'Show full chain',
  showOneLevel: 'Show one level',
  reset: 'Reset',
  whatChanged: 'What changed',
  viewerOnly: 'Worked in the viewer only. Published models do not change.',
  expectedNotMeasured: 'expected, not measured',
  measured: 'measured',
  // Along the chain (chain view §3.4)
  alongChainTitle: 'Along the chain',
  upstream: 'Upstream',
  thisStage: 'This stage',
  downstream: 'Downstream',
  layersGroup: 'Energy and logistics layers',
  noUpstream: 'No upstream link in the register yet.',
  noDownstream: 'No downstream link in the register yet.',
  noLayerLink: 'No link to the energy or logistics layer in the register yet.',
  noCompanies: 'No company on the slate here yet.',
  openLink: 'Open the link card',
  // Cost flow (chain view §3.5)
  sankeyTitle: (noun: string) => `Where a unit of ${noun} goes`,
  publishedFailed: 'Published models could not be read, so only the preview companies are shown. The reason:',
  publishedLoading: 'Reading the published models…',
  // The sheet-first model page (docs/company-models/sheet-first, DESIGN §6)
  companyTabs: 'Companies in this stage',
  elsewhereInStage: 'Elsewhere in this stage',
  companyFacts: (filings: number, from: string, to: string, fullTo: string, currency: string | null) =>
    `${filings} ${filings === 1 ? 'filing' : 'filings'}, ${from} to ${to}; full statements to ${fullTo}${currency ? `; reported in ${currency}` : ''}.`,
  pairedWith: 'Paired with',
  formulaBar: 'Formula bar',
  nameBox: 'Cell address',
  nameBoxNoCell: (typed: string) => `No cell at ${typed}. Use a value cell such as C5.`,
  nameBoxNotValue: (typed: string, what: 'label' | 'unit') => `${typed} holds a row's ${what}, not a value. Use a value cell such as C5.`,
  formulaBarSourced: (value: string, document: string, page?: number) => (page ? `${value}, from ${document}, p. ${page}` : `${value}, from ${document}`),
  notDisclosed: 'Not disclosed',
  editInBar: (label: string) => `Edit ${label}`,
  statusLine: (row: string, period: string, sheet: string) => `${row}, ${period} · ${sheet} sheet`,
  statusNone: (sheet: string) => `No cell selected · ${sheet} sheet`,
  statusLens: (feeds: number, fed: number) => `▲ ${feeds} feed it · ▼ ${fed} fed by it`,
  sheetsLabel: 'Sheets',
  zoom: 'Zoom',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  showInspector: 'Show the inspector',
  hideInspector: 'Hide the inspector',
  inspector: 'Inspector',
  unitColumn: 'Each row carries its unit in column B.',
  checks: 'Checks',
  checksMeans: 'Each tie-out of the model to a filing: the cell, the figure as filed, the difference.',
  checksNone: 'This model carries no tie-out yet.',
  checksHeader: { check: 'Check', unit: 'Unit', cell: 'Cell', model: 'In the model', filed: 'As filed', difference: 'Difference', status: 'Status', source: 'Filed in' },
  checksGap: 'Gap row of the model',
  onThisPage: 'On this page',
  // Production (VITE_FIA_LIVE): no fixture stands in, so each failure is a sentence of its own.
  liveNotAvailable: 'The published models are not available yet, so the companies below are listed as planned.',
  liveRefused: 'The published models could not be read: access was refused.',
  liveFailed: 'The published models could not be loaded. The companies below are listed as planned.',
} as const;
