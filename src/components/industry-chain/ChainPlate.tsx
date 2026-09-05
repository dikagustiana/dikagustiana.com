/**
 * The industry chain, at two distances.
 *
 * The headline is the entry point of the page and it is a claim the page has
 * to pay for: "Nothing here is complicated. It only looks that way from the
 * wrong distance." The sentence under it is the control — the two lens names
 * in it are the two buttons. No toggle bar, no announced chrome: step back and
 * the chain reads as an economy; step in and it reads as one unit of goods
 * with its price sliced at every joint.
 *
 * The base map is complete without any interaction. A lens is an overlay: it
 * dims the base enough to stand out and never hides it. One lens at a time.
 * Every joint and every layer is a door: it opens the reading of the margin
 * cut there and the line of the accounts that carries it; where the mapping
 * table has pinned curriculum modules to a joint, they follow.
 *
 * Two layouts, one state. A wide screen gets the generated plate
 * (ChainPlateSvg.tsx); a narrow one gets the column (ChainColumn.tsx). The
 * choice is a media query read on the first render, so only one is ever in
 * the document. `variant="preview"` opens with the short plate and one
 * button; the button, or either lens word, swaps in the full chain in place.
 */

import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { CHAIN_COPY, type JointId, type LensId } from '@/data/industryChain';
import { CHAIN_MODULE_LINKS, locatedModulesByJoint, type ChainModuleLink } from '@/data/chainCurriculumMap';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { ChainColumn } from './ChainColumn';
import { ChainLegend } from './ChainLegend';
import { ChainLensContext, type ChainLensState } from './chainLensContext';
import { ChainPlateCompact, ChainPlateWide } from './ChainPlateSvg';
import { ChainTargetPanel } from './ChainTargetPanel';
import { isJointId } from './chainTargets';
import './chain-plate.css';

/** The wide plate needs this much room before its type stays readable. */
export const WIDE_PLATE_QUERY = '(min-width: 1280px)';

const FOCUS =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** One of the two lens names inside the sentence. Text, not a widget. */
function LensWord({
  id,
  active,
  onToggle,
  children,
}: {
  id: LensId;
  active: boolean;
  onToggle: (id: LensId) => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onToggle(id)}
      className={cn(
        'inline border-b pb-px font-medium text-foreground transition-colors',
        active
          ? id === 'economy'
            ? 'border-b-2 border-accent text-accent'
            : 'border-b-2 border-accent-editorial'
          : 'border-dotted border-muted-foreground hover:border-solid hover:border-foreground',
        FOCUS,
      )}
    >
      {children}
    </button>
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

  const [lens, setLens] = useState<LensId | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(variant === 'full');
  const triggerRef = useRef<Element | null>(null);
  const figureRef = useRef<HTMLElement>(null);

  const showCompact = variant === 'preview' && !expanded;

  const modulesByJoint = useMemo(() => locatedModulesByJoint(links), [links]);

  const toggleLens = useCallback((next: LensId) => {
    // A lens is a closer look; on the short plate it opens the full chain.
    setExpanded(true);
    setLens((current) => (current === next ? null : next));
    setSelected(null);
  }, []);

  const onSelect = useCallback(
    (id: string, trigger: Element | null) => {
      // A layer named inside an open reading is a door too, but it is about
      // to be unmounted with that reading — so the door the reader actually
      // came through stays the one Close returns them to.
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
      // Back to the short plate: no lens, no reading — it has neither.
      setLens(null);
      setSelected(null);
    }
    setExpanded(next);
    // Let the swapped figure paint, then land focus on it so the reader is
    // where the chain now is. No scroll of our own: focus brings it into view
    // and respects the reader's motion setting through the browser.
    requestAnimationFrame(() => figureRef.current?.focus());
  }, [expanded]);

  const lensState = useMemo<ChainLensState>(() => ({ lens, selected, onSelect, panelId }), [lens, selected, onSelect, panelId]);

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

  const { lead } = CHAIN_COPY;

  return (
    <div className="chain-plate" data-lens={lens ?? undefined} data-view={showCompact ? 'compact' : 'full'}>
      <header className="max-w-3xl">
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl [text-wrap:balance]">
          {CHAIN_COPY.headline}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          {lead.before}
          <LensWord id="economy" active={lens === 'economy'} onToggle={toggleLens}>
            {lead.economy}
          </LensWord>
          {lead.middle}
          <LensWord id="unit" active={lens === 'unit'} onToggle={toggleLens}>
            {lead.unit}
          </LensWord>
          {lead.after}
        </p>
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
              <ChainPlateWide extended={lens === 'unit'} />
            )
          ) : (
            <ChainColumn variant={showCompact ? 'compact' : 'full'} panel={(id) => renderPanel(id, true)} />
          )}
        </figure>

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

        {!showCompact && wideScreen && lens === 'unit' && !selected && (
          <p className="mt-3 text-xs text-muted-foreground">{CHAIN_COPY.panel.hint}</p>
        )}

        {!showCompact && wideScreen && selected && renderPanel(selected)}

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
