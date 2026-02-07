import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, AlertTriangle, Route, ArrowRight } from 'lucide-react';

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
];

export default function GreenTransition() {
  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition' },
      ]}
    >
      <SEO
        title="Green Transition"
        description="The economics of decarbonization. Who pays, who benefits, what trade-offs exist. Analysis of energy transition as a financial and policy problem."
      />

      {/* Hero Section */}
      <div 
        className="relative h-[40vh] min-h-[280px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1920&q=80)',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center px-4 max-w-3xl">
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
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container max-w-3xl">
          <p className="text-muted-foreground text-center">
            How do you decarbonize an economy without crushing growth or creating energy poverty? 
            These essays explore the trade-offs, the stakeholders, and the realistic pathways.
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
