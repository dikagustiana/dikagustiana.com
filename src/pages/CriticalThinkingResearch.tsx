import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useSectionPhaseCounts } from '@/hooks/queries/useSectionPhaseCounts';
import { sectionStanding } from '@/lib/sectionStanding';

// The order is the order of work, so it is kept; it is not numbered, because
// the rows are pages to visit, not steps on this page.
const phases = [
  {
    id: 'clarify',
    title: 'Clarify',
    description: 'What exactly is the problem? What are you assuming? What do you actually know vs. believe?',
  },
  {
    id: 'analyze',
    title: 'Analyze',
    description: 'What evidence exists? Who produced it? What are their incentives? What contradicts your hypothesis?',
  },
  {
    id: 'construct',
    title: 'Construct',
    description: 'What argument can you build? What are the weakest points? What would change your mind?',
  },
  {
    id: 'apply',
    title: 'Apply',
    description: 'What action follows from your conclusion? What will you measure? When will you know if you were wrong?',
  },
];

export default function CriticalThinkingResearch() {
  const { data: counts, isSuccess: countsLoaded } = useSectionPhaseCounts();

  return (
    <PageLayout
      variant="content"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Critical Thinking' }
      ]}
    >
      <SEO
        title="Critical Thinking"
        description="Four phases of working through a question: Clarify, Analyze, Construct, Apply."
      />

      <div className="container py-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">
            Critical Thinking
          </h1>

          <ul className="divide-y divide-border border-y border-border">
            {phases.map((phase) => (
              <li key={phase.id}>
                <Link
                  to={`/critical-thinking-research/${phase.id}`}
                  className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <span>
                    <span className="block text-lg font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                      {phase.title}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{phase.description}</span>
                  </span>
                  <span className="shrink-0 text-xs font-mono text-muted-foreground sm:text-right">
                    {sectionStanding(countsLoaded, counts?.['critical-thinking']?.[phase.id])}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}
