/**
 * ColorGridPopover — the ONE palette component behind both the Text colour
 * and Highlight toolbar buttons.
 *
 * Structure replicated from the original: a "None" reset row, a 10×6 grid of
 * 60 swatches, then a THEME section of 2. The two buttons differ only in
 * which textStyle attribute they write (`color` vs `backgroundColor`) — two
 * near-identical palettes is the duplication this project keeps paying for,
 * so there is exactly one.
 *
 * Row one is the measured base row; rows 2–6 are computed tints (75/50/25%
 * toward white) and shades (25/50% toward black) of each base column, the
 * standard document-editor palette shape.
 */

import { useMemo } from 'react';
import { Ban } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** The measured base row, left to right. */
const BASE_ROW = [
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00',
  '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
] as const;

/**
 * THEME swatches: the body ink and the editorial accent. Values mirror the
 * --prose-fg / --accent-editorial tokens in src/index.css — marks must store
 * concrete colours, so the hex lives here and the token comment ties them.
 */
const THEME_SWATCHES: ReadonlyArray<{ value: string; label: string }> = [
  { value: '#363737', label: 'Body ink' },
  { value: '#ff6719', label: 'Accent' },
];

function mix(hex: string, target: 0 | 255, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (target - c) * amount);
  };
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(channel(16))}${toHex(channel(8))}${toHex(channel(0))}`;
}

function buildGrid(): string[][] {
  const rows: string[][] = [[...BASE_ROW]];
  for (const amount of [0.75, 0.5, 0.25]) {
    rows.push(BASE_ROW.map(c => mix(c, 255, amount)));
  }
  for (const amount of [0.25, 0.5]) {
    rows.push(BASE_ROW.map(c => mix(c, 0, amount)));
  }
  // Reorder: base row first, then light 3 → light 1, then dark 1 → dark 2 —
  // rows[1] is the lightest, so the visual gradient runs light-to-dark.
  return [rows[0], rows[1], rows[2], rows[3], rows[4], rows[5]];
}

interface ColorGridPopoverProps {
  /** The button that opens the palette. */
  trigger: React.ReactNode;
  /** Currently applied value, for the selected ring; null when none. */
  active: string | null;
  /** Apply a swatch. */
  onPick: (hex: string) => void;
  /** The "None" row — clear the mark attribute. */
  onClear: () => void;
  /** Accessible name for the palette ("Text colour" / "Highlight"). */
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColorGridPopover({
  trigger,
  active,
  onPick,
  onClear,
  label,
  open,
  onOpenChange,
}: ColorGridPopoverProps) {
  const grid = useMemo(buildGrid, []);
  const normalizedActive = active?.toLowerCase() ?? null;

  const swatch = (hex: string, key: string, title?: string) => (
    <button
      key={key}
      type="button"
      title={title ?? hex}
      aria-label={title ?? hex}
      onClick={() => {
        onPick(hex);
        onOpenChange(false);
      }}
      className={cn(
        'h-5 w-5 rounded-sm border border-black/10',
        normalizedActive === hex.toLowerCase() &&
          'ring-2 ring-accent-editorial ring-offset-1',
      )}
      style={{ backgroundColor: hex }}
    />
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start" aria-label={label}>
        <button
          type="button"
          onClick={() => {
            onClear();
            onOpenChange(false);
          }}
          className="mb-2 flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm text-foreground hover:bg-secondary"
        >
          <Ban className="h-3.5 w-3.5 text-muted-foreground" />
          None
        </button>

        <div className="grid grid-cols-10 gap-1" role="listbox" aria-label={`${label} swatches`}>
          {grid.map((row, r) => row.map((hex, c) => swatch(hex, `r${r}c${c}`)))}
        </div>

        <div className="mt-2 border-t border-border pt-2">
          <div className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Theme
          </div>
          <div className="flex gap-1">
            {THEME_SWATCHES.map(s => swatch(s.value, s.label, s.label))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
