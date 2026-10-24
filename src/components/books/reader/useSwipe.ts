/**
 * A sideways swipe on a touchscreen turns the page (bookReader.swipeStep). A swipe that starts or ends on a
 * turn zone would also click that button, turning the page a second time or undoing the turn, so the click
 * that follows a recognised swipe is swallowed. A tap is still a click, and a keyboard press on a turn zone
 * is never touched. A mouse press is a click on a turn zone, not a swipe.
 */
import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { swipeStep } from '@/lib/bookReader';

/** How long after a swipe its own click can still arrive. */
const CLICK_AFTER_SWIPE_MS = 600;

export function useSwipe(onTurn: (step: -1 | 1) => void, enabled = true) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swipedAt = useRef(0);
  return {
    onPointerDown: (e: ReactPointerEvent) => {
      start.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: ReactPointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from || !enabled) return;
      const step = swipeStep(e.clientX - from.x, e.clientY - from.y);
      if (!step) return;
      swipedAt.current = Date.now();
      onTurn(step);
    },
    onClickCapture: (e: ReactMouseEvent) => {
      if (Date.now() - swipedAt.current < CLICK_AFTER_SWIPE_MS) {
        swipedAt.current = 0;
        e.preventDefault();
        e.stopPropagation();
      }
    },
  };
}
