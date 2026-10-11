import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * How long one lap of a running row takes, measured rather than written down.
 *
 * A marquee holds its list twice and moves by one copy per lap (translateX
 * from 0 to -50% of a track two copies wide), so a lap is one copy's width
 * over the speed: duration = (trackWidth / 2) / speed. The copy is measured,
 * not counted, so the speed holds when an item is added or removed, and it is
 * measured again whenever the frame or the copy changes size: a resize, the
 * breakpoint that widens the columns, a list that grows.
 *
 * The copy's width is taken from its columns, each with the gap after it,
 * not from the copy's own box: the same list is a scroller while it stands
 * still and a strip while it runs, and its columns are what is the same in
 * both.
 *
 * Null when one copy is narrower than the frame: two copies of a short list
 * cannot cover the frame for a whole lap, and the empty end would show at the
 * loop. Null as well where nothing is laid out (jsdom).
 *
 * `offset` is how far into the lap the row starts, in seconds (a negative
 * animation-delay of that much), so that at rest its first column stands at
 * `lead`'s left edge, the page's margin, and not under the left fade.
 */
export interface MarqueeTiming {
  /** Seconds per lap. */
  duration: number;
  /** Seconds into the lap at which the row starts. */
  offset: number;
  /** Where the first column stands at the start, in px from the frame's left edge. */
  lead: number;
}

export function useMarqueeDuration(
  frame: RefObject<HTMLElement>,
  copy: RefObject<HTMLElement>,
  lead: RefObject<HTMLElement>,
  speed: number,
  /** Measure again when this changes (the list's items). */
  content: unknown,
): MarqueeTiming | null {
  const [timing, setTiming] = useState<MarqueeTiming | null>(null);

  // Before paint: the first frame a reader sees is already the right one.
  useLayoutEffect(() => {
    const box = frame.current;
    const list = copy.current;
    if (!box || !list) {
      setTiming(null);
      return;
    }
    const measure = () => {
      const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
      let width = 0;
      for (const item of Array.from(list.children)) width += item.getBoundingClientRect().width + gap;
      if (width === 0 || width < box.clientWidth) {
        setTiming(null);
        return;
      }
      const start = lead.current
        ? Math.min(Math.max(lead.current.getBoundingClientRect().left - box.getBoundingClientRect().left, 0), width)
        : 0;
      const next = { duration: width / speed, offset: (width - start) / speed, lead: start };
      setTiming((prev) =>
        prev && prev.duration === next.duration && prev.offset === next.offset && prev.lead === next.lead ? prev : next,
      );
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(box);
    ro?.observe(list);
    return () => ro?.disconnect();
  }, [frame, copy, lead, speed, content]);

  return timing;
}
