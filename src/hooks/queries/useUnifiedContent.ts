import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/lib/auditLog';
import { isMissingColumn, PINNED_SLOTS, SELECTED_COLUMNS, type SelectedEssay } from '@/hooks/queries/useSelectedEssays';

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
  /** The ONE featuring flag — leads the homepage row and drives the Finance landing. */
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
      // A failed read must not read as "0 drafts, 0 published" — throw so the
      // page can distinguish an outage from an empty workspace.
      const { data: essays, error: essaysError } = await supabase
        .from('essays')
        .select('id, published, section, status');
      if (essaysError) throw essaysError;

      const { count: fsliCount, error: fsliError } = await supabase
        .from('fsli_pages')
        .select('*', { count: 'exact', head: true });
      if (fsliError) throw fsliError;

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
      // Unstarring gives up the place in the homepage order too, so a
      // re-starred essay joins the end of the row instead of silently
      // reclaiming an old slot. Until the selected_rank migration is on
      // production the column is unknown (42703) and the flag alone is written.
      let { error } = await supabase
        .from('essays')
        .update(newSelected ? { is_selected: true } : { is_selected: false, selected_rank: null })
        .eq('id', id);
      if (error && !newSelected && isMissingColumn(error)) {
        ({ error } = await supabase.from('essays').update({ is_selected: false }).eq('id', id));
      }
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

/** A starred essay as the homepage-order panel sees it: drafts included. */
export interface SelectedOrderRow {
  id: string;
  title: string;
  section: string;
  published: boolean;
  selected_rank: number | null;
}

export interface SelectedOrder {
  rows: SelectedOrderRow[];
  /** True until migration 20261009140000_essay_selected_rank is applied: the order cannot be saved yet. */
  missingColumn: boolean;
}

/**
 * Every starred essay in homepage order. Unlike useSelectedEssays this
 * includes drafts, so the owner can place a piece before it goes live: it
 * holds its slot and appears the moment it is published. Archived essays
 * are out, as they are everywhere.
 */
export function useSelectedOrder() {
  return useQuery({
    queryKey: ['essays', 'selected-order'],
    queryFn: async (): Promise<SelectedOrder> => {
      const base = () => supabase.from('essays').select('id, title, section, published, selected_rank').eq('is_selected', true).neq('status', 'archived');

      const ranked = await base()
        .order('selected_rank', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (!ranked.error) {
        return { rows: (ranked.data ?? []).map((r) => ({ ...r, published: !!r.published })), missingColumn: false };
      }
      if (!isMissingColumn(ranked.error)) throw ranked.error;

      const { data, error } = await supabase
        .from('essays')
        .select('id, title, section, published')
        .eq('is_selected', true)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { rows: (data ?? []).map((r) => ({ ...r, published: !!r.published, selected_rank: null })), missingColumn: true };
    },
  });
}

/**
 * Writes the whole order: position i gets rank i + 1. One update per row;
 * the list is at most a few dozen starred essays, and an upsert would need
 * every NOT NULL column of the row. Only a row still starred takes its rank:
 * a panel opened before an essay was unstarred still lists it, and a rank
 * written back onto an unstarred essay would sort it ahead of newer ones in
 * the homepage read (useSelectedEssays). Unstarring clears the rank, so no
 * unstarred essay holds one.
 */
export function useSaveSelectedOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map((id, i) => supabase.from('essays').update({ selected_rank: i + 1 }).eq('id', id).eq('is_selected', true)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      await logAuditEvent({
        action: 'reorder_selected',
        table_name: 'essays',
        record_title: `Homepage order (${ids.length})`,
        metadata: { ids },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['essays'] });
      queryClient.invalidateQueries({ queryKey: ['unified-content'] });
      queryClient.invalidateQueries({ queryKey: ['finance-featured-essay'] });
    },
  });
}

export interface GlimpsePins {
  /** Every published essay, newest first, as the homepage reads it. */
  essays: SelectedEssay[];
  /** Slot i (0-based) holds the id pinned to slot i + 1, or null. */
  slots: (string | null)[];
  /** True until migration 20261030100000_essay_featured_rank is applied: the pins cannot be saved yet. */
  missingColumn: boolean;
}

/**
 * The homepage glimpse's pins, for Admin → Content → Homepage Glimpse: every
 * published essay (only a published essay can be pinned; the database clears
 * the pin of one that is unpublished), and which of them holds each slot.
 */
export function useGlimpsePins() {
  return useQuery({
    queryKey: ['essays', 'glimpse-pins'],
    queryFn: async (): Promise<GlimpsePins> => {
      const base = (columns: string) =>
        supabase.from('essays').select(columns).eq('published', true).order('created_at', { ascending: false });

      let read = await base(`${SELECTED_COLUMNS}, featured_rank`);
      const missingColumn = isMissingColumn(read.error);
      if (missingColumn) read = await base(SELECTED_COLUMNS);
      if (read.error) throw read.error;

      const essays = (read.data ?? []) as unknown as SelectedEssay[];
      const slots = Array.from({ length: PINNED_SLOTS }, (_, i) => essays.find((e) => e.featured_rank === i + 1)?.id ?? null);
      return { essays, slots, missingColumn };
    },
  });
}

type SetFeaturedEssays = (fn: 'set_featured_essays', args: { p_ids: (string | null)[] }) => PromiseLike<{ error: { code?: string; message: string } | null }>;

/**
 * Writes all three slots at once through set_featured_essays (migration
 * 20261030100000_essay_featured_rank): one call, one transaction, the old
 * pins cleared before the new ones are written, so no two essays ever hold
 * one slot. Cast because types.ts is regenerated from the live schema only
 * once the migration is applied.
 */
export function useSaveGlimpsePins() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slots: (string | null)[]) => {
      const rpc = supabase.rpc.bind(supabase) as unknown as SetFeaturedEssays;
      const { error } = await rpc('set_featured_essays', { p_ids: slots });
      if (error) throw error;

      await logAuditEvent({
        action: 'pin_glimpse',
        table_name: 'essays',
        record_title: `Homepage glimpse pins (${slots.filter(Boolean).length})`,
        metadata: { slots },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}
