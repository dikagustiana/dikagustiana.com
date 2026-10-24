/**
 * The access badge (Free / Buy), as /admin/books lists it. The shelf's cards it was made for became spines
 * (library phase 2, Spine.tsx).
 */
import type { Book } from '@/hooks/queries/useBooks';
import { accessLabel } from '@/lib/books';
import { cn } from '@/lib/utils';

export function AccessBadge({ access, className }: { access: Book['access']; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-sm border border-border px-1.5 py-0.5 font-mono text-[11px] uppercase leading-none',
        access === 'free' ? 'text-foreground' : 'text-muted-foreground',
        className,
      )}
    >
      {accessLabel(access)}
    </span>
  );
}
