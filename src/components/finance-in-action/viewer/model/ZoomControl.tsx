/**
 * Zoom for the grid (sheet-first PRD R2.5): 70 to 150 per cent in steps of
 * ten, with − and + and the figure between them. It sizes only the grid,
 * and lives with the page: nothing is stored. Ctrl and the wheel stay the
 * browser's own; a phone's pinch is not blocked (the control is not shown
 * there, DESIGN §3).
 */
import { Minus, Plus } from 'lucide-react';
import { COPY } from '@/lib/finance-in-action/copy';
import { LIMITS } from '@/lib/finance-in-action/layout';

const BUTTON =
  'inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-muted-foreground disabled:hover:bg-transparent';

const clampZoom = (z: number): number => Math.max(LIMITS.zoomMin, Math.min(LIMITS.zoomMax, z));

export function ZoomControl({ zoom, onZoom }: { zoom: number; onZoom: (z: number) => void }) {
  return (
    <div role="group" aria-label={COPY.zoom} className="hidden items-center md:flex">
      <button type="button" className={BUTTON} aria-label={COPY.zoomOut} disabled={zoom <= LIMITS.zoomMin} onClick={() => onZoom(clampZoom(zoom - LIMITS.zoomStep))}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="w-12 text-center text-sm tabular-nums text-foreground">
        {zoom}%
      </output>
      <button type="button" className={BUTTON} aria-label={COPY.zoomIn} disabled={zoom >= LIMITS.zoomMax} onClick={() => onZoom(clampZoom(zoom + LIMITS.zoomStep))}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
