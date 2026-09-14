import { EssayCardLink } from '@/components/EssayCardLink';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSelectedEssays } from '@/hooks/queries/useSelectedEssays';
import { LoadingState } from '@/components/states/LoadingState';
import { IndustryChainPreview } from '@/components/industry-chain';
import { useSectionCounts } from '@/hooks/queries/useSectionCounts';
import { sectionLabel } from '@/lib/sectionLabels';

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
  { title: 'Finance', path: '/finance', section: 'finance' },
  { title: 'Accounting', path: '/accounting', section: 'accounting' },
  {
    title: 'Green Transition',
    path: '/green-transition',
    section: 'green-transition',
    // The tracker is not in `essays`, so an essay count would report this
    // section as entirely empty when it carries a two-issue archive. Named
    // here rather than folded into the number.
    alsoHolds: 'a paused tracker archive',
  },
  { title: 'The Next Big Thing', path: '/the-next-big-thing', section: 'next-big-thing' },
  { title: 'Development Finance', path: '/development-finance', section: 'development-finance' },
];

/**
 * What is behind a door, in as few words as the truth needs.
 *
 * On 14 September 2026 three of these five sections held nothing at all, and
 * the list could not show it: every row looked identical, so a stranger found
 * the emptiness only by walking in. This is a COUNT, not a description — the
 * rule against six sibling sentences under six headings (docs/DECISIONS.md,
 * 2026-08-03) is about generated prose, and a number is not prose.
 *
 * Takes `loaded` rather than inferring it from the count, because the count
 * map has no key for a section with nothing in it: an absent key means zero,
 * and an unresolved query also means absent. Collapsing those two was how the
 * three EMPTY sections — the ones this exists for — rendered blank.
 *
 * Returns null until the query resolves: no number is better than a zero that
 * turns into a two.
 */
function sectionStanding(loaded: boolean, count: number | undefined, alsoHolds?: string): string | null {
  if (!loaded) return null;
  count = count ?? 0;
  const essays = count === 0 ? 'Nothing written yet' : `${count} essay${count === 1 ? '' : 's'}`;
  return alsoHolds ? `${essays} \u00b7 ${alsoHolds}` : essays;
}




const Index = () => {
  // Manual curation, not recency — recency is what put a database-rebuild
  // notice on the homepage. Zero selected essays hides the section entirely.
  const { data: featuredEssays, isLoading } = useSelectedEssays(4);
  const { data: sectionCounts, isSuccess: countsLoaded } = useSectionCounts();

  return (
    <PageLayout role="hybrid">
      <SEO
        title="Home"
        description="Finance, accounting, and green transition economics. Research and analysis by Dika Gustiana."
      />

      {/* THE MAP IS THE PAGE. It is the first thing under the header, and
          nothing precedes it: no hero, no artwork, no argument block, no
          reading path, no opening case. A reader meets the structure of
          economic activity, picks the relation that interests them, and goes
          to an essay for the depth. See docs/response-2026-09-14-v5/.

          What was here before is not deleted, only moved off the entrance:
          the argument and the reading path still exist and About still
          carries them. */}
      <IndustryChainPreview />

      {/* Featured Analysis */}
      {!isLoading && featuredEssays && featuredEssays.length > 0 && (
        <section className="py-12 bg-card border-y border-border">
          <div className="container">
            <div className="mb-8">
              <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                Selected Analysis
              </h2>
              {/* Says its own sort order. The sentence that used to follow
                  it — "the ordered argument is above" — named a block that no
                  longer precedes the map. */}
              <p className="text-sm text-muted-foreground">
                Hand-picked across sections, newest first.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredEssays.map((essay) => (
                <EssayCardLink key={essay.id} essay={essay}>
                  <Card className="h-full hover:shadow-lg transition-[transform,box-shadow] hover:-translate-y-1 cursor-pointer group">
                    <CardContent className="p-5">
                      <Badge variant="secondary" className="mb-3 text-xs">
                        {sectionLabel(essay.section)}
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
          duplicate made an in-page link resolve to the page top instead. It
          stays a named anchor because links to it exist. Each row IS the
          link; there is no per-row call to action. */}
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
                  className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <span className="text-lg font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                    {section.title}
                  </span>
                  {(() => {
                    const standing = sectionStanding(
                      countsLoaded,
                      sectionCounts?.[section.section],
                      section.alsoHolds,
                    );
                    return standing ? (
                      <span className="text-xs font-mono text-muted-foreground sm:text-right">
                        {standing}
                      </span>
                    ) : null;
                  })()}
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
