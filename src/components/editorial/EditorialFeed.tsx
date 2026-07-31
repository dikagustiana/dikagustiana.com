import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Clock, User, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
  published: boolean | null;
}

interface EditorialFeedProps {
  section: 'next-big-thing' | 'green-transition';
  topics?: { id: string; label: string }[];
  getEssayUrl: (essay: Essay) => string;
}

export function EditorialFeed({ section, topics = [], getEssayUrl }: EditorialFeedProps) {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const { data: essays, isLoading } = useQuery({
    queryKey: ['editorial-feed', section],
    queryFn: async () => {
      let query = supabase
        .from('essays')
        .select('id, slug, title, snippet, author, date, read_time, thumbnail_url, phase, status, published')
        .eq('section', section);

      // Non-admin users only see published essays
      if (!isAdmin) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as Essay[];
    },
  });

  // Filter and sort essays
  const filteredEssays = useMemo(() => {
    if (!essays) return [];
    
    let result = essays;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          (e.snippet && e.snippet.toLowerCase().includes(query))
      );
    }

    // Topic filter
    if (selectedTopic !== 'all') {
      result = result.filter((e) => e.phase === selectedTopic);
    }

    // Sort
    if (sortBy === 'oldest') {
      result = [...result].reverse();
    }

    return result;
  }, [essays, searchQuery, selectedTopic, sortBy]);

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
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search essays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          {/* Topic filter */}
          {topics.length > 0 && (
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort */}
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
      </div>

      {/* Essay count */}
      <p className="text-sm text-muted-foreground">
        {filteredEssays.length} {filteredEssays.length === 1 ? 'essay' : 'essays'}
      </p>

      {/* Essay list */}
      {filteredEssays.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No essays found</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredEssays.map((essay) => (
            <article key={essay.id} className="py-8 first:pt-0 last:pb-0">
              <Link 
                to={getEssayUrl(essay)}
                className="group flex flex-col sm:flex-row gap-6"
              >
                {/* Thumbnail */}
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Topic badge + draft indicator */}
                  <div className="flex items-center gap-2 mb-2">
                    {essay.phase && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {essay.phase}
                      </Badge>
                    )}
                    {isAdmin && essay.status !== 'published' && (
                      <Badge variant="outline" className="text-xs">
                        {essay.status || 'draft'}
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                    {essay.title}
                  </h2>

                  {/* Deck/snippet */}
                  {essay.snippet && (
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {essay.snippet}
                    </p>
                  )}

                  {/* Meta */}
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
