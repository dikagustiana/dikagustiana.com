/** The preview's standing label: SYNTHETIC figures are on screen (constraint 3). */
import { FlaskConical } from 'lucide-react';
import { COPY } from '@/lib/finance-in-action/copy';

export function SyntheticBanner({ text = COPY.syntheticBanner }: { text?: string }) {
  return (
    <div role="note" className="mb-6 flex items-start gap-3 rounded-md border border-dashed border-foreground/40 bg-muted/60 px-4 py-3 text-sm text-foreground">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

export function SyntheticBadge() {
  return (
    <span className="inline-flex items-center rounded border border-dashed border-foreground/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
      {COPY.syntheticBadge}
    </span>
  );
}
