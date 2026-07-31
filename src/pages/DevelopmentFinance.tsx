import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Landmark, Building2, HandCoins, Factory, Clock, User } from 'lucide-react';
import { useEssays } from '@/hooks/queries/useEssays';

const phases = [
  {
    slug: 'sovereign-wealth-funds',
    title: 'Sovereign Wealth Funds',
    description: 'How states manage and deploy national savings. Structure, mandates, governance, and the rise of Asia\'s SWFs.',
    icon: Landmark,
  },
  {
    slug: 'multilateral-development-banks',
    title: 'Multilateral Development Banks',
    description: 'The architecture of concessional lending. How IFC, ADB, and the World Bank mobilize private capital.',
    icon: Building2,
  },
  {
    slug: 'blended-finance',
    title: 'Blended Finance',
    description: 'Using public risk-taking to crowd in private investment. Structures, instruments, and real transactions.',
    icon: HandCoins,
  },
  {
    slug: 'indonesia-capital-architecture',
    title: 'Indonesia\'s Capital Architecture',
    description: 'State-owned enterprises, BUMN reform, Danantara\'s mandate, and the flow of national capital.',
    icon: Factory,
  },
];

export default function DevelopmentFinance() {
  const { data: latestEssays } = useEssays({
    section: 'development-finance',
    published: true,
    limit: 3,
  });

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Development Finance' },
      ]}
    >
      <SEO
        title="Development Finance"
        description="How public capital is deployed, at scale, to shape economies. Sovereign funds, multilateral lenders, blended finance, and the infrastructure of development."
      />

      {/* Hero */}
      <div className="bg-muted/30 border-b border-border py-16">
        <div className="container max-w-3xl text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
            Development Finance
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            How public capital is deployed, at scale, to shape economies. Sovereign funds,
            multilateral lenders, blended finance, and the infrastructure of development.
          </p>
        </div>
      </div>

      {/* Phase Cards */}
      <section className="container max-w-4xl py-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-8 text-center">
          Explore by Topic
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {phases.map((phase) => {
            const Icon = phase.icon;
            return (
              <Link key={phase.slug} to={`/development-finance/${phase.slug}`}>
                <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <Icon className="h-8 w-8 text-sky-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-sky-500 transition-colors">
                      {phase.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {phase.description}
                    </p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-sky-500 group-hover:gap-2 transition-all">
                      View Essays
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Latest Essays */}
      {latestEssays && latestEssays.length > 0 && (
        <section className="bg-card border-t border-border py-12">
          <div className="container max-w-4xl">
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
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-sky-500 transition-colors mb-1">
                    {essay.title}
                  </h3>
                  {essay.snippet && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{essay.snippet}</p>
                  )}
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
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </PageLayout>
  );
}
