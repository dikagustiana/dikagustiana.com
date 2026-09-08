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
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { placePopover } from './chainPlacement';

const PAD = 8;

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

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !figure) return;
    const measure = () => {
      const f = figure.getBoundingClientRect();
      const a = anchor?.getBoundingClientRect() ?? { top: f.top + PAD, left: f.left + PAD, width: 0, height: 0 };
      // Height is capped to the figure so the popover never runs out under
      // the map; the body scrolls instead.
      el.style.maxHeight = `${Math.max(160, f.height - PAD * 2)}px`;
      const size = { width: el.offsetWidth, height: el.offsetHeight };
      setPos(placePopover(a, f, size));
    };
    measure();
    window.addEventListener('resize', measure);
    // The reading can change height (a folded anatomy opened, a longer line);
    // re-measure when it does, where the browser can say so.
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => measure()) : null;
    ro?.observe(el);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [anchor, figure]);

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
