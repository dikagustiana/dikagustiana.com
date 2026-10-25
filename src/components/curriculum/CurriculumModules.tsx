/**
 * The track-index pieces shared by every syllabus page: the header, the
 * collapsible module row, and the essay row inside it.
 *
 * Lifted out of FinanceTrackIndex unchanged, so a Finance track renders
 * exactly as it did; Foundations of Knowing uses the same pieces with its ten
 * parts in place of modules. Everything a section owns arrives through props:
 * the number label, the essay's addresses, and the optional thesis line.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { CURRICULUM_CONTRACT } from '@/data/curriculumContract';
import { cn } from '@/lib/utils';
import { EssayEditLink, essayEditorUrl } from '@/components/EssayEditLink';

/* ─── Essay title split helper ─── */
function splitTitle(title: string) {
  const colonIdx = title.indexOf(':');
  if (colonIdx === -1) return { line1: title, line2: null };
  return {
    line1: title.slice(0, colonIdx).trim(),
    line2: title.slice(colonIdx + 1).trim(),
  };
}

/** One essay row's data, with its public address already resolved by the section. */
export interface CurriculumEssay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  published: boolean;
  read_time: string | null;
  /** The essay's public page, followed only once it is published (null: it has none). */
  href: string | null;
}

/* ─── Header ─── */
export function CurriculumHeader({
  title,
  description,
  summary,
}: {
  title: string;
  description?: string | null;
  summary: string;
}) {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
        {title}
      </h1>
      {description && (
        <p className="text-lg text-muted-foreground mb-4">{description}</p>
      )}
      {/* The counts come from the rows, not from the seed files: a
          planned inventory and a published count are different numbers
          and must never share a denominator. */}
      <div className="text-sm text-muted-foreground mb-8">
        <p>{summary}</p>
        <p className="mt-2 max-w-2xl leading-relaxed">{CURRICULUM_CONTRACT.note}</p>
      </div>
    </>
  );
}

/* ─── Essay row ─── */
export const CurriculumEssayRow = React.memo(function CurriculumEssayRow({
  essay,
  isAdmin,
  editSection,
}: {
  essay: CurriculumEssay;
  isAdmin: boolean;
  /** The writer's section for the edit link; EssayEditLink defaults to finance. */
  editSection?: string;
}) {
  const { line1, line2 } = splitTitle(essay.title);
  const isPublished = essay.published;

  // Everyone now sees every row (essay_structure), but only two kinds may be
  // interactive: a published essay links to its page for everyone, and a
  // draft links to the EDITOR for admins only — a draft's public page is an
  // empty shell not worth landing on. For readers a draft is INERT: no
  // anchor at all, because a title that looks clickable and does nothing (or
  // 404s) reads as broken — this exact failure shipped twice before.
  const titleTo = isPublished ? essay.href : isAdmin ? essayEditorUrl(essay.slug, editSection) : null;

  const title = (
    <>
      <p className="text-base font-semibold leading-snug">{line1}</p>
      {line2 && <p className="text-base leading-snug mt-0.5">{line2}</p>}
    </>
  );

  return (
    <div className="py-5 pl-[3.5rem] flex items-start gap-2">
      <div className="min-w-0 flex-1">
        {titleTo ? (
          <Link to={titleTo} className="block text-foreground hover:text-primary transition-colors">
            {title}
          </Link>
        ) : (
          // A real <div>, not a disabled link: nothing to click, focus, or
          // activate. Muted, so the eye reads "planned", not "broken".
          <div className="cursor-default text-muted-foreground">{title}</div>
        )}
        {essay.snippet && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{essay.snippet}</p>
        )}
        {/* Status and author from the row. "Planned" replaced "Coming soon":
            the second is a delivery promise, and 159 of these rows were making
            it. Published rows keep their byline and read time exactly as
            before. */}
        <p className="text-xs text-muted-foreground mt-2">
          {isPublished ? 'Published' : CURRICULUM_CONTRACT.plannedLabel}
          {essay.author ? ` · ${essay.author}` : ''}
          {essay.read_time ? ` · ${essay.read_time}` : ''}
        </p>
      </div>
      <EssayEditLink slug={essay.slug} section={editSection} className="mt-0.5" />
    </div>
  );
});

/* ─── Collapsible module row ─── */
export const CollapsibleModuleRow = React.memo(function CollapsibleModuleRow({
  number,
  title,
  thesis,
  anchorId,
  essays,
  counts,
  isOpen,
  onToggle,
  isAdmin,
  editSection,
}: {
  /** The display number, already padded ("01", "00"). */
  number: string;
  title: string;
  /** One line under the title; Finance tracks pass none. */
  thesis?: string | null;
  /** An id on the row, for a page that opens and scrolls to it. */
  anchorId?: string;
  essays: CurriculumEssay[];
  counts: { published: number; total: number };
  isOpen: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  editSection?: string;
}) {
  return (
    <div id={anchorId} className={anchorId ? 'scroll-mt-20' : undefined}>
      <button
        onClick={onToggle}
        className={
          thesis
            ? 'w-full grid grid-cols-[3rem_1fr_auto_1.5rem] items-baseline gap-x-4 gap-y-1 py-5 group hover:bg-muted/30 transition-colors -mx-3 px-3 rounded text-left'
            : 'w-full grid grid-cols-[3rem_1fr_auto_1.5rem] items-baseline gap-4 py-5 group hover:bg-muted/30 transition-colors -mx-3 px-3 rounded text-left'
        }
      >
        <span className="text-sm font-mono text-muted-foreground tabular-nums">
          {number}
        </span>
        <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
          {title}
        </span>
        {/* "n of N published" — N is now DERIVED from essay_structure, which
            every identity can count in full. The count keeps its place beside
            a collapsed module: at rest it is the only signal of the module's
            size and progress; the titles it summarises appear only on
            expansion. */}
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {counts.total > 0
            ? `${counts.published} of ${counts.total} published`
            : `${counts.published} published`}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
        {/* The thesis takes the row's second line: under the title alone
            from sm up, kept to one line; on a phone, where the title column
            is narrow, across the count and chevron too, so it reads whole. */}
        {thesis && (
          <span className="col-start-2 col-span-3 line-clamp-2 text-sm text-muted-foreground sm:col-span-1 sm:col-start-2 sm:line-clamp-1">
            {thesis}
          </span>
        )}
      </button>

      {isOpen && essays.length > 0 && (
        <div className="divide-y divide-border/30">
          {essays.map((essay) => (
            <CurriculumEssayRow key={essay.id} essay={essay} isAdmin={isAdmin} editSection={editSection} />
          ))}
        </div>
      )}
      {/* Every planned lesson now has a visible row, so an empty expansion
          means the module genuinely has no lessons assigned — say that, in
          one quiet line sized like the absence it announces. */}
      {isOpen && essays.length === 0 && (
        <p className="px-4 pb-4 pl-14 text-sm italic text-muted-foreground/80 sm:pl-16">
          No lessons assigned to this module yet.
        </p>
      )}
    </div>
  );
});
