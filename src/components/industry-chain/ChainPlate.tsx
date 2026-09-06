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
 * Two layouts, one state. A wide screen gets the generated plate
 * (ChainPlateSvg.tsx); a narrow one gets the column (ChainColumn.tsx). The
 * choice is a media query read on the first render, so only one is ever in
 * the document. `variant="preview"` opens with the short plate and one
 * button; the button, a lens word or a shift word swaps in the full chain.
 */

import { useCallback, useContext, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CHAIN_COPY,
  LEVERS,
  SHIFT_BY_ID,
  SHIFTS,
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
import { isDoor, isJointId, targetLabel } from './chainTargets';
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

/** One of the two shift words: a toggle, and the two exclude each other. */
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
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onToggle(id)}
      className={cn(
        'inline-flex min-h-11 items-center border-b pb-px font-medium text-foreground transition-colors',
        active ? 'border-b-2 border-accent-editorial' : 'border-dotted border-muted-foreground hover:border-solid hover:border-foreground',
        FOCUS,
      )}
    >
      {children}
    </button>
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
        {s.targets.map((t) => (
          <li key={t.id} data-move={t.id}>
            {isDoor(t.id) ? (
              <button
                type="button"
                onClick={(e) => onSelect(t.id, e.currentTarget)}
                className={cn('font-medium text-foreground hover:text-accent', FOCUS)}
              >
                {targetLabel(t.id)}
              </button>
            ) : (
              <span className="font-medium">{targetLabel(t.id)}</span>
            )}
            <span className="text-muted-foreground"> — {t.read[lens]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">{CHAIN_COPY.shift.hint}</p>
    </section>
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

  const [lens, setLens] = useState<LensId>('economy');
  const [shift, setShift] = useState<ShiftId | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(variant === 'full');
  const triggerRef = useRef<Element | null>(null);
  const figureRef = useRef<HTMLElement>(null);

  const showCompact = variant === 'preview' && !expanded;

  const modulesByJoint = useMemo(() => locatedModulesByJoint(links), [links]);

  const chooseLens = useCallback((next: LensId) => {
    // A distance is a closer (or a farther) look; on the short plate it opens the full chain.
    setExpanded(true);
    setLens(next);
  }, []);

  const toggleShift = useCallback((next: ShiftId) => {
    setExpanded(true);
    setShift((current) => (current === next ? null : next));
  }, []);

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
    () => ({ lens, shift, selected, onSelect, panelId }),
    [lens, shift, selected, onSelect, panelId],
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

  return (
    <div className="chain-plate" data-lens={lens} data-shift={shift ?? undefined} data-view={showCompact ? 'compact' : 'full'}>
      <header className="max-w-3xl">
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl [text-wrap:balance]">
          {CHAIN_COPY.headline}
        </h2>
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
          <button type="button" aria-pressed={shift === null} onClick={() => setShift(null)}
            className={cn('min-h-11 border-b text-foreground', shift === null ? 'border-foreground font-medium' : 'border-transparent', FOCUS)}>
            {CHAIN_COPY.controls.noShift}
          </button>
          <span role="status" aria-live="polite" aria-atomic="true">
            {CHAIN_COPY.lensName[lens]} · {shift ? SHIFT_BY_ID[shift].label : CHAIN_COPY.controls.noShift}
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

        {!showCompact && wideScreen && !shift && !selected && (
          <p className="mt-3 text-xs text-muted-foreground">{CHAIN_COPY.panel.hint}</p>
        )}

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
