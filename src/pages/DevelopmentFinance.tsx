import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useEssays } from '@/hooks/queries/useEssays';
import { useSectionPhaseCounts } from '@/hooks/queries/useSectionPhaseCounts';
import { sectionStanding } from '@/lib/sectionStanding';

const phases = [
  {
    slug: 'sovereign-wealth-funds',
    title: 'Sovereign Wealth Funds',
    description: 'How states manage and deploy national savings. Structure, mandates, governance, and the rise of Asia\'s SWFs.',
  },
  {
    slug: 'multilateral-development-banks',
    title: 'Multilateral Development Banks',
    description: 'The architecture of concessional lending. How IFC, ADB, and the World Bank mobilize private capital.',
  },
  {
    slug: 'blended-finance',
    title: 'Blended Finance',
    description: 'Using public risk-taking to crowd in private investment. Structures, instruments, and real transactions.',
  },
  {
    slug: 'indonesia-capital-architecture',
    title: 'Indonesia\'s Capital Architecture',
    description: 'State-owned enterprises, BUMN reform, Danantara\'s mandate, and the flow of national capital.',
  },
];

export default function DevelopmentFinance() {
  const { data: latestEssays } = useEssays({
    section: 'development-finance',
    published: true,
    limit: 3,
  });
  const { data: counts, isSuccess: countsLoaded } = useSectionPhaseCounts();

  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Development Finance' },
      ]}
    >
      <SEO
        title="Development Finance"
        description="How sovereign funds and multilateral lenders put public capital to work in developing economies."
      />

      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          Development Finance
        </h1>
        <p className="mb-8 max-w-2xl text-base text-muted-foreground leading-relaxed">
          How public capital is deployed, at scale, to shape economies. Sovereign funds,
          multilateral lenders, blended finance, and the infrastructure of development.
        </p>

        <ul className="divide-y divide-border border-y border-border">
          {phases.map((phase) => (
            <li key={phase.slug}>
              <Link
                to={`/development-finance/${phase.slug}`}
                className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <span>
                  <span className="block text-lg font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                    {phase.title}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{phase.description}</span>
                </span>
                <span className="shrink-0 text-xs font-mono text-muted-foreground sm:text-right">
                  {sectionStanding(countsLoaded, counts?.['development-finance']?.[phase.slug])}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {latestEssays && latestEssays.length > 0 && (
        <section className="bg-card border-t border-border py-12">
          <div className="container max-w-3xl">
            <h2 className="text-xl font-display font-semibold text-foreground mb-8">
              Latest Essays
            </h2>
            <div className="divide-y divide-border">
              {latestEssays.map((essay) => (
                <Link
                  key={essay.id}
                  to={`/development-finance/${essay.phase}/${essay.slug}`}
                  className="block py-6 first:pt-0 last:pb-0 group"
                >
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors mb-1">
                    {essay.title}
                  </h3>
                  {essay.snippet && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{essay.snippet}</p>
                  )}
                  {(essay.author || essay.read_time) && (
                    <p className="text-xs text-muted-foreground">
                      {[essay.author, essay.read_time].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </PageLayout>
  );
}
