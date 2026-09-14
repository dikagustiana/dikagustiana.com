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
 * off by default. Under a shift, the rows it moves are outlined in the form
 * of their status and carry the status word and the lever's work there,
 * right beneath them; nothing is dimmed, because a long column read at arm's
 * length cannot afford to lose contrast. A reading opens as a bottom sheet
 * (ChainPlate owns it): a phone has no hover and no room beside a row.
 *
 * Same data file, same controls, same panel as the wide plate. The order of
 * rows here is layout; every word is a record in src/data/industryChain.ts.
 * There is no legend: every form carries its own definition in its accessible
 * description.
 *
 * ONE COLUMN, TWO LEVELS OF GROUPING, exactly as the wide plate has. The
 * overview used to be a different drawing built from a COMPACT sequence: a
 * handful of boxes with no joints, no layers, no chips and no marks, so the
 * distance and shift controls had nothing to act on and had to be hidden.
 * `level="overview"` now runs the SAME column and applies the SAME grouping
 * rules the plate applies — OVERVIEW_GROUPS, OVERVIEW_INTERNAL_JOINTS,
 * OVERVIEW_OMITS — so the narrow reader gets every joint but one, every
 * layer, every border, every return, every flow and every mark without
 * opening the detail. `detail` un-groups; it adds nothing.
 */

import { useContext, useId, useState } from 'react';
import {
  BANDS,
  BORDERS,
  BYPRODUCT,
  CHAIN_COPY,
  DEFINE,
  FLOW_KIND_LABELS,
  JOINT_BY_ID,
  LEVERS,
  MARGIN_KINDS,
  NODES,
  NON_PHYSICAL,
  OVERVIEW_GROUPS,
  OVERVIEW_INTERNAL_JOINTS,
  RETAIL,
  RETAIL_GROUP,
  RETURNS,
  STAGES,
  SHIFT_BY_ID,
  STATUS,
  bandChip,
  isWritten,
  shiftTarget,
  type Band,
  type ChainLevel,
  type JointId,
  type MarginKind,
  type OverviewGroup,
} from '@/data/industryChain';
import { cn } from '@/lib/utils';
import { StatusBadge } from './ChainTargetPanel';
import { ChainLensContext } from './chainLensContext';
import { isDoor, markNumber } from './chainTargets';

const S = Object.fromEntries(STAGES.map((s) => [s.id, s]));
const N = Object.fromEntries([...NODES, ...RETAIL].map((n) => [n.id, n]));
const labelOf = (id: string) =>
  S[id]?.label ??
  N[id]?.label ??
  BORDERS.find((b) => b.id === id)?.label ??
  RETURNS.find((r) => r.id === id)?.label ??
  (id === RETAIL_GROUP.id ? RETAIL_GROUP.label : id);

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const KICKER = 'text-[10px] uppercase tracking-[0.16em] text-muted-foreground';
/** A target the shift that is on moves: an outline in the form of its status — heavy, plain or dashed. */
const LIT = 'outline outline-offset-2 outline-accent-editorial';
const litForm = (status?: string) =>
  status === 'stuck' ? `${LIT} outline-[3px]` : status === 'unpriced' ? `${LIT} outline-2 outline-dashed` : `${LIT} outline-2`;

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
  return shiftTarget(shift, id)?.condition !== undefined;
}
function useStatus(id: string) {
  const { shift } = useContext(ChainLensContext);
  return shiftTarget(shift, id)?.condition?.status;
}

/**
 * What a shift does at this row, read at the distance that is on, with the
 * same number the wide plate would give it.
 *
 * The column carries no floating marks: a phone has no hover and no room for
 * a badge that does not also say something. So the number opens the note
 * instead of pointing at it, and the essays behind a mark are listed right
 * here rather than in a panel the reader has to go and find. The numbering is
 * the plate's, so a number quoted in an essay means the same thing on both.
 */
function LitNote({ id }: { id: string }) {
  const { shift, lens, selected, onSelect, panelId } = useContext(ChainLensContext);
  const target = shiftTarget(shift, id);
  const condition = target?.condition;
  if (!shift || !target || !condition) return null;
  const n = markNumber(shift, id);
  const open = selected === id;
  // The status and the lever's work here, in the voice that is on. The
  // number is the button: it opens the full reading as a bottom sheet.
  const action = isWritten(condition.action, lens) ? condition.action[lens] : '';
  return (
    <div
      data-lit-note={id}
      data-status={condition.status}
      className={cn(
        'mt-1.5 border-l-2 pl-2 text-xs leading-snug text-foreground',
        condition.status === 'stuck' ? 'border-l-[3px] border-foreground' : condition.status === 'unpriced' ? 'border-dashed border-muted-foreground' : 'border-accent-editorial',
      )}
    >
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {n > 0 && (
          <button
            type="button"
            data-mark-n={n}
            aria-label={`${n}. ${SHIFT_BY_ID[shift].label} · ${labelOf(id)} · ${STATUS[condition.status].label}`}
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            onClick={(e) => onSelect(id, e.currentTarget)}
            className={cn(
              'inline-block min-h-6 min-w-6 rounded-full border px-2 text-center font-semibold tabular-nums',
              condition.status === 'stuck' && 'border-foreground bg-foreground text-background',
              condition.status === 'moving' && 'border-foreground',
              condition.status === 'unpriced' && 'border-dashed border-foreground',
              open && 'ring-2 ring-ring ring-offset-1',
              FOCUS,
            )}
          >
            {n}
          </button>
        )}
        <StatusBadge status={condition.status} />
      </p>
      <p className="mt-1">
        <span className="font-medium">{LEVERS[condition.lever].label}</span>
        {action && <span className="text-muted-foreground"> — {action}</span>}
      </p>
    </div>
  );
}

/* ── The forms ───────────────────────────────────────────────────────────── */

/**
 * A transformation stage. `detail` gates the material the overview groups
 * away — the example lanes into an origin, the stage's own gloss, and the
 * components of demand — and nothing else. The origin bar stays, because the
 * plate keeps it at both levels, and the shift's reading stays, because the
 * overview is a map to work at rather than a picture of one.
 */
function StageBox({ id, detail = true }: { id: string; detail?: boolean }) {
  const stage = S[id];
  const lit = useLit(id);
  const status = useStatus(id);
  return (
    <div className="min-w-0">
      <div
        data-id={id}
        data-lit={lit || undefined}
        title={stage.origin ? DEFINE.origin : DEFINE.stage}
        className={cn('rounded-sm border border-foreground bg-background px-3 py-2', lit && litForm(status))}
      >
        {stage.origin && <p className={KICKER}>{CHAIN_COPY.controls.origin}</p>}
        <p className="break-words text-[15px] font-semibold leading-snug text-foreground">{stage.label}</p>
        {detail && stage.lanes && <p className="mt-1 text-xs leading-snug text-muted-foreground">{stage.lanes.join(' · ')}</p>}
        {detail && stage.detail && <p className="mt-1 text-xs leading-snug text-muted-foreground">{stage.detail}</p>}
        {detail && stage.demand && (
          <ul className="mt-1.5 space-y-0.5 border-l-2 border-foreground pl-2 text-xs text-foreground">
            {stage.demand.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      <LitNote id={id} />
    </div>
  );
}

function NodePill({ id, label }: { id: string; label?: string }) {
  const node = N[id];
  const lit = useLit(id);
  const status = useStatus(id);
  return (
    <div className="min-w-0">
      <div
        data-id={id}
        data-lit={lit || undefined}
        title={DEFINE.node}
        className={cn('rounded-full border border-dashed border-muted-foreground bg-background px-3 py-1.5', lit && litForm(status))}
      >
        <p className="break-words text-sm leading-snug text-foreground">{label ?? node?.label ?? id}</p>
        {node?.recursion && <p className="mt-0.5 text-xs text-muted-foreground">↳ {node.recursion}</p>}
      </div>
      <LitNote id={id} />
    </div>
  );
}

/**
 * The retail function. Its five formats are rows on detail and are grouped
 * away on the overview; the node, its note and its joints are the same at
 * both levels. Grouping them says they share a FUNCTION — not a margin, which
 * is why the formats come back rather than being summed.
 */
function RetailGroup({ formats = true }: { formats?: boolean }) {
  const lit = useLit(RETAIL_GROUP.id);
  const status = useStatus(RETAIL_GROUP.id);
  return (
    <div className="min-w-0">
      <div data-id={RETAIL_GROUP.id} data-lit={lit || undefined} title={DEFINE.retail} className={cn('rounded-md border border-dashed border-muted-foreground p-2', lit && litForm(status))}>
        <p className={KICKER}>
          {RETAIL_GROUP.label} <span className="normal-case tracking-normal">· {RETAIL_GROUP.note}</span>
        </p>
        {formats && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {RETAIL.map((r) => (
              <li key={r.id} data-id={r.id} className="rounded-full border border-dashed border-muted-foreground bg-background px-2 py-0.5 text-xs text-foreground">
                {r.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <LitNote id={RETAIL_GROUP.id} />
    </div>
  );
}

/**
 * A transfer of title: the arrow between two forms, the joint mark in the
 * form of its margin kind — a filled diamond where a stage sells, an open one
 * where a node sells, a square where a fee is paid — its chip at the distance
 * that is on, and the door into its margin.
 */
function JointRow({ id }: { id: JointId }) {
  const { lens, selected, onSelect, panelId } = useContext(ChainLensContext);
  const joint = JOINT_BY_ID[id];
  const kind = MARGIN_KINDS[joint.margin];
  const open = selected === id;
  const lit = useLit(id);
  const status = useStatus(id);
  return (
    <div data-id={id} data-lit={lit || undefined} data-status={status} className="min-w-0 py-1">
      <span id={`${id}-desc`} className="sr-only">
        {kind.label}. {joint.read[lens].chip}.
      </span>
      <button
        type="button"
        aria-label={joint.label}
        aria-describedby={`${id}-desc`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(e) => onSelect(id, e.currentTarget)}
        className={cn('grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-sm px-1 py-1 text-left', lit && litForm(status), FOCUS)}
      >
        <span aria-hidden="true" className="flex flex-col items-center leading-none text-muted-foreground">
          <span className="text-base">↓</span>
          <span
            data-mark-form={kind.mark}
            className={cn(
              'mt-0.5 block h-3 w-3 border-[1.5px] border-foreground bg-background',
              kind.mark !== 'square' && 'rotate-45',
              kind.mark === 'filled-diamond' && 'bg-foreground',
              kind.mark === 'square' && 'bg-foreground',
              open && 'ring-2 ring-ring ring-offset-1',
            )}
          />
        </span>
        <span className="min-w-0">
          <span className="block break-words text-xs leading-snug text-muted-foreground">{joint.label}</span>
          <span className="block text-sm font-medium text-foreground">{MARGIN_KINDS[joint.margin].label}</span>
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
  const status = useStatus(id);
  return (
    <div className="min-w-0">
      <div
        data-id={id}
        data-lit={lit || undefined}
        title={`${DEFINE.border} — ${border.note}`}
        className={cn(
          'my-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-foreground',
          lit && 'rounded-sm ' + litForm(status),
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
  const status = useStatus(id);
  return (
    <li data-id={r.id} data-lit={lit || undefined} title={DEFINE.return} className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-xs leading-snug', lit && 'rounded-sm ' + litForm(status))}>
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
  const lit = RETURNS.filter((r) => r.from === from && shiftTarget(shift, r.id)?.condition);
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
              <li key={f.id} data-id={f.id} className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-xs leading-snug', kind === 'money' ? 'cp-text-money' : 'cp-text-information')}>
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
function LayerRow({ band }: { band: Band }) {
  const { selected, onSelect, panelId } = useContext(ChainLensContext);
  const open = selected === band.id;
  const lit = useLit(band.id);
  const status = useStatus(band.id);
  const chip = bandChip(band);
  return (
    <li data-id={band.id} data-lit={lit || undefined} className="min-w-0">
      {/* The definition sits outside the button so the button's name stays the layer's own label. */}
      <span id={`${band.id}-desc`} className="sr-only">
        {band.margin ? DEFINE.layerFee : DEFINE.layerTerms}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-describedby={`${band.id}-desc`}
        onClick={(e) => onSelect(band.id, e.currentTarget)}
        className={cn(
          'grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 rounded-sm border-t border-border bg-secondary px-3 py-2 text-left',
          lit && litForm(status),
          FOCUS,
        )}
      >
        <span className="min-w-0">
          <span className="block break-words text-xs font-medium uppercase tracking-wider text-foreground">{band.label}</span>
          <span className="block text-xs text-muted-foreground">{band.spanLabel}</span>
          {band.note && <span className="mt-1 block text-xs text-muted-foreground">{band.note}</span>}
        </span>
        {chip && (
          <span className={cn('rounded-sm px-1.5 text-[11px] font-semibold uppercase tracking-wider', chipForm(band.margin), !band.margin && 'bg-background')}>
            {chip}
          </span>
        )}
      </button>
      <LitNote id={band.id} />
    </li>
  );
}

/* ── One column, two levels of grouping ───────────────────────── */

/**
 * One box standing for two or more source records.
 *
 * It takes the node form because both groups collapse NODES, and it carries
 * the group’s own account of what stays true while they share a box — which
 * is where the sentence about two spreads not adding into one lives. It is
 * not a door: a group is a way of drawing, not a margin to read. The margins
 * inside it are read on detail, separately, which is the point.
 */
function GroupBox({ group }: { group: OverviewGroup }) {
  return (
    <div className="min-w-0">
      <div
        data-id={group.id}
        data-group=""
        title={`${DEFINE.node} — ${group.keeps}`}
        className="rounded-full border border-dashed border-muted-foreground bg-background px-3 py-1.5"
      >
        <p className="break-words text-sm leading-snug text-foreground">{group.label}</p>
      </div>
    </div>
  );
}

/**
 * The chain, top to bottom, at one of two levels of grouping.
 *
 * Everything that is a RELATION is drawn at both levels: the two origins and
 * where they join, the parallel packaging input, ten of the eleven joints,
 * every border, every enabling layer, every return with its own destination,
 * and both non-physical flow lists. What the overview groups away is named in
 * OVERVIEW_GROUPS and OVERVIEW_OMITS and put back by `detail`.
 *
 * The one joint the overview does not draw is the transfer between the
 * distributor and the wholesaler, which is internal to their shared box. It
 * is a door, so an address naming it opens the detail rather than a panel
 * with nothing behind it — see asksForFullChain in useChainUrl.ts.
 */
function Column({ level }: { level: ChainLevel }) {
  const base = useId();
  const returnsId = `${base}-returns`, flowsId = `${base}-flows`, layersId = `${base}-layers`;
  const [showReturns, setShowReturns] = useState(false);
  const [showFlows, setShowFlows] = useState(false);
  const overview = level === 'overview';
  const detail = !overview;

  return (
    <div
      className="cp-column flex min-w-0 flex-col"
      data-level={level}
      role="group"
      aria-label={overview ? CHAIN_COPY.aria.compact.title : CHAIN_COPY.aria.column}
    >
      <p className="mb-4 border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground">{CHAIN_COPY.mobileFlows}</p>
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col">
          <StageBox id="stage-biological" detail={detail} />
          <JointRow id="j-production-aggregation" />
          <NodePill id="node-aggregation" />
          <JointRow id="j-aggregation-processing" />
        </div>
        <div className="flex min-w-0 flex-col">
          <StageBox id="stage-extraction" detail={detail} />
          <BorderRule id="border-export" />
          <JointRow id="j-extraction-processing" />
        </div>
      </div>

      <StageBox id="stage-processing" detail={detail} />
      <p data-id={BYPRODUCT.id} className="mt-1 text-right text-xs text-muted-foreground">
        ↘ {BYPRODUCT.label}
      </p>
      <JointRow id="j-processing-trader" />

      <div className="grid min-w-0 grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col">
          <NodePill id="node-trader" />
          <BorderRule id="border-import" />
          <JointRow id="j-trader-manufacturing" />
        </div>
        <div className="flex min-w-0 flex-col">
          <StageBox id="stage-packaging" detail={detail} />
          <JointRow id="j-packaging-manufacturing" />
        </div>
      </div>

      <StageBox id="stage-manufacturing" detail={detail} />
      <div className="my-1 flex items-center gap-2 pl-4 text-xs text-muted-foreground">
        <span aria-hidden="true" className="h-4 border-l border-muted-foreground" />
        {CHAIN_COPY.controls.alongside}
      </div>
      <NodePill id="node-principal" />
      <JointRow id="j-manufacturing-distribution" />

      {/* The distributor and the wholesaler, as one box or as two nodes with
          the transfer between them. Both take title and transform nothing;
          the joint they share is real at both levels and is simply inside
          the box at the coarser one. */}
      {overview ? (
        <GroupBox group={OVERVIEW_GROUPS['group-distribution']} />
      ) : (
        <>
          <NodePill id="node-distributor" />
          <JointRow id="j-distributor-wholesaler" />
          <NodePill id="node-wholesaler" />
        </>
      )}
      <JointRow id="j-wholesale-retail" />
      <RetailGroup formats={detail} />
      <JointRow id="j-retail-consumption" />
      <StageBox id="stage-consumption" detail={detail} />
      <JointRow id="j-consumption-recovery" />
      <StageBox id="stage-recovery" detail={detail} />
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
            <LayerRow key={b.id} band={b} />
          ))}
        </ul>
      </section>
    </div>
  );
}

export function ChainColumn({ level }: { level: ChainLevel }) {
  return <Column level={level} />;
}
