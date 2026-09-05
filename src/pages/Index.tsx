import { EssayCardLink } from '@/components/EssayCardLink';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSelectedEssays } from '@/hooks/queries/useSelectedEssays';
import { LoadingState } from '@/components/states/LoadingState';
import { ChainPlate } from '@/components/industry-chain/ChainPlate';

/**
 * The Sections list: titles and destinations, nothing else.
 *
 * Kept by owner decision against a review that recommended deleting it; the
 * shape is a divide-y list because six equal cards with icon chips, parallel
 * descriptions and a repeated "Enter →" read as generated. Three constraints
 * this code cannot show (rationale in docs/DECISIONS.md, 2026-08-03):
 *   - No descriptions. The slot is removed on purpose — six sibling sentences
 *     in one meter are the tell. If they return, the owner writes them.
 *   - No numbering. These are peers with no learning order; numerals would
 *     read as rank. (FinanceLanding numbers its tracks because that order is
 *     real. This list is not that.)
 *   - IELTS is deliberately absent here. The page stays, the nav entry stays;
 *     it is an audience asset, not a top-level door.
 */
const sections = [
  { title: 'Finance', path: '/finance' },
  { title: 'Accounting', path: '/accounting' },
  { title: 'Green Transition', path: '/green-transition' },
  { title: 'The Next Big Thing', path: '/the-next-big-thing' },
  { title: 'Development Finance', path: '/development-finance' },
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

      {/* The plate holds the first screen. It replaces the hero rather than the
          page: Featured Analysis and the Sections list below are unchanged, and
          HeroSection itself is left in the repo so reinstating it is one line. */}
      <ChainPlate />

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

      {/* Sections list. id="sections", NOT "main-content": PageLayout's
          <main> already owns that id (the skip-link target), and the
          duplicate made the hero CTA resolve to the page top — it scrolled
          nowhere. Each row IS the link; there is no per-row call to action. */}
      <section id="sections" className="py-16 container">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-display font-semibold text-foreground mb-6">
            Sections
          </h2>

          <ul className="divide-y divide-border border-y border-border">
            {sections.map((section) => (
              <li key={section.path}>
                <Link
                  to={section.path}
                  className="group block py-5"
                >
                  <span className="text-lg font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                    {section.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageLayout>
  );
};

export default Index;
