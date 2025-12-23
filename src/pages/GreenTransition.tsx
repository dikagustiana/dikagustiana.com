import { Layout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FeatureCard } from '@/components/FeatureCard';

export default function GreenTransition() {
  return (
    <Layout>
      <div className="py-8 section-container">
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Green Transition' }]} />
        <h1 className="text-3xl font-display font-bold mb-4">Green Transition</h1>
        <p className="text-muted-foreground max-w-3xl mb-12">
          Explore sustainable finance, environmental initiatives, and the transition to a greener economy.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <FeatureCard
            title="Sustainable Finance"
            description="Understanding ESG investing, green bonds, and sustainable financial instruments for the modern investor."
            icon="Leaf"
          />
          <FeatureCard
            title="Climate Economics"
            description="Explore the economic implications of climate change and the transition to renewable energy sources."
            icon="Globe"
          />
        </div>
      </div>
    </Layout>
  );
}
