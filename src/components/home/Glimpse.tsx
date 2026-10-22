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
 * The row runs, right to left at GLIMPSE_SPEED, looping without a seam
 * (owner decision, 2026-10-11), and a reader can take hold of it at any time
 * (owner request, 2026-10-22): a swipe, a drag with the mouse, a sideways
 * scroll on a trackpad or with Shift and the wheel, the two arrow buttons at
 * every width, and the arrow keys (the row is a Tab stop; on a column, an
 * arrow key takes focus to the next column). It is an Embla carousel (the
 * engine under shadcn/ui's Carousel): `loop` shifts columns from one end to the other, so the list is
 * drawn once; `dragFree` leaves the row where the reader lets go of it; the
 * AutoScroll plugin runs it and WheelGestures turns a sideways scroll into a
 * drag. The row stops under the pointer, while a reader holds it, while a
 * column has keyboard focus (which brings that column to the page's margin),
 * and by its pause button, which is the one way to stop it on a touchscreen
 * and which nothing else undoes. Otherwise it starts again RESUME_AFTER after
 * the reader is done, from where they left it. A drag never opens an essay;
 * a click does. The edges fade.
 *
 * It stands still, a row that still moves by swipe, drag, trackpad, the
 * buttons and the arrow keys, for a reader who asked for reduced motion, and whenever the
 * columns are too few to loop, where the row's empty end would show: its
 * first column at the page's margin and its last at the other. With nothing
 * published the section is absent, not empty.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll, { type AutoScrollType } from 'embla-carousel-auto-scroll';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { EssayCardLink } from '@/components/EssayCardLink';
import type { SelectedEssay } from '@/hooks/queries/useSelectedEssays';
import { useCanLoop } from '@/hooks/useCanLoop';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { monthYear } from '@/lib/formatDate';
import { REDUCED_MOTION_QUERY, prefersReducedMotion } from '@/lib/motion';
import { sectionLabel } from '@/lib/sectionLabels';
import { cn } from '@/lib/utils';
import './glimpse.css';

/**
 * How fast the row runs, in px/s. Slow enough to read a deck while it moves:
 * at 30 a column crosses a 375px phone in about twenty seconds.
 */
const GLIMPSE_SPEED = 30;

/** Embla moves in fixed steps of 1/60 s, and AutoScroll's speed is px per step. */
const SPEED_PER_STEP = GLIMPSE_SPEED / 60;

/** How long the row waits, after a reader is done with it, before it runs again, in ms. */
const RESUME_AFTER = 3000;

const BUTTON = cn(
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);

interface GlimpseProps {
  essays: SelectedEssay[] | undefined;
  isLoading: boolean;
}

/** One essay's column. */
function Column({ essay }: { essay: SelectedEssay }) {
  return (
    <li className="glimpse__item">
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

/**
 * Embla watches the row's size and which column is in view; a browser
 * without either observer (and jsdom) gets the row as a plain list.
 */
function carouselSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.ResizeObserver === 'function' &&
    typeof window.IntersectionObserver === 'function'
  );
}

/** What holds the running row still. Any one of them stops it. */
interface Holds {
  running: boolean;
  paused: boolean;
  pointer: boolean;
  hover: boolean;
  focus: boolean;
}

export function Glimpse({ essays, isLoading }: GlimpseProps) {
  const frame = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLUListElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Stopped by the reader's own button; the pointer and focus stop it too.
  const [paused, setPaused] = useState(false);

  const still = useMediaQuery(REDUCED_MOTION_QUERY);
  const loops = useCanLoop(frame, track, essays);
  const loopable = !still && !isLoading && !!essays?.length && loops;

  // Every column stops at the page's margin, under the heading, wherever
  // the page is: the arrows and keyboard focus bring a column there, and
  // the running row starts with its first column there.
  const atMargin = useCallback(() => {
    if (!heading.current || !frame.current) return 0;
    return heading.current.getBoundingClientRect().left - frame.current.getBoundingClientRect().left;
  }, []);
  const options = useMemo(() => ({ loop: loopable, dragFree: true, align: atMargin }), [loopable, atMargin]);
  const plugins = useMemo(
    () => [
      // Started and stopped by the holds below, never by the plugin itself,
      // except that it stops for a column reached by Tab (stopOnFocusIn)
      // before Embla brings that column into view.
      AutoScroll({
        speed: SPEED_PER_STEP,
        direction: 'forward',
        playOnInit: false,
        startDelay: 0,
        stopOnInteraction: true,
        stopOnMouseEnter: false,
        stopOnFocusIn: true,
      }),
      WheelGesturesPlugin(),
    ],
    [],
  );
  const [carousel, api] = useEmblaCarousel(options, plugins);
  const setFrame = useCallback(
    (node: HTMLDivElement | null) => {
      frame.current = node;
      if (carouselSupported()) carousel(node);
    },
    [carousel],
  );

  // What Embla made of the row: whether it loops (it falls back to a still
  // row by itself when the columns cannot cover the frame), and whether
  // there is anywhere to go for the arrows.
  const [looping, setLooping] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  useEffect(() => {
    if (!api) {
      setLooping(false);
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const read = () => {
      setLooping(api.internalEngine().options.loop);
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    read();
    api.on('reInit', read).on('select', read);
    return () => {
      api.off('reInit', read).off('select', read);
    };
  }, [api]);

  const running = loopable && looping;

  // Run the row, or hold it. A hold stops it at once; when the last hold
  // lets go, it starts again after `delay`, from where it stands.
  const holds = useRef<Holds>({ running, paused, pointer: false, hover: false, focus: false });
  const timer = useRef(0);
  const decide = useCallback(
    (delay: number) => {
      window.clearTimeout(timer.current);
      const auto = api?.plugins().autoScroll as AutoScrollType | undefined;
      if (!api || !auto) return;
      const { running, paused, pointer, hover, focus } = holds.current;
      if (!running || paused || pointer || hover || focus || api.scrollSnapList().length < 2) {
        auto.stop();
        return;
      }
      if (auto.isPlaying()) return;
      if (delay > 0) timer.current = window.setTimeout(() => decide(0), delay);
      else auto.play(0);
    },
    [api],
  );

  useEffect(() => {
    holds.current.running = running;
    holds.current.paused = paused;
    decide(0);
  }, [running, paused, decide]);

  // A drag, a swipe or a sideways scroll (Embla's pointer events, which the
  // wheel plugin raises as well), and a fresh carousel after a resize.
  useEffect(() => {
    if (!api) return;
    const down = () => {
      holds.current.pointer = true;
      decide(0);
    };
    const up = () => {
      holds.current.pointer = false;
      decide(RESUME_AFTER);
    };
    const again = () => decide(0);
    api.on('pointerDown', down).on('pointerUp', up).on('reInit', again);
    return () => {
      api.off('pointerDown', down).off('pointerUp', up).off('reInit', again);
      window.clearTimeout(timer.current);
    };
  }, [api, decide]);

  // Shift and the wheel scroll sideways. Most browsers turn the wheel's
  // delta sideways themselves; where one has not, it is turned here, before
  // the wheel plugin (which listens on the frame) reads it, and the page is
  // not scrolled down instead.
  useEffect(() => {
    const el = frame.current;
    if (!api || !el) return;
    const sideways = (event: WheelEvent) => {
      if (!event.isTrusted || !event.shiftKey || event.deltaX !== 0 || event.deltaY === 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      event.target?.dispatchEvent(
        new WheelEvent('wheel', {
          deltaX: event.deltaY,
          deltaMode: event.deltaMode,
          clientX: event.clientX,
          clientY: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    el.addEventListener('wheel', sideways, { capture: true, passive: false });
    return () => el.removeEventListener('wheel', sideways, { capture: true });
  }, [api]);

  // A touch also sends pointer events; only a mouse hovers.
  const hover = (on: boolean) => (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    holds.current.hover = on;
    decide(on ? 0 : RESUME_AFTER);
  };
  const focusIn = (event: FocusEvent) => {
    if (!focusedByKeyboard(event.target)) return;
    holds.current.focus = true;
    decide(0);
  };
  const focusOut = (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && frame.current?.contains(event.relatedTarget)) return;
    if (!holds.current.focus) return;
    holds.current.focus = false;
    decide(RESUME_AFTER);
  };

  // The arrows and the arrow keys move by one column: at once for a reader
  // who asked for reduced motion. The row stops first, so the column lands
  // where it should, and runs again RESUME_AFTER later.
  const move = (scroll: (jump: boolean) => void) => {
    (api?.plugins().autoScroll as AutoScrollType | undefined)?.stop();
    scroll(prefersReducedMotion());
    decide(RESUME_AFTER);
  };
  const page = (direction: -1 | 1) => {
    if (!api) return;
    move((jump) => (direction < 0 ? api.scrollPrev(jump) : api.scrollNext(jump)));
  };

  // The arrow keys, while the row or a column in it has focus. On the row
  // they page it, as the arrow buttons do. On a column, focus goes to the
  // next column along (round the loop when the row runs) and the row brings
  // that column to the page's margin, so focus is never left off the edge.
  // Alt with an arrow is the browser's back and forward, and stays so.
  const arrowKeys = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !api) return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const slides = api.slideNodes();
    const from = slides.findIndex((slide) => slide.contains(event.target as Node));
    if (from < 0) return page(direction);
    const engine = api.internalEngine();
    const to = engine.options.loop ? (from + direction + slides.length) % slides.length : from + direction;
    if (to < 0 || to >= slides.length) return;
    const snap = engine.slideRegistry.findIndex((group) => group.includes(to));
    move((jump) => api.scrollTo(Math.max(snap, 0), jump));
    slides[to].querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
  };

  if (!isLoading && (!essays || essays.length === 0)) return null;

  return (
    <section aria-labelledby="glimpse-heading" className="border-b border-border py-12">
      <div className="container">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 ref={heading} id="glimpse-heading" className="text-xl font-display font-semibold text-foreground">
            Glimpse
          </h2>
          <div className="flex shrink-0 gap-2">
            {/* At every width: a phone has the swipe as well. */}
            {(canPrev || canNext) && (
              <>
                <button
                  type="button"
                  onClick={() => page(-1)}
                  disabled={!canPrev}
                  aria-label="Earlier in the row"
                  className={BUTTON}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => page(1)}
                  disabled={!canNext}
                  aria-label="Further along the row"
                  className={BUTTON}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            )}
            {/* A touchscreen has no hover, and a tap on a column follows its
                link: the button is how a reader there stops the row to read. */}
            {running && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? 'Resume the row' : 'Pause the row'}
                className={BUTTON}
              >
                {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* The frame is Embla's viewport and the list its container: one tree
          whether the row runs or stands still, so the list is the same
          element when it starts or stops. The list is a Tab stop, named by
          the heading, whenever it has somewhere to go, so the arrow keys
          reach it; the links are the stops after it. The list moves under
          the frame, so the frame draws its focus ring (glimpse.css). */}
      <div
        ref={setFrame}
        className={cn('glimpse__frame', running && 'glimpse__frame--running')}
        data-paused={running && paused ? '' : undefined}
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        onFocus={focusIn}
        onBlur={focusOut}
        onKeyDown={arrowKeys}
      >
        <ul
          ref={track}
          tabIndex={canPrev || canNext ? 0 : undefined}
          aria-labelledby="glimpse-heading"
          className={cn('glimpse__row', loopable ? 'glimpse__row--loop' : 'glimpse__row--still', 'focus-visible:outline-none')}
        >
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="glimpse__item" aria-hidden="true">
                  <div className="h-48 animate-pulse rounded-md bg-muted/40" />
                </li>
              ))
            : essays!.map((essay) => <Column key={essay.id} essay={essay} />)}
        </ul>
      </div>
    </section>
  );
}
