/**
 * The one line read on hover or focus, pinned beside the element itself.
 *
 * A legend three hundred pixels below the map answers a question where it was
 * not asked; a tooltip that lands on the neighbour hides the thing the reader
 * was comparing against. This label does neither: it is one line, and it is
 * placed by trying the space above, below, right and left of the element and
 * taking the position that covers the least of the plate's own ink — boxes,
 * chips, bands, marks and text — then clamping inside the figure. It is
 * aria-hidden: every element it describes already carries the same words in
 * its accessible name or description.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import type { LensId, ShiftId } from '@/data/industryChain';
import { hoverLine } from './chainTargets';
import type { Hovered } from './chainLensContext';

import { placeLabel } from './chainPlacement';

const OBSTACLES = '.cp-stage rect, .cp-node > rect, .cp-band-rect, .cp-joint-chip rect, .cp-chip, .cp-mark circle, .cp-callout rect, .cp-switch rect, text';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function HoverLabel({ hovered, figure, shift, lens }: { hovered: Hovered | null; figure: HTMLElement | null; shift: ShiftId | null; lens: LensId }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const line = hovered ? hoverLine(hovered.id, shift, lens) : null;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !figure || !hovered?.el) {
      setPos(null);
      return;
    }
    const f = figure.getBoundingClientRect();
    const a = hovered.el.getBoundingClientRect();
    const svg = figure.querySelector('svg');
    const obstacles: Rect[] = svg
      ? Array.from(svg.querySelectorAll(OBSTACLES))
          .filter((o) => !hovered.el!.contains(o))
          .map((o) => o.getBoundingClientRect())
      : [];
    setPos(placeLabel(a, f, { width: el.offsetWidth, height: el.offsetHeight }, obstacles));
  }, [hovered, figure, line?.lead, line?.detail]);

  if (!line) return null;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-chain-hover={hovered?.id}
      className="pointer-events-none absolute z-30 max-w-[26rem] rounded-sm border border-border bg-popover px-2 py-1 text-xs leading-snug text-popover-foreground shadow-sm"
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, opacity: 0 }}
    >
      <span className="font-semibold text-foreground">{line.lead}</span>
      {line.detail && <span className="text-muted-foreground"> · {line.detail}</span>}
    </div>
  );
}
