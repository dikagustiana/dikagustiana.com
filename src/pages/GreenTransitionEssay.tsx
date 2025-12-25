import { useParams, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FsliOnThisPage } from '@/components/fsli/FsliOnThisPage';
import { FsliHeroSection } from '@/components/fsli/FsliHeroSection';
import { FsliContentSection } from '@/components/fsli/FsliContentSection';
import { GreenTransitionRelatedEssays } from '@/components/green-transition/GreenTransitionRelatedEssays';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Clock, ChevronRight } from 'lucide-react';

const phaseLabels: Record<string, string> = {
  'where-we-are-now': 'Where We Are Now',
  'challenges-ahead': 'Challenges Ahead',
  'pathways-forward': 'Pathways Forward',
};

// Content sections configuration for essays
const contentSections = [
  { 
    key: 'introduction', 
    title: 'Introduction', 
    placeholder: 'Provide an overview of the topic and why it matters for the green transition.'
  },
  { 
    key: 'analysis', 
    title: 'Analysis', 
    placeholder: 'Deep dive into the data, trends, and key insights.'
  },
  { 
    key: 'implications', 
    title: 'Implications', 
    placeholder: 'What does this mean for policy makers, businesses, and individuals?'
  },
  { 
    key: 'recommendations', 
    title: 'Recommendations', 
    placeholder: 'Actionable steps and policy recommendations.'
  },
  { 
    key: 'conclusion', 
    title: 'Conclusion', 
    placeholder: 'Summary and final thoughts on the path forward.'
  },
];

// Build TOC structure for right sidebar
const buildTocSections = () => [
  {
    id: 'overview',
    title: 'Overview',
    children: [
      { id: 'introduction', title: 'Introduction' },
      { id: 'analysis', title: 'Analysis' },
    ]
  },
  {
    id: 'insights',
    title: 'Insights',
    children: [
      { id: 'implications', title: 'Implications' },
      { id: 'recommendations', title: 'Recommendations' },
    ]
  },
  {
    id: 'summary',
    title: 'Summary',
    children: [
      { id: 'conclusion', title: 'Conclusion' },
    ]
  },
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
  updated_at: string;
}

export default function GreenTransitionEssay() {
  const { phase, slug } = useParams<{ phase: string; slug: string }>();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('introduction');

  useEffect(() => {
    if (slug) {
      loadEssay();
    }
  }, [slug]);

  const loadEssay = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('essays')
        .select('*')
        .eq('slug', slug)
        .eq('section', 'green-transition')
        .maybeSingle();

      setEssay(data);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load essay:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Track active section on scroll
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2 mb-8" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!essay) {
    return <Navigate to={`/green-transition/${phase}`} replace />;
  }

  const tocSections = buildTocSections();
  const phaseLabel = phase ? phaseLabels[phase] || phase : '';
  
  const keyPoints = [
    'Understanding current energy policies and their effectiveness',
    'Analysis of barriers to green transition adoption',
    'Recommendations for stakeholders and policy makers'
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="container py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/green-transition" className="hover:text-foreground transition-colors">
              Green Transition
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/green-transition/${phase}`} className="hover:text-foreground transition-colors">
              {phaseLabel}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{essay.title}</span>
          </nav>

          {/* Three Column Layout */}
          <div className="flex gap-8">
            {/* Left Sidebar - Related Essays */}
            <GreenTransitionRelatedEssays phase={phase} currentSlug={slug} />

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Header Section */}
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-primary mb-2">
                  {essay.title}
                </h1>
                {essay.snippet && (
                  <p className="text-lg text-muted-foreground mb-3">
                    {essay.snippet}
                  </p>
                )}
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

              {/* Divider */}
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
            </div>

            {/* Right Sidebar - On This Page */}
            <FsliOnThisPage 
              sections={tocSections}
              activeSection={activeSection}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
