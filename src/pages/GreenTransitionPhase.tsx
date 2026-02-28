import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';

// Map URL slugs to database phase values
const phaseMapping: Record<string, string> = {
  'now': 'where-we-are-now',
  'gaps': 'challenges-ahead',
  'future': 'pathways-forward',
  'where-we-are-now': 'where-we-are-now',
  'challenges-ahead': 'challenges-ahead',
  'pathways-forward': 'pathways-forward',
};

const phaseDetails: Record<string, { title: string; coreQuestion: string }> = {
  'where-we-are-now': {
    title: 'Where We Are Now',
    coreQuestion: 'What is the actual state of energy transition in Indonesia—not the press releases?',
  },
  'challenges-ahead': {
    title: 'Challenges Ahead',
    coreQuestion: 'What structural barriers will block progress regardless of political will?',
  },
  'pathways-forward': {
    title: 'Pathways Forward',
    coreQuestion: 'Which interventions create the highest leverage with limited resources?',
  },
};

const GREEN_TRANSITION_TABS = [
  { label: 'Where We Are Now', path: '/green-transition/now' },
  { label: 'Challenges Ahead', path: '/green-transition/gaps' },
  { label: 'Pathways Forward', path: '/green-transition/future' },
];

export default function GreenTransitionPhase() {
  const { phase } = useParams<{ phase: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Map URL phase to database phase
  const dbPhase = phase ? phaseMapping[phase] || phase : '';
  const details = dbPhase ? phaseDetails[dbPhase] : null;

  const handleAddEssay = () => {
    navigate('/admin/writer/new');
  };

  const getEssayUrl = (essay: { slug: string; phase?: string | null }) => {
    return `/green-transition/${phase}/${essay.slug}`;
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
      subNav={{
        tabs: GREEN_TRANSITION_TABS,
        backLink: { label: 'Green Transition', path: '/green-transition' },
      }}
    >
      <SEO
        title={`${details?.title || 'Essays'} - Green Transition`}
        description={details?.coreQuestion || 'Economic analysis of Indonesia green transition.'}
      />

      <div className="container max-w-4xl py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              {details?.title || 'Essays'}
            </h1>
            <p className="text-muted-foreground max-w-2xl italic">
              {details?.coreQuestion}
            </p>
          </div>

          {isAdmin && (
            <Button onClick={handleAddEssay}>
              <Plus className="h-4 w-4 mr-2" />
              Add Essay
            </Button>
          )}
        </div>

        {/* Editorial Feed - filtered by phase */}
        <GreenTransitionPhaseFeed
          phase={dbPhase}
          getEssayUrl={getEssayUrl}
        />
      </div>
    </PageLayout>
  );
}

// Custom feed component that filters by phase
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Clock, User, Calendar } from 'lucide-react';

interface Essay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  phase: string | null;
  status: string | null;
}

interface GreenTransitionPhaseFeedProps {
  phase: string;
  getEssayUrl: (essay: Essay) => string;
}

function GreenTransitionPhaseFeed({ phase, getEssayUrl }: GreenTransitionPhaseFeedProps) {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Fetch essays via category FK chain: categories.section_id → sections
  // Step 1: Find the category matching this phase under green-transition section
  const { data: essays, isLoading } = useQuery({
    queryKey: ['green-transition-phase', phase],
    queryFn: async () => {
      // Find categories for green-transition section that match this phase
      const { data: cats } = await supabase
        .from('categories')
        .select('id, sections!categories_section_id_fkey(slug)')
        .eq('sections.slug', 'green-transition');

      // Filter categories whose slug matches the phase pattern
      const categoryIds = (cats || [])
        .filter((c: any) => {
          const slug = (c as any).slug || '';
          return slug === `green-transition-${phase}` || slug === phase;
        })
        .map((c: any) => c.id);

      // Fallback: use denormalized section+phase if no categories found yet
      let query;
      if (categoryIds.length > 0) {
        query = supabase
          .from('essays')
          .select('id, slug, title, snippet, author, date, read_time, thumbnail_url, phase, status')
          .in('category_id', categoryIds);
      } else {
        query = supabase
          .from('essays')
          .select('id, slug, title, snippet, author, date, read_time, thumbnail_url, phase, status')
          .eq('section', 'green-transition')
          .eq('phase', phase);
      }

      if (!isAdmin) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as Essay[];
    },
    enabled: !!phase,
  });

  const filteredEssays = useMemo(() => {
    if (!essays) return [];

    let result = essays;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          (e.snippet && e.snippet.toLowerCase().includes(query))
      );
    }

    if (sortBy === 'oldest') {
      result = [...result].reverse();
    }

    return result;
  }, [essays, searchQuery, sortBy]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-6">
            <Skeleton className="w-48 h-32 rounded-lg hidden sm:block" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search essays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredEssays.length} {filteredEssays.length === 1 ? 'essay' : 'essays'}
      </p>

      {filteredEssays.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No essays found in this phase yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredEssays.map((essay) => (
            <article key={essay.id} className="py-8 first:pt-0 last:pb-0">
              <Link
                to={getEssayUrl(essay)}
                className="group flex flex-col sm:flex-row gap-6"
              >
                {essay.thumbnail_url && (
                  <div className="flex-shrink-0 w-full sm:w-48 aspect-[16/10] sm:aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                    <img
                      src={essay.thumbnail_url}
                      alt={essay.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                    {essay.title}
                  </h2>

                  {essay.snippet && (
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {essay.snippet}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {essay.author && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {essay.author}
                      </span>
                    )}
                    {essay.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(essay.date)}
                      </span>
                    )}
                    {essay.read_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {essay.read_time}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
