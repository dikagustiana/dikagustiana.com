import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const phaseDetails: Record<string, { title: string; subtitle: string }> = {
  'clarify': { title: 'Clarify', subtitle: 'Define the problem clearly and identify what you need to understand.' },
  'analyze': { title: 'Analyze', subtitle: 'Break down complex information and examine evidence objectively.' },
  'construct': { title: 'Construct', subtitle: 'Build logical arguments and synthesize information into insights.' },
  'apply': { title: 'Apply', subtitle: 'Put your conclusions into action and evaluate outcomes.' },
};

const sampleEssays = [
  { id: 'essay-1', title: 'Introduction to Critical Thinking', description: 'Foundational concepts for developing analytical skills.' },
  { id: 'essay-2', title: 'Evidence Evaluation', description: 'How to assess the quality and reliability of information.' },
  { id: 'essay-3', title: 'Logical Fallacies', description: 'Common reasoning errors and how to avoid them.' },
];

export default function CriticalThinkingPhase() {
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
              { label: 'Critical Thinking and Research', path: '/critical-thinking-research' },
              { label: details?.title || 'Phase' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {details?.title || 'Critical Thinking Phase'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {details?.subtitle || 'Explore essays and insights on this topic.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {sampleEssays.map((essay) => (
            <Link key={essay.id} to={`/critical-thinking-research/${phase}/${essay.id}`}>
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
