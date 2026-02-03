import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { FeatureCard } from '@/components/FeatureCard';

export default function MasyarakatBaru() {
  return (
    <PageLayout
      variant="content"
      role="educator"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Masyarakat Baru' }
      ]}
      showManifesto
      manifesto="Education is not consumption—it is construction. Build your capacity or remain ignorant."
    >
      <SEO
        title="Masyarakat Baru"
        description="Resources for building knowledge in language, academia, and critical thinking. Essential capabilities for the modern learner."
      />
      
      <div className="py-8 section-container">
        <h1 className="text-3xl font-display font-bold mb-4">Masyarakat Baru</h1>
        
        <div className="prose prose-sm max-w-3xl mb-12">
          <p className="text-muted-foreground">
            Three capabilities. Language opens doors. Books build frameworks. Critical thinking prevents manipulation.
          </p>
          <p className="text-muted-foreground mt-2">
            Do not browse. Pick one. Master it before moving to the next.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            title="English IELTS"
            description="Band 7+ in 12 weeks. 4 skills. Structured practice protocols. No motivation—only method."
            icon="Globe"
            linkUrl="/masyarakat-baru/english-ielts"
            linkText="Start Preparation"
          />
          <FeatureCard
            title="Books and Academia"
            description="Curated readings that fight specific ignorance. How to read. What to skip. What capability you gain."
            icon="BookOpen"
            linkUrl="/masyarakat-baru/books-academia"
            linkText="Access Library"
          />
          <FeatureCard
            title="Critical Thinking and Research"
            description="Four phases: Clarify, Analyze, Construct, Apply. Stop accepting information passively."
            icon="Lightbulb"
            linkUrl="/masyarakat-baru/critical-thinking-research"
            linkText="Begin Training"
          />
        </div>
      </div>
    </PageLayout>
  );
}
