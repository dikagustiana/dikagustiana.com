import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { useTrackerEntries } from '@/hooks/queries/useTrackerEntries';
import { useFragmentOnArrival } from '@/hooks/useFragmentOnArrival';
import { TRACKER_QUARTERS, TRACKER_STANDFIRST, numberSources } from '@/lib/tracker';
import { SectorRegister } from '@/components/tracker/SectorRegister';
import { IssueSection } from '@/components/tracker/IssueSection';
import { SourceList } from '@/components/tracker/SourceList';
import { ChainSection } from '@/components/transition/ChainSection';
import { useChain, useChartModels } from '@/hooks/queries/useTransition';

/**
 * Indonesia Green Transition Tracker: the per-sector data appendix to the
 * current-condition essay series (PRD Part B, D5).
 *
 * Top to bottom, as PRD §B5 orders it: title and standfirst, one status line,
 * the chain of sourced charts once any is published (the transition data
 * layer, docs/prd/transition-data-layer), the sector register, the two quarters as short essays (newest first), and
 * the numbered sources. Every finding is a `tracker_entry` row, sourced to a
 * primary document and signed off (docs/spec/tracker_sources.md). The
 * standfirst and the two issue titles are the only copy written here, and
 * each says only what the entries below it say.
 *
 * Serif headings, sans body, no monospace, no bordered cards; sections are
 * divided by a single hairline. The column is the essay column, 728px.
 */
export default function GreenTransitionTracker() {
  const { data: entries, isLoading, isError, refetch } = useTrackerEntries();
  const chain = useChain();
  const transition = useChartModels();
  useFragmentOnArrival();

  const rows = entries ?? [];
  const { ordered, numberOf } = numberSources(rows);
  const unpublished = rows.filter((e) => !e.published).length;
  const newestFirst = [...TRACKER_QUARTERS].reverse();

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition', path: '/green-transition' },
        { label: 'Transition Tracker' },
      ]}
      subNav={{ tabs: GREEN_TRANSITION_TABS }}
    >
      <SEO
        title="Indonesia Green Transition Tracker"
        description="What Indonesian energy-transition policy did in January–June 2025, sector by sector, each finding sourced to the regulation, plan or official release itself."
      />

      <div className="container py-10">
        <div className="editorial-column space-y-10">
          <header>
            <h1 className="text-3xl font-semibold text-foreground">Indonesia Green Transition Tracker</h1>
            <p className="mt-4 font-sans text-[19px] leading-[1.6] text-prose-fg">{TRACKER_STANDFIRST}</p>
            <p className="mt-4 text-base text-muted-foreground">
              Covers January–June 2025. Not updated since.{' '}
              <Link
                to="/green-transition/current-condition"
                className="text-accent underline underline-offset-2 hover:opacity-80"
              >
                Continued in the current-condition essay series&nbsp;→
              </Link>
            </p>
          </header>

          {/* The sourced series, by link of the chain. Shown once a chart is
              published; until then the page is the register alone. */}
          {transition.charts.length > 0 && (chain.data?.length ?? 0) > 0 && (
            <ChainSection chain={chain.data ?? []} charts={transition.charts} status={transition.status} entries={rows} />
          )}

          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading the register">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState message="The register could not be loaded." onRetry={() => void refetch()} />
          ) : rows.length === 0 ? (
            <p className="border-t border-border pt-10 text-base text-muted-foreground">
              No entry is published yet.
            </p>
          ) : (
            <>
              <section aria-labelledby="register-title" className="border-t border-border pt-10">
                <h2 id="register-title" className="text-2xl text-foreground">
                  Sector register
                </h2>
                <p className="mt-2 text-base text-muted-foreground">
                  What each sector&rsquo;s primary documents record for each quarter. Open a sector for the detail.
                </p>
                {unpublished > 0 && (
                  <p className="mt-2 text-base text-foreground" role="note">
                    Admin view: {unpublished} of {rows.length} entries are not published. Readers see only published
                    entries.
                  </p>
                )}
                <div className="mt-6">
                  <SectorRegister entries={rows} numberOf={numberOf} />
                </div>
              </section>

              {newestFirst.map((quarter) => (
                <IssueSection key={quarter.key} quarter={quarter} entries={rows} numberOf={numberOf} />
              ))}

              <SourceList sources={ordered} />
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
