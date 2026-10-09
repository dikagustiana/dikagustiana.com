import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useSelectedEssays } from '@/hooks/queries/useSelectedEssays';
import { IndustryChainPreview } from '@/components/industry-chain';
import { Glimpse } from '@/components/home/Glimpse';

/**
 * How many starred essays the glimpse carries. The row scrolls, so this is a
 * ceiling, not a layout constraint; order comes from essays.selected_rank,
 * set in Admin → Content → Homepage order.
 */
const GLIMPSE_LIMIT = 30;

const Index = () => {
  // Manual curation, not recency — recency is what put a database-rebuild
  // notice on the homepage. Zero selected essays hides the glimpse entirely.
  const { data: featuredEssays, isLoading } = useSelectedEssays(GLIMPSE_LIMIT);

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

      {/* The glimpse: starred essays in the owner's order, one scrolling
          row. Replaced both "Selected Analysis" (a four-card grid) and the
          Sections list (2026-10-09, owner decision) — the header nav already
          names every section, so the list repeated it. */}
      <Glimpse essays={featuredEssays} isLoading={isLoading} />
    </PageLayout>
  );
};

export default Index;
