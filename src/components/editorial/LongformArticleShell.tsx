/**
 * LongformArticleShell — Noahpinion-style longform reading layout.
 *
 * Used exclusively for finance-in-motion essays. Other tracks use ArticleShell.
 * Single-column, wide paragraphs, minimal chrome, intellectual essay feel.
 */

import { ReactNode, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Clock } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ReadingProgress } from './ReadingProgress';
import { ArticleToc } from './ArticleToc';
import { ArticleBody } from './ArticleBody';
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <ReadingProgress />

      <main className="flex-1">
        {/* Two columns at lg: the reading column keeps its 780px measure, the
            ToC sits in a sticky aside beside it. Below lg the aside does not
            exist — a sidebar with no breakpoint would push the page past
            375px, which is the horizontal scroll GATE 3 just eliminated. */}
        <div className="mx-auto max-w-[780px] px-6 py-16 lg:grid lg:max-w-[1040px] lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12 lg:px-8">
        <article className="min-w-0 max-w-[780px] space-y-8">
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

          {/* Inline collapsible ToC for viewports without the sidebar */}
          <ArticleToc content={tocHtml} className="lg:hidden" />

          {/* ── Body ── */}
          <div className="longform-body">
            <ArticleBody content={content} />
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

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <ArticleToc content={tocHtml} variant="sidebar" />
          </div>
        </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
