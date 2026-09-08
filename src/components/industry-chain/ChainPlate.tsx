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
 * Nothing lives under the map. There is no legend, no caption, no list of
 * what moves and no hint line: every definition is read on the element that
 * raises the question (hover or focus pins one line beside it), and every
 * reading opens as a popover beside the element that opened it — a bottom
 * sheet on a narrow screen. Under the map there is only the button back to
 * the short version, where the map has one.
 *
 * The state — overlay, distance, open door — is in the address, so an essay
 * can link into the exact reading it argues from and a reader can share what
 * they are looking at. See useChainUrl.ts; the address carries slugs, never
 * the numbers, because the numbers are positions and the slugs are names.
 *
 * Two layouts, one state. A wide screen gets the generated plate
 * (ChainPlateSvg.tsx); a narrow one gets the column (ChainColumn.tsx). The
 * choice is a media query read on the first render, so only one is ever in
 * the document. `variant="preview"` opens with the short plate and one
 * button; the button, a lens word or a shift word swaps in the full chain.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { CHAIN_COPY, SHIFT_BY_ID, SHIFTS, type JointId, type LensId, type ShiftId } from '@/data/industryChain';
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
import { initialChainUrl, useChainUrl, type ChainUrlState } from './useChainUrl';
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
}: {
  links?: readonly ChainModuleLink[];
  /** `preview` opens short and expands in place; `full` is the whole chain from the start. */
  variant?: 'full' | 'preview';
}) {
  const base = useId();
  const panelId = `${base}-chain-panel`;
  const figureId = `${base}-chain-figure`;
  const wideScreen = useMediaQuery(WIDE_PLATE_QUERY, true);

  // The short version on the landing page is a taster, not an address: it
  // has no doors and nothing to share, so only the full plate reads and
  // writes the URL.
  const urlEnabled = variant === 'full';
  // An address can name an element that this overlay does not mark — an old
  // link, a hand-edited one, or one written against the other shift. Opening
  // it anyway would put a panel with a heading and nothing under it on the
  // page, which is the one thing the map must never show. So the address is
  // validated before it becomes state, here and on every Back or Forward;
  // the rejected parameter is then dropped from the URL by the writer.
  const [fromUrl] = useState(() => {
    const url = initialChainUrl(urlEnabled);
    return { ...url, node: canOpen(url.node, url.shift) ? url.node : null };
  });

  const [lens, setLens] = useState<LensId>(fromUrl.lens ?? 'economy');
  const [shift, setShift] = useState<ShiftId | null>(fromUrl.shift);
  const [selected, setSelected] = useState<string | null>(fromUrl.node);
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [expanded, setExpanded] = useState(variant === 'full');
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

  const chooseLens = useCallback((next: LensId) => {
    // A distance is a closer (or a farther) look; on the short plate it opens the full chain.
    setExpanded(true);
    setLens(next);
  }, []);

  const chooseShift = useCallback((next: ShiftId | null) => {
    setExpanded(true);
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
      // Back to the short plate: no shift, no reading — it has neither.
      setShift(null);
      setSelected(null);
    }
    setExpanded(next);
    // Let the swapped figure paint, then land focus on it so the reader is
    // where the chain now is. No scroll of our own: focus brings it into view
    // and respects the reader's motion setting through the browser.
    requestAnimationFrame(() => figureRef.current?.focus());
  }, [expanded]);

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
        <div className="mt-2 flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
          <button
            type="button"
            data-chain-control="shift"
            aria-pressed={shift === null}
            onClick={() => chooseShift(null)}
            className={cn('min-h-11 border-b text-foreground', shift === null ? 'border-foreground font-medium' : 'border-transparent', FOCUS)}
          >
            {CHAIN_COPY.controls.noShift}
          </button>
          <span role="status" aria-live="polite" aria-atomic="true">
            {CHAIN_COPY.lensName[lens]} · {shift ? SHIFT_BY_ID[shift].label : CHAIN_COPY.controls.noShift}
            {shift && ` · ${CHAIN_COPY.status.marks(marks)}`}
            {selected && ` · ${targetLabel(selected)}`}
          </span>
        </div>
        {!showCompact && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground" data-chain-scope>
            {CHAIN_COPY.scopeLead}
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
          className={cn('relative mt-8 outline-none', !wideScreen && 'max-w-2xl', FOCUS)}
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
                className="max-h-[85vh] overflow-y-auto rounded-t-lg p-4 pt-3"
                // Close returns focus to the row that opened the reading, once the trap is down.
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  returnFocus();
                }}
              >
                <SheetTitle className="sr-only">{targetLabel(selected)}</SheetTitle>
                <SheetDescription className="sr-only">{CHAIN_COPY.panel.close}</SheetDescription>
                {renderPanel(selected, { inline: true, hideClose: true })}
              </SheetContent>
            )}
          </Sheet>
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
