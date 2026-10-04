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
  /** Height of the link layer, in px. */
  layerHeight: 96,
  /** Vertical step between links that join the same two stages, in px. */
  laneStep: 22,
  /** First lane's depth below the cards, in px. */
  laneStart: 26,
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

export const PERCENT = 100;
export const HALF = 0.5;
