/**
 * LinkCardBlock — the rendered "Link preview" block.
 *
 * Deliberately NOT an iframe embed. `sanitizeHtml` forbids `iframe`, so an
 * iframe-based embed would render perfectly in the editor and be stripped on
 * publish — the silent-vanish failure this project keeps hitting. This card is
 * an anchor plus text. Its fields are a snapshot stored with the essay: typed
 * by the author, or resolved server-side when the author pasted the URL (see
 * linkCard.ts). Rendering it makes no request of any kind, and every tag and
 * attribute it emits is already in the sanitizer's allowlist.
 */

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fullDate } from '@/lib/formatDate';
import { linkCardDisplay, normalizeLinkCard, type LinkCardData } from '@/lib/tiptap/linkCardData';

// The record and its helpers live in src/lib/tiptap/linkCardData.ts; the type
// is re-exported for the components that have always imported it from here.
export type { LinkCardData } from '@/lib/tiptap/linkCardData';

interface LinkCardBlockProps {
  data: LinkCardData;
  className?: string;
  /** In the editor the card must not navigate when clicked. */
  isEditing?: boolean;
}

export function LinkCardBlock({ data, className, isEditing }: LinkCardBlockProps) {
  const card = normalizeLinkCard(data);
  if (!card.url) return null;

  const view = linkCardDisplay(card);
  const body = (
    <>
      <span className="link-card__source flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <ExternalLink className="h-3.5 w-3.5" />
        {view.source}
      </span>
      <span className="link-card__title mt-1 block font-semibold leading-snug text-foreground">
        {view.title}
      </span>
      {view.description && (
        <span className="link-card__description mt-1 block text-sm leading-relaxed text-muted-foreground">
          {view.description}
        </span>
      )}
      {(view.author || view.date) && (
        <span className="mt-2 block text-xs text-muted-foreground">
          {view.author && <span className="link-card__author font-medium">{view.author}</span>}
          {view.author && view.date && ' · '}
          {view.date && <span className="link-card__date">{view.date}</span>}
        </span>
      )}
      {/* The snapshot's age, for the author only. A reader sees the source's
          own date above, never when this site last looked at it. */}
      {isEditing && card.resolvedAt && (
        <span className="mt-2 block text-[11px] text-muted-foreground/80">
          Details fetched {fullDate(card.resolvedAt)}
        </span>
      )}
    </>
  );

  // `link-card` and its element classes are the same names the node's
  // `renderHTML` emits, so the block is identifiable by one selector in the
  // editor and in published HTML alike. They diverged once, and the cost was
  // an hour spent believing insertion had failed when only the class was
  // missing from the editing branch.
  const shared = cn(
    'link-card my-8 block rounded-lg border border-border bg-card p-4 no-underline transition-colors',
    !isEditing && 'hover:border-primary/50 hover:bg-muted/40',
    className,
  );

  if (isEditing) {
    return <span className={shared}>{body}</span>;
  }

  return (
    <a href={card.url} target="_blank" rel="noopener noreferrer" className={shared}>
      {body}
    </a>
  );
}
