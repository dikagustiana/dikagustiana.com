import { essayUrl } from '@/lib/essayUrl';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen, Layers, Link2 } from 'lucide-react';

interface RelatedContentProps {
  currentEssayId: string;
  section: string;
  categoryId?: string | null;
  prerequisites?: string[] | null;
  maxItems?: number;
}

interface RelatedEssay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  section: string;
  phase: string | null;
  read_time: string | null;
  matchType: 'category' | 'section' | 'prerequisite';
}

export function RelatedContent({
  currentEssayId,
  section,
  categoryId,
  prerequisites,
  maxItems = 3,
}: RelatedContentProps) {
  const { data: relatedEssays, isLoading } = useQuery({
    queryKey: ['related-essays', currentEssayId, section, categoryId],
    queryFn: async () => {
      const related: RelatedEssay[] = [];

      // 1. Same category (highest priority)
      if (categoryId) {
        const { data: categoryEssays } = await supabase
          .from('essays')
          .select('id, slug, title, snippet, section, phase, read_time')
          .eq('category_id', categoryId)
          .eq('published', true)
          .neq('id', currentEssayId)
          .limit(maxItems);

        categoryEssays?.forEach((essay) => {
          related.push({ ...essay, matchType: 'category' });
        });
      }

      // 2. Same section (if we need more)
      if (related.length < maxItems) {
        const existingIds = [currentEssayId, ...related.map((r) => r.id)];
        const { data: sectionEssays } = await supabase
          .from('essays')
          .select('id, slug, title, snippet, section, phase, read_time')
          .eq('section', section)
          .eq('published', true)
          .not('id', 'in', `(${existingIds.join(',')})`)
          .limit(maxItems - related.length);

        sectionEssays?.forEach((essay) => {
          related.push({ ...essay, matchType: 'section' });
        });
      }

      // 3. Shared prerequisites (if we still need more)
      if (related.length < maxItems && prerequisites && prerequisites.length > 0) {
        const existingIds = [currentEssayId, ...related.map((r) => r.id)];
        const { data: prereqEssays } = await supabase
          .from('essays')
          .select('id, slug, title, snippet, section, phase, read_time, prerequisites')
          .eq('published', true)
          .not('id', 'in', `(${existingIds.join(',')})`)
          .limit(10); // Get more to filter

        prereqEssays
          ?.filter((essay) => {
            const essayPrereqs = essay.prerequisites || [];
            return essayPrereqs.some((p: string) => prerequisites.includes(p));
          })
          .slice(0, maxItems - related.length)
          .forEach((essay) => {
            related.push({ 
              id: essay.id,
              slug: essay.slug,
              title: essay.title,
              snippet: essay.snippet,
              section: essay.section,
              phase: essay.phase,
              read_time: essay.read_time,
              matchType: 'prerequisite' 
            });
          });
      }

      return related.slice(0, maxItems);
    },
    enabled: !!currentEssayId && !!section,
  });

  if (isLoading || !relatedEssays || relatedEssays.length === 0) {
    return null;
  }

  const getMatchIcon = (matchType: RelatedEssay['matchType']) => {
    switch (matchType) {
      case 'category':
        return <Layers className="h-3 w-3" />;
      case 'section':
        return <BookOpen className="h-3 w-3" />;
      case 'prerequisite':
        return <Link2 className="h-3 w-3" />;
    }
  };

  const getMatchLabel = (matchType: RelatedEssay['matchType']) => {
    switch (matchType) {
      case 'category':
        return 'Same Category';
      case 'section':
        return 'Same Section';
      case 'prerequisite':
        return 'Shared Prerequisites';
    }
  };

  // One canonical builder — a local shape here is how the homepage 404'd.
  const getEssayUrl = (essay: RelatedEssay) =>
    essayUrl({ slug: essay.slug, section: essay.section, phase: essay.phase }) ?? '#';

  return (
    <Card className="mt-12">
      <CardHeader>
        <CardTitle className="text-lg">Related Content</CardTitle>
        <CardDescription>Continue reading on similar topics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {relatedEssays.map((essay) => (
            <Link key={essay.id} to={getEssayUrl(essay)}>
              <div className="group p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs gap-1">
                    {getMatchIcon(essay.matchType)}
                    {getMatchLabel(essay.matchType)}
                  </Badge>
                  {essay.read_time && (
                    <span className="text-xs text-muted-foreground">{essay.read_time}</span>
                  )}
                </div>
                <h4 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">
                  {essay.title}
                </h4>
                {essay.snippet && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{essay.snippet}</p>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Read more <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
