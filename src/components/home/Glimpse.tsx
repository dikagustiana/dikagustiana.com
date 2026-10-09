/**
 * Glimpse — the homepage's one row of essays.
 *
 * Starred essays (essays.is_selected) in the owner's order
 * (essays.selected_rank, Admin → Content → Homepage order), laid out as a
 * single horizontally scrolling row with snap points. Scrolls by trackpad,
 * touch, shift+wheel, the arrow buttons, or the keyboard once the row has
 * focus. Renders nothing when nothing is starred.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { EssayCardLink } from '@/components/EssayCardLink';
import { Badge } from '@/components/ui/badge';
import type { SelectedEssay } from '@/hooks/queries/useSelectedEssays';
import { sectionLabel } from '@/lib/sectionLabels';
import { cn } from '@/lib/utils';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

interface GlimpseProps {
  essays: SelectedEssay[] | undefined;
  isLoading: boolean;
}

export function Glimpse({ essays, isLoading }: GlimpseProps) {
  const track = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [measure, essays]);

  const page = (dir: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (!isLoading && (!essays || essays.length === 0)) return null;

  const scrollable = !(atStart && atEnd);

  return (
    <section aria-labelledby="glimpse-heading" className="border-b border-border bg-card py-12">
      <div className="container">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="glimpse-heading" className="text-xl font-display font-semibold text-foreground">
              Glimpse
            </h2>
            {essays && essays.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {essays.length} essay{essays.length === 1 ? '' : 's'}, in the order I&rsquo;d hand them to you.
              </p>
            )}
          </div>
          {scrollable && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => page(-1)}
                disabled={atStart}
                aria-label="Scroll essays left"
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30',
                  FOCUS,
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => page(1)}
                disabled={atEnd}
                aria-label="Scroll essays right"
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30',
                  FOCUS,
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full-bleed track: the row runs to the viewport edge so the next card
          visibly continues past it; scroll-padding keeps snapped cards aligned
          with the container's left edge. */}
      <ul
        ref={track}
        tabIndex={0}
        aria-label="Selected essays"
        className={cn(
          'glimpse-track flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4',
          'px-[calc(max(0px,(100vw-1400px)/2)+2rem)] scroll-px-[calc(max(0px,(100vw-1400px)/2)+2rem)]',
          FOCUS,
        )}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="w-[17.5rem] shrink-0 snap-start sm:w-[19rem]">
                <div className="h-56 animate-pulse rounded-lg border border-border bg-muted/40" />
              </li>
            ))
          : essays!.map((essay, i) => (
              <li key={essay.id} className="w-[17.5rem] shrink-0 snap-start sm:w-[19rem]">
                <EssayCardLink essay={essay}>
                  <article className="group flex h-full min-h-56 flex-col rounded-lg border border-border bg-background p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {sectionLabel(essay.section)}
                      </Badge>
                      <span className="font-mono text-[11px] text-muted-foreground" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="mb-2 line-clamp-3 font-display text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-accent">
                      {essay.title}
                    </h3>
                    {essay.snippet && (
                      <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">{essay.snippet}</p>
                    )}
                    {essay.read_time && (
                      <span className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {essay.read_time}
                      </span>
                    )}
                  </article>
                </EssayCardLink>
              </li>
            ))}
      </ul>
    </section>
  );
}
