import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useEssays } from '@/hooks/queries/useEssays';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { Banknote, BarChart3, HandCoins, Flame, Building2, Factory, Search, Clock, User, Calendar } from 'lucide-react';

const concepts = [
  { title: 'Green Bonds', description: 'Fixed-income instruments where proceeds are earmarked for climate and environmental projects.', icon: Banknote },
  { title: 'Carbon Markets', description: 'Compliance and voluntary systems that put a price on greenhouse gas emissions.', icon: BarChart3 },
  { title: 'Blended Finance for Climate', description: 'Combining concessional and commercial capital to de-risk green investments.', icon: HandCoins },
  { title: 'JETP (Just Energy Transition Partnerships)', description: 'Country-level financing packages to accelerate coal phase-out in emerging markets.', icon: Flame },
  { title: 'Climate-Aligned Lending', description: 'How banks and DFIs embed climate criteria into credit and investment decisions.', icon: Building2 },
  { title: 'Transition Finance', description: 'Financing high-emitting sectors to move toward low-carbon operations.', icon: Factory },
];

export default function ClimateFinance() {
  const { data: essays, isLoading } = useEssays({
    section: 'green-transition',
    phase: 'climate-finance',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const filteredEssays = useMemo(() => {
    if (!essays) return [];
    let result = essays.filter(e => e.published);

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
  }, [essays, searchQuery, sortBy]);

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
        { label: 'Green Transition', path: '/green-transition' },
        { label: 'Climate Finance' },
      ]}
      subNav={{
        tabs: GREEN_TRANSITION_TABS,
        backLink: { label: 'Green Transition', path: '/green-transition' },
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

        {/* Climate Finance Overview — Concepts Grid */}
        <section className="mb-12">
          <h2 className="text-xl font-display font-semibold text-foreground mb-6">
            Key Instruments & Concepts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {concepts.map((concept) => {
              const Icon = concept.icon;
              return (
                <Card key={concept.title} className="h-full">
                  <CardContent className="p-6">
                    <Icon className="h-6 w-6 text-accent mb-3" />
                    <h3 className="font-semibold text-foreground mb-2">{concept.title}</h3>
                    <p className="text-sm text-muted-foreground">{concept.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Callout */}
        <div className="bg-accent/5 border border-accent/20 rounded-lg py-6 px-6 mb-12">
          <p className="text-muted-foreground italic text-center">
            Indonesia's green transition requires ~$25B/year in climate investment through 2030.
            This track examines who provides it, on what terms, and what it achieves.
          </p>
        </div>

        {/* Essay Feed — same layout as other phase pages */}
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

          {isLoading ? (
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
      </div>
    </PageLayout>
  );
}
