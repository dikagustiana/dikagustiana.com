/**
 * BriefToggle — `Full · Brief`, the switch between an essay's two views.
 *
 * Rendered ONLY when a Brief exists (the caller guards; there is no
 * placeholder, no disabled state, no empty panel — the hypotheticalModel
 * lesson). Full is the default view: this site is a credibility instrument
 * and the long work is the evidence; the Brief is an exit for readers
 * without 26 minutes, not the front door. One essay, one URL — the view is
 * client state, never a second address.
 */

import { cn } from '@/lib/utils';

export type EssayView = 'full' | 'brief';

interface BriefToggleProps {
  view: EssayView;
  onChange: (view: EssayView) => void;
  className?: string;
}

export function BriefToggle({ view, onChange, className }: BriefToggleProps) {
  const item = (value: EssayView, label: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => onChange(value)}
      className={cn(
        'rounded-sm px-1 py-0.5 transition-colors',
        view === value
          ? 'font-semibold text-foreground underline decoration-2 underline-offset-[6px]'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      role="group"
      aria-label="Essay view"
      data-testid="essay-view-toggle"
      className={cn('flex items-center gap-1.5 text-sm', className)}
    >
      {item('full', 'Full')}
      <span aria-hidden className="text-muted-foreground/60">
        ·
      </span>
      {item('brief', 'Brief')}
    </div>
  );
}
