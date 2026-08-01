/**
 * EssayEditLink — the admin-only edit affordance beside an essay title.
 *
 * The 160 curriculum stubs are filled in gradually, so an admin browsing an
 * index needs a route into the editor from the title itself, not a detour
 * through /admin/content. Renders nothing for everyone else — the affordance
 * must not exist for non-admins, not merely be disabled.
 *
 * Rendered as a sibling of the title's own link, never inside it: nested
 * anchors are invalid HTML and browsers split them unpredictably.
 */

import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface EssayEditLinkProps {
  slug: string;
  /** Writer section segment; every current essay is `finance`. */
  section?: string;
  className?: string;
}

export function essayEditorUrl(slug: string, section = 'finance'): string {
  return `/admin/writer/${section}/${slug}`;
}

export function EssayEditLink({ slug, section = 'finance', className }: EssayEditLinkProps) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  return (
    <Link
      to={essayEditorUrl(slug, section)}
      aria-label={`Edit ${slug}`}
      title="Edit essay"
      onClick={e => e.stopPropagation()}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground/70',
        'hover:bg-secondary hover:text-foreground transition-colors',
        className,
      )}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Link>
  );
}
