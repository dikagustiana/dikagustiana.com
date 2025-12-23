import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function BookReader() {
  const { category, bookId } = useParams<{ category: string; bookId: string }>();

  const formatTitle = (s: string) => s?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Books and Academia', path: '/books-academia' },
              { label: formatTitle(category || ''), path: `/books/${category}` },
              { label: formatTitle(bookId || '') }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-display font-bold">
              {formatTitle(bookId || '')}
            </h1>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>

          {/* PDF Viewer Placeholder */}
          <div className="bg-card rounded-lg border border-border aspect-[3/4] flex items-center justify-center">
            <p className="text-muted-foreground">
              PDF viewer will be displayed here when a book is uploaded.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-muted-foreground">Page 1 of 1</span>
            <Button variant="outline">
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
