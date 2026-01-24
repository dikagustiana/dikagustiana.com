import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { HeroSection } from '@/components/HeroSection';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, Leaf, Lightbulb, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface FeaturedEssay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  section: string;
  phase: string | null;
  author: string | null;
  read_time: string | null;
}

const learningPaths = [
  {
    icon: BarChart3,
    title: 'Finance',
    description: 'How financial models support decisions. Scenario analysis, capital allocation, and the real economics of asset-heavy businesses.',
    path: '/finance-101',
    accent: 'text-blue-500',
  },
  {
    icon: BookOpen,
    title: 'Accounting',
    description: 'Why consolidation matters, how accounting policy shapes economics, and the reality of group structures under PSAK.',
    path: '/accounting',
    accent: 'text-purple-500',
  },
  {
    icon: Leaf,
    title: 'Green Transition',
    description: 'The energy transition as a financial and economic problem—costs, incentives, constraints, and who bears the burden.',
    path: '/green-transition',
    accent: 'text-accent',
  },
  {
    icon: Lightbulb,
    title: 'The Next Big Thing',
    description: 'Speculative but reasoned essays on the forces shaping industry, finance, and policy. Critical questions, not predictions.',
    path: '/the-next-big-thing',
    accent: 'text-amber-500',
  },
];

const getSectionLabel = (section: string, phase: string | null) => {
  if (section === 'green-transition') return 'Green Transition';
  if (section === 'next-big-thing') return 'Next Big Thing';
  return section;
};

const getEssayLink = (essay: FeaturedEssay) => {
  if (essay.section === 'green-transition' && essay.phase) {
    return `/green-transition/${essay.phase}/${essay.slug}`;
  }
  if (essay.section === 'next-big-thing') {
    return `/the-next-big-thing/${essay.slug}`;
  }
  return `/essays/${essay.slug}`;
};

const Index = () => {
  const [featuredEssays, setFeaturedEssays] = useState<FeaturedEssay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedEssays = async () => {
      try {
        const { data } = await supabase
          .from('essays')
          .select('id, slug, title, snippet, section, phase, author, read_time')
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(4);
        
        setFeaturedEssays(data || []);
      } catch (error) {
        console.error('Error loading featured essays:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedEssays();
  }, []);

  return (
    <Layout>
      <HeroSection 
        title="Finance and accounting explained clearly. The green transition analyzed honestly."
        subtitle="Built by someone who does the work—not just writes about it."
        ctaText="Start Learning"
      />
      
      {/* Featured Analysis Section */}
      {!loading && featuredEssays.length > 0 && (
        <div className="py-16 bg-card border-y border-border">
          <div className="section-container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground mb-2">
                  Featured Analysis
                </h2>
                <p className="text-muted-foreground text-sm">
                  Recent essays demonstrating how we think about finance, accounting, and transition economics.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredEssays.map((essay) => (
                <Link key={essay.id} to={getEssayLink(essay)}>
                  <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                    <CardContent className="p-5">
                      <Badge variant="secondary" className="mb-3 text-xs">
                        {getSectionLabel(essay.section, essay.phase)}
                      </Badge>
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                        {essay.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {essay.snippet}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {essay.author && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {essay.author}
                          </span>
                        )}
                        {essay.read_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {essay.read_time}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Learning Paths Section */}
      <div id="main-content" className="py-16 section-container">
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-4 text-center">
            What You'll Find Here
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto">
            Practical knowledge from real experience. No textbook definitions. No corporate jargon. 
            Just clear explanations of how things actually work.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {learningPaths.map((path) => (
            <Link key={path.path} to={path.path}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-secondary ${path.accent}`}>
                      <path.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                        {path.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {path.description}
                      </p>
                      <span className="text-sm font-medium text-accent inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        Explore
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Philosophy Section */}
      <div className="bg-secondary/50 py-16">
        <div className="section-container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground mb-6 text-center">
              Why This Exists
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Most finance and accounting content falls into two camps: oversimplified "explainers" 
                that miss the nuance, or dense textbooks that bury the insight under formality.
              </p>
              <p>
                This site is different. It's built by someone who prepares consolidated financial statements, 
                builds financial models for real decisions, and thinks seriously about what the energy 
                transition means for businesses and economies.
              </p>
              <p>
                The goal is simple: explain complex ideas clearly, highlight the trade-offs that actually 
                matter, and help you think through problems—not just memorize definitions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
