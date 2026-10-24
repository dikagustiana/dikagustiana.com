import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/states';
import { useEssays } from '@/hooks/queries/useEssays';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { Search } from 'lucide-react';
import { canSearchFeed, canSortFeed } from '@/lib/feedControls';

export default function ClimateFinance() {
  const { data: essays, isLoading, isError, refetch } = useEssays({
    section: 'green-transition',
    phase: 'climate-finance',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const publishedEssays = useMemo(() => (essays ?? []).filter(e => e.published), [essays]);

  const filteredEssays = useMemo(() => {
    let result = publishedEssays;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) => e.title.toLowerCase().includes(q) || (e.snippet && e.snippet.toLowerCase().includes(q))
      );
    }

    // Sort by created_at
    result = [...result].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [publishedEssays, searchQuery, sortBy]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition' },
        { label: 'Climate Finance' },
      ]}
      subNav={{
        tabs: GREEN_TRANSITION_TABS,
        backLink: { label: 'Green Transition', path: '/green-transition/now' },
      }}
    >
      <SEO
        title="Climate Finance — Green Transition"
        description="The instruments, institutions, and capital flows that fund the green transition."
      />

      {/* Phase Header */}
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            Climate Finance
          </h1>
          <p className="text-muted-foreground max-w-2xl italic">
            The instruments, institutions, and capital flows that fund the green transition. Green bonds, carbon markets, climate-aligned lending, and the cost of decarbonization.
          </p>
        </div>

        {/* Essay Feed — same layout as other phase pages */}
        <div className="space-y-8">
          {/* Filters: only once the list is long enough to need them. */}
          {(canSearchFeed(publishedEssays.length) || canSortFeed(publishedEssays.length)) && (
            <div className="flex flex-col sm:flex-row gap-4">
              {canSearchFeed(publishedEssays.length) && (
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search essays..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              {canSortFeed(publishedEssays.length) && (
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {filteredEssays.length} {filteredEssays.length === 1 ? 'essay' : 'essays'}
          </p>

          {isError ? (
            <ErrorState
              title="Couldn't load the essays"
              message="The essays could not be fetched just now. This is a temporary failure, not an empty section."
              onRetry={() => refetch()}
            />
          ) : isLoading ? (
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
          ) : filteredEssays.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No essays found in this phase yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredEssays.map((essay) => (
                <article key={essay.id} className="py-8 first:pt-0 last:pb-0">
                  <Link
                    to={`/green-transition/climate-finance/${essay.slug}`}
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
                        <p className="text-muted-foreground mb-4 line-clamp-2">{essay.snippet}</p>
                      )}
                      {(essay.author || essay.read_time || essay.date) && (
                        <p className="text-sm text-muted-foreground">
                          {[essay.author, essay.date ? formatDate(essay.date) : null, essay.read_time].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
