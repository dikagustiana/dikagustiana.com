import { useParams, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FsliSidebar } from '@/components/fsli/FsliSidebar';
import { FsliMobileSidebar } from '@/components/fsli/FsliMobileSidebar';
import { FsliMetricCard } from '@/components/fsli/FsliMetricCard';
import { FsliSection } from '@/components/fsli/FsliSection';
import { getFsliItemBySlug, fsliSections } from '@/data/fsliData';

export default function FsliDetail() {
  const { slug } = useParams<{ slug: string }>();
  const item = slug ? getFsliItemBySlug(slug) : null;

  if (!item) {
    return <Navigate to="/accounting/fsli" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Accounting', path: '/accounting' },
              { label: 'FSLI Detail', path: '/accounting/fsli' },
              { label: item.english }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="flex gap-8">
          <FsliSidebar />
          
          <div className="flex-1 min-w-0">
            <FsliMobileSidebar />

            {/* Title Section */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
                {item.english}
              </h1>
              <p className="text-xl text-muted-foreground">{item.indonesian}</p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <FsliMetricCard 
                label="December 31, 2024"
                value={item.dec2024}
                variant="primary"
              />
              <FsliMetricCard 
                label="December 31, 2023"
                value={item.dec2023}
                variant="muted"
              />
              <FsliMetricCard 
                label="Notes Reference"
                value={item.notes || 'N/A'}
                variant="accent"
              />
            </div>

            {/* Content Sections */}
            <div className="bg-card rounded-lg border border-border p-6">
              {fsliSections.map((section) => (
                <FsliSection
                  key={section.key}
                  pageSlug={slug!}
                  sectionKey={section.key}
                  title={section.title}
                  placeholder={section.placeholder}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
