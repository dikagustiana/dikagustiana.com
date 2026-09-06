/**
 * The chain for a narrow screen: top to bottom, in HTML.
 *
 * Not a shrunken plate. At phone width the map is redrawn as a column: every
 * stage a solid box, every node a dashed pill, every joint a tappable row
 * between them with the same diamond the wide plate uses and the same chip —
 * the joint read at the distance that is on, in the form of its margin kind.
 * The two origins and the two side inputs sit two abreast where the chain
 * actually forks. The enabling layers become a list whose rows open; return
 * flows and the money and information flows are lists behind two toggles,
 * off by default. Under a shift, the rows it moves are outlined and carry
 * what moves there, right beneath them; nothing is dimmed, because a long
 * column read at arm's length cannot afford to lose contrast.
 *
 * Same data file, same controls, same panel as the wide plate. The order of
 * rows here is layout; every word is a record in src/data/industryChain.ts.
 * `variant="compact"` draws the short version from COMPACT: no joints, no
 * layers list, no toggles, no small labels.
 */

import { useContext, useId, useState, type ReactNode } from 'react';
import {
  BANDS,
  BORDERS,
  BYPRODUCT,
  CHAIN_COPY,
  COMPACT,
  FLOW_KIND_LABELS,
  JOINT_BY_ID,
  MARGIN_KINDS,
  NODES,
  NON_PHYSICAL,
  RETAIL,
  RETAIL_GROUP,
  RETURNS,
  STAGES,
  SHIFT_BY_ID,
  bandChip,
  shiftTarget,
  type Band,
  type CompactStep,
  type JointId,
  type MarginKind,
} from '@/data/industryChain';
import { cn } from '@/lib/utils';
import { ChainLensContext } from './chainLensContext';

const S = Object.fromEntries(STAGES.map((s) => [s.id, s]));
const N = Object.fromEntries([...NODES, ...RETAIL].map((n) => [n.id, n]));
const labelOf = (id: string) => S[id]?.label ?? N[id]?.label ?? (id === RETAIL_GROUP.id ? RETAIL_GROUP.label : id);

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const KICKER = 'text-[10px] uppercase tracking-[0.16em] text-muted-foreground';
/** A target the shift that is on moves: the same ring the wide plate draws, as an outline. */
const LIT = 'outline outline-2 outline-offset-2 outline-accent-editorial';

/** The chip forms, the same three the plate and the panel use. */
const chipForm = (kind?: MarginKind) =>
  kind === 'conversion'
    ? 'border border-foreground text-foreground'
    : kind === 'node-spread'
      ? 'border border-dashed border-foreground text-foreground'
      : kind === 'service-fee'
        ? 'border border-border bg-secondary text-secondary-foreground'
        : 'border border-border text-muted-foreground';

/* ── What a shift moves here, inline ─────────────────────────────────────── */

function useLit(id: string) {
  const { shift } = useContext(ChainLensContext);
  return shiftTarget(shift, id) !== undefined;
}

function LitNote({ id }: { id: string }) {
  const { shift, lens } = useContext(ChainLensContext);
  const target = shiftTarget(shift, id);
  if (!shift || !target) return null;
  return (
    <p data-lit-note={id} className="mt-1.5 border-l-2 border-accent-editorial pl-2 text-xs leading-snug text-foreground">
      <span className="font-medium">{SHIFT_BY_ID[shift].label}</span> — {target.read[lens]}
    </p>
  );
}

/* ── The forms ───────────────────────────────────────────────────────────── */

function StageBox({ id, detail = true }: { id: string; detail?: boolean }) {
  const stage = S[id];
  const lit = useLit(id);
  return (
    <div className="min-w-0">
      <div data-id={id} data-lit={lit || undefined} className={cn('rounded-sm border border-foreground bg-background px-3 py-2', lit && LIT)}>
        {detail && stage.origin && <p className={KICKER}>{CHAIN_COPY.controls.origin}</p>}
        <p className="break-words text-[15px] font-semibold leading-snug text-foreground">{stage.label}</p>
        {detail && stage.lanes && <p className="mt-1 text-xs leading-snug text-muted-foreground">{stage.lanes.join(' · ')}</p>}
        {detail && stage.demand && (
          <ul className="mt-1.5 space-y-0.5 border-l-2 border-foreground pl-2 text-xs text-foreground">
            {stage.demand.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      {detail && <LitNote id={id} />}
    </div>
  );
}

function NodePill({ id, label }: { id: string; label?: string }) {
  const node = N[id];
  const lit = useLit(id);
  return (
    <div className="min-w-0">
      <div data-id={id} data-lit={lit || undefined} className={cn('rounded-full border border-dashed border-muted-foreground bg-background px-3 py-1.5', lit && LIT)}>
        <p className="break-words text-sm leading-snug text-foreground">{label ?? node?.label ?? id}</p>
        {node?.recursion && <p className="mt-0.5 text-xs text-muted-foreground">↳ {node.recursion}</p>}
      </div>
      <LitNote id={id} />
    </div>
  );
}

function RetailGroup() {
  const lit = useLit(RETAIL_GROUP.id);
  return (
    <div className="min-w-0">
      <div data-id={RETAIL_GROUP.id} data-lit={lit || undefined} className={cn('rounded-md border border-dashed border-muted-foreground p-2', lit && LIT)}>
        <p className={KICKER}>
          {RETAIL_GROUP.label} <span className="normal-case tracking-normal">· {RETAIL_GROUP.note}</span>
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {RETAIL.map((r) => (
            <li key={r.id} data-id={r.id} className="rounded-full border border-dashed border-muted-foreground bg-background px-2 py-0.5 text-xs text-foreground">
              {r.label}
            </li>
          ))}
        </ul>
      </div>
      <LitNote id={RETAIL_GROUP.id} />
    </div>
  );
}

/** A transfer of title: the arrow between two forms, its chip at the distance that is on, and the door into its margin. */
function JointRow({ id }: { id: JointId }) {
  const { lens, selected, onSelect, panelId } = useContext(ChainLensContext);
  const joint = JOINT_BY_ID[id];
  const open = selected === id;
  const lit = useLit(id);
  return (
    <div data-id={id} data-lit={lit || undefined} className="min-w-0 py-1">
      <button
        type="button"
        aria-label={joint.label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(e) => onSelect(id, e.currentTarget)}
        className={cn('grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-sm px-1 py-1 text-left', FOCUS)}
      >
        <span aria-hidden="true" className="flex flex-col items-center leading-none text-muted-foreground">
          <span className="text-base">↓</span>
          <span
            className={cn(
              'mt-0.5 block h-3 w-3 rotate-45 border-[1.5px] bg-background',
              open ? 'border-foreground bg-foreground' : lit ? 'border-accent-editorial border-2' : 'border-foreground',
            )}
          />
        </span>
        <span className="min-w-0">
          <span className="block break-words text-xs leading-snug text-muted-foreground">{joint.label}</span>
          <span data-chip={lens} className={cn('mt-0.5 inline-block rounded-sm px-1.5 text-[12px] font-medium', chipForm(joint.margin))}>
            {joint.read[lens].chip}
          </span>
        </span>
      </button>
      <LitNote id={id} />
    </div>
  );
}

function BorderRule({ id }: { id: string }) {
  const border = BORDERS.find((b) => b.id === id)!;
  const lit = useLit(id);
  return (
    <div className="min-w-0">
      <div
        data-id={id}
        data-lit={lit || undefined}
        className={cn(
          'my-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-foreground',
          lit && 'rounded-sm ' + LIT,
        )}
      >
        <span aria-hidden="true" className="flex-1 border-t border-dashed border-foreground" />
        <span>{border.label}</span>
        <span aria-hidden="true" className="flex-1 border-t border-dashed border-foreground" />
      </div>
      <LitNote id={id} />
    </div>
  );
}

const Arrow = () => (
  <div aria-hidden="true" className="py-0.5 text-center text-base leading-none text-muted-foreground">
    ↓
  </div>
);

/** The panel, rendered under whichever row opened it — never half a screen away. */
function PanelSlot({ ids, panel }: { ids: readonly string[]; panel: (id: string) => ReactNode }) {
  const { selected } = useContext(ChainLensContext);
  if (!selected || !ids.includes(selected)) return null;
  return <div className="min-w-0">{panel(selected)}</div>;
}

/* ── Lists behind toggles ────────────────────────────────────────────────── */

function Toggle({ id, pressed, onToggle, children }: { id: string; pressed: boolean; onToggle: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-controls={pressed ? id : undefined}
      onClick={onToggle}
      className={cn(
        'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
        pressed ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground',
        FOCUS,
      )}
    >
      {children}
    </button>
  );
}

function ReturnItem({ id }: { id: string }) {
  const r = RETURNS.find((x) => x.id === id)!;
  const lit = useLit(id);
  return (
    <li data-id={r.id} data-lit={lit || undefined} className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-xs leading-snug', lit && 'rounded-sm ' + LIT)}>
      <span aria-hidden="true" className="text-muted-foreground">↺</span>
      <span className="min-w-0">
        <span className="font-medium text-foreground">{r.label}</span>
        <span className="block text-muted-foreground">
          {labelOf(r.from)} → {labelOf(r.to)}
          {r.note && ` · ${r.note}`}
        </span>
        <LitNote id={r.id} />
      </span>
    </li>
  );
}

function ReturnsList({ id }: { id: string }) {
  return (
    <ul id={id} className="mt-3 space-y-2">
      {RETURNS.map((r) => (
        <ReturnItem key={r.id} id={r.id} />
      ))}
    </ul>
  );
}

/** The returns a shift moves, shown where they leave — so the loop is visible without opening the list. */
function LitReturns({ from }: { from: string }) {
  const { shift } = useContext(ChainLensContext);
  if (!shift) return null;
  const lit = RETURNS.filter((r) => r.from === from && shiftTarget(shift, r.id));
  if (lit.length === 0) return null;
  return (
    <ul className="mt-2 space-y-2" data-lit-returns={from}>
      {lit.map((r) => (
        <ReturnItem key={r.id} id={r.id} />
      ))}
    </ul>
  );
}

function NonPhysicalList({ id }: { id: string }) {
  return (
    <div id={id} className="mt-3 space-y-3">
      {(['money', 'information'] as const).map((kind) => (
        <div key={kind}>
          <p className={KICKER}>{FLOW_KIND_LABELS[kind]}</p>
          <ul className="mt-1 space-y-1.5">
            {NON_PHYSICAL.filter((f) => f.kind === kind).map((f) => (
              <li key={f.id} data-id={f.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-xs leading-snug">
                <span aria-hidden="true" className="text-muted-foreground">
                  {f.direction === 'upstream' ? '↑' : '↓'}
                </span>
                <span className="min-w-0">
                  <span className="font-medium text-foreground">{f.label}</span>
                  <span className="block text-muted-foreground">{f.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** One layer as a row that opens: the same door the wide plate's band is. */
function LayerRow({ band, panel }: { band: Band; panel: (id: string) => ReactNode }) {
  const { selected, onSelect, panelId } = useContext(ChainLensContext);
  const open = selected === band.id;
  const lit = useLit(band.id);
  const chip = bandChip(band);
  return (
    <li data-id={band.id} data-lit={lit || undefined} className="min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(e) => onSelect(band.id, e.currentTarget)}
        className={cn(
          'grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 rounded-sm border-t border-border bg-secondary px-3 py-2 text-left',
          lit && LIT,
          FOCUS,
        )}
      >
        <span className="min-w-0">
          <span className="block break-words text-xs font-medium uppercase tracking-wider text-foreground">{band.label}</span>
          <span className="block text-xs text-muted-foreground">{band.spanLabel}</span>
        </span>
        {chip && (
          <span className={cn('rounded-sm px-1.5 text-[11px] font-semibold uppercase tracking-wider', chipForm(band.margin), !band.margin && 'bg-background')}>
            {chip}
          </span>
        )}
      </button>
      <LitNote id={band.id} />
      <PanelSlot ids={[band.id]} panel={panel} />
    </li>
  );
}

/* ── The two columns ─────────────────────────────────────────────────────── */

function FullColumn({ panel }: { panel: (id: string) => ReactNode }) {
  const base = useId();
  const returnsId = `${base}-returns`, flowsId = `${base}-flows`, layersId = `${base}-layers`;
  const [showReturns, setShowReturns] = useState(false);
  const [showFlows, setShowFlows] = useState(false);

  return (
    <div className="cp-column flex min-w-0 flex-col" data-variant="full" role="group" aria-label={CHAIN_COPY.aria.column}>
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col">
          <StageBox id="stage-biological" />
          <JointRow id="j-production-aggregation" />
          <NodePill id="node-aggregation" />
          <JointRow id="j-aggregation-processing" />
        </div>
        <div className="flex min-w-0 flex-col">
          <StageBox id="stage-extraction" />
          <BorderRule id="border-export" />
          <JointRow id="j-extraction-processing" />
        </div>
      </div>
      <PanelSlot ids={['j-production-aggregation', 'j-aggregation-processing', 'j-extraction-processing']} panel={panel} />

      <StageBox id="stage-processing" />
      <p data-id={BYPRODUCT.id} className="mt-1 text-right text-xs text-muted-foreground">
        ↘ {BYPRODUCT.label}
      </p>
      <JointRow id="j-processing-trader" />
      <PanelSlot ids={['j-processing-trader']} panel={panel} />

      <div className="grid min-w-0 grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col">
          <NodePill id="node-trader" />
          <BorderRule id="border-import" />
          <JointRow id="j-trader-manufacturing" />
        </div>
        <div className="flex min-w-0 flex-col">
          <StageBox id="stage-packaging" />
          <JointRow id="j-packaging-manufacturing" />
        </div>
      </div>
      <PanelSlot ids={['j-trader-manufacturing', 'j-packaging-manufacturing']} panel={panel} />

      <StageBox id="stage-manufacturing" />
      <div className="my-1 flex items-center gap-2 pl-4 text-xs text-muted-foreground">
        <span aria-hidden="true" className="h-4 border-l border-muted-foreground" />
        {CHAIN_COPY.controls.alongside}
      </div>
      <NodePill id="node-principal" />
      <JointRow id="j-manufacturing-distribution" />
      <PanelSlot ids={['j-manufacturing-distribution']} panel={panel} />

      <NodePill id="node-distributor" />
      <JointRow id="j-distributor-wholesaler" />
      <PanelSlot ids={['j-distributor-wholesaler']} panel={panel} />
      <NodePill id="node-wholesaler" />
      <JointRow id="j-wholesale-retail" />
      <PanelSlot ids={['j-wholesale-retail']} panel={panel} />
      <RetailGroup />
      <JointRow id="j-retail-consumption" />
      <PanelSlot ids={['j-retail-consumption']} panel={panel} />
      <StageBox id="stage-consumption" />
      <JointRow id="j-consumption-recovery" />
      <PanelSlot ids={['j-consumption-recovery']} panel={panel} />
      <StageBox id="stage-recovery" />
      {!showReturns && <LitReturns from="stage-recovery" />}

      <div className="mt-5 flex flex-wrap gap-2">
        <Toggle id={returnsId} pressed={showReturns} onToggle={() => setShowReturns((v) => !v)}>
          {CHAIN_COPY.controls.returns}
        </Toggle>
        <Toggle id={flowsId} pressed={showFlows} onToggle={() => setShowFlows((v) => !v)}>
          {CHAIN_COPY.controls.nonPhysical}
        </Toggle>
      </div>
      {showReturns && <ReturnsList id={returnsId} />}
      {showFlows && <NonPhysicalList id={flowsId} />}

      <section aria-labelledby={layersId} className="mt-6">
        <h3 id={layersId} className={KICKER}>
          {CHAIN_COPY.controls.layers}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {BANDS.map((b) => (
            <LayerRow key={b.id} band={b} panel={panel} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function GroupPill({ step }: { step: Extract<CompactStep, { kind: 'group' }> }) {
  return (
    <div data-id={step.id} className="rounded-full border border-dashed border-muted-foreground bg-background px-3 py-1.5">
      <p className="break-words text-sm leading-snug text-foreground">{step.label}</p>
    </div>
  );
}

function CompactColumn() {
  const steps = COMPACT.sequence;
  const out: ReactNode[] = [];
  let i = 0;
  while (i < steps.length) {
    const step = steps[i];
    if (step.kind === 'stages' && step.ids.length === 2) {
      const next = steps[i + 1];
      const groupForFirst = next && next.kind === 'group' && next.from?.includes(step.ids[0]) ? next : null;
      out.push(
        <div key={step.ids.join('+')} className="grid min-w-0 grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col">
            <StageBox id={step.ids[0]} detail={false} />
            {groupForFirst && (
              <>
                <Arrow />
                <GroupPill step={groupForFirst} />
              </>
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <StageBox id={step.ids[1]} detail={false} />
          </div>
        </div>,
      );
      i += groupForFirst ? 2 : 1;
    } else {
      out.push(step.kind === 'stages' ? <StageBox key={step.ids[0]} id={step.ids[0]} detail={false} /> : <GroupPill key={step.id} step={step} />);
      i += 1;
    }
    if (i < steps.length) out.push(<Arrow key={`arrow-${i}`} />);
  }

  const ret = COMPACT.returnArrow;
  return (
    <div className="cp-column flex min-w-0 flex-col" data-variant="compact" role="group" aria-label={CHAIN_COPY.aria.compact.title}>
      {out}
      <div data-id={ret.id} className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden="true" className="flex-1 border-t border-dashed border-muted-foreground" />
        <span>
          ↑ {ret.label} · {CHAIN_COPY.controls.back} {labelOf(ret.to)}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {COMPACT.bands.map((id) => {
          const band = BANDS.find((b) => b.id === id)!;
          return (
            <li key={id} data-id={id} className="rounded-sm border-t border-border bg-secondary px-3 py-2 text-xs font-medium uppercase tracking-wider text-foreground">
              {band.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ChainColumn({ variant, panel }: { variant: 'full' | 'compact'; panel: (id: string) => ReactNode }) {
  return variant === 'compact' ? <CompactColumn /> : <FullColumn panel={panel} />;
}
