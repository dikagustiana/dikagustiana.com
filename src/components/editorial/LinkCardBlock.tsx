/**
 * LinkCardBlock — the rendered "Link preview" block.
 *
 * Deliberately NOT an iframe embed. `sanitizeHtml` forbids `iframe`, so an
 * iframe-based embed would render perfectly in the editor and be stripped on
 * publish — the silent-vanish failure this project keeps hitting. This card is
 * an anchor plus text, built from the URL alone with no server round trip, so
 * every tag and attribute it emits is already in the sanitizer's allowlist.
 */

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LinkCardData {
  url: string;
  title?: string | null;
  description?: string | null;
}

/** Hostname without `www.`, or the raw string when it will not parse. */
export function linkCardHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

interface LinkCardBlockProps {
  data: LinkCardData;
  className?: string;
  /** In the editor the card must not navigate when clicked. */
  isEditing?: boolean;
}

export function LinkCardBlock({ data, className, isEditing }: LinkCardBlockProps) {
  const { url, title, description } = data;
  if (!url) return null;

  const host = linkCardHost(url);
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <ExternalLink className="h-3.5 w-3.5" />
        {host}
      </span>
      <span className="link-card__title mt-1 block font-semibold leading-snug text-foreground">
        {title?.trim() || url}
      </span>
      {description?.trim() && (
        <span className="link-card__description mt-1 block text-sm leading-relaxed text-muted-foreground">
          {description}
        </span>
      )}
    </>
  );

  // `link-card` and its two element classes are the same names the node's
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
    <a href={url} target="_blank" rel="noopener noreferrer" className={shared}>
      {body}
    </a>
  );
}
