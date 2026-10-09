/**
 * Says when the owner's published models could not be read. In the preview
 * the fixtures still draw and the reason is written out; in production there
 * is no fixture to fall back on, so the note says which failure it was, in a
 * sentence and never a number (PRD "FSRE publish path" G8).
 */
import { COPY } from '@/lib/finance-in-action/copy';
import type { PublishedFailure, PublishedState } from '@/lib/finance-in-action/registryState';

export function PublishedNote({ state, failure, fixtures }: { state: PublishedState; failure: PublishedFailure | null; fixtures: boolean }) {
  if (state !== 'error' || !failure) return null;
  const text = fixtures
    ? `${COPY.publishedFailed} ${failure.detail}`
    : failure.reason === 'not-available'
      ? COPY.liveNotAvailable
      : failure.reason === 'refused'
        ? COPY.liveRefused
        : COPY.liveFailed;
  return (
    <p role="status" data-published-failure={failure.reason} className="mb-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
      {text}
    </p>
  );
}
