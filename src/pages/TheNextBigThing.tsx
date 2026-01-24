import { Layout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { EssayModule } from '@/components/next-big-thing/EssayModule';

export default function TheNextBigThing() {
  return (
    <Layout>
      {/* Hero Section */}
      <div 
        className="relative h-[50vh] min-h-[350px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80)',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-primary/70" />
        
        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-display font-light text-white leading-tight italic">
            What's the next big thing that will shape our world?
          </h1>
          <p className="mt-6 text-white/80 text-lg max-w-2xl mx-auto">
            Essays exploring emerging trends, transformative ideas, and the forces shaping tomorrow
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-secondary border-b border-border">
        <div className="container py-3">
          <Breadcrumb
            items={[
              { label: 'Home', path: '/' },
              { label: 'The Next Big Thing' },
            ]}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-12">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-2">
            Essays & Analysis
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Deep dives into the ideas and trends defining our future
          </p>
        </div>

        {/* Essay Module */}
        <EssayModule />
      </main>
    </Layout>
  );
}
