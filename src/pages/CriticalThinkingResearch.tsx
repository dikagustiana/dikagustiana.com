import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Search, Lightbulb, Target, Zap } from 'lucide-react';

const phases = [
  {
    id: 'clarify',
    title: 'Clarify',
    description: 'What exactly is the problem? What are you assuming? What do you actually know vs. believe?',
    icon: Search,
    task: 'Write one sentence defining the problem without jargon.',
  },
  {
    id: 'analyze',
    title: 'Analyze',
    description: 'What evidence exists? Who produced it? What are their incentives? What contradicts your hypothesis?',
    icon: Lightbulb,
    task: 'List 3 sources. Rate their reliability. Identify conflicts.',
  },
  {
    id: 'construct',
    title: 'Construct',
    description: 'What argument can you build? What are the weakest points? What would change your mind?',
    icon: Target,
    task: 'Build a 3-point argument. Attack each point yourself.',
  },
  {
    id: 'apply',
    title: 'Apply',
    description: 'What action follows from your conclusion? What will you measure? When will you know if you were wrong?',
    icon: Zap,
    task: 'Define one action. Set one metric. Set a review date.',
  },
];

export default function CriticalThinkingResearch() {
  return (
    <PageLayout
      variant="content"
      role="educator"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Critical Thinking and Research' }
      ]}
      showManifesto
      manifesto="Most people accept information without examination. This is intellectual laziness. Learn to think or remain a vessel for others' ideas."
    >
      <SEO
        title="Critical Thinking and Research"
        description="Four-phase methodology for rigorous analysis: Clarify, Analyze, Construct, Apply. Stop consuming information passively."
      />
      
      <div className="container py-8">
        <div className="max-w-3xl mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Critical Thinking Framework
          </h1>
          <div className="space-y-4 text-muted-foreground">
            <p>
              <strong>The Ignorance This Fights:</strong> The belief that reading means understanding. 
              That information equals knowledge. That agreement equals truth.
            </p>
            <p>
              <strong>Why Needed Now:</strong> Information is abundant and manipulation is cheap. 
              AI generates plausible content at scale. Your only defense is rigorous thinking.
            </p>
            <p>
              <strong>How to Use:</strong> Work through each phase sequentially. Do not skip to conclusions. 
              Write your outputs. Time yourself. Review your reasoning after outcomes are known.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl">
          {phases.map((phase, index) => (
            <Link key={phase.id} to={`/critical-thinking-research/${phase.id}`}>
              <Card className="h-full hover:border-primary/50 transition-all hover:-translate-y-1 cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-muted-foreground/50">{index + 1}</span>
                    <phase.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>{phase.title}</CardTitle>
                  <CardDescription className="text-sm">{phase.description}</CardDescription>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Your Task</p>
                    <p className="text-sm">{phase.task}</p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
