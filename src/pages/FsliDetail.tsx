import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { FsliRelatedItems } from '@/components/fsli/FsliRelatedItems';
import { FsliOnThisPage } from '@/components/fsli/FsliOnThisPage';
import { FsliContentSection } from '@/components/fsli/FsliContentSection';
import { FsliMobileSidebar } from '@/components/fsli/FsliMobileSidebar';
import { useFsliPage, useFsliSections } from '@/hooks/queries/useFsliPages';
import { useEssaysByFsliSlug } from '@/hooks/queries/useEssays';
import { useAuth } from '@/contexts/AuthContext';
import NotFound from './NotFound';
import { ArticleBody } from '@/components/editorial/ArticleBody';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/states';
import { scrollBehavior } from '@/lib/motion';
import { RefreshCw, ChevronRight, Pencil } from 'lucide-react';

// The page's fixed outline. Section PROSE lives in fsli_sections and is
// empty until written — there is deliberately no placeholder text here.
// All 24 line items used to render the same cash-equivalents boilerplate
// as if it were their own content.
const contentSections = [
  {
    key: 'definition',
    title: 'Definition',
    subtitle: 'Understanding the fundamental concepts and requirements for classification.',
  },
  { key: 'recognition', title: 'Recognition Criteria' },
  { key: 'measurement', title: 'Measurement Principles' },
  { key: 'presentation', title: 'Presentation and Disclosure' },
];

// Issues subsections
const issueSections = [
  { key: 'issues-common', title: 'Common Implementation Issues' },
  { key: 'issues-overdrafts', title: 'Classification Boundary Cases' },
  { key: 'issues-currency', title: 'Foreign Currency Considerations' },
];

// Example subsections
const exampleSections = [
  { key: 'examples-practical', title: 'Practical Examples' },
  { key: 'examples-journal', title: 'Journal Entry Examples' },
  { key: 'examples-implementation', title: 'Implementation Steps' },
];

// Build TOC structure for right sidebar
const buildTocSections = () => [
  {
    id: 'fundamentals',
    title: 'Fundamentals',
    children: contentSections.map(s => ({ id: s.key, title: s.title }))
  },
  {
    id: 'issues',
    title: 'Issues',
    children: issueSections.map(s => ({ id: s.key, title: s.title }))
  },
  {
    id: 'examples',
    title: 'Examples',
    children: exampleSections.map(s => ({ id: s.key, title: s.title }))
  },
];

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
  const [activeSection, setActiveSection] = useState<string>('definition');
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: item, isLoading, error } = useFsliPage(slug || '');
  const { data: linkedEssays } = useEssaysByFsliSlug(slug || '');

  // ONE query for all section prose. FsliContentSection used to fetch its own
  // row, costing ten single-row requests per page view.
  const { data: sectionRows, isLoading: sectionsLoading } = useFsliSections(slug || '');
  const contentByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of sectionRows ?? []) {
      if (row.content) map[row.section_key] = row.content;
    }
    return map;
  }, [sectionRows]);

  // Track active section on scroll — rAF-coalesced so the ten
  // getBoundingClientRect reads happen once per frame, not once per event.
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const sections = [...contentSections, ...issueSections, ...exampleSections];
      for (const section of sections) {
        const element = document.getElementById(section.key);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(section.key);
            break;
          }
        }
      }
    };
    const handleScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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

  const tocSections = buildTocSections();

  // The real, per-item facts this page actually has today: the reported
  // figures and notes reference from the statement it was seeded from.
  const figures = [
    { label: '31 Dec 2024', value: item.dec_2024 },
    { label: '31 Dec 2023', value: item.dec_2023 },
    { label: 'Notes ref.', value: item.notes_ref },
  ].filter((f) => f.value);

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

              {/* Admin Banner */}
              {!authLoading && isAdmin && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-6 flex flex-col md:flex-row md:items-center gap-3">
                  <Badge variant="outline" className="bg-primary/20">Admin</Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-2 flex-1">
                    <Pencil className="h-4 w-4" />
                    Scroll ke section di bawah (Definition, Recognition, dst.) lalu klik ikon pensil atau teksnya untuk edit. (Judul & Key points belum editable.)
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => document.getElementById('definition')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })}
                  >
                    Ke Definition
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

              {/* Divider */}
              <hr className="border-border my-8" />

              {/* Content Sections - Fundamentals */}
              {contentSections.map((section) => (
                <FsliContentSection
                  key={section.key}
                  id={section.key}
                  pageSlug={slug!}
                  sectionKey={section.key}
                  title={section.title}
                  subtitle={section.subtitle}
                  content={contentByKey[section.key] ?? ''}
                  loading={sectionsLoading}
                />
              ))}

              {/* Issues Section Header */}
              <div className="pt-8 pb-4">
                <h2 className="text-lg font-semibold text-foreground">Issues</h2>
              </div>

              {/* Issue Sections */}
              {issueSections.map((section) => (
                <FsliContentSection
                  key={section.key}
                  id={section.key}
                  pageSlug={slug!}
                  sectionKey={section.key}
                  title={section.title}
                  content={contentByKey[section.key] ?? ''}
                  loading={sectionsLoading}
                />
              ))}

              {/* Examples Section Header */}
              <div className="pt-8 pb-4">
                <h2 className="text-lg font-semibold text-foreground">Examples</h2>
              </div>

              {/* Example Sections */}
              {exampleSections.map((section) => (
                <FsliContentSection
                  key={section.key}
                  id={section.key}
                  pageSlug={slug!}
                  sectionKey={section.key}
                  title={section.title}
                  content={contentByKey[section.key] ?? ''}
                  loading={sectionsLoading}
                />
              ))}

              {/* Linked Essays */}
              {linkedEssays && linkedEssays.length > 0 && (
                <>
                  <div className="pt-8 pb-4" id="linked-essays">
                    <h2 className="text-lg font-semibold text-foreground">Related Essays</h2>
                  </div>
                  {linkedEssays.map((essay) => (
                    <div key={essay.id} className="mb-8">
                      <h3 className="text-base font-semibold text-foreground mb-2">{essay.title}</h3>
                      {essay.snippet && (
                        <p className="text-sm text-muted-foreground mb-4">{essay.snippet}</p>
                      )}
                      {essay.content && (
                        <ArticleBody content={essay.content} />
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Right Sidebar - On This Page */}
            <FsliOnThisPage
              sections={tocSections}
              activeSection={activeSection}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
