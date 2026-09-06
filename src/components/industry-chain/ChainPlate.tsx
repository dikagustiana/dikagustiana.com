/**
 * The industry chain, at two distances — and in motion.
 *
 * One chain. Two distances. Two sentences under the headline contain the
 * controls that change how the same structure is read:
 *
 *   distance   the two lens names in the first sentence. ECONOMY or FINANCE,
 *              always one of them, economy at rest — the reader arrives from
 *              far. The map does not change; the word on every joint does.
 *   shift      the two shift words in the second sentence. Neither on is the
 *              resting map; one on rings the joints and layers that shift
 *              moves; the other switches. Each scenario is read separately.
 *
 * The two compose. A shift is read at whichever distance is on, in the
 * caption after the figure and in the panel of any lit target — and the
 * reader finds for themselves that the two lenses work on movement as they
 * do on rest.
 *
 * Every joint and every layer is a door: it opens the reading of the margin
 * cut there and the line of the accounts that carries it; where the mapping
 * table has pinned curriculum modules to a joint, they follow. A door stays
 * open when a control changes: the same target, read differently.
 *
 * A shift also NUMBERS what it moves. The marks are an index onto the
 * overlay, in the order the marks land on the plate rather than the order of
 * the data file, and they are renumbered from one for each overlay. Which
 * elements are marked is the shift's business and the shift's alone: move the
 * distance control and the marks stay where they are, saying something else.
 * The control says how many marks it would raise before it raises them.
 *
 * Nothing floats. Pointing at a mark, a joint or a layer writes one line into
 * a readout of fixed height under the plate, so no label is ever raised over
 * the element beside the one being pointed at.
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

import { useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CHAIN_COPY,
  LEVERS,
  MARGIN_KINDS,
  SHIFT_BY_ID,
  SHIFTS,
  BAND_BY_ID,
  JOINT_BY_ID,
  bandChip,
  type JointId,
  type LensId,
  type ShiftId,
} from '@/data/industryChain';
import { CHAIN_MODULE_LINKS, locatedModulesByJoint, type ChainModuleLink } from '@/data/chainCurriculumMap';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { ChainColumn } from './ChainColumn';
import { ChainLegend } from './ChainLegend';
import { ChainReference } from './ChainReference';
import { ChainLensContext, type ChainLensState } from './chainLensContext';
import { ChainPlateCompact, ChainPlateWide } from './ChainPlateSvg';
import { ChainTargetPanel } from './ChainTargetPanel';
import { isDoor, isJointId, markArticles, markNumber, markedIds, targetLabel } from './chainTargets';
import { initialChainUrl, useChainUrl, type ChainUrlState } from './useChainUrl';
import './chain-plate.css';
import './chain-review.css';

/** The wide plate needs this much room before its type stays readable. */
export const WIDE_PLATE_QUERY = '(min-width: 1280px)';

const FOCUS =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const KICKER = 'text-[11px] uppercase tracking-[0.18em] text-muted-foreground';

/** One of the two lens names inside the sentence: a position, not a switch — one of the two is always on. */
function LensWord({
  id,
  active,
  onChoose,
  children,
}: {
  id: LensId;
  active: boolean;
  onChoose: (id: LensId) => void;
  children: string;
}) {
  return (
    <button
      type="button"
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
function ShiftWord({
  id,
  active,
  onToggle,
  children,
}: {
  id: ShiftId;
  active: boolean;
  onToggle: (id: ShiftId) => void;
  children: string;
}) {
  const count = markedIds(id).length;
  return (
    <button
      type="button"
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
 * One line under the plate, in place of a tooltip.
 *
 * A floating tooltip on a plate this dense covers the element next to the one
 * being pointed at — the reader loses the neighbour they were comparing it
 * with. This line is always in the document, always the same height, and
 * always in the same place, so nothing moves and nothing is hidden. It reads
 * whatever the pointer or the focus ring is on: a mark by its number, title
 * and how many essays sit behind it; a joint by the margin cut there; a layer
 * by what it charges for.
 */
function Readout({ hovered, shift, lens }: { hovered: string | null; shift: ShiftId | null; lens: LensId }) {
  const rest = shift ? CHAIN_COPY.mark.rest : CHAIN_COPY.panel.hint;
  let line: ReactNode = rest;

  if (hovered) {
    const n = shift ? markNumber(shift, hovered) : 0;
    const articles = markArticles(shift, hovered).length;
    const essays = articles === 0 ? CHAIN_COPY.mark.essayNone : `${articles} ${articles === 1 ? CHAIN_COPY.mark.essayOne : CHAIN_COPY.mark.essayMany}`;
    const joint = isJointId(hovered) ? JOINT_BY_ID[hovered] : null;
    const band = BAND_BY_ID[hovered];
    const detail = joint
      ? `${MARGIN_KINDS[joint.margin].label} · ${joint.read[lens].chip}`
      : band
        ? `${band.margin ? MARGIN_KINDS[band.margin].label : bandChip(band)}`
        : null;
    line = (
      <>
        {n > 0 && <span className="font-semibold tabular-nums">{n}. </span>}
        <span className="font-medium text-foreground">{targetLabel(hovered)}</span>
        {detail && <span className="text-muted-foreground"> · {detail}</span>}
        {n > 0 && <span className="text-muted-foreground"> · {essays}</span>}
      </>
    );
  }

  return (
    <p
      data-chain-readout=""
      data-readout-target={hovered ?? undefined}
      className="mt-3 min-h-[2.75rem] border-t border-border pt-2 text-sm leading-snug text-muted-foreground"
    >
      {line}
    </p>
  );
}

/** The shift as a whole, read at the distance that is on. Changes with either control. */
function ShiftCaption({ shift, lens }: { shift: ShiftId; lens: LensId }) {
  const s = SHIFT_BY_ID[shift];
  return (
    <div className="mt-4 max-w-3xl border-l-2 border-accent-editorial pl-4" data-shift-caption={shift}>
      <p className={KICKER}>
        {s.label} · {CHAIN_COPY.lensName[lens]}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-foreground md:text-base">{s.read[lens]}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        <span className="uppercase tracking-wider">{CHAIN_COPY.shift.leverKicker}</span>
        {' — '}
        {s.levers.map((l) => LEVERS[l].label).join(' · ')}
      </p>
    </div>
  );
}

/** Under the wide plate: what moves where, one line per lit target, each door among them a button. */
function ShiftMoves({ shift, lens }: { shift: ShiftId; lens: LensId }) {
  const { onSelect } = useContext(ChainLensContext);
  const s = SHIFT_BY_ID[shift];
  return (
    <section aria-label={`${CHAIN_COPY.shift.movesHeading} — ${s.label}`} className="mt-4" data-shift-moves={shift}>
      <h3 className={KICKER}>
        {CHAIN_COPY.shift.movesHeading} · {CHAIN_COPY.lensName[lens]}
      </h3>
      <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-sm text-foreground md:grid-cols-2">
        {/* In the order the marks are numbered, not the order the data file
            happens to list them: this list IS the index, so it has to count. */}
        {[...s.targets]
          .sort((a, b) => markNumber(shift, a.id) - markNumber(shift, b.id))
          .map((t) => {
          const n = markNumber(shift, t.id);
          return (
            <li key={t.id} data-move={t.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)]">
              <span aria-hidden="true" className="tabular-nums font-semibold text-muted-foreground">
                {n > 0 ? n : '·'}
              </span>
              <span>
                {/* Every marked target opens, whether or not it is a door in
                    its own right: a mark that could not be opened would be a
                    number pointing at nothing. */}
                <button
                  type="button"
                  onClick={(e) => onSelect(t.id, e.currentTarget)}
                  className={cn('text-left font-medium text-foreground hover:text-accent', FOCUS)}
                >
                  {targetLabel(t.id)}
                </button>
                <span className="text-muted-foreground"> — {t.read[lens]}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">{CHAIN_COPY.shift.hint}</p>
    </section>
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
  const [fromUrl] = useState(() => initialChainUrl(urlEnabled));

  const [lens, setLens] = useState<LensId>(fromUrl.lens ?? 'economy');
  const [shift, setShift] = useState<ShiftId | null>(fromUrl.shift);
  const [selected, setSelected] = useState<string | null>(fromUrl.node);
  const [hovered, setHovered] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(variant === 'full');
  const triggerRef = useRef<Element | null>(null);
  const figureRef = useRef<HTMLElement>(null);

  const urlState = useMemo<ChainUrlState>(() => ({ lens, shift, node: selected }), [lens, shift, selected]);
  const subscribeToUrl = useChainUrl(urlEnabled, urlState);
  useEffect(
    () =>
      subscribeToUrl((next) => {
        setLens(next.lens ?? 'economy');
        setShift(next.shift);
        setSelected(next.node);
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
      // A door named inside an open reading (a layer in a joint's panel, a
      // target in the moves list) is about to be re-rendered with it — so the
      // door the reader actually came through stays the one Close returns to.
      const panel = document.getElementById(panelId);
      if (!(trigger && panel?.contains(trigger))) triggerRef.current = trigger;
      setSelected((current) => (current === id ? null : id));
    },
    [panelId],
  );

  const closePanel = useCallback(() => {
    setSelected(null);
    const t = triggerRef.current;
    if (t instanceof HTMLElement || t instanceof SVGElement) {
      if (t.isConnected) t.focus();
      else figureRef.current?.focus();
    } else figureRef.current?.focus();
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

  const lensState = useMemo<ChainLensState>(
    () => ({ lens, shift, selected, onSelect, hovered, onHover: setHovered, panelId }),
    [lens, shift, selected, onSelect, hovered, panelId],
  );

  const renderPanel = useCallback(
    (id: string, inline = false): ReactNode => (
      <ChainTargetPanel
        id={id}
        moduleSlugs={isJointId(id) ? modulesByJoint[id as JointId] ?? [] : []}
        onClose={closePanel}
        panelId={panelId}
        inline={inline}
      />
    ),
    [modulesByJoint, closePanel, panelId],
  );

  const { lead, shiftLead } = CHAIN_COPY;
  const [reindus, green] = SHIFTS;
  const marks = shift ? markedIds(shift).length : 0;

  return (
    <div className="chain-plate" data-lens={lens} data-shift={shift ?? undefined} data-view={showCompact ? 'compact' : 'full'}>
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
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
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
          <button type="button" aria-pressed={shift === null} onClick={() => chooseShift(null)}
            className={cn('min-h-11 border-b text-foreground', shift === null ? 'border-foreground font-medium' : 'border-transparent', FOCUS)}>
            {CHAIN_COPY.controls.noShift}
          </button>
          <span role="status" aria-live="polite" aria-atomic="true">
            {CHAIN_COPY.lensName[lens]} · {shift ? SHIFT_BY_ID[shift].label : CHAIN_COPY.controls.noShift}
            {shift && ` · ${marks} ${marks === 1 ? CHAIN_COPY.mark.markOne : CHAIN_COPY.mark.markMany}`}
          </span>
        </div>
        {!showCompact && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{CHAIN_COPY.scopeLead}</p>}
      </header>

      <ChainLensContext.Provider value={lensState}>
        {/* Below the plate's width the column is the map, and a column is
            read at reading width — not stretched across a tablet. */}
        <figure
          id={figureId}
          ref={figureRef}
          tabIndex={-1}
          className={cn('mt-8 outline-none', !wideScreen && 'max-w-2xl', FOCUS)}
        >
          {wideScreen ? (
            showCompact ? (
              <ChainPlateCompact />
            ) : (
              <ChainPlateWide />
            )
          ) : (
            <ChainColumn variant={showCompact ? 'compact' : 'full'} panel={(id) => renderPanel(id, true)} />
          )}
        </figure>

        {!showCompact && wideScreen && <Readout hovered={hovered} shift={shift} lens={lens} />}

        {/* Keep the plate anchored when the scenario caption changes length. */}
        {shift && !showCompact && <ShiftCaption shift={shift} lens={lens} />}

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

        {!showCompact && wideScreen && shift && !selected && <ShiftMoves shift={shift} lens={lens} />}

        {!showCompact && wideScreen && selected && renderPanel(selected)}

        {!showCompact && wideScreen && <ChainReference />}

        {!showCompact && (
          <details className="mt-5 max-w-3xl border-t border-border text-sm text-muted-foreground">
            <summary className={cn('min-h-11 cursor-pointer py-3 font-medium text-foreground', FOCUS)}>{CHAIN_COPY.reference.basis}</summary>
            <p className="mb-3 leading-relaxed">{CHAIN_COPY.scope}</p>
            <p className="leading-relaxed">{CHAIN_COPY.basis}</p>
          </details>
        )}

        {!showCompact && (
          <div className={cn(!wideScreen && 'max-w-2xl')}>
            <ChainLegend collapsible={!wideScreen} />
          </div>
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
