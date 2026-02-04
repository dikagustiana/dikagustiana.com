import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingState, EmptyState } from '@/components/states';
import { Plus, ArrowLeft, ArrowRight, User, Clock } from 'lucide-react';

const phaseDetails: Record<string, { title: string; coreQuestion: string; section: string }> = {
  'where-we-are-now': { 
    title: 'Where We Are Now', 
    coreQuestion: 'What is the actual state of energy transition in Indonesia—not the press releases?',
    section: 'where-we-are-now'
  },
  'challenges-ahead': { 
    title: 'Challenges Ahead', 
    coreQuestion: 'What structural barriers will block progress regardless of political will?',
    section: 'challenges-ahead'
  },
  'pathways-forward': { 
    title: 'Pathways Forward', 
    coreQuestion: 'Which interventions create the highest leverage with limited resources?',
    section: 'pathways-forward'
  },
};

interface Essay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
}

export default function GreenTransitionPhase() {
  const { phase } = useParams<{ phase: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [sortBy, setSortBy] = useState('latest');
  const [loading, setLoading] = useState(true);

  const details = phase ? phaseDetails[phase] : null;

  useEffect(() => {
    if (details?.section) {
      loadEssays();
    }
  }, [phase, sortBy]);

  const loadEssays = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('essays')
        .select('id, slug, title, snippet, author, date, read_time, thumbnail_url')
        .eq('section', 'green-transition')
        .eq('phase', details?.section);

      if (sortBy === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'title') {
        query = query.order('title', { ascending: true });
      }

      const { data } = await query;
      setEssays(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load essays:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const defaultThumbnail = 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&q=80';

  const handleAddEssay = () => {
    // Navigate to admin content editor with pre-filled section and phase
    navigate(`/admin/content/new?section=green-transition&phase=${details?.section || ''}`);
  };

  return (
    <PageLayout
      variant="content"
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition', path: '/green-transition' },
        { label: details?.title || 'Phase' }
      ]}
      showManifesto
      manifesto={details?.coreQuestion}
    >
      <SEO
        title={`${details?.title || 'Essays'} - Green Transition`}
        description={details?.coreQuestion || 'Economic analysis of Indonesia green transition.'}
      />

      <div className="container py-8">
        {/* Back Link */}
        <Link 
          to="/green-transition" 
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to The Green Transition
        </Link>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              {details?.title || 'Essays'}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              <strong>Core Question:</strong> {details?.coreQuestion}
            </p>
          </div>

          {isAdmin && (
            <Button onClick={handleAddEssay}>
              <Plus className="h-4 w-4 mr-2" />
              Add Essay
            </Button>
          )}
        </div>

        {/* Sort and Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            {essays.length} essays found
          </span>
        </div>

        {/* Essays Grid */}
        {loading ? (
          <LoadingState variant="cards" count={3} />
        ) : essays.length === 0 ? (
          <EmptyState
            title="No essays in this phase yet"
            message="Essays for this phase are being developed."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {essays.map((essay) => (
              <Link key={essay.id} to={`/green-transition/${phase}/${essay.slug}`}>
                <Card className="overflow-hidden hover:border-primary/50 transition-all hover:-translate-y-1 cursor-pointer h-full">
                  {/* Thumbnail */}
                  <div className="aspect-[16/10] bg-muted overflow-hidden">
                    <img 
                      src={essay.thumbnail_url || defaultThumbnail}
                      alt={essay.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-2 line-clamp-2">
                      {essay.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {essay.snippet}
                    </p>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                      {essay.author && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {essay.author}
                        </span>
                      )}
                      {essay.read_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {essay.read_time}
                        </span>
                      )}
                    </div>
                    
                    <span className="text-sm font-medium text-primary inline-flex items-center gap-1 group">
                      Read Essay
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
