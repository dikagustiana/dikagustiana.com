/**
 * ArticleShell — The single canonical essay layout.
 *
 * Every essay page (Next Big Thing, Green Transition, Finance) wraps its
 * content in this shell.  It provides:
 *  - Header / Footer
 *  - Reading progress bar (subtle, below header)
 *  - Font-size toggle
 *  - Constrained content column (max-w-3xl) for optimal reading
 *  - Vertical rhythm via consistent padding
 *
 * This component replaces per-section layouts.
 */

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ReadingProgress } from './ReadingProgress';
import { FontSizeToggle, useFontSize } from './FontSizeToggle';
import { ArticleHeader } from './ArticleHeader';
import { ArticleToc } from './ArticleToc';
import { ArticleBody } from './ArticleBody';
import { KeyTakeaways } from './KeyTakeaways';
import { References } from './References';
import { AuthorBox } from './AuthorBox';
import { EssayNavigation } from './EssayNavigation';
import { RelatedEssays } from './RelatedEssays';
import { SEO } from '@/components/SEO';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArticleShellProps {
  /** SEO */
  seoTitle: string;
  seoDescription?: string;
  seoAuthor?: string;

  /** Back navigation */
  backLink: { label: string; path: string };

  /** Article header */
  title: string;
  deck?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  readTime?: string | null;
  topic?: string | null;
  heroImage?: string | null;
  heroCaption?: string | null;

  /** Content (TipTap JSON string or legacy HTML) */
  content: string;
  /** Pre-rendered HTML for TOC extraction (optional, avoids double-conversion) */
  htmlContent?: string;

  /** End matter */
  keyTakeaways?: string[];
  references?: (string | { label: string; url?: string })[];
  authorBio?: string | null;

  /** Prev/Next navigation */
  previous?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
  getEssayUrl?: (slug: string) => string;

  /** Related essays */
  currentEssayId?: string;
  section?: string;

  /** Extra content before the body (rare) */
  children?: ReactNode;

  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArticleShell({
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
  topic,
  heroImage,
  heroCaption,
  content,
  htmlContent,
  keyTakeaways,
  references,
  authorBio,
  previous,
  next,
  getEssayUrl,
  currentEssayId,
  section,
  children,
  className,
}: ArticleShellProps) {
  const { fontSize, changeFontSize, fontSizeClass } = useFontSize();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip link: ArticleShell renders its own chrome (it does not use
          PageLayout), and the longest pages on the site had no way past the
          header for keyboard users. */}
      <a
        href="#article-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Header />
      <ReadingProgress />

      <main id="article-content" tabIndex={-1} className="flex-1 outline-none">
        {/* Reader controls bar */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="container max-w-3xl lg:max-w-[64rem] py-2 flex justify-end">
            <FontSizeToggle fontSize={fontSize} onChange={changeFontSize} />
          </div>
        </div>

        {/* Article content column. Below lg: the single centred column it has
            always been. At lg:+ a two-column grid — reading column plus a
            sticky table-of-contents rail. 48rem + 3rem gap + 13rem = 64rem,
            so the reading column keeps its max-w-3xl measure. */}
        <div className={cn('container py-8 md:py-12', className)}>
          <div className="mx-auto max-w-3xl lg:max-w-[64rem] lg:grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12">
            <div className={cn('min-w-0', fontSizeClass)}>
            <SEO
              title={seoTitle}
              description={seoDescription}
              type="article"
              author={seoAuthor || author || 'Dika Gustiana'}
            />

            {/* Back link */}
            <Link
              to={backLink.path}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLink.label}
            </Link>

            {/* Header block */}
            <ArticleHeader
              title={title}
              deck={deck}
              author={author}
              publishedAt={publishedAt}
              updatedAt={updatedAt}
              createdAt={createdAt}
              readTime={readTime}
              topic={topic}
              heroImage={heroImage}
              heroCaption={heroCaption}
            />

            {/* Table of contents — inline collapsible below lg: only; the
                sticky sidebar takes over at lg:+ */}
            <ArticleToc className="lg:hidden" content={htmlContent || content} />

            {/* Optional extra content before body */}
            {children}

            {/* Article body */}
            <ArticleBody
              content={content}
              fontSizeClass={fontSizeClass}
            />

            {/* End matter */}
            {keyTakeaways && keyTakeaways.length > 0 && (
              <KeyTakeaways takeaways={keyTakeaways} />
            )}

            {references && references.length > 0 && (
              <References references={references} />
            )}

            {author && (
              <AuthorBox name={author} bio={authorBio} />
            )}

            {/* Prev/Next navigation */}
            {getEssayUrl && (
              <EssayNavigation
                backLink={backLink}
                previous={previous}
                next={next}
                getEssayUrl={getEssayUrl}
              />
            )}

            {/* Related essays */}
            {currentEssayId && section && (
              <RelatedEssays
                currentEssayId={currentEssayId}
                section={section}
              />
            )}
            </div>

            {/* Sticky ToC rail, lg:+ only. top-32 clears the fixed header
                (4rem) and the sticky reader-controls bar. The list inside
                caps its own height and scrolls internally. */}
            <aside className="hidden lg:block">
              <div className="sticky top-32">
                <ArticleToc variant="sidebar" content={htmlContent || content} />
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
