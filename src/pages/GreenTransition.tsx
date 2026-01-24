import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Triangle, ArrowRight } from 'lucide-react';

const phaseCards = [
  {
    slug: 'where-we-are-now',
    title: 'Where We Are Now',
    description: 'Current energy mix, emissions profile, existing policies, and the gap between climate commitments and economic reality.',
    linkText: 'View Essays',
  },
  {
    slug: 'challenges-ahead',
    title: 'Challenges Ahead',
    description: 'The hard problems: stranded assets, grid stability, financing gaps, SME challenges, and the politics of transition costs.',
    linkText: 'Explore Essays',
  },
  {
    slug: 'pathways-forward',
    title: 'Pathways Forward',
    description: 'What might actually work: sector priorities, policy mechanisms, financing structures, and realistic timelines.',
    linkText: 'See Essays',
  },
];

export default function GreenTransition() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero Section */}
      <div 
        className="relative h-[60vh] min-h-[400px] flex items-center justify-center bg-cover bg-center"
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

      {/* Context Section */}
      <div className="bg-secondary/50 py-12">
        <div className="container max-w-4xl">
          <h2 className="text-xl font-display font-semibold text-foreground mb-4">
            An Economic Lens on Decarbonization
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              Climate discourse often focuses on targets and timelines. But the real questions are 
              economic: How much will it cost? Who will pay? What happens to industries that can't 
              transition fast enough? What about developing economies that need cheap energy to grow?
            </p>
            <p>
              This section examines the green transition as a problem of costs, incentives, and 
              trade-offs—not as a morality play or corporate brochure.
            </p>
          </div>
        </div>
      </div>

      {/* Phase Cards */}
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {phaseCards.map((phase) => (
            <Link key={phase.slug} to={`/green-transition/${phase.slug}`}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer bg-card border-border">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <div className="w-10 h-10 rounded border border-border flex items-center justify-center">
                      <Triangle className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {phase.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {phase.description}
                  </p>
                  <span className="text-sm text-accent font-medium inline-flex items-center gap-1 group">
                    {phase.linkText}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Key Questions */}
      <div className="bg-card border-t border-border py-16">
        <div className="container max-w-4xl">
          <h2 className="text-xl font-display font-semibold text-foreground mb-6">
            Questions Worth Asking
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="border-l-2 border-accent pl-4">
                <p className="text-muted-foreground text-sm">
                  <strong className="text-foreground">Demand vs. Profitability:</strong> Consumers 
                  want green products, but are they willing to pay the premium? What happens when 
                  sustainability costs more than alternatives?
                </p>
              </div>
              <div className="border-l-2 border-accent pl-4">
                <p className="text-muted-foreground text-sm">
                  <strong className="text-foreground">SMEs vs. Large Firms:</strong> Multinationals 
                  can afford sustainability investments. Can small businesses? Who helps them transition?
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="border-l-2 border-accent pl-4">
                <p className="text-muted-foreground text-sm">
                  <strong className="text-foreground">Stranded Assets:</strong> What happens to coal 
                  plants, gas infrastructure, and fossil fuel reserves that become uneconomic before 
                  their useful life ends? Who absorbs the loss?
                </p>
              </div>
              <div className="border-l-2 border-accent pl-4">
                <p className="text-muted-foreground text-sm">
                  <strong className="text-foreground">Role of Finance:</strong> Can green bonds and 
                  ESG investing actually drive decarbonization, or are they mostly about repackaging 
                  existing capital flows?
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
