import { useParams, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { FsliOnThisPage } from '@/components/fsli/FsliOnThisPage';
import { FsliHeroSection } from '@/components/fsli/FsliHeroSection';
import { FsliContentSection } from '@/components/fsli/FsliContentSection';
import { RelatedContent } from '@/components/RelatedContent';
import { InlineEssayEditor, AdminEditBanner } from '@/components/admin';
import { supabase } from '@/integrations/supabase/client';
import { LoadingState } from '@/components/states';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, Clock } from 'lucide-react';

const phaseLabels: Record<string, string> = {
  'where-we-are-now': 'Where We Are Now',
  'challenges-ahead': 'Challenges Ahead',
  'pathways-forward': 'Pathways Forward',
};

const phaseQuestions: Record<string, string> = {
  'where-we-are-now': 'What is the actual state—not the press releases?',
  'challenges-ahead': 'What structural barriers will block progress?',
  'pathways-forward': 'Which interventions create the highest leverage?',
};

// Content sections configuration for essays
const contentSections = [
  { key: 'introduction', title: 'Introduction', placeholder: 'Overview of the topic and why it matters.' },
  { key: 'analysis', title: 'Analysis', placeholder: 'Deep dive into the data, trends, and key insights.' },
  { key: 'implications', title: 'Implications', placeholder: 'What does this mean for stakeholders?' },
  { key: 'recommendations', title: 'Recommendations', placeholder: 'Actionable steps and policy recommendations.' },
  { key: 'conclusion', title: 'Conclusion', placeholder: 'Summary and final thoughts.' },
];

const buildTocSections = () => [
  { id: 'overview', title: 'Overview', children: [
    { id: 'introduction', title: 'Introduction' },
    { id: 'analysis', title: 'Analysis' },
  ]},
  { id: 'insights', title: 'Insights', children: [
    { id: 'implications', title: 'Implications' },
    { id: 'recommendations', title: 'Recommendations' },
  ]},
  { id: 'summary', title: 'Summary', children: [
    { id: 'conclusion', title: 'Conclusion' },
  ]},
];

interface Essay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  content: string | null;
  phase: string | null;
  category_id: string | null;
  prerequisites: string[] | null;
  updated_at: string;
  status: string | null;
  published: boolean | null;
}

export default function GreenTransitionEssay() {
  const { phase, slug } = useParams<{ phase: string; slug: string }>();
  const { isAdmin } = useAuth();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('introduction');

  useEffect(() => {
    if (slug) {
      loadEssay();
    }
  }, [slug, isAdmin]);

  const loadEssay = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('slug', slug)
        .eq('section', 'green-transition')
        .maybeSingle();

      if (error) throw error;

      // Check access: non-admins can only see published essays (status='published')
      if (data) {
        const isPublished = data.status === 'published';
        if (!isPublished && !isAdmin) {
          // Draft accessed by non-admin - show 404
          setNotFound(true);
          setEssay(null);
        } else {
          setEssay(data);
        }
      } else {
        setNotFound(true);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load essay:', error);
      }
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      for (const section of contentSections) {
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

  const phaseLabel = phase ? phaseLabels[phase] || phase : '';
  const coreQuestion = phase ? phaseQuestions[phase] : '';

  if (loading) {
    return (
      <PageLayout
        variant="essay"
        role="economist"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Green Transition', path: '/green-transition' },
          { label: phaseLabel, path: `/green-transition/${phase}` },
          { label: 'Loading...' }
        ]}
      >
        <div className="container py-8">
          <LoadingState variant="article" />
        </div>
      </PageLayout>
    );
  }

  // Non-admin accessing draft or essay not found - redirect to phase page
  if (notFound || !essay) {
    return <Navigate to={`/green-transition/${phase}`} replace />;
  }

  const tocSections = buildTocSections();
  
  const keyPoints = [
    'Who benefits from current arrangements',
    'Who loses if this changes',
    'What are the second-order effects'
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <PageLayout
      variant="essay"
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition', path: '/green-transition' },
        { label: phaseLabel, path: `/green-transition/${phase}` },
        { label: essay.title }
      ]}
      showManifesto
      manifesto={coreQuestion}
    >
      <SEO
        title={essay.title}
        description={essay.snippet || 'Economic analysis of Indonesia green transition.'}
        type="article"
        author={essay.author || 'Dika Gustiana'}
      />
      
      <div className="container py-6">
        {/* Three Column Layout */}
        <div className="flex gap-8">
          {/* Left Sidebar - Hidden on mobile */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <h3 className="text-sm font-medium mb-3">In This Phase</h3>
              <p className="text-xs text-muted-foreground">{coreQuestion}</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Admin Edit Banner */}
            <AdminEditBanner essayId={essay.id} essaySlug={essay.slug} />

            {/* Header Section */}
            <div className="mb-6">
              <InlineEssayEditor
                essayId={essay.id}
                field="title"
                value={essay.title}
                as="h1"
                className="text-2xl md:text-3xl font-display font-bold text-primary mb-2"
                onUpdate={(newValue) => setEssay({ ...essay, title: newValue })}
              />
              <InlineEssayEditor
                essayId={essay.id}
                field="snippet"
                value={essay.snippet || ''}
                as="p"
                className="text-lg text-muted-foreground mb-3"
                onUpdate={(newValue) => setEssay({ ...essay, snippet: newValue })}
              />
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4" />
                  Updated {formatDate(essay.updated_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {essay.read_time || '5 min read'}
                </span>
              </div>
            </div>

            {/* Hero Section */}
            <FsliHeroSection
              title={essay.title}
              description={essay.snippet || 'Exploring key aspects of the green transition.'}
              keyPoints={keyPoints}
              imageUrl={essay.thumbnail_url || undefined}
            />

            <hr className="border-border my-8" />

            {/* Content Sections */}
            {contentSections.map((section) => (
              <FsliContentSection
                key={section.key}
                id={section.key}
                pageSlug={`green-transition-${slug}`}
                sectionKey={section.key}
                title={section.title}
                placeholder={section.placeholder}
              />
            ))}

            {/* Related Content */}
            <RelatedContent
              currentEssayId={essay.id}
              section="green-transition"
              categoryId={essay.category_id}
              prerequisites={essay.prerequisites}
            />
          </div>

          {/* Right Sidebar - On This Page */}
          <FsliOnThisPage 
            sections={tocSections}
            activeSection={activeSection}
          />
        </div>
      </div>
    </PageLayout>
  );
}
