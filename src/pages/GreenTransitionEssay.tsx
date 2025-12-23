import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

export default function GreenTransitionEssay() {
  const { phase, slug } = useParams<{ phase: string; slug: string }>();
  const { isAdmin } = useAuth();

  const formatTitle = (s: string) => s?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Essay';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Green Transition', path: '/green-transition' },
              { label: formatTitle(phase || ''), path: `/green-transition/${phase}` },
              { label: formatTitle(slug || '') }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <article className="max-w-3xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                {formatTitle(slug || '')}
              </h1>
              {isAdmin && (
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            <div className="mt-4 flex items-center gap-4 text-muted-foreground text-sm">
              <span>By Dika Gustiana</span>
              <span>•</span>
              <span>5 min read</span>
            </div>
          </header>

          <div className="prose prose-invert max-w-none">
            <p className="text-muted-foreground italic">
              This essay content is being developed. Check back soon for comprehensive insights on this topic.
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
