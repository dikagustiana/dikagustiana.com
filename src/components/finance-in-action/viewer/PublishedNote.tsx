/** Says when the owner's published models could not be read; the preview still draws. */
import { COPY } from '@/lib/finance-in-action/copy';
import type { PublishedState } from '@/lib/finance-in-action/usePreviewRegistry';

export function PublishedNote({ state, error }: { state: PublishedState; error: string | null }) {
  if (state !== 'error') return null;
  return (
    <p role="status" className="mb-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
      {COPY.publishedFailed} {error}
    </p>
  );
}
