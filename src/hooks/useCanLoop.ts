import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Whether a row of columns is long enough to loop: measured, not counted.
 *
 * A looping carousel (Embla, `loop: true`) shifts a column from one end of
 * the row to the other as it passes out of view. It can only do that when
 * every column but one still covers the frame, or the shifted column is seen
 * arriving and the row's empty end shows. This is Embla's own test
 * (SlideLooper.canLoop: the frame less every other column's width), taken
 * before the carousel is made, so the row is drawn in the right form the
 * first time: a looping row, or a still one with an end at each side.
 *
 * The columns are measured, so the answer holds when an essay is added or
 * removed, and measured again whenever the frame or the list changes size: a
 * resize, the breakpoint that widens the columns. False where nothing is laid
 * out (jsdom).
 */
export function useCanLoop(
  frame: RefObject<HTMLElement>,
  list: RefObject<HTMLElement>,
  /** Measure again when this changes (the list's items). */
  content: unknown,
): boolean {
  const [loops, setLoops] = useState(false);

  // Before paint: the first frame a reader sees is already the right one.
  useLayoutEffect(() => {
    const box = frame.current;
    const row = list.current;
    if (!box || !row) {
      setLoops(false);
      return;
    }
    const measure = () => {
      const widths = Array.from(row.children, (item) => item.getBoundingClientRect().width);
      const total = widths.reduce((sum, width) => sum + width, 0);
      const widest = Math.max(0, ...widths);
      setLoops(total > 0 && total - widest >= box.clientWidth);
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(box);
    ro?.observe(row);
    return () => ro?.disconnect();
  }, [frame, list, content]);

  return loops;
}
