import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/lib/auditLog';

export type ContentType = 'essay' | 'fsli';

export interface UnifiedContentItem {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  section: string;
  category?: string;
  phase?: string | null;
  fsli_slug?: string | null;
  topic?: string | null;
  published: boolean;
  status: string | null;
  /** The ONE featuring flag — drives homepage, About and Finance landing. */
  is_selected?: boolean;
  voice_role: string | null;
  finance_section?: string | null;
  finance_modules?: { slug: string; track_slug: string } | null;
  snippet: string | null;
  updated_at: string;
  created_at: string;
}

export interface ContentFilter {
  contentType?: 'all' | ContentType;
  section?: string;
  status?: string;
  published?: boolean;
  search?: string;
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
          // finance_section + the module join feed the canonical URL builder,
          // so the admin "View public" link resolves for curriculum essays.
          .select(`
            id, title, slug, section, phase, fsli_slug, topic, published, status,
            is_selected, voice_role, snippet, updated_at, created_at, finance_section,
            finance_modules!essays_module_id_fkey ( slug, track_slug )
          `)
          .order('updated_at', { ascending: false });

        if (filter.section && filter.section !== 'all') {
          essayQuery = essayQuery.eq('section', filter.section);
        }
        if (filter.published !== undefined) {
          essayQuery = essayQuery.eq('published', filter.published);
        }
        // Status filter - use status as source of truth
        if (filter.status && filter.status !== 'all') {
          essayQuery = essayQuery.eq('status', filter.status as 'draft' | 'tone_pending' | 'published' | 'archived');
        }
        // Search filter - push to Supabase
        if (filter.search) {
          const pattern = `%${filter.search}%`;
          essayQuery = essayQuery.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
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
            phase: essay.phase,
            fsli_slug: essay.fsli_slug,
            topic: essay.topic,
            finance_section: essay.finance_section,
            finance_modules: essay.finance_modules,
            published: essay.published ?? false,
            status: essay.status || (essay.published ? 'published' : 'draft'),
            is_selected: essay.is_selected ?? false,
            voice_role: essay.voice_role,
            snippet: essay.snippet,
            updated_at: essay.updated_at,
            created_at: essay.created_at,
          });
        });
      }

      // Fetch FSLI pages if not filtering by essays only
      if (filter.contentType !== 'essay') {
        const shouldIncludeFsli = !filter.section ||
          filter.section === 'all' ||
          filter.section === 'accounting';

        if (shouldIncludeFsli) {
          let fsliQuery = supabase
            .from('fsli_pages')
            .select('id, title, subtitle, slug, category, updated_at, created_at')
            .order('updated_at', { ascending: false });

          // Search filter - push to Supabase
          if (filter.search) {
            const pattern = `%${filter.search}%`;
            fsliQuery = fsliQuery.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
          }

          const { data: fsliPages, error: fsliError } = await fsliQuery;
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
      const { data: essays } = await supabase
        .from('essays')
        .select('id, published, section, status');

      const { count: fsliCount } = await supabase
        .from('fsli_pages')
        .select('*', { count: 'exact', head: true });

      const essayList = essays || [];

      // Status-based counts (status is source of truth)
      const publishedEssays = essayList.filter(e => e.status === 'published').length;
      const tonePendingEssays = essayList.filter(e => e.status === 'tone_pending').length;
      const draftEssays = essayList.filter(e => e.status === 'draft' || (!e.status && !e.published)).length;
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
        published: publishedEssays + (fsliCount || 0),
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
      const newStatus = published ? 'published' : 'draft';

      const { data: targets } = await supabase
        .from('essays')
        .select('id, title, slug, section')
        .in('id', ids);

      const { error } = await supabase
        .from('essays')
        .update({
          published,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) throw error;

      await Promise.all(
        (targets ?? []).map((t) =>
          logAuditEvent({
            action: published ? 'bulk_publish' : 'bulk_unpublish',
            table_name: 'essays',
            record_id: t.id,
            record_title: t.title,
            record_slug: t.slug,
            record_section: t.section,
            changes: { published, status: newStatus },
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-content'] });
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}

export function useTogglePublishContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, currentlyPublished }: { id: string; currentlyPublished: boolean }) => {
      const newPublished = !currentlyPublished;
      const newStatus = newPublished ? 'published' : 'draft';

      const { error } = await supabase
        .from('essays')
        .update({
          published: newPublished,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      const { data: target } = await supabase
        .from('essays')
        .select('title, slug, section')
        .eq('id', id)
        .maybeSingle();

      await logAuditEvent({
        action: newPublished ? 'publish' : 'unpublish',
        table_name: 'essays',
        record_id: id,
        record_title: target?.title ?? null,
        record_slug: target?.slug ?? null,
        record_section: target?.section ?? null,
      });

      return { published: newPublished, status: newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-content'] });
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}

/**
 * Toggle `is_selected` — the ONE featuring mechanism. Before this existed the
 * flag had no UI anywhere and the only way to change it was raw SQL.
 */
export function useToggleSelectContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, currentlySelected }: { id: string; currentlySelected: boolean }) => {
      const newSelected = !currentlySelected;
      const { error } = await supabase
        .from('essays')
        .update({ is_selected: newSelected })
        .eq('id', id);
      if (error) throw error;

      const { data: target } = await supabase
        .from('essays')
        .select('title, slug, section')
        .eq('id', id)
        .maybeSingle();

      await logAuditEvent({
        action: newSelected ? 'feature' : 'unfeature',
        table_name: 'essays',
        record_id: id,
        record_title: target?.title ?? null,
        record_slug: target?.slug ?? null,
        record_section: target?.section ?? null,
      });

      return { is_selected: newSelected };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-content'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
      queryClient.invalidateQueries({ queryKey: ['finance-featured-essay'] });
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: ContentType }) => {
      if (type === 'essay') {
        const { data: target } = await supabase
          .from('essays')
          .select('title, slug, section')
          .eq('id', id)
          .maybeSingle();
        // Archive, never delete. A hard delete used to CASCADE into
        // essay_revisions — the essay and its entire history gone from one
        // confirm() click, on a database with no point-in-time recovery. An
        // archived essay is invisible to readers (published=false), visible in
        // the admin list with an "archived" badge, and restorable. The row and
        // its revisions stay. (The FK is now ON DELETE RESTRICT as well, so
        // even a raw SQL delete cannot silently take the history with it.)
        const { error } = await supabase
          .from('essays')
          .update({
            status: 'archived',
            published: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw error;
        await logAuditEvent({
          action: 'archive',
          table_name: 'essays',
          record_id: id,
          record_title: target?.title ?? null,
          record_slug: target?.slug ?? null,
          record_section: target?.section ?? null,
        });
      } else if (type === 'fsli') {
        const { data: target } = await supabase
          .from('fsli_pages')
          .select('title, slug')
          .eq('id', id)
          .maybeSingle();
        const { error } = await supabase.from('fsli_pages').delete().eq('id', id);
        if (error) throw error;
        await logAuditEvent({
          action: 'delete',
          table_name: 'fsli_pages',
          record_id: id,
          record_title: target?.title ?? null,
          record_slug: target?.slug ?? null,
          record_section: 'accounting',
        });
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

/** Bring an archived essay back as a draft. The other half of archive-not-delete. */
export function useRestoreContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data: target } = await supabase
        .from('essays')
        .select('title, slug, section')
        .eq('id', id)
        .maybeSingle();
      const { error } = await supabase
        .from('essays')
        .update({ status: 'draft', published: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'archived');
      if (error) throw error;
      await logAuditEvent({
        action: 'restore',
        table_name: 'essays',
        record_id: id,
        record_title: target?.title ?? null,
        record_slug: target?.slug ?? null,
        record_section: target?.section ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-content'] });
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}
