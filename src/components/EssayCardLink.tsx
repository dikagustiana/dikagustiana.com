/**
 * EssayCardLink — the only way a listing should link to an essay.
 *
 * Wraps the canonical `essayUrl` builder and enforces the rule that made the
 * homepage 404: **if a canonical URL cannot be built, this renders a plain
 * wrapper instead of a link.** A card that goes nowhere is a visible bug; a
 * card that goes somewhere broken is an invisible one, and the invisible kind
 * shipped.
 */

import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { essayUrl, type EssayUrlInput } from '@/lib/essayUrl';

/** Row shapes vary by query; accept the union and normalise here. */
export interface EssayCardRow {
  slug: string;
  section?: string | null;
  phase?: string | null;
  finance_section?: string | null;
  fsli_slug?: string | null;
  topic?: string | null;
  finance_modules?: { slug: string; track_slug: string } | null;
}

function toInput(essay: EssayCardRow): EssayUrlInput {
  return {
    slug: essay.slug,
    section: essay.section,
    phase: essay.phase,
    track: essay.finance_modules?.track_slug ?? essay.finance_section ?? null,
    moduleSlug: essay.finance_modules?.slug ?? null,
    fsliSlug: essay.fsli_slug,
    topic: essay.topic,
  };
}

interface Props {
  essay: EssayCardRow;
  children: ReactNode;
  className?: string;
}

export function EssayCardLink({ essay, children, className }: Props) {
  const href = essayUrl(toInput(essay));

  if (!href) {
    // Not linkable. Render the content without an anchor and without the
    // pointer affordance, so it cannot look clickable and then fail.
    return <div className={className}>{children}</div>;
  }

  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}
