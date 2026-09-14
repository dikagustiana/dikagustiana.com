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
 * The short plate carries one bounded question and one labelled action that
 * opens the single reading on this map written against evidence rather than as
 * an illustration (PILOT, below). Orientation is not explanation: naming the
 * Energy band told a stranger the noun and left them to invent the question.
 *
 * The state — overlay, distance, open door — is in the address, so an essay
 * can link into the exact reading it argues from and a reader can share what
 * they are looking at. Both variants READ that address now, and the preview
 * opens itself when one asks for something the short plate cannot draw: a link
 * that records an exploration has to restore it. See useChainUrl.ts; the
 * address carries slugs, never the numbers, because the numbers are positions
 * and the slugs are names.
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

/**
 * The one reading on this map written against evidence rather than as an
 * illustration, and the state it is written in: the Energy layer, read as
 * finance, under the green transition. Every other mark is a scenario and says
 * so (see `BASIS` in the data file).
 *
 * It is named here rather than inlined because three things have to agree
 * about it — the entrance that opens it, the copy that describes it, and the
 * test that checks the entrance still lands on a written reading.
 */
export const PILOT = { lens: 'finance', shift: 'green', node: 'band-energy' } as const satisfies {
  lens: LensId;
  shift: ShiftId;
  node: string;
};

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
}: {
  links?: readonly ChainModuleLink[];
  /** `preview` opens short and expands in place; `full` is the whole chain from the start. */
  variant?: 'full' | 'preview';
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
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
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
  const urlEnabled = variant === 'full' || expanded;
  const [anchor, setAnchor] = useState<Element | null>(null);
  const triggerRef = useRef<Element | null>(null);
  const figureRef = useRef<HTMLElement>(null);

  const urlState = useMemo<ChainUrlState>(() => ({ lens, shift, node: selected }), [lens, shift, selected]);
  const subscribeToUrl = useChainUrl(urlEnabled, urlState);
  useEffect(
    () =>
      subscribeToUrl((next) => {
        setLens(next.lens ?? 'economy');
        setShift(next.shift);
        setSelected(canOpen(next.node, next.shift) ? next.node : null);
      }),
    [subscribeToUrl],
  );

  const showCompact = variant === 'preview' && !expanded;

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
      if (!(trigger && panel?.contains(trigger))) triggerRef.current = trigger;
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
    if (!next) {
      // Back to the short plate: no shift, no reading — it has neither. The
      // distance and the layer switches survive the round trip, because the
      // short plate draws neither and the reader did not ask to lose them.
      setShift(null);
      setSelected(null);
    }
    setExpanded(next);
    // Let the swapped figure paint, then land focus on it so the reader is
    // where the chain now is. No scroll of our own: focus brings it into view
    // and respects the reader's motion setting through the browser.
    requestAnimationFrame(() => figureRef.current?.focus());
  }, [expanded]);

  /**
   * The one labelled entrance on the short plate: the assessed reading of the
   * Energy layer, at the distance and under the scenario it was written in.
   *
   * It sets all three at once, which is exactly why its label has to say so —
   * `CHAIN_COPY.opening.actionMeans` is the control's description, not
   * decoration. Nothing here is exclusive: the reader lands in the ordinary
   * full map with the ordinary controls, free to change any of the three or
   * close the reading and go somewhere else.
   */
  const openPilot = useCallback(() => {
    setLens(PILOT.lens);
    setShift(PILOT.shift);
    setSelected(PILOT.node);
    setExpanded(true);
    // The reading takes focus itself (ChainTargetPanel focuses its heading, with
    // preventScroll, so the page does not jump out from under a reader who is
    // already looking at the map). What it cannot do is bring the newly drawn
    // figure into view, so that happens here — and only the scroll, never the
    // focus, which would take it off the reading.
    requestAnimationFrame(() => figureRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() }));
  }, []);

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
    const frame = requestAnimationFrame(() => figureRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() }));
    return () => cancelAnimationFrame(frame);
  }, []);

  // The popover is anchored to the element that carries the open reading —
  // its mark under a shift, else its door — found after the plate has drawn
  // it, so a reading opened from the address is anchored on the first paint.
  useEffect(() => {
    if (!wideScreen || showCompact || !selected) {
      setAnchor(null);
      return;
    }
    setAnchor(anchorFor(figureRef.current, selected, shift));
  }, [wideScreen, showCompact, selected, shift]);

  // Isolation at the finance distance: everything not in the open reading's
  // set steps back. Done by marking the plate's own elements, because the
  // base geometry is static and knows nothing about state.
  const isolate = wideScreen && !showCompact && lens === 'finance' && selected ? isolationSet(selected) : null;
  useEffect(() => {
    const svg = figureRef.current?.querySelector('svg.cp-svg--wide');
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
  }, [isolate, shift, lens]);

  // A layer switched off must fade everywhere it is drawn, and two of those
  // places are static geometry with no handlers: the shift outline on its
  // band, and, for energy, the arrows rising into every stage.
  useEffect(() => {
    const svg = figureRef.current?.querySelector('svg.cp-svg--wide');
    if (!svg) return;
    svg.querySelectorAll<Element>('.cp-shifts .cp-lit[data-for]').forEach((el) => {
      if (hidden.has(el.getAttribute('data-for')!)) el.setAttribute('data-hidden', '');
      else el.removeAttribute('data-hidden');
    });
    svg.querySelectorAll<Element>('.cp-energy-in').forEach((el) => {
      if (hidden.has('band-energy')) el.setAttribute('data-hidden', '');
      else el.removeAttribute('data-hidden');
    });
  }, [hidden, shift, showCompact, wideScreen]);

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

  const { lead, shiftLead, opening } = CHAIN_COPY;
  const [reindus, green] = SHIFTS;
  const marks = shift ? markedIds(shift).length : 0;

  return (
    <div
      className="chain-plate"
      data-lens={lens}
      data-shift={shift ?? undefined}
      data-view={showCompact ? 'compact' : 'full'}
      data-isolate={isolate ? selected ?? undefined : undefined}
    >
      <header className="max-w-3xl">
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl [text-wrap:balance]">
          {CHAIN_COPY.headline}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-foreground md:text-lg" data-chain-standfirst>
          {CHAIN_COPY.standfirst}
        </p>
        {/* The two distances and the two scenarios are the full chain's
            controls, and they are shown where they do something. The short
            plate has no chips to re-word and no marks to raise, so offering
            them there was offering an inert control whose only observable
            effect was to swap the plate. */}
        {!showCompact && (
          <>
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
              {/* The way back, beside the controls that got the reader here.
                  The button under the map stays: one exit at each end of a
                  figure that is taller than the screen is not two answers to
                  the same question. */}
              {variant === 'preview' && (
                <button
                  type="button"
                  data-chain-control="detail"
                  aria-expanded={expanded}
                  aria-controls={figureId}
                  onClick={toggleExpanded}
                  className={cn('min-h-11 border-b border-transparent text-foreground hover:border-foreground', FOCUS)}
                >
                  {CHAIN_COPY.controls.seeCompact}
                </button>
              )}
              <span role="status" aria-live="polite" aria-atomic="true">
                {CHAIN_COPY.lensName[lens]} · {shift ? SHIFT_BY_ID[shift].label : CHAIN_COPY.controls.noShift}
                {shift && ` · ${CHAIN_COPY.status.marks(marks)}`}
                {selected && ` · ${targetLabel(selected)}`}
              </span>
            </div>
          </>
        )}

        {/* The short plate's one bounded question, and the labelled action that
            answers it inside the same swimlane. */}
        {showCompact && (
          <div className="mt-5 border-l-2 border-foreground pl-4" data-chain-opening>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{opening.kicker}</p>
            <p className="mt-1.5 text-base font-semibold leading-snug text-foreground md:text-lg">{opening.question}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{opening.relation}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{opening.caution}</p>
            <button
              type="button"
              data-chain-control="pilot"
              aria-describedby={`${base}-pilot-means`}
              onClick={openPilot}
              className={cn(
                'mt-4 inline-block rounded border-2 border-foreground px-5 py-2.5 text-sm font-medium tracking-[0.04em] text-foreground transition-colors hover:bg-foreground/[0.06] active:bg-foreground/[0.12]',
                FOCUS,
              )}
            >
              {opening.action}
            </button>
            <p id={`${base}-pilot-means`} className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {opening.actionMeans} {opening.case}
            </p>
          </div>
        )}
        {!showCompact && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground" data-chain-scope>
            {CHAIN_COPY.scopeLead}
          </p>
        )}
        {/* A numbered disc reads as a ranking unless something says otherwise,
            and these numbers are positions on the drawing that renumber when
            the overlay changes. Shown only while an overlay is on, which is
            the only time numbers exist. */}
        {!showCompact && shift && (
          <>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground" data-chain-mark-order>
              {CHAIN_COPY.markOrderNote}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground" data-chain-condition-note>
              {CHAIN_COPY.conditionNote(fullDate(CONDITION_AS_OF))}
            </p>
          </>
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
          {wideScreen ? showCompact ? <ChainPlateCompact /> : <ChainPlateWide /> : <ChainColumn variant={showCompact ? 'compact' : 'full'} />}

          {/* No label for the element whose reading is already open: the reading says it all. */}
          {wideScreen && !showCompact && (
            <HoverLabel hovered={hovered && hovered.id !== selected ? hovered : null} figure={figureRef.current} shift={shift} lens={lens} />
          )}

          {wideScreen && !showCompact && selected && (
            <ChainPopover anchor={anchor} figure={figureRef.current} onClose={closePanel}>
              {renderPanel(selected)}
            </ChainPopover>
          )}
        </figure>

        {/* A phone has no hover and no room beside a row: a reading opens as a bottom sheet. */}
        {!wideScreen && !showCompact && (
          <Sheet open={!!selected} onOpenChange={(open) => !open && closePanel()}>
            {selected && (
              <SheetContent
                side="bottom"
                data-chain-sheet=""
                // The sheet does NOT scroll; the box inside it does. The
                // sheet's own Close is positioned against the sheet, so a
                // sheet that scrolled carried its dismissal off the top of a
                // long reading — the phone form of the same defect the popover
                // had beside the plate.
                className="max-h-[85vh] rounded-t-lg p-0"
                // Close returns focus to the row that opened the reading, once the trap is down.
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  returnFocus();
                }}
              >
                <SheetTitle className="sr-only">{targetLabel(selected)}</SheetTitle>
                <SheetDescription className="sr-only">{CHAIN_COPY.panel.close}</SheetDescription>
                <div className="max-h-[85vh] overflow-y-auto p-4 pt-3">
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
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-12 text-sm text-muted-foreground"
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
        {!showCompact && shift && (
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
            {expanded ? CHAIN_COPY.controls.seeCompact : CHAIN_COPY.controls.seeFull}
          </button>
        )}
      </ChainLensContext.Provider>
    </div>
  );
}

/** The plate as an About section: no heading of its own — the headline is the heading. */
export function IndustryChainSection() {
  return (
    <section id="industry-chain" className="border-b border-border py-12">
      <div className="container">
        <ChainPlate />
      </div>
    </section>
  );
}

/** The short version, for the landing page: the second thing after the hero. */
export function IndustryChainPreview() {
  return (
    <section id="industry-chain" className="border-b border-border py-12">
      <div className="container">
        <ChainPlate variant="preview" />
      </div>
    </section>
  );
}
