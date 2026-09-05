/**
 * The two toggles, the macro markers they reveal, and the legend.
 *
 * The legend exists for confirmation, not for decoding: the four categories
 * are already four different shapes on the map. It repeats them here in the
 * same shapes so the two readings agree.
 */

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CHAIN_META, MACRO_ENTRIES } from '@/data/industryChain';

const HATCH = {
  backgroundImage:
    'repeating-linear-gradient(135deg, hsl(var(--border)) 0 1px, transparent 1px 5px)',
} as const;

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function ChainControls({
  macroLensId,
  detailId,
  macroLens,
  detail,
  hasSelection,
  onMacroLensChange,
  onDetailChange,
  onClear,
}: {
  macroLensId: string;
  detailId: string;
  macroLens: boolean;
  detail: boolean;
  hasSelection: boolean;
  onMacroLensChange: (next: boolean) => void;
  onDetailChange: (next: boolean) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-2">
        <Switch id={macroLensId} checked={macroLens} onCheckedChange={onMacroLensChange} />
        <Label htmlFor={macroLensId} className="cursor-pointer">
          <span className="block text-sm font-medium text-foreground">
            {CHAIN_META.controls.macroLens}
          </span>
          <span className="block text-xs font-normal text-muted-foreground">
            {CHAIN_META.controls.macroLensHint}
          </span>
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch id={detailId} checked={detail} onCheckedChange={onDetailChange} />
        <Label htmlFor={detailId} className="cursor-pointer">
          <span className="block text-sm font-medium text-foreground">
            {CHAIN_META.controls.detail}
          </span>
          <span className="block text-xs font-normal text-muted-foreground">
            {CHAIN_META.controls.detailHint}
          </span>
        </Label>
      </div>

      {hasSelection && (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground',
            FOCUS,
          )}
        >
          {CHAIN_META.controls.clear}
        </button>
      )}
    </div>
  );
}

/** The macro markers. Each one lights the part of the chain it enters. */
export function MacroMarkerBar({
  activeId,
  onSelect,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {CHAIN_META.sections.macro}
      </p>
      <ul className="flex flex-wrap gap-2">
        {MACRO_ENTRIES.map((entry) => {
          const isActive = entry.id === activeId;
          return (
            <li key={entry.id}>
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelect(entry.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors',
                  isActive
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-background text-foreground hover:border-accent',
                  FOCUS,
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[8px] font-bold leading-none',
                    isActive ? 'bg-accent-foreground text-accent' : 'bg-primary text-primary-foreground',
                  )}
                >
                  {entry.badge}
                </span>
                {entry.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ChainLegend() {
  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {CHAIN_META.sections.legend}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CHAIN_META.categories.map((category) => (
          <li key={category.id} className="flex gap-2">
            <span aria-hidden="true" className="mt-0.5 shrink-0">
              <LegendMark category={category.id} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground">{category.label}</span>
              <span className="block text-xs leading-snug text-muted-foreground">
                {category.definition}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        {CHAIN_META.footnote}
      </p>
    </div>
  );
}

function LegendMark({ category }: { category: 'stage' | 'node' | 'layer' | 'return' }) {
  if (category === 'stage') {
    return <span className="block h-5 w-8 rounded-md border-2 border-primary/30 bg-card" />;
  }
  if (category === 'node') {
    return <span className="block h-4 w-8 rounded-2xl border border-dashed border-foreground/45 bg-background" />;
  }
  if (category === 'layer') {
    return (
      <span className="flex h-4 w-8 items-center overflow-hidden rounded-sm border border-border bg-muted/40">
        <span className="h-full w-2.5" style={HATCH} />
      </span>
    );
  }
  return (
    <span className="flex h-4 w-8 items-center gap-1">
      <span className="text-[9px] leading-none text-foreground/70">◀</span>
      <span className="h-0 flex-1 border-t border-dashed border-foreground/45" />
    </span>
  );
}
