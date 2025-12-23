import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Search, Lightbulb, Target, Zap } from 'lucide-react';

const phases = [
  {
    id: 'clarify',
    title: 'Clarify',
    description: 'Define the problem clearly and identify what you need to understand.',
    icon: Search,
    color: 'text-blue-500',
  },
  {
    id: 'analyze',
    title: 'Analyze',
    description: 'Break down complex information and examine evidence objectively.',
    icon: Lightbulb,
    color: 'text-yellow-500',
  },
  {
    id: 'construct',
    title: 'Construct',
    description: 'Build logical arguments and synthesize information into insights.',
    icon: Target,
    color: 'text-green-500',
  },
  {
    id: 'apply',
    title: 'Apply',
    description: 'Put your conclusions into action and evaluate outcomes.',
    icon: Zap,
    color: 'text-purple-500',
  },
];

export default function CriticalThinkingResearch() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Critical Thinking and Research' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Think Like a Detective
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sharpen your critical thinking and research skills to analyze any piece of information.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {phases.map((phase) => (
            <Link key={phase.id} to={`/critical-thinking-research/${phase.id}`}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardHeader className="text-center">
                  <phase.icon className={`h-12 w-12 mx-auto mb-2 ${phase.color}`} />
                  <CardTitle>{phase.title}</CardTitle>
                  <CardDescription>{phase.description}</CardDescription>
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
