import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ContentCard } from '@/components/ContentCard';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, AlertTriangle, Route } from 'lucide-react';

const phaseCards = [
  {
    slug: 'now',
    title: 'Where We Are Now',
    description: 'Current energy mix, emissions profile, existing policies, and the gap between climate commitments and economic reality.',
    icon: MapPin,
    whoBenefits: 'Data providers, consultants, incumbents claiming green credentials',
    whoLoses: 'Those waiting for clarity before acting',
  },
  {
    slug: 'gaps',
    title: 'Challenges Ahead',
    description: 'The hard problems: stranded assets, grid stability, financing gaps, SME challenges, and the politics of transition costs.',
    icon: AlertTriangle,
    whoBenefits: 'First movers who solve infrastructure bottlenecks',
    whoLoses: 'Asset owners in carbon-intensive sectors',
  },
  {
    slug: 'future',
    title: 'Pathways Forward',
    description: 'What might actually work: sector priorities, policy mechanisms, financing structures, and realistic timelines.',
    icon: Route,
    whoBenefits: 'Countries and firms that invest early in transition infrastructure',
    whoLoses: 'Late movers facing higher costs and stranded capital',
  },
];

export default function GreenTransition() {
  return (
    <PageLayout
      role="economist"
      showManifesto
      manifesto="The green transition is an economic problem—not just an environmental one."
    >
      <SEO
        title="Green Transition"
        description="The economics of decarbonization. Who pays, who benefits, what trade-offs exist. Analysis of energy transition as a financial and policy problem."
      />

      {/* Hero Section */}
      <div 
        className="relative h-[50vh] min-h-[350px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1920&q=80)',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-display font-light text-white leading-tight italic mb-6">
            Would it be green transition for the rich and energy poverty for the rest?
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            The energy transition is a financial and economic problem—not just an environmental one. 
            Who pays? Who benefits? Who gets left behind?
          </p>
        </div>
      </div>

      {/* Core Question */}
      <div className="bg-amber-500/5 border-y border-amber-500/20 py-8">
        <div className="container max-w-4xl">
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase mb-2">The Core Question</p>
              <p className="text-foreground">How do you decarbonize an economy without crushing growth or creating energy poverty?</p>
            </div>
            <div>
              <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-2">Who Benefits</p>
              <p className="text-muted-foreground">Renewable developers, grid infrastructure builders, carbon credit traders, first-mover manufacturers</p>
            </div>
            <div>
              <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase mb-2">Who Loses</p>
              <p className="text-muted-foreground">Coal regions, energy-intensive SMEs, developing economies needing cheap power, stranded asset holders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase Cards */}
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {phaseCards.map((phase) => (
            <ContentCard
              key={phase.slug}
              title={phase.title}
              description={phase.description}
              icon={phase.icon}
              linkUrl={`/green-transition/${phase.slug}`}
              linkText="View Essays"
              role="economist"
              whoBenefits={phase.whoBenefits}
              whoLoses={phase.whoLoses}
            />
          ))}
        </div>
      </div>

      {/* Trade-offs Section */}
      <div className="bg-card border-t border-border py-16">
        <div className="container max-w-4xl">
          <h2 className="text-xl font-display font-semibold text-foreground mb-6">
            Trade-offs Worth Understanding
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Speed vs. Cost</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Faster transitions require larger subsidies and stranded asset write-offs. 
                  Slower transitions risk missing climate targets.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Second-order effect: Political backlash if transition costs fall on consumers too fast
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Grid Stability vs. Intermittency</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Renewables are cheap but intermittent. Storage and backup add costs. 
                  The grid needs firm capacity someone must pay for.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Second-order effect: Underinvestment in grid creates bottlenecks for renewable deployment
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Domestic Industry vs. Imports</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Building local manufacturing capacity costs more but creates jobs. 
                  Importing is cheaper but creates supply chain dependency.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Second-order effect: Carbon border adjustments may reshape global trade flows
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Efficiency vs. Equity</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Carbon pricing is economically efficient but hits poor households harder. 
                  Subsidies are less efficient but more politically sustainable.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Second-order effect: Revenue recycling design determines political durability
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
