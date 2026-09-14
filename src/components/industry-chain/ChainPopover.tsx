/**
 * A reading pinned beside the element that opened it.
 *
 * The brief's rule: the reader must not have to move their eyes away from
 * the element they just selected. So the panel is a popover inside the
 * figure, placed by the anchor's box — below it where there is room, else
 * above, else to its right, else to its left, always clamped inside the
 * figure — and it closes on a click outside, on Escape, or on its own Close.
 * It is positioned with plain absolute coordinates rather than a portal so it
 * scrolls with the plate and never floats over the page.
 *
 * WHAT THE FIGURE ALONE COULD NOT SETTLE. The figure is not the reader's
 * viewport. The wide plate is taller than the space under the site's sticky
 * header on an ordinary laptop, so a placement that was correct by the
 * figure's geometry could put the reading's own title and Close control behind
 * that header — or above the top of the screen — exactly when the evidence got
 * long enough to be worth reading. Reproduced at 1348×936 on 14 September
 * 2026. So the figure's geometry is intersected with the part of it a reader
 * can actually see: the band between the bottom of the sticky header and the
 * bottom of the viewport. The popover is capped to that band and re-placed as
 * the page scrolls, which keeps its identity and its dismissal in view while
 * the long reading scrolls inside it.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { placePopover, type Band } from './chainPlacement';

const PAD = 8;
/** Below this a capped popover is a slot, not a reading; it keeps its own height and lets the page scroll. */
const MIN_BAND = 220;

/**
 * The bottom edge of whatever is stuck to the top of the window — the site
 * header. Measured rather than assumed: the header's height is a layout
 * decision that lives in its own component, and a number copied here would go
 * stale silently. Anything not actually pinned (position: sticky or fixed)
 * scrolls away and does not constrain a reading.
 */
function stuckTop(): number {
  if (typeof document === 'undefined') return 0;
  let bottom = 0;
  for (const el of document.querySelectorAll<HTMLElement>('header, [data-sticky-top]')) {
    const pos = getComputedStyle(el).position;
    if (pos !== 'sticky' && pos !== 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.top <= 0 && r.bottom > bottom) bottom = r.bottom;
  }
  return bottom;
}

export function ChainPopover({
  anchor,
  figure,
  onClose,
  children,
}: {
  anchor: Element | null;
  figure: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || !figure) return;
    const f = figure.getBoundingClientRect();
    const a = anchor?.getBoundingClientRect() ?? { top: f.top + PAD, left: f.left + PAD, width: 0, height: 0 };

    // The readable band, in the figure's own coordinates: what is both inside
    // the figure and inside the window below anything stuck to its top.
    const viewH = typeof window === 'undefined' ? f.height : window.innerHeight;
    const band: Band = {
      top: Math.max(PAD, stuckTop() - f.top + PAD),
      bottom: Math.min(f.height - PAD, viewH - f.top - PAD),
    };
    const room = band.bottom - band.top;

    // Height is capped to the readable band so the reading's head and its
    // Close stay on screen and the body scrolls instead. Where the band is too
    // small to hold a reading at all — a figure mostly off-screen — the old
    // rule stands and the cap is the figure.
    const cap = room >= MIN_BAND ? room : Math.max(MIN_BAND, f.height - PAD * 2);
    el.style.maxHeight = `${Math.max(160, cap)}px`;
    const size = { width: el.offsetWidth, height: el.offsetHeight };
    setPos(placePopover(a, f, size, room >= MIN_BAND ? band : undefined));
  }, [anchor, figure]);

  useLayoutEffect(() => {
    if (!ref.current || !figure) return;
    measure();
    // One re-place per frame at most: a scroll fires far faster than a layout
    // is worth recomputing, and a reading that jitters is worse than one that
    // lags a frame.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    // The reading can change height (a folded anatomy opened, a longer line);
    // re-measure when it does, where the browser can say so.
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    ro?.observe(ref.current);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      ro?.disconnect();
    };
  }, [measure, figure]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      // A click on another door swaps the reading; the door handles that itself.
      const door = (e.target as Element).closest?.('.cp-hit, .cp-mark, .cp-joint-chip, .cp-switch, [data-chain-control]');
      if (door) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      data-chain-popover=""
      className="absolute z-20 w-[22rem] max-w-[calc(100%-1rem)] overflow-y-auto rounded-md shadow-lg ring-1 ring-border"
      // Not `visibility: hidden` while unplaced: the heading inside takes
      // focus on mount, and a hidden element cannot be focused in a browser.
      style={pos ? { top: pos.top, left: pos.left } : { top: PAD, left: PAD, opacity: 0 }}
    >
      {children}
    </div>
  );
}
