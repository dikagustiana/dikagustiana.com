import { Layout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FeatureCard } from '@/components/FeatureCard';

export default function MasyarakatBaru() {
  return (
    <Layout>
      <div className="py-8 section-container">
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Masyarakat Baru' }]} />
        <h1 className="text-3xl font-display font-bold mb-4">Masyarakat Baru</h1>
        <p className="text-muted-foreground max-w-3xl mb-12">
          A collection of resources for building knowledge in language, academia, and critical thinking - essential skills for the modern learner.
        </p>
        
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            title="English IELTS"
            description="Prepare for your IELTS examination with comprehensive resources covering all four skills: reading, writing, listening, and speaking."
            icon="Globe"
            linkUrl="/masyarakat-baru/english-ielts"
            linkText="Start Learning"
          />
          <FeatureCard
            title="Books and Academia"
            description="Explore curated book recommendations and academic resources to deepen your understanding across various subjects."
            icon="BookOpen"
            linkUrl="/masyarakat-baru/books-academia"
            linkText="Browse Books"
          />
          <FeatureCard
            title="Critical Thinking and Research"
            description="Develop essential analytical skills and research methodologies for academic and professional success."
            icon="Lightbulb"
            linkUrl="/masyarakat-baru/critical-thinking-research"
            linkText="Explore"
          />
        </div>
      </div>
    </Layout>
  );
}
