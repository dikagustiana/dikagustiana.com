import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { FsliRelatedItems } from '@/components/fsli/FsliRelatedItems';
import { FsliOnThisPage } from '@/components/fsli/FsliOnThisPage';
import { FsliMobileSidebar } from '@/components/fsli/FsliMobileSidebar';
import { FsliCoveredBy } from '@/components/fsli/FsliCoveredBy';
import { useFsliPage } from '@/hooks/queries/useFsliPages';
import { useFsliEssayBodies } from '@/hooks/queries/useEssays';
import { useAuth } from '@/contexts/AuthContext';
import NotFound from './NotFound';
import { ArticleBody } from '@/components/editorial/ArticleBody';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/states';
import { buildFsliToc, fsliTocIds } from '@/lib/fsliToc';
import { RefreshCw, ChevronRight, Pencil } from 'lucide-react';

// There is no fixed outline any more. The page used to lay out ten
// subsections (Definition … Implementation Steps) whose prose lived in
// fsli_sections, which holds no written row, so every line item showed ten
// "Not written yet." lines before the essay that does exist. The essay
// linked to the line item is now the page body, and "On this page" lists
// its own headings (owner decision D1(a), October 2026 site sweep).

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function FsliDetail() {
  const { slug } = useParams<{ slug: string }>();
  // The heading the scroll-spy last found active, and the line item it found
  // it on. FsliDetail stays mounted from one /accounting/fsli/:slug to the
  // next, so a highlight from the previous page must not land on a heading
  // here that shares its id (two essays that both open with "Overview").
  const [spied, setSpied] = useState<{ slug?: string; id: string }>({ id: '' });
  const activeSection = spied.slug === slug ? spied.id : '';
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: item, isLoading, error } = useFsliPage(slug || '');
  // Published essays linked to this line item, bodies included — the read
  // side of the FSLI authoring path (written in the studio, published here).
  // They ARE the page body.
  const {
    data: linkedEssays,
    isLoading: essaysLoading,
    isError: essaysError,
    refetch: refetchEssays,
  } = useFsliEssayBodies(slug || '');
  // A failed read is not "no essay": read as zero rows, an outage removed the
  // body and could put the covered-by sentence in its place. Rows from an
  // earlier read, if there are any, still stand.
  const essaysFailed = essaysError && !linkedEssays;
  const essays = useMemo(() => linkedEssays ?? [], [linkedEssays]);

  // "On this page": the essay's h2/h3 headings. The ids are minted here, for
  // the whole page, and handed to each ArticleBody so the body renders them.
  const toc = useMemo(() => buildFsliToc(essays.map((essay) => essay.content)), [essays]);
  const tocIds = useMemo(() => fsliTocIds(toc.entries), [toc]);

  // Track the active heading on scroll — rAF-coalesced so the
  // getBoundingClientRect reads happen once per frame, not once per event.
  // Active is the last heading that has passed the line under the header: a
  // heading is one line tall, so the old "the line falls inside it" test,
  // written for whole sections, would almost never hold.
  useEffect(() => {
    if (tocIds.length === 0) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      let current = '';
      for (const id of tocIds) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= 150) current = id;
      }
      setSpied((prev) => (prev.slug === slug && prev.id === current ? prev : { slug, id: current }));
    };
    const handleScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    // Once now as well: the page can open part-way down (a #heading link, a
    // restored scroll position), and nothing scrolls to say so.
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [tocIds, slug]);

  if (isLoading) {
    return (
      <PageLayout variant="content" role="manager">
        <div className="flex-1 container py-8">
          <LoadingState />
        </div>
      </PageLayout>
    );
  }

  // A slug that matches nothing is a wrong URL, not a reason to teleport the
  // reader to the index and leave them wondering what happened to the page
  // they asked for. Same correction as the essay pages (GATE 1f).
  if (!item || error) {
    return <NotFound />;
  }

  // The real, per-item facts this page actually has today: the reported
  // figures and notes reference from the statement it was seeded from.
  const figures = [
    { label: '31 Dec 2024', value: item.dec_2024 },
    { label: '31 Dec 2023', value: item.dec_2023 },
    { label: 'Notes ref.', value: item.notes_ref },
  ].filter((f) => f.value);

  // No essay of its own: the page names the line item whose essay covers it,
  // if any (fsli_pages.covered_by_slug; absent before its migration). With
  // neither, the page ends at its figures — no outline, no empty state.
  const coveredBy = !essaysLoading && !essaysFailed && essays.length === 0 ? item.covered_by_slug ?? null : null;

  return (
    <PageLayout variant="content" role="manager">
      <SEO title={item.title} description={item.subtitle || `${item.title} — financial statement line item detail.`} />
      <div className="flex-1">
        <div className="container py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/accounting" className="hover:text-foreground transition-colors">
              Accounting
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/accounting/fsli" className="hover:text-foreground transition-colors">
              FSLI
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{item.title}</span>
          </nav>

          {/* Three Column Layout */}
          <div className="flex gap-8">
            {/* Left Sidebar - Related Items */}
            <FsliRelatedItems />

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Mobile Sidebar */}
              <FsliMobileSidebar />

              {/* Admin Banner — FSLI prose is authored in the writer studio
                  as accounting essays linked to this line item. The inline
                  editor that wrote straight into public rows is deleted. */}
              {!authLoading && isAdmin && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-6 flex flex-col md:flex-row md:items-center gap-3">
                  <Badge variant="outline" className="bg-primary/20">Admin</Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-2 flex-1">
                    <Pencil className="h-4 w-4" />
                    This page's prose is written in the studio — draft, publish,
                    revision history and autosave included. Link an accounting
                    essay to this line item in Post settings.
                  </span>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link to={`/admin/writer/accounting/new?fsli=${slug}`}>
                      Write in Studio
                    </Link>
                  </Button>
                </div>
              )}

              {/* Title Section */}
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-primary mb-2">
                  {item.title}
                </h1>
                {item.subtitle && (
                  <p className="text-muted-foreground mb-3">{item.subtitle}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-4 w-4" />
                    Updated {formatDate(item.updated_at)}
                  </span>
                </div>
              </div>

              {/* Reported figures — the one thing every line item genuinely
                  has. Replaces a hero that showed a stock photo and
                  cash-equivalents "key points" on all 24 pages. */}
              {figures.length > 0 && (
                <div className="mb-2 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
                  {figures.map((f) => (
                    <div key={f.label} className="rounded-lg border border-border bg-card p-4">
                      <div className="text-xs text-muted-foreground mb-1">{f.label}</div>
                      <div className="text-lg font-semibold text-foreground tabular-nums">{f.value}</div>
                    </div>
                  ))}
                </div>
              )}
              {figures.length > 0 && (
                <p className="text-xs text-muted-foreground mb-6">
                  Figures as reported in the source financial statements.
                </p>
              )}

              {/* Divider — only above something. */}
              {(essaysLoading || essaysFailed || essays.length > 0 || coveredBy) && <hr className="border-border my-8" />}

              {coveredBy && <FsliCoveredBy slug={coveredBy} />}

              {/* The page body: the essay linked to this line item, its title
                  as the first h2, its snippet as the lede, then the essay
                  itself. It used to sit at the very bottom under a "Related
                  Essays" heading, below ten empty subsections. Two linked
                  essays (none today) follow each other in the studio's order. */}
              {essaysLoading ? (
                // Skeleton shaped like a short paragraph, not a spinner.
                <div className="space-y-2" aria-hidden>
                  <div className="h-4 w-full rounded bg-muted animate-pulse" />
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                </div>
              ) : essaysFailed ? (
                <ErrorState onRetry={() => void refetchEssays()} />
              ) : (
                essays.map((essay, index) => (
                  <section key={essay.id} className="mb-12 last:mb-0" data-fsli-essay={essay.slug}>
                    {/* The body's own measure, so title, lede and prose share
                        one left edge; the essay page's title and deck classes,
                        so the title still reads above the body's own h2s. */}
                    <div className="mx-auto w-[728px] max-w-full">
                      <h2 className="editorial-title mb-4">{essay.title}</h2>
                      {essay.snippet && (
                        <p className="editorial-subtitle mb-8">{essay.snippet}</p>
                      )}
                    </div>
                    {essay.content && (
                      <ArticleBody content={essay.content} headingIds={toc.headingIds[index]} />
                    )}
                  </section>
                ))
              )}
            </div>

            {/* Right Sidebar - On This Page */}
            <FsliOnThisPage
              sections={toc.entries}
              activeSection={activeSection}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
