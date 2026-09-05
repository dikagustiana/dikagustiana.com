/**
 * The four categories, drawn as four different things.
 *
 * The distinction has to survive being read without the legend, and it has to
 * survive being read without colour, so it is carried by shape, line style and
 * texture:
 *
 *   stage  — solid filled rectangle, two-pixel solid border, numbered
 *   node   — unfilled pill, one-pixel dashed border, diamond glyph
 *   layer  — full-width band, hatched cap, running the length of the chain
 *   return — no box at all: a dashed rule with a leftward head
 *
 * Colour only ever carries selection and the macro lens, and the lens also
 * stamps a badge so it is never colour alone either.
 */

import { cn } from '@/lib/utils';
import { useChainElement, type ChainElementState } from './chainContext';
import type {
  ChainBranch,
  ChainLayer,
  ChainNode,
  ChainNodeGroup,
  ChainStage,
  Described,
} from '@/data/industryChain';

/** Hatching for the enabling bands. Uses the border token; no new colour. */
const HATCH = {
  backgroundImage:
    'repeating-linear-gradient(135deg, hsl(var(--border)) 0 1px, transparent 1px 5px)',
} as const;

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function selectionRing(state: ChainElementState) {
  if (state.isActive) return 'ring-2 ring-accent';
  if (state.isLit) return 'ring-1 ring-accent';
  return '';
}

function LensBadge({ badge }: { badge?: string }) {
  if (!badge) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1.5 -top-1.5 z-20 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[8px] font-bold leading-none text-accent-foreground"
    >
      {badge}
    </span>
  );
}

/* ── A. Transformation stage ─────────────────────────────────────────── */

export function StageBox({ stage }: { stage: ChainStage }) {
  const state = useChainElement(stage.id);
  const hasSubLabels = Boolean(stage.subLabels?.length);

  const body = (
    <>
      <span className="flex items-start gap-1.5">
        <span
          aria-hidden="true"
          className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-primary text-[9px] font-bold leading-none text-primary-foreground"
        >
          {stage.ordinal ?? '+'}
        </span>
        <span className="break-words text-[11px] font-semibold leading-tight text-foreground">{stage.label}</span>
      </span>
      {stage.marker && (
        <span className="mt-1 block text-[9px] italic leading-tight text-muted-foreground">
          {stage.marker}
        </span>
      )}
    </>
  );

  const shell = cn(
    'relative w-full rounded-md border-2 border-primary/30 bg-card p-2 transition-opacity',
    state.isDimmed && 'opacity-40',
    selectionRing(state),
  );

  if (!hasSubLabels) {
    return (
      <button {...state.buttonProps} className={cn(shell, 'text-left', FOCUS)}>
        <LensBadge badge={state.badge} />
        {body}
      </button>
    );
  }

  return (
    <div className={shell}>
      <LensBadge badge={state.badge} />
      <button {...state.buttonProps} className={cn('block w-full rounded-sm text-left', FOCUS)}>
        {body}
      </button>
      <ul className="mt-1.5 space-y-1">
        {stage.subLabels?.map((sub) => (
          <li key={sub.id}>
            <StageSubLabel sub={sub} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StageSubLabel({ sub }: { sub: Described }) {
  const state = useChainElement(sub.id);
  return (
    <button
      {...state.buttonProps}
      className={cn(
        'relative block w-full rounded-sm border-l-2 border-primary/30 bg-background/70 px-1.5 py-0.5 text-left text-[9.5px] leading-tight text-foreground transition-opacity',
        state.isDimmed && 'opacity-40',
        selectionRing(state),
        FOCUS,
      )}
    >
      <LensBadge badge={state.badge} />
      {sub.label}
    </button>
  );
}

/* ── B. Intermediary node ────────────────────────────────────────────── */

function NodeShell({
  id,
  label,
  marker,
  caption,
  recursion,
  compact = false,
}: {
  id: string;
  label: string;
  marker?: string;
  caption?: string;
  /** A node type that nests inside itself, drawn as a nested line. */
  recursion?: string;
  compact?: boolean;
}) {
  const state = useChainElement(id);
  return (
    <button
      {...state.buttonProps}
      className={cn(
        'relative w-full rounded-2xl border border-dashed border-foreground/45 bg-background text-left transition-opacity',
        compact ? 'px-2 py-1' : 'px-2 py-1.5',
        state.isDimmed && 'opacity-40',
        selectionRing(state),
        FOCUS,
      )}
    >
      <LensBadge badge={state.badge} />
      <span className="flex items-baseline gap-1">
        <span aria-hidden="true" className="text-[8px] leading-none text-muted-foreground">
          &#9671;
        </span>
        <span className="break-words text-[10px] font-medium leading-tight text-foreground">{label}</span>
      </span>
      {caption && (
        <span className="mt-0.5 block pl-2.5 text-[9px] leading-tight text-muted-foreground">
          {caption}
        </span>
      )}
      {marker && !compact && (
        <span className="mt-0.5 block pl-2.5 text-[9px] italic leading-tight text-muted-foreground">
          {marker}
        </span>
      )}
      {recursion && (
        <span className="mt-0.5 block pl-2.5 text-[9px] leading-tight text-muted-foreground">
          <span aria-hidden="true">{'↳ '}</span>
          {recursion}
        </span>
      )}
    </button>
  );
}

export function NodeGroupPill({ group }: { group: ChainNodeGroup }) {
  return <NodeShell id={group.id} label={group.label} marker={group.marker} />;
}

export function NodePill({ node, compact = false }: { node: ChainNode; compact?: boolean }) {
  return (
    <NodeShell
      id={node.id}
      label={node.label}
      marker={node.marker}
      recursion={node.recursion}
      compact={compact}
    />
  );
}

/* ── C. Enabling layer ───────────────────────────────────────────────── */

export function LayerBand({
  layer,
  showSubBands,
}: {
  layer: ChainLayer;
  showSubBands: boolean;
}) {
  const state = useChainElement(layer.id);
  return (
    <div
      className={cn(
        'relative rounded-sm border border-border bg-muted/40 transition-opacity',
        state.isDimmed && 'opacity-40',
        selectionRing(state),
      )}
    >
      <LensBadge badge={state.badge} />
      <button
        {...state.buttonProps}
        className={cn('flex w-full items-center gap-2 rounded-sm py-1.5 pr-2 text-left', FOCUS)}
      >
        <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-l-sm" style={HATCH} />
        <span className="text-[10.5px] font-medium uppercase tracking-wide text-foreground">
          {layer.label}
        </span>
        {layer.marker && (
          <span className="text-[9px] italic text-muted-foreground">{layer.marker}</span>
        )}
      </button>
      {showSubBands && layer.subBands && (
        <ul className="space-y-1 px-2 pb-2 pl-8">
          {layer.subBands.map((band) => (
            <li key={band.id}>
              <SubBand band={band} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SubBand({ band }: { band: Described }) {
  const state = useChainElement(band.id);
  return (
    <button
      {...state.buttonProps}
      className={cn(
        'relative flex w-full items-center gap-2 rounded-sm border border-border/70 bg-background/60 py-1 pr-2 text-left transition-opacity',
        state.isDimmed && 'opacity-40',
        selectionRing(state),
        FOCUS,
      )}
    >
      <LensBadge badge={state.badge} />
      <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-l-sm" style={HATCH} />
      <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground">{band.label}</span>
    </button>
  );
}

/* ── D. Physical return flow ─────────────────────────────────────────── */

/** The one arrow drawn at the top level, carrying the four labels. */
export function ReturnRail({
  summary,
  labels,
  orientation,
}: {
  summary: Described;
  labels: string[];
  orientation: 'horizontal' | 'vertical';
}) {
  const state = useChainElement(summary.id);
  return (
    <button
      {...state.buttonProps}
      className={cn(
        'relative flex w-full items-center gap-2 rounded-sm px-1 py-1 text-left transition-opacity',
        state.isDimmed && 'opacity-40',
        state.isActive && 'ring-2 ring-accent',
        !state.isActive && state.isLit && 'ring-1 ring-accent',
        FOCUS,
      )}
    >
      <LensBadge badge={state.badge} />
      <span aria-hidden="true" className="shrink-0 text-[11px] leading-none text-foreground/70">
        {orientation === 'horizontal' ? '◀' : '▲'}
      </span>
      <span className="relative flex min-w-0 flex-1 items-center">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 border-t border-dashed border-foreground/45"
        />
        <span className="relative flex flex-wrap gap-x-3 gap-y-0.5 bg-background pr-2">
          {labels.map((label) => (
            <span key={label} className="text-[9px] leading-tight text-muted-foreground">
              {label}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

/** One return flow, once Detail has separated them. */
export function ReturnChip({
  flow,
  loop,
}: {
  flow: Described & { from: string; to: string };
  loop: boolean;
}) {
  const state = useChainElement(flow.id);
  return (
    <button
      {...state.buttonProps}
      className={cn(
        'relative flex w-full items-center gap-1.5 rounded-sm border-t border-dashed border-foreground/45 bg-background px-1.5 py-1 text-left transition-opacity',
        state.isDimmed && 'opacity-40',
        selectionRing(state),
        FOCUS,
      )}
    >
      <LensBadge badge={state.badge} />
      <span aria-hidden="true" className="shrink-0 text-[10px] leading-none text-foreground/70">
        {loop ? '↻' : '◀'}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[9.5px] font-medium leading-tight text-foreground">
          {flow.label}
        </span>
        <span className="block truncate text-[9px] leading-tight text-muted-foreground">
          {flow.to}
        </span>
      </span>
    </button>
  );
}

/**
 * The by-product branch. Deliberately not a return chip: it points away from
 * the chain, and it is drawn with a solid line, because it travels forward.
 */
export function BranchChip({ branch }: { branch: ChainBranch }) {
  const state = useChainElement(branch.id);
  return (
    <button
      {...state.buttonProps}
      className={cn(
        'relative flex w-full items-center gap-1.5 rounded-sm border-l-2 border-foreground/40 bg-background px-1.5 py-1 text-left transition-opacity',
        state.isDimmed && 'opacity-40',
        selectionRing(state),
        FOCUS,
      )}
    >
      <LensBadge badge={state.badge} />
      <span className="min-w-0">
        <span className="block text-[9.5px] font-medium leading-tight text-foreground">
          {branch.label}
        </span>
        <span className="block text-[9px] leading-tight text-muted-foreground">
          {'↘ '}
          {branch.to}
        </span>
      </span>
    </button>
  );
}
