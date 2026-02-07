import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ContentType = 'essay' | 'fsli';

export interface UnifiedContentItem {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  section: string;
  category?: string;
  published: boolean;
  status: string | null;
  voice_role: string | null;
  snippet: string | null;
  updated_at: string;
  created_at: string;
}

export interface ContentFilter {
  contentType?: 'all' | ContentType;
  section?: string;
  status?: string;
  published?: boolean;
}

export function useUnifiedContent(filter: ContentFilter = {}) {
  return useQuery({
    queryKey: ['unified-content', filter],
    queryFn: async () => {
      const items: UnifiedContentItem[] = [];

      // Fetch essays if not filtering by FSLI only
      if (filter.contentType !== 'fsli') {
        let essayQuery = supabase
          .from('essays')
          .select('id, title, slug, section, published, status, voice_role, snippet, updated_at, created_at')
          .order('updated_at', { ascending: false });

        if (filter.section && filter.section !== 'all') {
          essayQuery = essayQuery.eq('section', filter.section);
        }
        if (filter.published !== undefined) {
          essayQuery = essayQuery.eq('published', filter.published);
        }
        // Status filter
        if (filter.status && filter.status !== 'all') {
          if (filter.status === 'published') {
            essayQuery = essayQuery.eq('published', true);
          } else if (filter.status === 'draft') {
            essayQuery = essayQuery.eq('published', false).or('status.is.null,status.eq.draft');
          } else if (filter.status === 'tone_pending') {
            essayQuery = essayQuery.eq('status', 'tone_pending' as const);
          } else if (filter.status === 'archived') {
            essayQuery = essayQuery.eq('status', 'archived' as const);
          }
        }

        const { data: essays, error: essayError } = await essayQuery;
        if (essayError) throw essayError;

        essays?.forEach((essay) => {
          items.push({
            id: essay.id,
            type: 'essay',
            title: essay.title,
            slug: essay.slug,
            section: essay.section,
            published: essay.published ?? false,
            status: essay.status || (essay.published ? 'published' : 'draft'),
            voice_role: essay.voice_role,
            snippet: essay.snippet,
            updated_at: essay.updated_at,
            created_at: essay.created_at,
          });
        });
      }

      // Fetch FSLI pages if not filtering by essays only
      if (filter.contentType !== 'essay') {
        // Only include FSLI if section filter is 'all', 'accounting', or not set
        const shouldIncludeFsli = !filter.section || 
          filter.section === 'all' || 
          filter.section === 'accounting';

        if (shouldIncludeFsli) {
          const { data: fsliPages, error: fsliError } = await supabase
            .from('fsli_pages')
            .select('id, title, subtitle, slug, category, updated_at, created_at')
            .order('updated_at', { ascending: false });

          if (fsliError) throw fsliError;

          fsliPages?.forEach((page) => {
            items.push({
              id: page.id,
              type: 'fsli',
              title: page.title,
              slug: page.slug,
              section: 'accounting',
              category: page.category || undefined,
              published: true, // FSLI pages are always public
              status: 'published',
              voice_role: 'manager',
              snippet: page.subtitle,
              updated_at: page.updated_at,
              created_at: page.created_at,
            });
          });
        }
      }

      // Sort by updated_at descending
      items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      return items;
    },
  });
}

export function useContentStats() {
  return useQuery({
    queryKey: ['content-stats'],
    queryFn: async () => {
      // Get essay counts with status
      const { data: essays } = await supabase
        .from('essays')
        .select('id, published, section, status');

      // Get FSLI page count
      const { count: fsliCount } = await supabase
        .from('fsli_pages')
        .select('*', { count: 'exact', head: true });

      const essayList = essays || [];
      
      // Status-based counts
      const publishedEssays = essayList.filter(e => e.status === 'published' || (e.published && !e.status)).length;
      const tonePendingEssays = essayList.filter(e => e.status === 'tone_pending').length;
      const draftEssays = essayList.filter(e => !e.published && (!e.status || e.status === 'draft')).length;
      const archivedEssays = essayList.filter(e => e.status === 'archived').length;

      // Section breakdown
      const sectionCounts: Record<string, number> = {};
      essayList.forEach(e => {
        sectionCounts[e.section] = (sectionCounts[e.section] || 0) + 1;
      });
      sectionCounts['accounting'] = (sectionCounts['accounting'] || 0) + (fsliCount || 0);

      return {
        total: essayList.length + (fsliCount || 0),
        essays: essayList.length,
        fsliPages: fsliCount || 0,
        published: publishedEssays + (fsliCount || 0), // FSLI pages are always public
        tonePending: tonePendingEssays,
        draft: draftEssays,
        archived: archivedEssays,
        sectionCounts,
      };
    },
  });
}

export function useBulkPublishContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, published }: { ids: string[]; published: boolean }) => {
      const { error } = await supabase
        .from('essays')
        .update({ published, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-content'] });
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: ContentType }) => {
      if (type === 'essay') {
        const { error } = await supabase.from('essays').delete().eq('id', id);
        if (error) throw error;
      } else if (type === 'fsli') {
        const { error } = await supabase.from('fsli_pages').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-content'] });
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
      queryClient.invalidateQueries({ queryKey: ['fsli-pages'] });
    },
  });
}
