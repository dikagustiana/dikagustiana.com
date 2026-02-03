import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { EssayModule } from '@/components/next-big-thing/EssayModule';

export default function TheNextBigThing() {
  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'The Next Big Thing' },
      ]}
      showManifesto
      manifesto="Rigorous speculation about structural economic change."
    >
      <SEO
        title="The Next Big Thing"
        description="Speculative but reasoned essays on emerging forces in industry, finance, and policy. Critical questions, not predictions. Winners, losers, and second-order effects."
      />

      {/* Hero Section */}
      <div 
        className="relative h-[45vh] min-h-[300px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80)',
        }}
      >
        <div className="absolute inset-0 bg-primary/70" />
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-display font-light text-white leading-tight italic">
            What's the next big thing that will reshape industries?
          </h1>
          <p className="mt-6 text-white/80 text-lg max-w-2xl mx-auto">
            Speculative but reasoned essays on emerging forces in industry, finance, and policy. 
            Critical questions, not predictions.
          </p>
        </div>
      </div>

      {/* Economist Frame */}
      <div className="bg-amber-500/5 border-y border-amber-500/20 py-6">
        <div className="container max-w-4xl">
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase mb-2">The Core Question</p>
              <p className="text-foreground">Which structural shifts will create new winners and losers in the next decade?</p>
            </div>
            <div>
              <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-2">Who Benefits</p>
              <p className="text-muted-foreground">Those who identify shifts early, position capital accordingly, and build optionality</p>
            </div>
            <div>
              <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase mb-2">Who Loses</p>
              <p className="text-muted-foreground">Incumbents who dismiss disruption, late movers, and those betting on stability</p>
            </div>
          </div>
        </div>
      </div>

      {/* Philosophy Section */}
      <div className="bg-muted/30 py-8">
        <div className="container max-w-3xl">
          <p className="text-muted-foreground text-center">
            This is an ideas laboratory—not a blog, not a prediction service. The goal is to think 
            seriously about forces that might reshape how we work, invest, and organize. Some ideas 
            will be wrong. The value is in the reasoning, not the conclusions.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-12">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-2">
            Essays & Analysis
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Explorations of technology shifts, policy experiments, market structure changes, 
            and economic forces that might matter in the next decade.
          </p>
        </div>

        <EssayModule />
      </main>
    </PageLayout>
  );
}
