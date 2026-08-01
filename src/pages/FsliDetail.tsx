import { useParams, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { FsliRelatedItems } from '@/components/fsli/FsliRelatedItems';
import { FsliOnThisPage } from '@/components/fsli/FsliOnThisPage';
import { FsliHeroSection } from '@/components/fsli/FsliHeroSection';
import { FsliContentSection } from '@/components/fsli/FsliContentSection';
import { FsliMobileSidebar } from '@/components/fsli/FsliMobileSidebar';
import { useFsliPage } from '@/hooks/queries/useFsliPages';
import { useEssaysByFsliSlug } from '@/hooks/queries/useEssays';
import { useAuth } from '@/contexts/AuthContext';
import NotFound from './NotFound';
import { ArticleBody } from '@/components/editorial/ArticleBody';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/states';
import { RefreshCw, ChevronRight, Pencil } from 'lucide-react';

// Content sections configuration
const contentSections = [
  {
    key: 'definition',
    title: 'Definition',
    subtitle: 'Understanding the fundamental concepts and requirements for classification.'
  },
  {
    key: 'recognition',
    title: 'Recognition Criteria'
  },
  {
    key: 'measurement',
    title: 'Measurement Principles'
  },
  {
    key: 'presentation',
    title: 'Presentation and Disclosure'
  },
];

// Issues subsections
const issueSections = [
  { key: 'issues-common', title: 'Common Implementation Issues' },
  { key: 'issues-overdrafts', title: 'Bank Overdrafts Treatment' },
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

export default function FsliDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [activeSection, setActiveSection] = useState<string>('definition');
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: item, isLoading, error } = useFsliPage(slug || '');
  const { data: linkedEssays } = useEssaysByFsliSlug(slug || '');

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
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

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
  // The hero says what is true for THIS line item — its subtitle — or nothing.
  const heroDescription = item.subtitle || '';

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
                    onClick={() => document.getElementById('definition')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    Ke Definition
                  </Button>
                </div>
              )}

              {/* Title Section */}
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-primary mb-3">
                  {item.title}
                </h1>
                {/* Real timestamp from the row. The previous "Updated 6 Sep
                    2025 · 6 min read" was a hardcoded string on all 24 pages. */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-4 w-4" />
                    Updated{' '}
                    {new Date(item.updated_at).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Hero Section */}
              <FsliHeroSection
                title={item.title}
                description={heroDescription}
              />

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
