import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Triangle, ArrowRight } from 'lucide-react';

const phaseCards = [
  {
    slug: 'where-we-are-now',
    title: 'Where We Are Now',
    description: 'Summarize the current state: energy mix, emissions, active policies, and key barriers.',
    linkText: 'View Essays',
  },
  {
    slug: 'challenges-ahead',
    title: 'Challenges Ahead',
    description: 'Identify gaps in policy, funding, technology, infrastructure, and market readiness.',
    linkText: 'Explore Essays',
  },
  {
    slug: 'pathways-forward',
    title: 'Pathways Forward',
    description: 'Roadmap for implementation: sector priorities, sequence of initiatives, funding, and metrics.',
    linkText: 'See Essays',
  },
];

export default function GreenTransition() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero Section with full-width background */}
      <div 
        className="relative h-[60vh] min-h-[400px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1920&q=80)',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Hero Text */}
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-display font-light text-white leading-tight italic">
            Would it be green transition for the rich and energy poverty for the rest?
          </h1>
        </div>
      </div>

      {/* Phase Cards Section */}
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

      <Footer />
    </div>
  );
}
