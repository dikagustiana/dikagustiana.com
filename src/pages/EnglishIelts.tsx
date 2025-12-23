import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones, BookOpen, Pencil, MessageCircle } from 'lucide-react';

const skills = [
  {
    title: 'Listening',
    description: 'Master the art of understanding spoken English in various accents and contexts.',
    icon: Headphones,
  },
  {
    title: 'Reading',
    description: 'Develop strategies to comprehend complex texts efficiently and accurately.',
    icon: BookOpen,
  },
  {
    title: 'Writing',
    description: 'Learn to express ideas clearly in academic and general writing tasks.',
    icon: Pencil,
  },
  {
    title: 'Speaking',
    description: 'Build confidence in spoken English for interviews and conversations.',
    icon: MessageCircle,
  },
];

export default function EnglishIelts() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'English - IELTS' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            From Zero to 7.5
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Follow a guided path to build your English step by step — all the way to achieving your IELTS dream score.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {skills.map((skill) => (
            <Card key={skill.title} className="h-full hover:shadow-lg transition-all hover:-translate-y-1">
              <CardHeader className="text-center">
                <skill.icon className="h-12 w-12 mx-auto mb-2 text-primary" />
                <CardTitle>{skill.title}</CardTitle>
                <CardDescription>{skill.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            More content coming soon. Start your IELTS journey today!
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
