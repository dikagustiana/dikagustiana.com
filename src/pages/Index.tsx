import { EssayCardLink } from '@/components/EssayCardLink';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, Leaf, Lightbulb, Clock, User, GraduationCap, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSelectedEssays } from '@/hooks/queries/useSelectedEssays';
import { LoadingState } from '@/components/states/LoadingState';
import { HeroSection } from '@/components/HeroSection';

/**
 * The section cards. There is deliberately NO per-section `accent` field.
 *
 * This array used to assign each card its own hue — blue-500, purple-500,
 * the brand emerald, amber-500, green-500, sky-500 — which put six accents in
 * one grid, including two greens two cards apart and two near-identical
 * blues. Distinctness between sections comes from order and typography, not
 * from hue; every icon renders in one muted colour and picks up the accent
 * only on hover, alongside its title.
 */
const sections = [
  {
    icon: BarChart3,
    title: 'Finance',
    description: 'How to calculate, analyze, and support decisions. Not theory—procedure.',
    path: '/finance-101',
  },
  {
    icon: BookOpen,
    title: 'Accounting',
    description: 'Consolidation, policy choices, PSAK application. What you check, what you calculate.',
    path: '/accounting',
  },
  {
    icon: Leaf,
    title: 'Green Transition',
    description: 'The economics of decarbonization. Who pays, who benefits, what trade-offs exist.',
    path: '/green-transition',
  },
  {
    icon: Lightbulb,
    title: 'The Next Big Thing',
    description: 'Rigorous speculation about structural shifts. Winners, losers, second-order effects.',
    path: '/the-next-big-thing',
  },
  {
    icon: GraduationCap,
    title: 'IELTS Preparation',
    description: 'Band 7+ methodology. Time limits, task protocols, scoring criteria.',
    path: '/english-ielts',
  },
  {
    icon: Landmark,
    title: 'Development Finance',
    description: 'Sovereign funds, multilateral lenders, and blended finance. How public capital shapes economies.',
    path: '/development-finance',
  },
];

const getSectionLabel = (section: string, phase: string | null) => {
  if (section === 'green-transition') return 'Green Transition';
  if (section === 'next-big-thing') return 'Next Big Thing';
  return section;
};


const Index = () => {
  // Manual curation, not recency — recency is what put a database-rebuild
  // notice on the homepage. Zero selected essays hides the section entirely.
  const { data: featuredEssays, isLoading } = useSelectedEssays(4);

  return (
    <PageLayout role="hybrid">
      <SEO
        title="Home"
        description="Finance, accounting, and green transition economics. Research and analysis by Dika Gustiana."
      />

      {/* Hero */}
      <HeroSection />

      {/* Featured Analysis */}
      {!isLoading && featuredEssays && featuredEssays.length > 0 && (
        <section className="py-12 bg-card border-y border-border">
          <div className="container">
            <div className="mb-8">
              <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                Selected Analysis
              </h2>
              <p className="text-sm text-muted-foreground">
                Hand-picked essays across sections.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredEssays.map((essay) => (
                <EssayCardLink key={essay.id} essay={essay}>
                  <Card className="h-full hover:shadow-lg transition-[transform,box-shadow] hover:-translate-y-1 cursor-pointer group">
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
                </EssayCardLink>
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

      {/* Sections Grid. id="sections", NOT "main-content": PageLayout's
          <main> already owns that id (the skip-link target), and the
          duplicate made the hero CTA resolve to the page top — it scrolled
          nowhere. */}
      <section id="sections" className="py-16 container">
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-display font-semibold text-foreground mb-4 text-center">
            Sections
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {sections.map((section) => (
            <Link key={section.path} to={section.path}>
              <Card className="h-full hover:shadow-lg transition-[transform,box-shadow] hover:-translate-y-1 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-secondary text-muted-foreground group-hover:text-accent transition-colors">
                      <section.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {section.description}
                      </p>
                      <span className="text-sm font-medium text-accent-text inline-flex items-center gap-1">
                        Enter
                        {/* Nudge the arrow with a transform instead of
                            animating the flex gap, which re-runs layout. */}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
