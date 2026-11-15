/**
 * LongformArticleShell — Noahpinion-style longform reading layout.
 *
 * Used exclusively for finance-in-motion essays. Other tracks use ArticleShell.
 * Single-column, wide paragraphs, minimal chrome, intellectual essay feel.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ReadingProgress } from './ReadingProgress';
import { ArticleToc } from './ArticleToc';
import { ArticleBody } from './ArticleBody';
import { BriefToggle } from './BriefToggle';
import { LanguageToggle } from './LanguageToggle';
import { LangScope } from './LangScope';
import { useEssayLanguageView, type TranslationState } from './useEssayLanguageView';
import { contentToHtml } from '@/lib/tiptap/serialize';
import { citedIndexes, publicReferencesHtml } from '@/lib/editorial/referenceAnnotations';
import { KeyTakeaways } from './KeyTakeaways';
import { References } from './References';
import { AuthorBox } from './AuthorBox';
import { EssayNavigation } from './EssayNavigation';
import { RelatedEssays } from './RelatedEssays';
import { SEO } from '@/components/SEO';
import { essayShareImage } from '@/lib/shareImage.mjs';

export interface LongformArticleShellProps {
  seoTitle: string;
  seoDescription?: string;
  seoAuthor?: string;
  /** The essay's slug: names its build-time share card (src/lib/shareImage.mjs). */
  slug?: string;
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
  /** The essay's Indonesian version — see ArticleShell's prop of the same name. */
  translation?: TranslationState;
  keyTakeaways?: string[];
  references?: (string | { label: string; url?: string })[];
  /**
   * A reader, not an admin, on a page that hides reference annotations
   * (docs/prd/2026-10-fia-fixes item 10; the Finance essay page sets it): the
   * body's reference list and `references` lose their VERIFIED / UNAVAILABLE
   * / UNVERIFIED / MISNUMBERED notes. What is stored does not change.
   */
  hideReferenceAnnotations?: boolean;
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
  slug,
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
  content: storedContent,
  htmlContent: storedHtml,
  brief,
  translation,
  keyTakeaways,
  references,
  hideReferenceAnnotations = false,
  authorBio,
  previous,
  next,
  getEssayUrl,
  currentEssayId,
  section,
}: LongformArticleShellProps) {
  // Item 10: a reader's body and reference list carry no annotations; an admin's carry everything.
  const content = useMemo(() => (hideReferenceAnnotations ? publicReferencesHtml(storedContent) : storedContent), [storedContent, hideReferenceAnnotations]);
  const htmlContent = useMemo(() => (hideReferenceAnnotations && storedHtml ? publicReferencesHtml(storedHtml) : storedHtml), [storedHtml, hideReferenceAnnotations]);
  const showUpdated = useMemo(() => {
    if (!updatedAt || !createdAt) return false;
    const diffDays =
      (new Date(updatedAt).getTime() - new Date(createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    return diffDays >= 7;
  }, [updatedAt, createdAt]);

  // ToC heading extraction parses HTML; the body may be stored as TipTap JSON.
  const tocHtml = useMemo(() => contentToHtml(content), [content]);

  // Language × view — same rules as ArticleShell (useEssayLanguageView):
  // each toggle only when there is a choice, Full the default, reset on essay
  // change. htmlContent is the caller's precomputed HTML; tocHtml the
  // internal fallback so heading extraction works from TipTap JSON too.
  const englishFields = useMemo(
    () => ({ title, seoTitle, seoDescription, deck, keyTakeaways, heroCaption, readTime }),
    [title, seoTitle, seoDescription, deck, keyTakeaways, heroCaption, readTime],
  );
  const englishToc = useMemo(() => htmlContent || tocHtml, [htmlContent, tocHtml]);
  const lv = useEssayLanguageView({ content, tocHtml: englishToc, brief, english: englishFields, translation });
  const f = lv.fields;
  const showBrief = lv.isBrief;
  const cited = useMemo(() => citedIndexes(lv.lang === 'id' ? lv.tocHtml : content), [lv.lang, lv.tocHtml, content]);

  if (lv.pending) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1" aria-busy="true" />
        <Footer />
      </div>
    );
  }

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
            title={f.seoTitle}
            description={f.seoDescription}
            type="article"
            author={seoAuthor || author || 'Dika Gustiana'}
            // The og:image the prerender wrote into this page's raw HTML
            // (hero, else the essay's card), from the same formula.
            image={slug ? essayShareImage({ slug, thumbnail_url: heroImage, updated_at: updatedAt }).url : undefined}
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
            {/* .editorial-title, the class ArticleShell and the writer's title
                input share; this shell used text-5xl font-black, a third
                title spec for the same kind of page. */}
            <h1 lang={lv.lang} className="editorial-title">
              {f.title}
            </h1>

            {f.deck && (
              <p lang={lv.lang} className="text-xl text-muted-foreground font-medium">
                {f.deck}
              </p>
            )}

            {/* Metadata line */}
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {(author || publishedAt || f.readTime) && (
                <span>
                  {author && <span className="font-medium text-foreground">{author}</span>}
                  {author && (publishedAt || f.readTime) && ' · '}
                  {[publishedAt && formatDate(publishedAt), f.readTime].filter(Boolean).join(' · ')}
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
                alt={f.title}
                loading="lazy"
                className="w-full rounded-lg"
              />
              {f.heroCaption && (
                <figcaption lang={lv.lang} className="text-sm text-muted-foreground mt-3 text-center italic">
                  {f.heroCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* `Full · Brief` and `EN · ID` — each only when there is a choice, near the title. */}
          {lv.showLanguageToggle ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {lv.showViewToggle && <BriefToggle view={lv.selection.view} onChange={lv.setView} />}
              <LanguageToggle language={lv.selection.language} onChange={lv.setLanguage} />
            </div>
          ) : (
            // English only: the markup the Brief toggle always had.
            lv.showViewToggle && <BriefToggle view={lv.selection.view} onChange={lv.setView} />
          )}

          {/* Table of contents — inline collapsible below lg: only; the
              sticky sidebar takes over at lg:+. htmlContent is the caller's
              precomputed HTML; tocHtml is the internal fallback so heading
              extraction works even when only TipTap JSON was passed.
              Hidden in the Brief view — it navigates headings the Brief
              does not have. */}
          {!showBrief && <ArticleToc className="lg:hidden" content={lv.tocHtml} />}

          {/* ── Body — the one thing the toggles switch. ── */}
          <div lang={lv.lang} className="longform-body">
            <ArticleBody content={lv.body} />
          </div>

          {/* End matter */}
          {f.keyTakeaways && f.keyTakeaways.length > 0 && (
            <LangScope lang={lv.lang}>
              <KeyTakeaways takeaways={f.keyTakeaways} />
            </LangScope>
          )}

          {references && references.length > 0 && (
            <References references={references} hideAnnotations={hideReferenceAnnotations} citedIndexes={cited} />
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
                <ArticleToc variant="sidebar" content={lv.tocHtml} />
              </div>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
