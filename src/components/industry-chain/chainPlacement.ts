/**
 * Where things beside the plate go: the popover that carries a reading, and
 * the one-line label pinned on hover. Both are placed from the anchor's box
 * inside the figure's box, in the figure's own coordinates, and both are pure
 * so they can be tested without a browser.
 */

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const POP_GAP = 10;
const POP_PAD = 8;

/**
 * Where a popover of `size` should sit beside `anchor`, inside `figure`.
 * Below and above are the natural reading positions; a side placement is
 * taken only when neither fits, and a clamped one only when none does — in
 * which case the popover is kept clear of the anchor's own column.
 */
export function placePopover(anchor: Box, figure: Box, size: { width: number; height: number }): { top: number; left: number } {
  const ax = anchor.left - figure.left;
  const ay = anchor.top - figure.top;
  const acx = ax + anchor.width / 2;
  const acy = ay + anchor.height / 2;
  const w = Math.min(size.width, figure.width - POP_PAD * 2);
  const h = size.height;
  const fits = (top: number, left: number) =>
    top >= POP_PAD && left >= POP_PAD && top + h <= figure.height - POP_PAD && left + w <= figure.width - POP_PAD;
  const candidates: Array<[number, number]> = [
    [ay + anchor.height + POP_GAP, acx - w / 2], // below
    [ay - POP_GAP - h, acx - w / 2], // above
    [acy - h / 2, ax + anchor.width + POP_GAP], // right
    [acy - h / 2, ax - POP_GAP - w], // left
  ];
  const clamp = ([top, left]: [number, number]) => ({
    top: Math.max(POP_PAD, Math.min(top, Math.max(POP_PAD, figure.height - POP_PAD - h))),
    left: Math.max(POP_PAD, Math.min(left, Math.max(POP_PAD, figure.width - POP_PAD - w))),
  });
  for (const c of candidates) if (fits(c[0], c[1])) return { top: c[0], left: c[1] };
  const clamped = clamp(candidates[2]);
  if (clamped.left + w <= ax || clamped.left >= ax + anchor.width) return clamped;
  return clamp(candidates[3]);
}

const LABEL_GAP = 6;
const LABEL_PAD = 4;

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));

/**
 * The place beside `anchor` where a label of `size` covers the least ink:
 * above, below, right and left are tried in that order, each clamped inside
 * the figure, and the one with the least overlap with the plate's own
 * elements wins — covering the anchor itself counts four times over.
 */
export function placeLabel(anchor: Box, figure: Box, size: { width: number; height: number }, obstacles: Box[]): { top: number; left: number } {
  const ax = anchor.left - figure.left;
  const ay = anchor.top - figure.top;
  const acx = ax + anchor.width / 2;
  const acy = ay + anchor.height / 2;
  const { width: w, height: h } = size;
  const candidates: Array<[number, number]> = [
    [ay - LABEL_GAP - h, acx - w / 2],
    [ay + anchor.height + LABEL_GAP, acx - w / 2],
    [acy - h / 2, ax + anchor.width + LABEL_GAP],
    [acy - h / 2, ax - LABEL_GAP - w],
  ];
  const clamp = ([top, left]: [number, number]): Box => ({
    top: Math.max(LABEL_PAD, Math.min(top, figure.height - LABEL_PAD - h)),
    left: Math.max(LABEL_PAD, Math.min(left, figure.width - LABEL_PAD - w)),
    width: w,
    height: h,
  });
  const own: Box = { top: ay, left: ax, width: anchor.width, height: anchor.height };
  let best: Box = clamp(candidates[0]);
  let bestCost = Infinity;
  for (const c of candidates) {
    const r = clamp(c);
    const cost =
      overlap(r, own) * 4 +
      obstacles.reduce((sum, o) => sum + overlap(r, { top: o.top - figure.top, left: o.left - figure.left, width: o.width, height: o.height }), 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = r;
    }
    if (cost === 0) break;
  }
  return { top: best.top, left: best.left };
}
