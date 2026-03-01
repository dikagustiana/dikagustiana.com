import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { useEssays } from '@/hooks/queries/useEssays';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { Banknote, BarChart3, HandCoins, Flame, Building2, Factory, Clock, User, ArrowRight } from 'lucide-react';

const concepts = [
  {
    title: 'Green Bonds',
    description: 'Fixed-income instruments where proceeds are earmarked for climate and environmental projects.',
    icon: Banknote,
  },
  {
    title: 'Carbon Markets',
    description: 'Compliance and voluntary systems that put a price on greenhouse gas emissions.',
    icon: BarChart3,
  },
  {
    title: 'Blended Finance for Climate',
    description: 'Combining concessional and commercial capital to de-risk green investments.',
    icon: HandCoins,
  },
  {
    title: 'JETP (Just Energy Transition Partnerships)',
    description: 'Country-level financing packages to accelerate coal phase-out in emerging markets.',
    icon: Flame,
  },
  {
    title: 'Climate-Aligned Lending',
    description: 'How banks and DFIs embed climate criteria into credit and investment decisions.',
    icon: Building2,
  },
  {
    title: 'Transition Finance',
    description: 'Financing high-emitting sectors to move toward low-carbon operations.',
    icon: Factory,
  },
];

export default function ClimateFinance() {
  const { data: essays, isLoading } = useEssays({
    section: 'green-transition',
    phase: 'climate-finance',
    published: true,
  });

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition', path: '/green-transition' },
        { label: 'Climate Finance' },
      ]}
      subNav={{
        tabs: GREEN_TRANSITION_TABS,
        backLink: { label: 'Green Transition', path: '/green-transition' },
      }}
    >
      <SEO
        title="Climate Finance — Green Transition"
        description="The instruments, institutions, and capital flows that fund the green transition. Green bonds, carbon markets, climate-aligned lending, and the cost of decarbonization."
      />

      {/* Hero */}
      <div className="bg-muted/30 border-b border-border py-16">
        <div className="container max-w-3xl text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
            Climate Finance
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The instruments, institutions, and capital flows that fund the green transition.
            Green bonds, carbon markets, climate-aligned lending, and the cost of decarbonization.
          </p>
        </div>
      </div>

      {/* Concepts Grid */}
      <section className="container max-w-5xl py-12">
        <h2 className="text-xl font-display font-semibold text-foreground mb-8 text-center">
          Key Instruments & Concepts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {concepts.map((concept) => {
            const Icon = concept.icon;
            return (
              <Card key={concept.title} className="h-full">
                <CardContent className="p-6">
                  <Icon className="h-6 w-6 text-accent mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">{concept.title}</h3>
                  <p className="text-sm text-muted-foreground">{concept.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Callout */}
      <div className="bg-accent/5 border-y border-accent/20 py-8">
        <div className="container max-w-3xl text-center">
          <p className="text-muted-foreground italic">
            Indonesia's green transition requires ~$25B/year in climate investment through 2030.
            This track examines who provides it, on what terms, and what it achieves.
          </p>
        </div>
      </div>

      {/* Essays */}
      <section className="container max-w-4xl py-12">
        <h2 className="text-xl font-display font-semibold text-foreground mb-8">
          Essays
        </h2>

        {isLoading ? (
          <p className="text-muted-foreground">Loading essays...</p>
        ) : essays && essays.length > 0 ? (
          <div className="divide-y divide-border">
            {essays.map((essay) => (
              <Link
                key={essay.id}
                to={`/green-transition/climate-finance/${essay.slug}`}
                className="block py-6 first:pt-0 last:pb-0 group"
              >
                <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors mb-1">
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
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No essays published in this track yet.</p>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
