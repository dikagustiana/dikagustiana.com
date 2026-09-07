/**
 * One map, two independent controls. Distance re-reads the same geometry;
 * condition selects either the descriptive base or one exclusive author
 * overlay. A written target gets a numbered, shape-coded mark. Selecting it
 * opens a collision-aware popover on the wide plate or a bottom sheet on the
 * column. Overlay, distance and permanent target slug stay in the URL.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CHAIN_COPY,
  CONDITION_STATUSES,
  MARGIN_KINDS,
  SHIFT_BY_ID,
  SHIFTS,
  BAND_BY_ID,
  JOINT_BY_ID,
  bandChip,
  shiftTarget,
  type JointId,
  type LensId,
  type ShiftId,
} from '@/data/industryChain';
import { CHAIN_MODULE_LINKS, locatedModulesByJoint, type ChainModuleLink } from '@/data/chainCurriculumMap';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { ChainColumn } from './ChainColumn';
import { ChainLegend } from './ChainLegend';
import { ChainPanelOverlay } from './ChainPanelOverlay';
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

/** One physical control: distance changes the unit of reading, never the map. */
function DistanceSwitch({ lens, onChoose }: { lens: LensId; onChoose: (id: LensId) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={lens === 'finance'}
      aria-label={`Distance: ${CHAIN_COPY.lensName[lens]}`}
      onClick={() => onChoose(lens === 'economy' ? 'finance' : 'economy')}
      className={cn(
        'inline-grid min-h-11 grid-cols-2 rounded-full border border-foreground p-1 text-sm text-foreground',
        FOCUS,
      )}
    >
      {(['economy', 'finance'] as LensId[]).map((id) => (
        <span
          key={id}
          className={cn('rounded-full px-3 py-1.5 transition-colors', lens === id && 'bg-foreground text-background')}
        >
          {CHAIN_COPY.lensName[id]}
        </span>
      ))}
    </button>
  );
}

function ConditionChoice({
  id,
  active,
  onChoose,
  name,
}: {
  id: ShiftId | null;
  active: boolean;
  onChoose: (id: ShiftId | null) => void;
  name: string;
}) {
  const count = id ? markedIds(id).length : null;
  const label = id ? SHIFT_BY_ID[id].label : CHAIN_COPY.controls.noShift;
  return (
    <label
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:border-foreground',
      )}
    >
      <input className="sr-only" type="radio" name={name} checked={active} onChange={() => onChoose(id)} />
      {label}
      {id && <span className={cn('text-xs tabular-nums', active ? 'text-background/75' : 'text-muted-foreground')} data-mark-count={id}>({count})</span>}
    </label>
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
    const target = shiftTarget(shift, hovered);
    const status = target ? CONDITION_STATUSES[target.condition.status].label : null;
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
        {n > 0 && status && <span className="text-muted-foreground"> · {status}</span>}
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

/**
 * Which targets can be open at all under a shift: every joint and every layer
 * always, plus whatever that shift has marked. A stage or a border is a door
 * only while the overlay that marks it is on, so switching overlays closes a
 * reading that no longer exists rather than leaving a panel with no mark.
 */
const canOpen = (id: string | null, shift: ShiftId | null): boolean => {
  if (id === null) return false;
  if (shift && shiftTarget(shift, id)) return markNumber(shift, id) > 0;
  return isDoor(id);
};

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
  const [hovered, setHovered] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(variant === 'full');
  const triggerRef = useRef<Element | null>(null);
  const [panelAnchor, setPanelAnchor] = useState<Element | null>(null);
  const figureRef = useRef<HTMLElement>(null);

  const urlState = useMemo<ChainUrlState>(() => ({ lens, shift, node: selected }), [lens, shift, selected]);
  const subscribeToUrl = useChainUrl(urlEnabled, urlState);
  useEffect(
    () =>
      subscribeToUrl((next) => {
        setLens(next.lens ?? 'economy');
        setShift(next.shift);
        setSelected(canOpen(next.node, next.shift) ? next.node : null);
        setPanelAnchor(null);
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
    setShift(next);
    setSelected((open) => (canOpen(open, next) ? open : null));
  }, []);

  const onSelect = useCallback(
    (id: string, trigger: Element | null) => {
      // A door named inside an open reading (a layer in a joint's panel, a
      // target in the moves list) is about to be re-rendered with it — so the
      // door the reader actually came through stays the one Close returns to.
      const panel = document.getElementById(panelId);
      if (!(trigger && panel?.contains(trigger))) {
        triggerRef.current = trigger;
        setPanelAnchor(trigger);
      }
      setSelected((current) => (current === id ? null : id));
    },
    [panelId],
  );

  const closePanel = useCallback(() => {
    setSelected(null);
    setPanelAnchor(null);
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
    (id: string): ReactNode => (
      <ChainTargetPanel
        id={id}
        moduleSlugs={isJointId(id) ? modulesByJoint[id as JointId] ?? [] : []}
        onClose={closePanel}
        panelId={panelId}
      />
    ),
    [modulesByJoint, closePanel, panelId],
  );

  const [reindus, green] = SHIFTS;
  const marks = shift ? markedIds(shift).length : 0;

  // Shared URLs have no click target. Resolve the permanent id to the actual
  // rendered mark/row after the chosen layout exists, then attach the panel.
  useEffect(() => {
    if (!selected || panelAnchor) return;
    const frame = requestAnimationFrame(() => {
      const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(selected) : selected;
      const target = figureRef.current?.querySelector(`[data-mark="${escaped}"], [data-id="${escaped}"]`);
      if (target) {
        triggerRef.current = target;
        setPanelAnchor(target);
        if ('scrollIntoView' in target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, panelAnchor, wideScreen, showCompact]);

  return (
    <div className="chain-plate" data-lens={lens} data-shift={shift ?? undefined} data-view={showCompact ? 'compact' : 'full'}>
      <header className="max-w-3xl">
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl [text-wrap:balance]">
          {CHAIN_COPY.headline}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-foreground md:text-lg" data-chain-standfirst>
          {CHAIN_COPY.standfirst}
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
          <div>
            <p className={KICKER}>Distance</p>
            <div className="mt-1.5"><DistanceSwitch lens={lens} onChoose={chooseLens} /></div>
          </div>
          <fieldset>
            <legend className={KICKER}>{CHAIN_COPY.panel.conditionKicker}</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <ConditionChoice name={`${base}-condition`} id={null} active={shift === null} onChoose={chooseShift} />
              <ConditionChoice name={`${base}-condition`} id={reindus.id} active={shift === reindus.id} onChoose={chooseShift} />
              <ConditionChoice name={`${base}-condition`} id={green.id} active={shift === green.id} onChoose={chooseShift} />
            </div>
          </fieldset>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
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
            <ChainColumn variant={showCompact ? 'compact' : 'full'} />
          )}
        </figure>

        {!showCompact && wideScreen && <Readout hovered={hovered} shift={shift} lens={lens} />}

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

        {!showCompact && (
          <div className={cn(!wideScreen && 'max-w-2xl')}>
            <ChainLegend />
          </div>
        )}

        {!showCompact && selected && (
          <ChainPanelOverlay open anchor={panelAnchor} onClose={closePanel}>
            {renderPanel(selected)}
          </ChainPanelOverlay>
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
