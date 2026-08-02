import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, AlertTriangle, Route, ArrowRight, TrendingUp } from 'lucide-react';

const phaseCards = [
  {
    slug: 'now',
    title: 'Where We Are Now',
    description: 'Current energy mix, emissions profile, existing policies, and the gap between climate commitments and economic reality.',
    icon: MapPin,
    question: 'What is the actual state—not the press releases?',
  },
  {
    slug: 'gaps',
    title: 'Challenges Ahead',
    description: 'The hard problems: stranded assets, grid stability, financing gaps, SME challenges, and the politics of transition costs.',
    icon: AlertTriangle,
    question: 'What structural barriers will block progress?',
  },
  {
    slug: 'future',
    title: 'Pathways Forward',
    description: 'What might actually work: sector priorities, policy mechanisms, financing structures, and realistic timelines.',
    icon: Route,
    question: 'Which interventions create the highest leverage?',
  },
  {
    slug: 'climate-finance',
    title: 'Climate Finance',
    description: 'The instruments, institutions, and capital flows that fund the green transition. Green bonds, carbon markets, and climate-aligned lending.',
    icon: TrendingUp,
    question: 'Who provides the capital, on what terms, and what does it achieve?',
  },
];

export default function GreenTransition() {
  return (
    <PageLayout
      role="economist"
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
        description="The economics of decarbonization. Who pays, who benefits, what trade-offs exist. Analysis of energy transition as a financial and policy problem."
      />

      {/* Page header. Was a 40vh third-party stock photograph, hot-linked at
          runtime, under a 50% black scrim with a centred white italic question
          over it. Replaced with the text header FinanceLanding.tsx:40-50
          uses. */}
      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          Green Transition
        </h1>
        <div className="mb-2 max-w-2xl">
          <p className="text-base text-muted-foreground leading-relaxed">
            The energy transition is a financial and economic problem, not just
            an environmental one. Who pays? Who benefits? Who gets left behind?
          </p>
          <p className="text-base text-muted-foreground mt-3">
            How do you decarbonize an economy without crushing growth or creating
            energy poverty? These essays work through the trade-offs, the
            stakeholders, and the realistic pathways.
          </p>
        </div>
      </div>

      {/* Phase Cards */}
      <div className="container max-w-4xl py-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-8 text-center">
          Explore by Phase
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {phaseCards.map((phase) => {
            const Icon = phase.icon;
            return (
              <Link key={phase.slug} to={`/green-transition/${phase.slug}`}>
                <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {phase.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {phase.description}
                    </p>
                    <p className="text-xs text-primary/80 italic mb-4">
                      {phase.question}
                    </p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                      View Essays
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Trade-offs Section */}
      <div className="bg-card border-t border-border py-12">
        <div className="container max-w-4xl">
          <h2 className="text-xl font-display font-semibold text-foreground mb-6 text-center">
            Trade-offs Worth Understanding
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Speed vs. Cost</h3>
                <p className="text-sm text-muted-foreground">
                  Faster transitions require larger subsidies and stranded asset write-offs. 
                  Slower transitions risk missing climate targets.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Grid Stability vs. Intermittency</h3>
                <p className="text-sm text-muted-foreground">
                  Renewables are cheap but intermittent. Storage and backup add costs. 
                  The grid needs firm capacity someone must pay for.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Domestic Industry vs. Imports</h3>
                <p className="text-sm text-muted-foreground">
                  Building local manufacturing capacity costs more but creates jobs. 
                  Importing is cheaper but creates supply chain dependency.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Efficiency vs. Equity</h3>
                <p className="text-sm text-muted-foreground">
                  Carbon pricing is economically efficient but hits poor households harder. 
                  Subsidies are less efficient but more politically sustainable.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
