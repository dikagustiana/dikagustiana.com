import { useParams, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { FsliRelatedItems } from '@/components/fsli/FsliRelatedItems';
import { FsliOnThisPage } from '@/components/fsli/FsliOnThisPage';
import { FsliHeroSection } from '@/components/fsli/FsliHeroSection';
import { FsliContentSection } from '@/components/fsli/FsliContentSection';
import { FsliMobileSidebar } from '@/components/fsli/FsliMobileSidebar';
import { useFsliPage } from '@/hooks/queries/useFsliPages';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/states';
import { RefreshCw, Clock, ChevronRight, Pencil } from 'lucide-react';

// Content sections configuration
const contentSections = [
  {
    key: 'definition',
    title: 'Definition',
    subtitle: 'Understanding the fundamental concepts and requirements for classification.',
    placeholder: 'Cash and cash equivalents represent the most liquid assets that an entity possesses. According to IAS 7 Statement of Cash Flows, cash comprises cash on hand and demand deposits. Cash equivalents are short-term, highly liquid investments that are readily convertible to known amounts of cash and which are subject to an insignificant risk of changes in value.'
  },
  {
    key: 'recognition',
    title: 'Recognition Criteria',
    placeholder: 'Recognition requires the asset to be readily convertible to cash and subject to insignificant risk of value changes. The entity must have control over the resource and expect future economic benefits.'
  },
  {
    key: 'measurement',
    title: 'Measurement Principles',
    placeholder: 'Cash and cash equivalents are typically measured at their face value or nominal amount. Foreign currency cash holdings are translated using the closing rate at the reporting date.'
  },
  {
    key: 'presentation',
    title: 'Presentation and Disclosure',
    placeholder: 'Proper presentation and disclosure are essential for transparency in financial reporting. The components of cash and cash equivalents should be disclosed in the notes to the financial statements.'
  },
];

// Issues subsections
const issueSections = [
  { key: 'issues-common', title: 'Common Implementation Issues', placeholder: 'Common issues include misclassification of restricted cash, improper treatment of bank overdrafts, and incorrect foreign currency translation.' },
  { key: 'issues-overdrafts', title: 'Bank Overdrafts Treatment', placeholder: 'Bank overdrafts that are repayable on demand and form an integral part of an entity\'s cash management may be included as a component of cash and cash equivalents.' },
  { key: 'issues-currency', title: 'Foreign Currency Considerations', placeholder: 'Cash and cash equivalents denominated in foreign currencies must be translated at the closing exchange rate, with translation differences recognized appropriately.' },
];

// Example subsections
const exampleSections = [
  { key: 'examples-practical', title: 'Practical Examples', placeholder: 'Example: A company holds USD 1,000,000 in checking accounts, USD 500,000 in money market funds maturing in 60 days, and USD 200,000 in 3-month treasury bills.' },
  { key: 'examples-journal', title: 'Journal Entry Examples', placeholder: 'Dr. Cash 100,000\nCr. Revenue 100,000\n(To record cash receipt from customer)' },
  { key: 'examples-implementation', title: 'Implementation Steps', placeholder: '1. Identify all cash holdings\n2. Evaluate each investment for cash equivalent criteria\n3. Document the assessment\n4. Prepare appropriate disclosures' },
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

// Generate key points based on item
const getKeyPoints = () => {
  return [
    'Include currency, bank deposits, and highly liquid investments with original maturities of three months or less',
    'Recognition requires the asset to be readily convertible to cash and subject to insignificant risk of value changes',
    'Proper presentation and disclosure are essential for transparency in financial reporting'
  ];
};

export default function FsliDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [activeSection, setActiveSection] = useState<string>('definition');
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: item, isLoading, error } = useFsliPage(slug || '');

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
        <main className="flex-1 container py-8">
          <LoadingState />
        </main>
      </PageLayout>
    );
  }

  if (!item || error) {
    return <Navigate to="/accounting/fsli" replace />;
  }

  const tocSections = buildTocSections();
  const keyPoints = getKeyPoints();
  const heroDescription = `${item.title} represent important components on a company's balance sheet`;

  return (
    <PageLayout variant="content" role="manager">
      <main className="flex-1">
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
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-4 w-4" />
                    Updated 6 Sep 2025
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    6 min read
                  </span>
                </div>
              </div>

              {/* Hero Section */}
              <FsliHeroSection
                title={item.title}
                description={heroDescription}
                keyPoints={keyPoints}
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
                  placeholder={section.placeholder}
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
                  placeholder={section.placeholder}
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
                  placeholder={section.placeholder}
                />
              ))}
            </div>

            {/* Right Sidebar - On This Page */}
            <FsliOnThisPage
              sections={tocSections}
              activeSection={activeSection}
            />
          </div>
        </div>
      </main>
    </PageLayout>
  );
}
