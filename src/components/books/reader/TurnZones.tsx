/**
 * The left and right halves of the page as buttons: a press on the left goes back a page, on the right forward,
 * as on an e-reader. They are real buttons, so they are reachable by keyboard and named for a screen reader,
 * and they show a faint arrow only on hover or focus.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  onTurn: (step: -1 | 1) => void;
  atStart?: boolean;
  atEnd?: boolean;
}

const zone =
  'group absolute inset-y-0 flex w-1/2 items-center px-3 text-white/0 outline-none transition-colors hover:text-white/70 focus-visible:text-white/90 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 disabled:cursor-default disabled:hover:text-white/0';

export function TurnZones({ onTurn, atStart = false, atEnd = false }: Props) {
  return (
    <>
      <button type="button" aria-label="Previous page" disabled={atStart} onClick={() => onTurn(-1)} className={`${zone} left-0 justify-start`}>
        <ChevronLeft className="h-8 w-8 drop-shadow" aria-hidden="true" />
      </button>
      <button type="button" aria-label="Next page" disabled={atEnd} onClick={() => onTurn(1)} className={`${zone} right-0 justify-end`}>
        <ChevronRight className="h-8 w-8 drop-shadow" aria-hidden="true" />
      </button>
    </>
  );
}
