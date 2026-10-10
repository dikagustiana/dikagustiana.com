import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useSelectedEssays } from '@/hooks/queries/useSelectedEssays';
import { IndustryChainPreview } from '@/components/industry-chain';
import { Glimpse } from '@/components/home/Glimpse';
import { ReadingPath } from '@/components/argument/ReadingPath';
import { ChangedMind } from '@/components/argument/ChangedMind';
import { scrollBehavior } from '@/lib/motion';

/**
 * How many essays the glimpse carries, starred and unstarred together. The
 * row scrolls, so this is a ceiling on the query, not a layout constraint.
 */
const GLIMPSE_LIMIT = 30;

/**
 * A fragment names a section of this page: essays link to #the-argument and
 * #changed-my-mind, and About's old links arrive here with theirs (App.tsx).
 * The browser looks for the fragment before the page has drawn and finds
 * nothing, and the sections above these two change height as their data
 * arrives, so the jump is made here: once, when nothing is fetching any more,
 * clear of the sticky header, and not at all if the reader has already
 * scrolled. Measured before this existed: a fresh load of /#changed-my-mind
 * stayed at the top, with the section 3,700px down.
 */
function useFragmentOnArrival() {
  const { hash } = useLocation();
  const fetching = useIsFetching();
  // The first render counts nothing as fetching yet: the queries start after
  // it. "Nothing fetching any more" means after something was.
  const started = useRef(false);
  const done = useRef(false);

  useEffect(() => {
    if (fetching > 0) started.current = true;
    if (done.current || !started.current || fetching > 0) return;
    // Arrival ends at the first settled pass, with a fragment or without; a
    // fragment that comes later (the skip link, say) is the browser's to follow.
    done.current = true;
    if (!hash) return;
    // A hand-typed fragment need not be valid percent-encoding ("/#100%"), and
    // a throw in the frame below would be uncaught: such a one is used as typed.
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // keep it as typed
    }
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (!target || window.scrollY > 0) return;
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - header, behavior: scrollBehavior() });
    });
  }, [hash, fetching]);
}

const Index = () => {
  // Every published essay, the starred ones first in the owner's order and
  // the rest newest first (useSelectedEssays). Zero published essays hides
  // the glimpse entirely.
  const { data: selectedEssays, isLoading } = useSelectedEssays(GLIMPSE_LIMIT);
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

          What was here before is not deleted, only moved off the entrance:
          the argument and the reading path sit under the glimpse. */}
      <IndustryChainPreview />

      {/* The glimpse: every published essay, the starred ones first in the
          owner's order, one scrolling row. The Sections list that used to
          follow it was removed by owner decision on 2026-10-09
          (docs/DECISIONS.md); the header's navigation names every section. */}
      <Glimpse essays={selectedEssays} isLoading={isLoading} />

      {/* The argument in full — the case, the comparison, the objection, the
          limits and the ordered path through what exists — then the revision
          of judgment. Both came here from About when the owner removed that
          page (decision D4(a), 2026-10-10), as the same sections with the
          same ids, so a link to #the-argument or #changed-my-mind still
          lands; their copy is unchanged. About's own chain section is not
          repeated: the map at the top of this page is the same map. */}
      <ReadingPath />

      <ChangedMind />
    </PageLayout>
  );
};

export default Index;
