import { Layout } from '@/components/Layout';
import { HeroSection } from '@/components/HeroSection';

const Index = () => {
  return (
    <Layout>
      <HeroSection 
        title="Every Great Story Begins with Someone Who Was Scared but Did It Anyway"
        subtitle="Just begin. Messy, nervous, unsure. That's how the best stories start"
        ctaText="Choose Your Path"
      />
      <div id="main-content" className="py-16 section-container">
        <div className="text-center">
          <p className="text-muted-foreground">Explore our learning modules above</p>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
