/**
 * The parts of the map that are lines rather than boxes: the non-physical
 * flows, the border crossings, and the decorative connectors.
 *
 * Non-physical flows are drawn thinner than anything physical and carry a head
 * at both ends, because both of them run in both directions with different
 * content each way.
 */

import { cn } from '@/lib/utils';
import { useChainElement } from './chainContext';
import type { BoundaryCrossing, ChainBoundary, NonPhysicalFlow } from '@/data/industryChain';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/* ── E. Non-physical flows ───────────────────────────────────────────── */

export function NonPhysicalRow({
  flow,
  lineStyle,
}: {
  flow: NonPhysicalFlow;
  lineStyle: 'dotted' | 'dashed';
}) {
  const state = useChainElement(flow.id);
  return (
    <button
      {...state.buttonProps}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-sm px-1 py-1 text-left transition-opacity',
        state.isDimmed && 'opacity-40',
        state.isActive && 'ring-2 ring-accent',
        !state.isActive && state.isLit && 'ring-1 ring-accent',
        FOCUS,
      )}
    >
      {state.badge && (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 z-20 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[8px] font-bold leading-none text-accent-foreground"
        >
          {state.badge}
        </span>
      )}
      <span className="w-20 shrink-0 text-[9.5px] font-medium uppercase tracking-wide text-foreground">
        {flow.label}
      </span>
      <span className="relative flex min-w-0 flex-1 items-center justify-between">
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-x-0 top-1/2 border-t border-foreground/30',
            lineStyle === 'dotted' ? 'border-dotted' : 'border-dashed',
          )}
        />
        <span className="relative bg-background pr-2 text-[9px] leading-tight text-muted-foreground">
          <span aria-hidden="true">{'◁ '}</span>
          {flow.leftward}
        </span>
        <span className="relative bg-background pl-2 text-[9px] leading-tight text-muted-foreground">
          {flow.rightward}
          <span aria-hidden="true">{' ▷'}</span>
        </span>
      </span>
    </button>
  );
}

/* ── The border ──────────────────────────────────────────────────────── */

/**
 * A crossing is drawn as a vertical dashed cut through the whole chain, not as
 * a band, because that is what it is. All three crossings open the same panel:
 * they are one element with three points of contact.
 */
export function BoundaryCut({
  boundary,
  crossing,
}: {
  boundary: ChainBoundary;
  crossing: BoundaryCrossing;
}) {
  const state = useChainElement(boundary.id);
  // A zero-width column so the cut lands exactly on the grid line it belongs
  // to; the label is centred on the cut rather than the cut on the label.
  return (
    <span className="relative block h-full w-0">
      <span
        aria-hidden="true"
        className={cn(
          'absolute bottom-0 left-0 top-5 border-l-2 border-dashed transition-opacity',
          state.isLit || state.isActive ? 'border-accent' : 'border-foreground/35',
          state.isDimmed && 'opacity-40',
        )}
      />
      <button
        {...state.buttonProps}
        className={cn(
          'pointer-events-auto absolute left-1/2 top-0 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-dashed border-foreground/50 bg-background px-1.5 py-0.5 text-[9px] leading-none text-muted-foreground transition-opacity',
          state.isDimmed && 'opacity-40',
          state.isActive && 'ring-2 ring-accent',
          !state.isActive && state.isLit && 'ring-1 ring-accent',
          FOCUS,
        )}
      >
        <span aria-hidden="true">{crossing.direction === 'out' ? '↑ ' : '↓ '}</span>
        {crossing.label}
      </button>
    </span>
  );
}

/** Horizontal variant, for the vertical chain. Same element, cut the other way. */
export function BoundaryCutInline({
  boundary,
  crossing,
}: {
  boundary: ChainBoundary;
  crossing: BoundaryCrossing;
}) {
  const state = useChainElement(boundary.id);
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'h-0 flex-1 border-t-2 border-dashed',
          state.isLit || state.isActive ? 'border-accent' : 'border-foreground/35',
        )}
      />
      <button
        {...state.buttonProps}
        className={cn(
          'relative rounded-full border border-dashed border-foreground/50 bg-background px-2 py-0.5 text-[9px] leading-none text-muted-foreground transition-opacity',
          state.isDimmed && 'opacity-40',
          state.isActive && 'ring-2 ring-accent',
          !state.isActive && state.isLit && 'ring-1 ring-accent',
          FOCUS,
        )}
      >
        <span aria-hidden="true">{crossing.direction === 'out' ? '→ ' : '← '}</span>
        {crossing.label}
      </button>
      <span
        aria-hidden="true"
        className={cn(
          'h-0 flex-1 border-t-2 border-dashed',
          state.isLit || state.isActive ? 'border-accent' : 'border-foreground/35',
        )}
      />
    </div>
  );
}

/**
 * The border's place in the list of enabling layers. Listed with the other
 * six so all seven are present, but drawn as a cut rather than a band, because
 * it is not one.
 */
export function BoundaryListEntry({ boundary }: { boundary: ChainBoundary }) {
  const state = useChainElement(boundary.id);
  return (
    <button
      {...state.buttonProps}
      className={cn(
        'relative flex w-full items-center gap-2 rounded-sm px-1 py-1.5 text-left transition-opacity',
        state.isDimmed && 'opacity-40',
        state.isActive && 'ring-2 ring-accent',
        !state.isActive && state.isLit && 'ring-1 ring-accent',
        FOCUS,
      )}
    >
      <span
        aria-hidden="true"
        className="ml-2 h-5 w-0 shrink-0 border-l-2 border-dashed border-foreground/50"
      />
      <span className="text-[10.5px] font-medium uppercase tracking-wide text-foreground">
        {boundary.label}
      </span>
      <span className="text-[9px] italic text-muted-foreground">
        {boundary.crossings.map((crossing) => crossing.label).join(' · ')}
      </span>
    </button>
  );
}

/* ── Decorative connectors ───────────────────────────────────────────── */

export function ForwardChevron() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-2.5 top-1/2 z-20 -translate-y-1/2 text-[10px] leading-none text-foreground/45"
    >
      ▶
    </span>
  );
}

export function MergeBrace() {
  return (
    <span aria-hidden="true" className="flex h-full items-center justify-center">
      <span className="h-1/2 w-2 rounded-r-sm border-y border-r border-foreground/25" />
      <span className="text-[10px] leading-none text-foreground/45">▶</span>
    </span>
  );
}

export function DownChevron() {
  return (
    <span aria-hidden="true" className="block text-center text-[10px] leading-none text-foreground/45">
      ▼
    </span>
  );
}
