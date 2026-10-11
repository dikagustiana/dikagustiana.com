/**
 * The glimpse: the homepage's one row of essays.
 *
 * Every published essay: the starred ones (essays.is_selected) first in the
 * owner's order (essays.selected_rank, Admin → Content → Homepage order),
 * then the rest newest first (useSelectedEssays; owner decision D3(a),
 * 2026-10-10). Each is a narrow column of text: the section, the title, the
 * deck, the month. No badge, no number, no author, no reading time: a
 * glimpse of the essay itself, not a card about it. It replaced "Selected
 * Analysis" (a four-card grid, newest first) and the Sections list
 * (docs/DECISIONS.md, 2026-10-09).
 *
 * The row runs: a marquee, right to left, at GLIMPSE_SPEED, looping without a
 * seam (owner decision, 2026-10-11). The list is drawn twice on one strip and
 * the strip moves by one copy per lap (the `marquee` keyframes in
 * tailwind.config.ts); the lap's length is measured from the copy
 * (useMarqueeDuration), so the speed holds whatever the number of essays. It
 * stops under the pointer and while a link in it has focus, and the edges
 * fade. The second copy is hidden from screen readers and from Tab, so both
 * meet one list.
 *
 * It stands still, as a row that scrolls sideways (by swipe or trackpad, by
 * the two buttons, by the arrow keys once the row has focus, CSS snapping
 * doing the rest), for a reader who asked for reduced motion, and whenever
 * one copy is narrower than the page, where a loop would show its empty
 * end. With nothing published the section is absent, not empty.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FocusEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EssayCardLink } from '@/components/EssayCardLink';
import type { SelectedEssay } from '@/hooks/queries/useSelectedEssays';
import { useMarqueeDuration } from '@/hooks/useMarqueeDuration';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { monthYear } from '@/lib/formatDate';
import { REDUCED_MOTION_QUERY, scrollBehavior } from '@/lib/motion';
import { sectionLabel } from '@/lib/sectionLabels';
import { cn } from '@/lib/utils';
import './glimpse.css';

/**
 * How fast the row runs, in px/s. Slow enough to read a deck while it moves:
 * at 30 a column crosses a 375px phone in about twenty seconds.
 */
const GLIMPSE_SPEED = 30;

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

/** One essay's column. `repeat` marks the running row's second copy: out of the tab order. */
function Column({ essay, repeat = false }: { essay: SelectedEssay; repeat?: boolean }) {
  return (
    <li className="glimpse__item">
      <EssayCardLink essay={essay} className="group flex h-full flex-col" tabIndex={repeat ? -1 : undefined}>
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
  );
}

/** Keyboard focus, not the focus a click gives a link. */
function focusedByKeyboard(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}

export function Glimpse({ essays, isLoading }: GlimpseProps) {
  const frame = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const still = useMediaQuery(REDUCED_MOTION_QUERY);
  const timing = useMarqueeDuration(frame, track, heading, GLIMPSE_SPEED, essays);
  const running = !still && !isLoading && !!essays?.length && timing !== null;

  // Where the still row is, for the buttons: disabled at either edge, hidden
  // when every column already fits.
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
  }, [measure, essays, running]);

  const page = (direction: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: scrollBehavior() });
  };

  // Focus stops the running row (glimpse.css, :focus-within), but the column
  // a reader tabs to may be off either edge. So the row is set where that
  // column stands at the page's margin, where the row starts; the first
  // column, which starts left of the margin, is set at the lap's start.
  // Not for a click: the column would move from under the pointer.
  const bringIntoView = (event: FocusEvent<HTMLUListElement>) => {
    const moving = strip.current;
    const item = (event.target as HTMLElement).closest('li');
    const lap = moving?.getAnimations?.()[0];
    if (!timing || !moving || !item || !lap || !focusedByKeyboard(event.target)) return;
    // The column's place on the strip: both boxes move together.
    const x = item.getBoundingClientRect().left - moving.getBoundingClientRect().left;
    // The animation's own time runs from the (negative) delay, and a time
    // before zero is before the animation starts, drawn unmoved: so the time
    // is taken within one lap.
    const delay = Number(lap.effect?.getTiming().delay ?? 0);
    const lapMs = timing.duration * 1000;
    const at = (Math.max(0, x - timing.lead) / GLIMPSE_SPEED) * 1000 + delay;
    lap.currentTime = ((at % lapMs) + lapMs) % lapMs;
    if (frame.current) frame.current.scrollLeft = 0;
  };

  if (!isLoading && (!essays || essays.length === 0)) return null;

  const scrollable = !running && !(atStart && atEnd);

  return (
    <section aria-labelledby="glimpse-heading" className="border-b border-border py-12">
      <div className="container">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 ref={heading} id="glimpse-heading" className="text-xl font-display font-semibold text-foreground">
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

      {/* One tree for both forms, so the list is the same element when the
          row starts or stops running: the frame and the strip only take
          their classes when it runs. */}
      <div ref={frame} className={running ? 'glimpse__marquee' : undefined}>
        <div
          ref={strip}
          className={running ? 'glimpse__strip animate-marquee motion-reduce:animate-none' : undefined}
          style={
            running && timing
              ? ({ '--marquee-duration': `${timing.duration}s`, animationDelay: `${-timing.offset}s` } as CSSProperties)
              : undefined
          }
        >
          {/* Still, a focusable scroll region, so the arrow keys reach it;
              named by the heading, as a focusable region must be. Running, the
              links are the stops. */}
          <ul
            ref={track}
            tabIndex={running ? undefined : 0}
            aria-labelledby="glimpse-heading"
            onFocus={running ? bringIntoView : undefined}
            className={
              running
                ? 'glimpse__copy'
                : cn('glimpse__track', FOCUS, 'focus-visible:ring-inset focus-visible:ring-offset-0')
            }
          >
            {isLoading
              ? Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="glimpse__item" aria-hidden="true">
                    <div className="h-48 animate-pulse rounded-md bg-muted/40" />
                  </li>
                ))
              : essays!.map((essay) => <Column key={essay.id} essay={essay} />)}
          </ul>
          {running && (
            <ul aria-hidden="true" className="glimpse__copy">
              {essays!.map((essay) => (
                <Column key={essay.id} essay={essay} repeat />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
