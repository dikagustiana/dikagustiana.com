import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Clock, User, Calendar } from 'lucide-react';

const phaseDetails: Record<string, { title: string; description: string }> = {
  'sovereign-wealth-funds': {
    title: 'Sovereign Wealth Funds',
    description: 'How states manage and deploy national savings. Structure, mandates, governance, and the rise of Asia\'s SWFs.',
  },
  'multilateral-development-banks': {
    title: 'Multilateral Development Banks',
    description: 'The architecture of concessional lending. How IFC, ADB, and the World Bank mobilize private capital.',
  },
  'blended-finance': {
    title: 'Blended Finance',
    description: 'Using public risk-taking to crowd in private investment. Structures, instruments, and real transactions.',
  },
  'indonesia-capital-architecture': {
    title: 'Indonesia\'s Capital Architecture',
    description: 'State-owned enterprises, BUMN reform, Danantara\'s mandate, and the flow of national capital.',
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
  status: string | null;
}

export default function DevelopmentFinancePhase() {
  const { phase } = useParams<{ phase: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const details = phase ? phaseDetails[phase] : null;

  const { data: essays, isLoading } = useQuery({
    queryKey: ['development-finance-phase', phase],
    queryFn: async () => {
      let query = supabase
        .from('essays')
        .select('id, slug, title, snippet, author, date, read_time, thumbnail_url, status')
        .eq('section', 'development-finance')
        .eq('phase', phase!);

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
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) => e.title.toLowerCase().includes(q) || (e.snippet && e.snippet.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'oldest') result = [...result].reverse();
    return result;
  }, [essays, searchQuery, sortBy]);

  return (
    <PageLayout
      variant="content"
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Development Finance', path: '/development-finance' },
        { label: details?.title || 'Phase' },
      ]}
    >
      <SEO
        title={`${details?.title || 'Essays'} — Development Finance`}
        description={details?.description || 'Development finance analysis.'}
      />

      <div className="container max-w-4xl py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              {details?.title || 'Essays'}
            </h1>
            <p className="text-muted-foreground max-w-2xl italic">
              {details?.description}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => navigate('/admin/writer/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Essay
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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

        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {filteredEssays.length} {filteredEssays.length === 1 ? 'essay' : 'essays'}
            </p>

            {filteredEssays.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No essays found in this topic yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredEssays.map((essay) => (
                  <article key={essay.id} className="py-8 first:pt-0 last:pb-0">
                    <Link
                      to={`/development-finance/${phase}/${essay.slug}`}
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
                        <h2 className="text-xl font-semibold text-foreground group-hover:text-sky-500 transition-colors mb-2 line-clamp-2">
                          {essay.title}
                        </h2>
                        {essay.snippet && (
                          <p className="text-muted-foreground mb-4 line-clamp-2">{essay.snippet}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {essay.author && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {essay.author}
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
          </>
        )}
      </div>
    </PageLayout>
  );
}
