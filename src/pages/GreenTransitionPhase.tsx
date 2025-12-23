import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const phaseDetails: Record<string, { title: string; subtitle: string }> = {
  'now': { title: 'Where We Are Now', subtitle: 'Understanding the current state of global sustainability efforts.' },
  'gaps': { title: 'Challenges Ahead', subtitle: 'Identifying the barriers and gaps in our transition to sustainability.' },
  'future': { title: 'Pathways Forward', subtitle: 'Exploring solutions and opportunities for a greener future.' },
  'where-we-are-now': { title: 'Where We Are Now', subtitle: 'Understanding the current state of global sustainability efforts.' },
  'challenges-ahead': { title: 'Challenges Ahead', subtitle: 'Identifying the barriers and gaps in our transition to sustainability.' },
  'pathways-forward': { title: 'Pathways Forward', subtitle: 'Exploring solutions and opportunities for a greener future.' },
};

const sampleEssays = [
  { slug: 'renewable-energy-transition', title: 'The Renewable Energy Transition', description: 'How the world is shifting from fossil fuels to clean energy.' },
  { slug: 'carbon-neutrality', title: 'Achieving Carbon Neutrality', description: 'Strategies for businesses to reach net-zero emissions.' },
  { slug: 'sustainable-finance', title: 'Sustainable Finance', description: 'The role of ESG investing in driving environmental change.' },
];

export default function GreenTransitionPhase() {
  const { phase } = useParams<{ phase: string }>();
  const details = phase ? phaseDetails[phase] : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Green Transition', path: '/green-transition' },
              { label: details?.title || 'Phase' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {details?.title || 'Green Transition Phase'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {details?.subtitle || 'Explore essays and insights on this topic.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {sampleEssays.map((essay) => (
            <Link key={essay.slug} to={`/green-transition/${phase}/${essay.slug}`}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{essay.title}</CardTitle>
                  <CardDescription>{essay.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
