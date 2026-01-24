import { Layout } from '@/components/Layout';
import { HeroSection } from '@/components/HeroSection';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, Leaf, Lightbulb } from 'lucide-react';

const learningPaths = [
  {
    icon: BarChart3,
    title: 'Finance',
    description: 'How financial models support decisions. Scenario analysis, capital allocation, and the real economics of asset-heavy businesses.',
    path: '/finance-101',
    accent: 'text-blue-500',
  },
  {
    icon: BookOpen,
    title: 'Accounting',
    description: 'Why consolidation matters, how accounting policy shapes economics, and the reality of group structures under PSAK.',
    path: '/accounting',
    accent: 'text-purple-500',
  },
  {
    icon: Leaf,
    title: 'Green Transition',
    description: 'The energy transition as a financial and economic problem—costs, incentives, constraints, and who bears the burden.',
    path: '/green-transition',
    accent: 'text-accent',
  },
  {
    icon: Lightbulb,
    title: 'The Next Big Thing',
    description: 'Speculative but reasoned essays on the forces shaping industry, finance, and policy. Critical questions, not predictions.',
    path: '/the-next-big-thing',
    accent: 'text-amber-500',
  },
];

const Index = () => {
  return (
    <Layout>
      <HeroSection 
        title="Finance and accounting explained clearly. The green transition analyzed honestly."
        subtitle="Built by someone who does the work—not just writes about it."
        ctaText="Start Learning"
      />
      
      {/* Learning Paths Section */}
      <div id="main-content" className="py-16 section-container">
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-4 text-center">
            What You'll Find Here
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto">
            Practical knowledge from real experience. No textbook definitions. No corporate jargon. 
            Just clear explanations of how things actually work.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {learningPaths.map((path) => (
            <Link key={path.path} to={path.path}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-secondary ${path.accent}`}>
                      <path.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                        {path.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {path.description}
                      </p>
                      <span className="text-sm font-medium text-accent inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        Explore
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Philosophy Section */}
      <div className="bg-secondary/50 py-16">
        <div className="section-container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground mb-6 text-center">
              Why This Exists
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Most finance and accounting content falls into two camps: oversimplified "explainers" 
                that miss the nuance, or dense textbooks that bury the insight under formality.
              </p>
              <p>
                This site is different. It's built by someone who prepares consolidated financial statements, 
                builds financial models for real decisions, and thinks seriously about what the energy 
                transition means for businesses and economies.
              </p>
              <p>
                The goal is simple: explain complex ideas clearly, highlight the trade-offs that actually 
                matter, and help you think through problems—not just memorize definitions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
