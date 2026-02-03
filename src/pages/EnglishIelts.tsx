import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones, BookOpen, Pencil, MessageCircle, Clock, Target } from 'lucide-react';

const skills = [
  {
    title: 'Listening',
    targetScore: 'Band 7.0+',
    timeRequired: '40 minutes per session',
    task: 'Complete 4 sections, 40 questions. Answer while listening.',
    method: 'Predict answers before audio. Write during audio. Transfer at end.',
    icon: Headphones,
  },
  {
    title: 'Reading',
    targetScore: 'Band 7.0+',
    timeRequired: '60 minutes total',
    task: '3 passages, 40 questions. No extra transfer time.',
    method: 'Skim first. Locate keywords. Answer in passage order.',
    icon: BookOpen,
  },
  {
    title: 'Writing',
    targetScore: 'Band 7.0+',
    timeRequired: 'Task 1: 20 min | Task 2: 40 min',
    task: 'Task 1: 150+ words. Task 2: 250+ words. Band 7 = 25% complex sentences.',
    method: '5 min planning. 4 paragraphs Task 2. Proofread last 3 min.',
    icon: Pencil,
  },
  {
    title: 'Speaking',
    targetScore: 'Band 7.0+',
    timeRequired: '11-14 minutes exam',
    task: 'Part 1: Personal. Part 2: 2-min monologue. Part 3: Abstract discussion.',
    method: 'Extend answers naturally. Use discourse markers. Self-correct visibly.',
    icon: MessageCircle,
  },
];

export default function EnglishIelts() {
  return (
    <PageLayout 
      role="coach"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'IELTS Preparation' }
      ]}
      showManifesto
      manifesto="A score is the only measure. Everything else is preparation."
    >
      <SEO 
        title="IELTS Preparation"
        description="Band 7+ methodology for IELTS. Time limits, task protocols, scoring criteria. Structured exam preparation."
      />

      <main className="container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            IELTS Preparation: Band 7+ Methodology
          </h1>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target: Band 7.0+
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Exam Duration: 2h 45min
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {skills.map((skill) => (
            <Card key={skill.title} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <skill.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{skill.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Target</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">{skill.targetScore}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Time</p>
                    <p className="font-medium">{skill.timeRequired}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Task Description</p>
                  <p className="text-sm">{skill.task}</p>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Method</p>
                  <p className="text-sm text-foreground">{skill.method}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 max-w-2xl mx-auto">
          <Card className="bg-muted/30">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-3">Scoring Criteria (All Skills)</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><strong>Band 6:</strong> Competent user. Some inaccuracies, misunderstandings in unfamiliar contexts.</li>
                <li><strong>Band 7:</strong> Good user. Occasional inaccuracies. Handles complex language well.</li>
                <li><strong>Band 8:</strong> Very good user. Only occasional unsystematic inaccuracies.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </PageLayout>
  );
}
