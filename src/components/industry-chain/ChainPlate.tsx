/**
 * The industry chain, at two distances — and in motion.
 *
 * One chain. Two sentences under the headline contain the controls that
 * change how the same structure is read:
 *
 *   distance   the two lens names in the first sentence. ECONOMY or FINANCE,
 *              always one of them, economy at rest — the reader arrives from
 *              far. The map does not change; the word on every joint does,
 *              and at FINANCE an open reading isolates its joint: the rest of
 *              the chain steps back until it is closed.
 *   shift      the two shift words in the second sentence. Neither on is the
 *              resting map; one on marks the elements that shift moves, each
 *              with a numbered disc whose form is its status; the other
 *              switches. Each scenario is read separately.
 *
 * The two compose. A shift is read at whichever distance is on, in the panel
 * of any marked element — and the panel speaks in that one voice only. Which
 * elements are marked is the shift's business alone: move the distance
 * control and the marks stay where they are, saying something else. The
 * control says how many marks it would raise before it raises them.
 *
 *   detail     how much of the chain is drawn. `variant="preview"` opens with
 *              the short plate; the button under it, and the one beside the
 *              controls once it is open, swap the two. It is a THIRD question,
 *              not a side effect of the other two — a distance and a scenario
 *              now change only what they name, and a control that would have
 *              nothing to change on the short plate is not offered there.
 *
 * Nothing lives under the map but the way back and, under a shift, the written
 * conflict between the two scenarios. There is no legend, no caption, no list
 * of what moves and no hint line: every definition is read on the element that
 * raises the question (hover or focus pins one line beside it), and every
 * reading opens as a popover beside the element that opened it — a bottom
 * sheet on a narrow screen, where the distance rides inside the sheet so a
 * phone reader can re-read the same element without closing it.
 *
 * TWO LEVELS OF THE SAME MAP, not a taster and a map. The overview groups
 * what can be grouped without asserting anything the detail denies, and it
 * carries the distance, both overlays and every door, so a reader can work at
 * it without opening the detail at all. There is no opening case and no
 * guided route: the reader picks the relation that interests them, and the
 * depth is in the essay the reading leads to.
 *
 * The state — overlay, distance, open door — is in the address at both levels,
 * so an essay can link into the exact reading it argues from and a reader can
 * share what they are looking at from the top of the landing page. The preview
 * opens the detail only for an address naming an element the overview groups
 * away. See useChainUrl.ts; the address carries slugs, never the numbers,
 * because the numbers are positions and the slugs are names.
 *
 * Two layouts, one state. A wide screen gets the generated plate
 * (ChainPlateSvg.tsx); a narrow one gets the column (ChainColumn.tsx). The
 * choice is a media query read on the first render, so only one is ever in
 * the document.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import {
  CHAIN_COPY,
  CONDITION_AS_OF,
  SHIFT_BY_ID,
  SHIFTS,
  TENSIONS,
  drawnAtOverview,
  type ChainLevel,
  type JointId,
  type LensId,
  type ShiftId,
} from '@/data/industryChain';
import { fullDate } from '@/lib/formatDate';
import { scrollBehavior } from '@/lib/motion';
import { CHAIN_MODULE_LINKS, locatedModulesByJoint, type ChainModuleLink } from '@/data/chainCurriculumMap';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { ChainColumn } from './ChainColumn';
import { ChainLensContext, type ChainLensState, type Hovered } from './chainLensContext';
import { ChainPlateCompact, ChainPlateWide } from './ChainPlateSvg';
import { ChainPopover } from './ChainPopover';
import { ChainTargetPanel } from './ChainTargetPanel';
import { HoverLabel } from './HoverLabel';
import { isDoor, isJointId, isolationSet, markNumber, markedIds, targetLabel } from './chainTargets';
import { asksForFullChain, initialChainUrl, useChainUrl, type ChainUrlState } from './useChainUrl';
import './chain-plate.css';
import './chain-review.css';

/** The wide plate needs this much room before its type stays readable. */
export const WIDE_PLATE_QUERY = '(min-width: 1280px)';

const FOCUS =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** One of the two lens names inside the sentence: a position, not a switch — one of the two is always on. */
function LensWord({ id, active, onChoose, children }: { id: LensId; active: boolean; onChoose: (id: LensId) => void; children: string }) {
  return (
    <button
      type="button"
      data-chain-control="lens"
      aria-pressed={active}
      onClick={() => onChoose(id)}
      className={cn(
        'inline-flex min-h-11 items-center border-b pb-px font-medium text-foreground transition-colors',
        active ? 'border-b-2 border-foreground' : 'border-dotted border-muted-foreground hover:border-solid hover:border-foreground',
        FOCUS,
      )}
    >
      {children}
    </button>
  );
}

/**
 * One of the two shift words: a toggle, and the two exclude each other. It
 * says how many marks it would put on the map, so the reader knows the size
 * of what they are turning on before they turn it on. The count is
 * aria-hidden because the live status line announces it in words; the word
 * itself stays the button's whole accessible name.
 */
function ShiftWord({ id, active, onToggle, children }: { id: ShiftId; active: boolean; onToggle: (id: ShiftId) => void; children: string }) {
  const count = markedIds(id).length;
  return (
    <button
      type="button"
      data-chain-control="shift"
      aria-pressed={active}
      onClick={() => onToggle(id)}
      className={cn(
        'inline-flex min-h-11 items-center gap-1 border-b pb-px font-medium text-foreground transition-colors',
        active ? 'border-b-2 border-accent-editorial' : 'border-dotted border-muted-foreground hover:border-solid hover:border-foreground',
        FOCUS,
      )}
    >
      {children}
      <span aria-hidden="true" className="text-xs tabular-nums text-muted-foreground" data-mark-count={id}>
        ({count})
      </span>
    </button>
  );
}

/**
 * Which targets can be open at all under a shift: every joint and every layer
 * always, plus whatever that shift has marked. A stage or a border is a door
 * only while the overlay that marks it is on, so switching overlays closes a
 * reading that no longer exists rather than leaving a panel with no mark.
 */
const canOpen = (id: string | null, shift: ShiftId | null): boolean =>
  id !== null && (isDoor(id) || (shift !== null && markNumber(shift, id) > 0));

/** No layer switched off. One frozen instance, so restoring the overview is a no-op when it already is. */
const EMPTY_HIDDEN: ReadonlySet<string> = new Set();

/**
 * Where focus should go back to, given what the reader actually pressed.
 *
 * A joint's chip is a deliberate non-button: it is `aria-hidden`, outside the
 * tab order, and it opens the same door the diamond does so a reader who lands
 * on the word is not one target away from the reading. What that costs is a
 * return path — calling focus() on an element a browser cannot focus does
 * nothing, so closing a reading opened from a chip dropped focus to <body> and
 * a keyboard reader was returned to the top of the document. Reproduced on
 * /about at 1348x936 on 14 September 2026.
 *
 * So a chip hands back its joint, which is the door in the tab order and the
 * one the reader means. Anything else is returned as it came.
 */
function focusableTrigger(trigger: Element | null): Element | null {
  const chip = trigger?.closest?.('.cp-joint-chip');
  if (!chip) return trigger;
  const id = chip.getAttribute('data-for');
  return (id ? chip.ownerDocument.querySelector(`.cp-hit[data-id="${id}"]`) : null) ?? trigger;
}

/** The element on the plate a reading is anchored to: its mark under a shift, else its own door or form. */
function anchorFor(figure: HTMLElement | null, id: string, shift: ShiftId | null): Element | null {
  if (!figure) return null;
  const q = (sel: string) => figure.querySelector(sel);
  return (
    (shift && markNumber(shift, id) > 0 ? q(`.cp-marks--${shift} .cp-mark[data-mark="${id}"]`) : null) ??
    q(`.cp-hit[data-id="${id}"]`) ??
    q(`.cp-base [data-id="${id}"]`)
  );
}

export function ChainPlate({
  links = CHAIN_MODULE_LINKS,
  variant = 'full',
  initialShift = null,
  heading = 'h2',
}: {
  links?: readonly ChainModuleLink[];
  /** `preview` opens short and expands in place; `full` is the whole chain from the start. */
  variant?: 'full' | 'preview';
  /**
   * The rank of the map's own title. On the landing page nothing precedes the
   * map, so the map's title IS the page's main heading and this is `h1`;
   * inside About it sits under that page's heading and stays `h2`. A prop
   * rather than a guess, because the component cannot see what is above it.
   */
  heading?: 'h1' | 'h2';
  /**
   * The overlay a page frame opens the map with when the address names none —
   * the Green Transition section mounts the same component with `green` on.
   * An address always wins over it.
   */
  initialShift?: ShiftId | null;
}) {
  const base = useId();
  const panelId = `${base}-chain-panel`;
  const figureId = `${base}-chain-figure`;
  const wideScreen = useMediaQuery(WIDE_PLATE_QUERY, true);

  // An address can name an element that this overlay does not mark — an old
  // link, a hand-edited one, or one written against the other shift. Opening
  // it anyway would put a panel with a heading and nothing under it on the
  // page, which is the one thing the map must never show. So the address is
  // validated before it becomes state, here and on every Back or Forward;
  // the rejected parameter is then dropped from the URL by the writer.
  const [fromUrl] = useState(() => {
    const url = initialChainUrl();
    return { ...url, node: canOpen(url.node, url.shift) ? url.node : null };
  });

  const [lens, setLens] = useState<LensId>(fromUrl.lens ?? 'economy');
  const [shift, setShift] = useState<ShiftId | null>(fromUrl.shift ?? initialShift);
  const [selected, setSelected] = useState<string | null>(fromUrl.node);
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(EMPTY_HIDDEN);
  // The preview opens short — unless the address asks for something the short
  // plate cannot draw, in which case it opens into exactly that.
  //
  // This is the second half of a contract version 2 left open. From the
  // expansion onwards the map wrote its state into the address, so a reader
  // could copy a link to what they were looking at; the address was then read
  // back only on the `full` variant, so that link opened the landing page at
  // Economy, no shift, short — parameters intact and reading gone. A URL that
  // records an exploration without restoring it is worse than no URL: it
  // promises a shared reading and hands over a different one.
  //
  // A plain visit is untouched. `asksForFullChain` is false for an address
  // with no chain parameters, and false for `distance=economy` alone, which is
  // what the short plate already shows.
  const [expanded, setExpanded] = useState(variant === 'full' || asksForFullChain(fromUrl));
  const [anchor, setAnchor] = useState<Element | null>(null);
  const triggerRef = useRef<Element | null>(null);
  const figureRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // THE DETAIL SCROLLS INSIDE THE MAP, THE PAGE DOES NOT. The detail plate is
  // drawn at no less than one CSS pixel per unit (chain-review.css), so below
  // about 1760px of figure it is wider than its window and the box around it
  // scrolls sideways. Measured, not assumed: the note under the figure that
  // says so appears only while the box actually overflows.
  const [scrollable, setScrollable] = useState(false);

  const urlState = useMemo<ChainUrlState>(() => ({ lens, shift, node: selected }), [lens, shift, selected]);
  // THE ADDRESS IS LIVE AT BOTH LEVELS. It used to be written only once the
  // preview was expanded, because the short plate had no state worth sharing:
  // no distance, no overlay, no open door. The overview has all three, so a
  // reader who changes one at the top of the landing page can send what they
  // are looking at. A plain visit is still untouched — useChainUrl writes
  // nothing until the reader changes something.
  const subscribeToUrl = useChainUrl(true, urlState);
  useEffect(
    () =>
      subscribeToUrl((next) => {
        setLens(next.lens ?? 'economy');
        setShift(next.shift);
        setSelected(canOpen(next.node, next.shift) ? next.node : null);
      }),
    [subscribeToUrl],
  );

  /**
   * WHICH LEVEL OF GROUPING IS DRAWN. Not "how much of the map is offered":
   * both levels carry the doors, the chips and the marks, so everything below
   * this line runs at both. The gates that used to hang off it are gone
   * — they existed because the old short plate had nothing to act on.
   */
  const level: ChainLevel = variant === 'preview' && !expanded ? 'overview' : 'detail';
  const atOverview = level === 'overview';

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver !== 'function') {
      setScrollable(false);
      return;
    }
    const check = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wideScreen, level]);

  const modulesByJoint = useMemo(() => locatedModulesByJoint(links), [links]);

  // THREE CONTROLS, THREE CONTRACTS. How much of the chain is drawn, which
  // distance it is read at, and which scenario is on are three different
  // questions, and each control now changes only its own. They used to be
  // coupled: both of these set `expanded`, so pressing the already-active
  // Economy — or the already-active No shift, which changes nothing at all —
  // swapped the whole short plate for the full one. A reader cannot learn what
  // a control means while it also does something else.
  //
  // The coupling was there because the short plate cannot honour either
  // control: it has no chips to re-word and no marks to raise. The answer is
  // not to make them expand; it is not to offer them where they do nothing.
  // The short plate shows its one labelled entrance and the button to the full
  // chain, and these two appear where they mean something.
  const chooseLens = useCallback((next: LensId) => setLens(next), []);

  const chooseShift = useCallback((next: ShiftId | null) => {
    setShift((current) => {
      const after = current === next ? null : next;
      setSelected((open) => (canOpen(open, after) ? open : null));
      return after;
    });
  }, []);
  const toggleShift = useCallback((next: ShiftId) => chooseShift(next), [chooseShift]);

  const onSelect = useCallback(
    (id: string, trigger: Element | null) => {
      // A door named inside an open reading (a layer in a joint's panel) is
      // about to be re-rendered with it — so the door the reader actually
      // came through stays the one Close returns to.
      const panel = document.getElementById(panelId);
      if (!(trigger && panel?.contains(trigger))) triggerRef.current = focusableTrigger(trigger);
      setSelected((current) => (current === id ? null : id));
    },
    [panelId],
  );

  /** Focus goes back to the door the reader came through, or to the figure when that door is gone. */
  const returnFocus = useCallback(() => {
    const t = triggerRef.current;
    if ((t instanceof HTMLElement || t instanceof SVGElement) && t.isConnected) t.focus({ preventScroll: true });
    else figureRef.current?.focus({ preventScroll: true });
  }, []);

  const closePanel = useCallback(() => {
    setSelected(null);
    // Beside the plate the reading is a plain element, so focus can return at
    // once. In the sheet a focus trap is still up until it unmounts, so the
    // sheet returns focus itself, from onCloseAutoFocus.
    if (wideScreen) returnFocus();
  }, [wideScreen, returnFocus]);

  const onHover = useCallback((id: string | null, el?: Element | null) => {
    setHovered(id ? { id, el: el ?? null } : null);
  }, []);

  // The stages, nodes, returns, borders, rails and shift arrows are static
  // geometry with no handlers of their own; the figure listens for them, so
  // every form on the plate reads its definition on hover. The joints, bands,
  // switches and marks have their own handlers and are left alone here.
  const baseTarget = (target: EventTarget | null): Element | null => {
    const el = target instanceof Element ? target : null;
    const hit = el?.closest('.cp-base [data-id], .cp-shifts .cp-move[data-id]') ?? null;
    return hit && !hit.closest('.cp-hits, .cp-mark-layer') ? hit : null;
  };
  const onFigureOver = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      const hit = baseTarget(e.target);
      if (hit) onHover(hit.getAttribute('data-id'), hit);
    },
    [onHover],
  );
  const onFigureOut = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      const from = baseTarget(e.target);
      if (!from) return;
      const to = e.relatedTarget instanceof Element ? e.relatedTarget : null;
      if (to && from.contains(to)) return;
      onHover(null);
    },
    [onHover],
  );

  const onToggleLayer = useCallback((id: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleExpanded = useCallback(() => {
    const next = !expanded;
    // THE LEVEL CONTROL CHANGES THE LEVEL AND NOTHING ELSE, in both
    // directions. Going back used to drop the shift and the open reading,
    // because the short plate could draw neither; the overview draws both, so
    // clearing them would now be the control doing something it does not say.
    // The one case that still has to be cleared is a reading of an element the
    // overview does not draw — a panel with no element under it is the one
    // thing the map must never show.
    if (!next && selected && !drawnAtOverview(selected)) setSelected(null);
    setExpanded(next);
    // Let the swapped figure paint, then land focus on it so the reader is
    // where the chain now is. No scroll of our own: focus brings it into view
    // and respects the reader's motion setting through the browser.
    requestAnimationFrame(() => figureRef.current?.focus());
  }, [expanded, selected]);

  // A SHARED READING ARRIVES BELOW THE FOLD. An address naming an element
  // opens its reading on the first paint, and on both pages that carry the map
  // the figure is thousands of pixels down. The panel focuses its own heading
  // with preventScroll — deliberately, so the page does not jump under a reader
  // who is already looking at the map — which leaves an incoming link opening a
  // reading the recipient cannot see. So the figure is brought to them once,
  // and only when the address actually asked for a reading. A fragment in the
  // same address is the reader's own instruction and wins.
  const arrivedOpen = useRef(fromUrl.node !== null);
  useEffect(() => {
    if (!arrivedOpen.current) return;
    arrivedOpen.current = false;
    if (typeof window === 'undefined' || window.location.hash) return;
    const frame = requestAnimationFrame(() => figureRef.current?.scrollIntoView?.({ block: 'start', behavior: scrollBehavior() }));
    return () => cancelAnimationFrame(frame);
  }, []);

  // The popover is anchored to the element that carries the open reading —
  // its mark under a shift, else its door — found after the plate has drawn
  // it, so a reading opened from the address is anchored on the first paint.
  useEffect(() => {
    if (!wideScreen || !selected) {
      setAnchor(null);
      return;
    }
    const next = anchorFor(figureRef.current, selected, shift);
    setAnchor(next);
    // The detail can be wider than its window, and an address can open an
    // element that sits in the part scrolled out of view — the transfer inside
    // the distribution box, say. The map is scrolled so the element is in
    // view, once, when the reading opens; a reader's own scrolling is left alone.
    const scroller = scrollerRef.current;
    if (!next || !scroller || scroller.scrollWidth <= scroller.clientWidth + 1) return;
    const a = next.getBoundingClientRect();
    const s = scroller.getBoundingClientRect();
    if (a.left >= s.left + 8 && a.right <= s.right - 8) return;
    scroller.scrollTo({ left: scroller.scrollLeft + (a.left + a.width / 2 - s.left) - s.width / 2, behavior: scrollBehavior() });
  }, [wideScreen, selected, shift, level]);

  // Isolation at the finance distance: everything not in the open reading's
  // set steps back. Done by marking the plate's own elements, because the
  // base geometry is static and knows nothing about state.
  const isolate = wideScreen && lens === 'finance' && selected ? isolationSet(selected) : null;
  useEffect(() => {
    const svg = figureRef.current?.querySelector('svg.cp-svg');
    if (!svg) return;
    const all = svg.querySelectorAll<Element>('[data-dim]');
    all.forEach((el) => el.removeAttribute('data-dim'));
    if (!isolate) return;
    const keep = isolate;
    const own = (el: Element) => el.getAttribute('data-id') ?? el.getAttribute('data-for') ?? el.getAttribute('data-mark') ?? el.getAttribute('data-switch');
    // The flows that pass through a kept joint stay with it.
    const centres = Array.from(keep)
      .filter(isJointId)
      .map((jid) => svg.querySelector(`.cp-hit[data-id="${jid}"] .cp-joint-mark`))
      .filter((el): el is SVGGraphicsElement => !!el && 'getBBox' in el)
      .map((el) => {
        const b = el.getBBox();
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      });
    const throughKept = (el: Element) => {
      if (!('getBBox' in el)) return false;
      const b = (el as SVGGraphicsElement).getBBox();
      return centres.some((c) => c.x >= b.x - 3 && c.x <= b.x + b.width + 3 && c.y >= b.y - 3 && c.y <= b.y + b.height + 3);
    };
    svg.querySelectorAll<Element>('.cp-base > *, .cp-hits > *, .cp-shifts .cp-lit, .cp-shifts .cp-move, .cp-shifts .cp-callout, .cp-mark').forEach((el) => {
      const id = own(el);
      if (id && keep.has(id)) return;
      if (el.classList.contains('cp-flow') && throughKept(el)) return;
      el.setAttribute('data-dim', '');
    });
  }, [isolate, shift, lens, level]);

  // A layer switched off must fade everywhere it is drawn, and two of those
  // places are static geometry with no handlers: the shift outline on its
  // band, and, for energy, the arrows rising into every stage.
  useEffect(() => {
    const svg = figureRef.current?.querySelector('svg.cp-svg');
    if (!svg) return;
    svg.querySelectorAll<Element>('.cp-shifts .cp-lit[data-for]').forEach((el) => {
      if (hidden.has(el.getAttribute('data-for')!)) el.setAttribute('data-hidden', '');
      else el.removeAttribute('data-hidden');
    });
    svg.querySelectorAll<Element>('.cp-energy-in').forEach((el) => {
      if (hidden.has('band-energy')) el.setAttribute('data-hidden', '');
      else el.removeAttribute('data-hidden');
    });
  }, [hidden, shift, level, wideScreen]);

  const lensState = useMemo<ChainLensState>(
    () => ({ lens, shift, selected, onSelect, hovered, onHover, hidden, onToggleLayer, panelId }),
    [lens, shift, selected, onSelect, hovered, onHover, hidden, onToggleLayer, panelId],
  );

  const renderPanel = useCallback(
    (id: string, opts: { inline?: boolean; hideClose?: boolean } = {}): ReactNode => (
      <ChainTargetPanel
        id={id}
        moduleSlugs={isJointId(id) ? modulesByJoint[id as JointId] ?? [] : []}
        onClose={closePanel}
        panelId={panelId}
        inline={opts.inline}
        hideClose={opts.hideClose}
      >
        {isolate && <p className="mt-2 text-xs text-muted-foreground">{CHAIN_COPY.controls.isolated}</p>}
      </ChainTargetPanel>
    ),
    [modulesByJoint, closePanel, panelId, isolate],
  );

  const { lead, shiftLead } = CHAIN_COPY;
  const Heading = heading;
  const [reindus, green] = SHIFTS;
  const marks = shift ? markedIds(shift).length : 0;

  return (
    <div
      className="chain-plate"
      data-lens={lens}
      data-shift={shift ?? undefined}
      data-level={level}
      data-isolate={isolate ? selected ?? undefined : undefined}
    >
      <header className="max-w-3xl">
        {/* The map's own heading. On the landing page nothing precedes it, so
            it is the page's h1; inside About it is an h2 under that page's
            own heading. A title, not a hero: no artwork, no reserved empty
            space, no call to action. */}
        <Heading className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl [text-wrap:balance]">
          {CHAIN_COPY.title}
        </Heading>
        <p className="mt-3 text-base leading-relaxed text-foreground md:text-lg" data-chain-standfirst>
          {CHAIN_COPY.standfirst}
        </p>

        {/* THE CONTROLS ACT AT BOTH LEVELS. They used to be hidden on the
            short plate because that plate had no chips to re-word and no
            marks to raise. The overview draws both, so the controls are
            offered where they now do something — which is everywhere. */}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          {lead.before}
          <LensWord id="economy" active={lens === 'economy'} onChoose={chooseLens}>
            {lead.economy}
          </LensWord>
          {lead.middle}
          <LensWord id="finance" active={lens === 'finance'} onChoose={chooseLens}>
            {lead.finance}
          </LensWord>
          {lead.after}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base" data-chain-shift-lead>
          {shiftLead.before}
          <ShiftWord id={reindus.id} active={shift === reindus.id} onToggle={toggleShift}>
            {reindus.word}
          </ShiftWord>
          {shiftLead.middle}
          <ShiftWord id={green.id} active={shift === green.id} onToggle={toggleShift}>
            {green.word}
          </ShiftWord>
          {shiftLead.after}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <button
            type="button"
            data-chain-control="shift"
            aria-pressed={shift === null}
            onClick={() => chooseShift(null)}
            className={cn('min-h-11 border-b text-foreground', shift === null ? 'border-foreground font-medium' : 'border-transparent', FOCUS)}
          >
            {CHAIN_COPY.controls.noShift}
          </button>
          {/* One way back to the overview, at the top. The button under the
              map stays: one exit at each end of a figure taller than the
              screen is not two answers to the same question. */}
          {variant === 'preview' && (
            <button
              type="button"
              data-chain-control="detail"
              aria-expanded={expanded}
              aria-controls={figureId}
              onClick={toggleExpanded}
              className={cn('min-h-11 border-b border-transparent text-foreground hover:border-foreground', FOCUS)}
            >
              {atOverview ? CHAIN_COPY.controls.seeFull : CHAIN_COPY.controls.seeCompact}
            </button>
          )}
          <span role="status" aria-live="polite" aria-atomic="true">
            {CHAIN_COPY.lensName[lens]} · {shift ? SHIFT_BY_ID[shift].label : CHAIN_COPY.controls.noShift}
            {shift && ` · ${CHAIN_COPY.status.marks(marks)}`}
            {selected && ` · ${targetLabel(selected)}`}
          </span>
        </div>

        {/* A switched-off layer fades to near nothing and keeps its place,
            which is what makes it useful for comparing two layers — and what
            makes it easy to read as a claim. It is not one: the service is
            still bought and its constraint has not gone. Said here, with the
            way back, only while any layer is off. */}
        {hidden.size > 0 && (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground" data-chain-hidden-layers>
            <span>{CHAIN_COPY.controls.layersHidden(hidden.size)}</span>
            <button
              type="button"
              data-chain-control="layers"
              onClick={() => setHidden(EMPTY_HIDDEN)}
              className={cn('min-h-11 border-b border-transparent text-foreground hover:border-foreground', FOCUS)}
            >
              {CHAIN_COPY.controls.showAllLayers}
            </button>
          </p>
        )}

        {/* WHICH SHAPES OPEN — on the plate, where a hundred paths look alike
            and a reader with no pointer has no way to sweep for the four that
            react. The column has no such problem: its doors are rows with a
            chip and a diamond, and they are the only things in it that can be
            pressed. So this is said where it is needed and nowhere else,
            because three paragraphs of grey between a reader and the map is
            the wall the map replaced. */}
        {wideScreen && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground" data-chain-doors>
            {CHAIN_COPY.doorsLead}
          </p>
        )}
        {/* What the level control does, where the level control is. */}
        {variant === 'preview' && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground" data-chain-level-note>
            {CHAIN_COPY.controls.levelNote}
          </p>
        )}
      </header>

      <ChainLensContext.Provider value={lensState}>
        {/* Below the plate's width the column is the map, and a column is
            read at reading width — not stretched across a tablet. The figure
            is the positioning context for the popover and the hover label. */}
        <figure
          id={figureId}
          ref={figureRef}
          tabIndex={-1}
          /* scroll-mt: every scroll to this figure is programmatic and the page
             header is sticky — without it the map lands under the header. */
          className={cn('relative mt-8 scroll-mt-20 outline-none', !wideScreen && 'max-w-2xl', FOCUS)}
          onMouseOver={wideScreen ? onFigureOver : undefined}
          onMouseOut={wideScreen ? onFigureOut : undefined}
        >
          {wideScreen ? (
            <div ref={scrollerRef} data-chain-scroll data-chain-scrollable={scrollable || undefined} className="cp-scroll">
              {atOverview ? <ChainPlateCompact /> : <ChainPlateWide />}
            </div>
          ) : (
            <ChainColumn level={level} />
          )}

          {/* No label for the element whose reading is already open: the reading says it all. */}
          {wideScreen && (
            <HoverLabel hovered={hovered && hovered.id !== selected ? hovered : null} figure={figureRef.current} shift={shift} lens={lens} />
          )}

          {wideScreen && selected && (
            <ChainPopover anchor={anchor} figure={figureRef.current} onClose={closePanel}>
              {renderPanel(selected)}
            </ChainPopover>
          )}
        </figure>

        {/* WHAT THIS MAP IS OF, under the map. It used to sit above it, where
            it was a caveat about a drawing the reader had not seen yet; the
            question it answers — are these firms? is this route the only one?
            — is one a reader asks after looking. */}
        {scrollable && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground" data-chain-scrolls>
            {CHAIN_COPY.controls.scrolls}
          </p>
        )}
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground" data-chain-scope>
          {CHAIN_COPY.scopeLead}
        </p>

        {/* A phone has no hover and no room beside a row: a reading opens as a bottom sheet. */}
        {!wideScreen && (
          <Sheet open={!!selected} onOpenChange={(open) => !open && closePanel()}>
            {selected && (
              <SheetContent
                side="bottom"
                data-chain-sheet=""
                // The sheet does NOT scroll; the box inside it does, and the
                // distance control stays outside that box. Two reasons, one
                // shape: the sheet's own Close is positioned against the sheet,
                // so a sheet that scrolled carried its dismissal off the top of
                // a long reading — the phone form of the defect the popover had
                // beside the plate; and a distance control that scrolls away is
                // a distance control the reader has to go and find, which is
                // the finding this one exists to answer.
                className="flex max-h-[85vh] flex-col gap-0 rounded-t-lg p-0"
                // Close returns focus to the row that opened the reading, once the trap is down.
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  returnFocus();
                }}
              >
                <SheetTitle className="sr-only">{targetLabel(selected)}</SheetTitle>
                <SheetDescription className="sr-only">{CHAIN_COPY.panel.close}</SheetDescription>
                {/* The distance, inside the reading.
                    The state already supported keeping a target while the
                    distance changes — what a phone reader could not do was
                    reach the control without closing the reading, because it
                    lived outside a modal sheet. So comparing the two readings
                    of one element meant dismissing it, finding the words in the
                    lead paragraph, and finding the element again: the interface
                    interrupting the one operation the map exists to show.
                    Still one voice at a time; the panel below re-reads. */}
                <div
                  className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pr-14 pt-3 text-sm text-muted-foreground"
                  data-chain-sheet-distance
                >
                  <span id={`${base}-sheet-distance`}>{CHAIN_COPY.controls.sheetDistance}</span>
                  <span className="flex flex-wrap items-baseline gap-x-3" role="group" aria-labelledby={`${base}-sheet-distance`}>
                    <LensWord id="economy" active={lens === 'economy'} onChoose={chooseLens}>
                      {CHAIN_COPY.lensName.economy}
                    </LensWord>
                    <LensWord id="finance" active={lens === 'finance'} onChoose={chooseLens}>
                      {CHAIN_COPY.lensName.finance}
                    </LensWord>
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                  {renderPanel(selected, { inline: true, hideClose: true })}
                </div>
              </SheetContent>
            )}
          </Sheet>
        )}

        {/* The two overlays are exclusive so their mechanisms stay separable.
            That leaves a reader who has seen each alone believing both can run
            at full strength; the conflict is written out rather than drawn,
            because a second overlay would imply they compose. */}
        {shift && (
          <section className="mt-8 max-w-3xl border-t border-border pt-5" data-chain-tensions>
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {CHAIN_COPY.tensionsHeading}
            </h3>
            <ul className="mt-3 space-y-4">
              {TENSIONS.map((t) => (
                <li key={t.id} data-tension={t.id}>
                  <button
                    type="button"
                    onClick={(e) => onSelect(t.at, e.currentTarget)}
                    className={cn(
                      'text-left text-sm font-medium text-foreground hover:text-accent',
                      FOCUS,
                    )}
                  >
                    {t.label} · {targetLabel(t.at)}
                  </button>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.note[lens]}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {variant === 'preview' && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={figureId}
            onClick={toggleExpanded}
            className={cn(
              'mt-6 inline-block rounded border-2 border-foreground px-6 py-2.5 text-sm font-medium tracking-[0.04em] text-foreground transition-colors hover:bg-foreground/[0.06] active:bg-foreground/[0.12]',
              FOCUS,
            )}
          >
            {atOverview ? CHAIN_COPY.controls.seeFull : CHAIN_COPY.controls.seeCompact}
          </button>
        )}
      </ChainLensContext.Provider>
    </div>
  );
}

/** The plate as an About section: under that page's heading, so the map's title is an h2. */
export function IndustryChainSection() {
  return (
    <section id="industry-chain" className="border-b border-border py-12">
      <div className="container">
        <ChainPlate />
      </div>
    </section>
  );
}

/**
 * The map at the top of the landing page, opening at the overview.
 *
 * Nothing precedes it — there is no hero and no argument block above it any
 * more — so its title carries the page's main heading.
 */
export function IndustryChainPreview() {
  return (
    <section id="industry-chain" className="border-b border-border py-12">
      <div className="container">
        <ChainPlate variant="preview" heading="h1" />
      </div>
    </section>
  );
}
