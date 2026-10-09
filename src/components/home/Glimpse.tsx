/**
 * The glimpse: the homepage's one row of essays.
 *
 * Starred essays (essays.is_selected) in the owner's order
 * (essays.selected_rank, Admin → Content → Homepage order), each a narrow
 * column of text: the section, the title, the deck, the month. No badge, no
 * number, no author, no reading time: a glimpse of the essay itself, not a
 * card about it. It replaced "Selected Analysis" (a four-card grid, newest
 * first) and the Sections list (docs/DECISIONS.md, 2026-10-09).
 *
 * The row runs to the viewport's edges and scrolls sideways: by swipe or
 * trackpad, by the two buttons, or by the arrow keys once the row has focus.
 * The buttons page by most of the visible width and follow the reader's
 * motion preference (scrollBehavior); CSS snapping does the rest. With
 * nothing starred the section is absent, not empty.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EssayCardLink } from '@/components/EssayCardLink';
import type { SelectedEssay } from '@/hooks/queries/useSelectedEssays';
import { monthYear } from '@/lib/formatDate';
import { scrollBehavior } from '@/lib/motion';
import { sectionLabel } from '@/lib/sectionLabels';
import { cn } from '@/lib/utils';
import './glimpse.css';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const BUTTON = cn(
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30',
  FOCUS,
);

interface GlimpseProps {
  essays: SelectedEssay[] | undefined;
  isLoading: boolean;
}

export function Glimpse({ essays, isLoading }: GlimpseProps) {
  const track = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  // Where the row is, for the buttons: disabled at either edge, hidden when
  // every column already fits.
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, [measure, essays]);

  const page = (direction: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: scrollBehavior() });
  };

  if (!isLoading && (!essays || essays.length === 0)) return null;

  const scrollable = !(atStart && atEnd);

  return (
    <section aria-labelledby="glimpse-heading" className="border-b border-border py-12">
      <div className="container">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="glimpse-heading" className="text-xl font-display font-semibold text-foreground">
            Glimpse
          </h2>
          {scrollable && (
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => page(-1)} disabled={atStart} aria-label="Earlier in the row" className={BUTTON}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => page(1)} disabled={atEnd} aria-label="Further along the row" className={BUTTON}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* A focusable scroll region, so the arrow keys reach it; named by the
          heading, as a focusable region must be. */}
      <ul ref={track} tabIndex={0} aria-labelledby="glimpse-heading" className={cn('glimpse__track', FOCUS, 'focus-visible:ring-inset focus-visible:ring-offset-0')}>
        {isLoading
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="glimpse__item" aria-hidden="true">
                <div className="h-48 animate-pulse rounded-md bg-muted/40" />
              </li>
            ))
          : essays!.map((essay) => (
              <li key={essay.id} className="glimpse__item">
                <EssayCardLink essay={essay} className="group flex h-full flex-col">
                  <p className="eyebrow mb-3">
                    {sectionLabel(essay.section)}
                  </p>
                  <h3 className="mb-3 font-display text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-accent">
                    {essay.title}
                  </h3>
                  {essay.snippet && (
                    <p className="mb-4 line-clamp-5 font-serif text-sm leading-relaxed text-muted-foreground">
                      {essay.snippet}
                    </p>
                  )}
                  <p className="mt-auto text-xs text-muted-foreground">{monthYear(essay.date ?? essay.created_at)}</p>
                </EssayCardLink>
              </li>
            ))}
      </ul>
    </section>
  );
}
