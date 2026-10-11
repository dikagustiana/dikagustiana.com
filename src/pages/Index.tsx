import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useSelectedEssays } from '@/hooks/queries/useSelectedEssays';
import { IndustryChainPreview } from '@/components/industry-chain';
import { Glimpse } from '@/components/home/Glimpse';
import { useFragmentOnArrival } from '@/hooks/useFragmentOnArrival';

/**
 * How many essays the glimpse carries, starred and unstarred together. The
 * row runs (or, for a reader who asked for reduced motion, scrolls), so this
 * is a ceiling on the query, not a layout constraint.
 */
const GLIMPSE_LIMIT = 30;

const Index = () => {
  // Every published essay, the starred ones first in the owner's order and
  // the rest newest first (useSelectedEssays). Zero published essays hides
  // the glimpse entirely.
  const { data: selectedEssays, isLoading } = useSelectedEssays(GLIMPSE_LIMIT);
  // A fragment names a section of this page (#industry-chain, the map), and
  // About's old links arrive here with theirs (App.tsx). The page draws from
  // queries, so the jump is made once they settle, not by the browser.
  useFragmentOnArrival();

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
          With the world flag on (VITE_WORLD_KAWASAN) this slot is the
          Kawasan Industri world; the page around it does not move.

          What stood here before was moved under the glimpse first; the
          argument, its reading path and the revision of judgment were then
          removed by owner decision on 2026-10-11 (docs/DECISIONS.md). */}
      <IndustryChainPreview />

      {/* The glimpse: every published essay, the starred ones first in the
          owner's order, one running row, and the last section of the page.
          The Sections list that used to follow it was removed by owner
          decision on 2026-10-09, and the two sections About left here, the
          argument and the revision of judgment, on 2026-10-11
          (docs/DECISIONS.md); the header's navigation names every section. */}
      <Glimpse essays={selectedEssays} isLoading={isLoading} />
    </PageLayout>
  );
};

export default Index;
