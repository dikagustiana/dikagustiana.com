/**
 * A book seen end-on, standing on a plank (docs/prd/library-phase-2 §3, Shelf; the idea from Gloss's
 * components/library/Book.tsx, by permission, docs/licenses/gloss.md). Cloth in the shelf's colour, the title
 * running down it in the sans face, the author's surname across the foot, and for a book that is bought
 * rather than read here, a small price tag at the head. No cover image on the spine.
 *
 * Reached for (hover or focus), it lifts and tilts 6°, by transform alone, over 200 ms; with reduced motion
 * it stays put and focus shows as an outline only. The whole spine is one button; the shelf moves focus along
 * it with the arrow keys (roving tabindex, Shelf.tsx).
 */
import { forwardRef, memo } from 'react';
import { Tag } from 'lucide-react';
import type { ShelfBook } from '@/hooks/queries/useBooks';
import { spineLabel, surname } from '@/lib/spines';

interface SpineProps {
  book: ShelfBook;
  tabIndex: number;
  onOpen: (book: ShelfBook) => void;
  onFocus: () => void;
}

export const Spine = memo(
  forwardRef<HTMLButtonElement, SpineProps>(function Spine({ book, tabIndex, onOpen, onFocus }, ref) {
    const { h, w, color, ink } = book.spine;
    const title = book.title ?? book.slug;
    const by = surname(book.author);
    // Shrink a long title before it is cut short: the room is the spine's height less head and foot.
    const room = h - (by ? 46 : 22) - (book.access === 'paid' ? 18 : 0);
    const size = Math.max(9, Math.min(14, w * 0.34, room / Math.max(1, title.length * 0.55)));
    return (
      <button
        ref={ref}
        type="button"
        data-spine={book.slug}
        tabIndex={tabIndex}
        aria-label={spineLabel(book)}
        title={title}
        onClick={() => onOpen(book)}
        onFocus={onFocus}
        className="group/spine block shrink-0 rounded-[2px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className="relative flex origin-bottom-left flex-col items-center overflow-hidden rounded-[2px] font-sans shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14),2px_0_4px_-2px_rgb(0_0_0/0.35)] transition-transform duration-200 ease-out group-hover/spine:-translate-y-2 group-hover/spine:-rotate-6 group-focus-visible/spine:-translate-y-2 group-focus-visible/spine:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover/spine:transform-none motion-reduce:group-focus-visible/spine:transform-none"
          style={{ width: w, height: h, background: color, color: ink }}
        >
          {/* Cloth: darker at the edges, a little light down the middle. */}
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.22),rgb(255_255_255/0.1)_18%,transparent_55%,rgb(0_0_0/0.18))]" />
          {book.access === 'paid' && <Tag className="relative mt-2 h-3 w-3 shrink-0 opacity-80" />}
          <span className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-0.5 py-2">
            <span className="max-h-full overflow-hidden text-ellipsis whitespace-nowrap font-medium leading-tight [writing-mode:vertical-rl]" style={{ fontSize: size }}>
              {title}
            </span>
          </span>
          {by && (
            <span className="relative mb-2 max-w-full truncate px-0.5 text-[9px] uppercase tracking-wide opacity-85" style={{ fontSize: Math.min(9, (w - 6) / Math.max(1, by.length * 0.62)) }}>
              {by}
            </span>
          )}
        </span>
      </button>
    );
  }),
);
