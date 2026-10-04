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

/** How many items a list shows before it says "and N more". */
export const LIMITS = {
  rejectedIssues: 5,
  inspectorSources: 4,
  changes: 24,
} as const;

/** A selected line is drawn this many times thicker. */
export const EMPHASIS = 2;

export const PERCENT = 100;
export const HALF = 0.5;
