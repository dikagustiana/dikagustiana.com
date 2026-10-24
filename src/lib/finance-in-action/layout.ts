/**
 * Geometry for the drawn parts of Finance in Action: the status glyph, the
 * stage strip's link layer, the driver tree and the waterfall. Kept here so
 * no component carries a number literal (constraint 7); none of these is a
 * figure, only a size.
 */
export const GLYPH = {
  size: 12,
  radius: 5,
  stroke: 1.5,
} as const;

/** Narrowest a stage card may get before the strip scrolls. */
export const STRIP_MIN_COLUMN = '7.5rem';

/** The stage strip and the links drawn under it. */
export const STRIP = {
  /** viewBox units per stage column. */
  column: 100,
  /** Vertical step between links that join the same two stages, in px. */
  laneStep: 28,
  /** First lane's depth below the cards, in px. */
  laneStart: 40,
  /** Room under the deepest lane, in px. */
  laneFoot: 12,
  /** The row of link buttons under the drawing, in px. */
  labelRow: 52,
  /** A line sample beside a link's name, in px. */
  sample: 24,
  sampleHeight: 10,
  /** Stroke widths, in px: a base, and what a share of 1 adds to it. */
  costBase: 3,
  costScale: 14,
  demandBase: 1,
  demandScale: 6,
  dashedWidth: 2,
  dash: '6 5',
  /** Offset between the cost-share and the demand-share line of one link, in px. */
  pairOffset: 6,
} as const;

/** The driver tree drawn with its edges. */
export const TREE = {
  nodeWidth: 176,
  nodeHeight: 64,
  columnGap: 56,
  rowGap: 16,
  padding: 8,
  edgeWidth: 1.5,
  arrow: 6,
} as const;

/** The unit-economics waterfall. */
export const WATERFALL = {
  /** Height of the plot area, in px. */
  plotHeight: 220,
  /** Width of one bar's column, in rem. */
  columnRem: 7.5,
  /** Share of the column the bar takes, in %. */
  barWidthPct: 64,
} as const;

/** Room either side of a peer band, as a share of its width. */
export const PEER_PAD = 0.25;

/**
 * How many items a list shows before it says "and N more"; and the model
 * grid's bounds (sheet-first PRD R2.5, D-S7): its zoom, in per cent, and how
 * many columns before the latest reported quarter it opens on.
 */
export const LIMITS = {
  rejectedIssues: 5,
  inspectorSources: 4,
  changes: 24,
  zoomMin: 70,
  zoomMax: 150,
  zoomStep: 10,
  zoomDefault: 100,
  openColumnsBefore: 3,
  /** How long the formula bar waits for the selection to settle before it is read out, in ms. */
  announceDelay: 400,
} as const;

/** Letters of a ticker in a company tab's monogram, where an issuer's logo would be (sheet-first PRD D-S8). */
export const MONOGRAM_LETTERS = 2;

/** From this width the model card opens with its inspector beside the grid (sheet-first PRD D-S6). */
export const INSPECTOR_OPEN_FROM = '(min-width: 1440px)';

/** The figures the cell legend shows as its samples: a figure and a rate, in the house format. */
export const LEGEND_SAMPLE = { figure: 1234, rate: 0.08 } as const;

/** A selected line is drawn this many times thicker. */
export const EMPHASIS = 2;

export const PERCENT = 100;
export const HALF = 0.5;

/** "Where a unit goes": the hand-built sankey (chain view §3.5). viewBox units. */
export const SANKEY = {
  width: 840,
  /** Height the revenue (and any loss) stack takes. */
  stack: 300,
  top: 16,
  bottom: 16,
  nodeWidth: 14,
  /** Gap between two line slots in the middle column. */
  gap: 10,
  /** Smallest slot a line gets, so its label fits even when its flow is thin. */
  minSlot: 22,
  /** Room above and below a slot's label lines. */
  slotPad: 6,
  upstreamX: 230,
  lineX: 400,
  revenueX: 680,
  /** Space between a node and its label. */
  labelPad: 8,
  /** Characters per line before an upstream label wraps. */
  wrapAt: 24,
  lineHeight: 17,
  fontSize: 15,
  smallFont: 11,
  /** Opacity of a flow's ribbon, so its label stays readable over it. */
  ribbonOpacity: 0.35,
  hatch: 6,
} as const;
