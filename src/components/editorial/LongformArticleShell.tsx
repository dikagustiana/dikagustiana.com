/**
 * LongformArticleShell — Noahpinion-style longform reading layout.
 *
 * Used exclusively for finance-in-motion essays. Other tracks use ArticleShell.
 * Single-column, wide paragraphs, minimal chrome, intellectual essay feel.
 */

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Clock } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ReadingProgress } from './ReadingProgress';
import { ArticleToc } from './ArticleToc';
import { ArticleBody } from './ArticleBody';
import { BriefToggle, type EssayView } from './BriefToggle';
import { parseBriefDoc, isEmptyBrief } from '@/lib/brief';
import { contentToHtml } from '@/lib/tiptap/serialize';
import { KeyTakeaways } from './KeyTakeaways';
import { References } from './References';
import { AuthorBox } from './AuthorBox';
import { EssayNavigation } from './EssayNavigation';
import { RelatedEssays } from './RelatedEssays';
import { SEO } from '@/components/SEO';

export interface LongformArticleShellProps {
  seoTitle: string;
  seoDescription?: string;
  seoAuthor?: string;
  backLink: { label: string; path: string };
  title: string;
  deck?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  readTime?: string | null;
  heroImage?: string | null;
  heroCaption?: string | null;
  content: string;
  /** Pre-rendered HTML for TOC extraction (optional, avoids double-conversion) */
  htmlContent?: string;
  /** The essay's optional Brief companion — see ArticleShell's prop of the same name. */
  brief?: unknown;
  keyTakeaways?: string[];
  references?: (string | { label: string; url?: string })[];
  authorBio?: string | null;
  previous?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
  getEssayUrl?: (slug: string) => string;
  currentEssayId?: string;
  section?: string;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function LongformArticleShell({
  seoTitle,
  seoDescription,
  seoAuthor,
  backLink,
  title,
  deck,
  author,
  publishedAt,
  updatedAt,
  createdAt,
  readTime,
  heroImage,
  heroCaption,
  content,
  htmlContent,
  brief,
  keyTakeaways,
  references,
  authorBio,
  previous,
  next,
  getEssayUrl,
  currentEssayId,
  section,
}: LongformArticleShellProps) {
  const showUpdated = useMemo(() => {
    if (!updatedAt || !createdAt) return false;
    const diffDays =
      (new Date(updatedAt).getTime() - new Date(createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    return diffDays >= 7;
  }, [updatedAt, createdAt]);

  // ToC heading extraction parses HTML; the body may be stored as TipTap JSON.
  const tocHtml = useMemo(() => contentToHtml(content), [content]);

  // Brief view — same rules as ArticleShell: toggle only when a real Brief
  // exists, Full the default, reset on essay change.
  const briefContent = useMemo(() => {
    const doc = parseBriefDoc(brief);
    return doc && !isEmptyBrief(doc) ? JSON.stringify(doc) : null;
  }, [brief]);
  const [view, setView] = useState<EssayView>('full');
  useEffect(() => {
    setView('full');
  }, [content]);
  const showBrief = view === 'brief' && briefContent != null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <ReadingProgress />

      <main className="flex-1">
        {/* Below lg: the single centred longform column. At lg:+ a two-column
            grid — reading column plus a sticky table-of-contents rail.
            justify-center keeps the pair centred when the viewport is wider
            than the tracks. */}
        <div className="mx-auto max-w-[780px] lg:max-w-none lg:grid lg:grid-cols-[minmax(0,48rem)_13rem] lg:justify-center lg:gap-12 lg:px-8">
          <article className="min-w-0 px-6 lg:px-0 py-16 space-y-8">
          <SEO
            title={seoTitle}
            description={seoDescription}
            type="article"
            author={seoAuthor || author || 'Dika Gustiana'}
          />

          {/* Back link */}
          <Link
            to={backLink.path}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLink.label}
          </Link>

          {/* ── Title section ── */}
          <header className="space-y-4">
            <h1 className="text-5xl font-black leading-tight text-foreground">
              {title}
            </h1>

            {deck && (
              <p className="text-xl text-muted-foreground font-medium">
                {deck}
              </p>
            )}

            {/* Metadata line */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {author && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {author}
                </span>
              )}
              {publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(publishedAt)}
                </span>
              )}
              {readTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {readTime}
                </span>
              )}
              {showUpdated && updatedAt && (
                <span className="text-xs italic">
                  Updated {formatDate(updatedAt)}
                </span>
              )}
            </div>
          </header>

          {/* Hero image */}
          {heroImage && (
            <figure>
              <img
                src={heroImage}
                alt={title}
                loading="lazy"
                className="w-full rounded-lg"
              />
              {heroCaption && (
                <figcaption className="text-sm text-muted-foreground mt-3 text-center italic">
                  {heroCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* `Full · Brief` — only when a Brief exists, near the title. */}
          {briefContent != null && <BriefToggle view={view} onChange={setView} />}

          {/* Table of contents — inline collapsible below lg: only; the
              sticky sidebar takes over at lg:+. htmlContent is the caller's
              precomputed HTML; tocHtml is the internal fallback so heading
              extraction works even when only TipTap JSON was passed.
              Hidden in the Brief view — it navigates headings the Brief
              does not have. */}
          {!showBrief && <ArticleToc className="lg:hidden" content={htmlContent || tocHtml} />}

          {/* ── Body — the one thing the toggle switches. ── */}
          <div className="longform-body">
            <ArticleBody content={showBrief ? briefContent : content} />
          </div>

          {/* End matter */}
          {keyTakeaways && keyTakeaways.length > 0 && (
            <KeyTakeaways takeaways={keyTakeaways} />
          )}

          {references && references.length > 0 && (
            <References references={references} />
          )}

          {author && <AuthorBox name={author} bio={authorBio} />}

          {getEssayUrl && (
            <EssayNavigation
              backLink={backLink}
              previous={previous}
              next={next}
              getEssayUrl={getEssayUrl}
            />
          )}

          {currentEssayId && section && (
            <RelatedEssays currentEssayId={currentEssayId} section={section} />
          )}
          </article>

          {/* Sticky ToC rail, lg:+ only. top-24 clears the fixed header and
              the reading-progress bar; the list caps its own height and
              scrolls internally. Hidden in the Brief view. */}
          <aside className="hidden lg:block py-16">
            {!showBrief && (
              <div className="sticky top-24">
                <ArticleToc variant="sidebar" content={htmlContent || tocHtml} />
              </div>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
