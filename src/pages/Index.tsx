import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, Leaf, Lightbulb, Clock, User, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFeaturedEssays } from '@/hooks/queries/useEssays';
import { LoadingState } from '@/components/states/LoadingState';

const sections = [
  {
    icon: BarChart3,
    title: 'Finance',
    description: 'How to calculate, analyze, and support decisions. Not theory—procedure.',
    path: '/finance-101',
    accent: 'text-blue-500',
  },
  {
    icon: BookOpen,
    title: 'Accounting',
    description: 'Consolidation, policy choices, PSAK application. What you check, what you calculate.',
    path: '/accounting',
    accent: 'text-purple-500',
  },
  {
    icon: Leaf,
    title: 'Green Transition',
    description: 'The economics of decarbonization. Who pays, who benefits, what trade-offs exist.',
    path: '/green-transition',
    accent: 'text-accent',
  },
  {
    icon: Lightbulb,
    title: 'The Next Big Thing',
    description: 'Rigorous speculation about structural shifts. Winners, losers, second-order effects.',
    path: '/the-next-big-thing',
    accent: 'text-amber-500',
  },
  {
    icon: GraduationCap,
    title: 'IELTS Preparation',
    description: 'Band 7+ methodology. Time limits, task protocols, scoring criteria.',
    path: '/english-ielts',
    accent: 'text-green-500',
  },
];

const getSectionLabel = (section: string, phase: string | null) => {
  if (section === 'green-transition') return 'Green Transition';
  if (section === 'next-big-thing') return 'Next Big Thing';
  return section;
};

const getEssayLink = (essay: { section: string; phase: string | null; slug: string }) => {
  if (essay.section === 'green-transition' && essay.phase) {
    return `/green-transition/${essay.phase}/${essay.slug}`;
  }
  if (essay.section === 'next-big-thing') {
    return `/the-next-big-thing/${essay.slug}`;
  }
  return `/essays/${essay.slug}`;
};

const Index = () => {
  const { data: featuredEssays, isLoading } = useFeaturedEssays(4);

  return (
    <PageLayout role="hybrid">
      <SEO 
        title="Technical Education Site"
        description="Finance, accounting, green transition economics, and IELTS preparation. Opinionated and practical content for professionals."
      />

      {/* Hero - Hybrid Voice */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-4xl text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
            This is a technical education site.
          </h1>
          
          <div className="text-left max-w-2xl mx-auto space-y-4 text-muted-foreground">
            <p className="text-lg">It covers:</p>
            <ul className="space-y-2 text-base">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-semibold">Finance & Accounting:</span>
                <span>How to do the job correctly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-semibold">Green Transition:</span>
                <span>Economic analysis of decarbonization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-semibold">Essays:</span>
                <span>Rigorous thinking about industry shifts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-semibold">Books:</span>
                <span>Readings that build capability</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-semibold">IELTS:</span>
                <span>Structured exam preparation</span>
              </li>
            </ul>
            <p className="text-base pt-4 border-t border-border mt-6">
              The material is opinionated and practical.
            </p>
            <p className="text-foreground font-medium">
              Pick a section. Do the work.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Analysis */}
      {!isLoading && featuredEssays && featuredEssays.length > 0 && (
        <section className="py-12 bg-card border-y border-border">
          <div className="container">
            <div className="mb-8">
              <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                Recent Analysis
              </h2>
              <p className="text-sm text-muted-foreground">
                Latest essays across sections.
              </p>
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
        </section>
      )}

      {isLoading && (
        <section className="py-12 bg-card border-y border-border">
          <div className="container">
            <LoadingState variant="cards" count={4} />
          </div>
        </section>
      )}

      {/* Sections Grid */}
      <section id="main-content" className="py-16 container">
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-display font-semibold text-foreground mb-4 text-center">
            Sections
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {sections.map((section) => (
            <Link key={section.path} to={section.path}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-secondary ${section.accent}`}>
                      <section.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {section.description}
                      </p>
                      <span className="text-sm font-medium text-accent inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        Enter
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </PageLayout>
  );
};

export default Index;
