import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { trackerIssues } from '@/data/trackerIssues';
import { useSectionPhaseCounts } from '@/hooks/queries/useSectionPhaseCounts';
import { sectionStanding } from '@/lib/sectionStanding';

// `dbPhase` is the value stored in essays.phase; the URL slug for the first
// three is shorter (see GreenTransitionPhase.phaseMapping).
const phases = [
  {
    slug: 'now',
    dbPhase: 'where-we-are-now',
    title: 'Where We Are Now',
    description: 'Current energy mix, emissions profile, existing policies, and the gap between climate commitments and economic reality.',
  },
  {
    slug: 'gaps',
    dbPhase: 'challenges-ahead',
    title: 'Challenges Ahead',
    description: 'The hard problems: stranded assets, grid stability, financing gaps, SME challenges, and the politics of transition costs.',
  },
  {
    slug: 'future',
    dbPhase: 'pathways-forward',
    title: 'Pathways Forward',
    description: 'What might actually work: sector priorities, policy mechanisms, financing structures, and realistic timelines.',
  },
  {
    slug: 'climate-finance',
    dbPhase: 'climate-finance',
    title: 'Climate Finance',
    description: 'The instruments, institutions, and capital flows that fund the green transition.',
  },
];

export default function GreenTransition() {
  const { data: counts, isSuccess: countsLoaded } = useSectionPhaseCounts();

  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition' },
      ]}
      subNav={{
        tabs: GREEN_TRANSITION_TABS,
      }}
    >
      <SEO
        title="Green Transition"
        description="This section examines the economics of the energy transition and the policy choices behind it."
      />

      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          Green Transition
        </h1>
        <p className="mb-8 max-w-2xl text-base text-muted-foreground leading-relaxed">
          How Indonesia's energy transition gets paid for: who carries the cost, who captures the
          return, and which constraint actually binds on a given asset.
        </p>

        <ul className="divide-y divide-border border-y border-border">
          {phases.map((phase) => (
            <li key={phase.slug}>
              <Link
                to={`/green-transition/${phase.slug}`}
                className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <span>
                  <span className="block text-lg font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                    {phase.title}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{phase.description}</span>
                </span>
                <span className="shrink-0 text-xs font-mono text-muted-foreground sm:text-right">
                  {sectionStanding(countsLoaded, counts?.['green-transition']?.[phase.dbPhase])}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              to="/green-transition/tracker"
              className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span>
                <span className="block text-lg font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                  Transition Tracker
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Quarterly readings of Indonesia's energy transition, January–June 2025, with dated corrections.
                </span>
              </span>
              {/* Not in `essays`, so it has no count from the hook above. */}
              <span className="shrink-0 text-xs font-mono text-muted-foreground sm:text-right">
                {trackerIssues.length} {trackerIssues.length === 1 ? 'issue' : 'issues'} · paused
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </PageLayout>
  );
}
