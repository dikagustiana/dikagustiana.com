import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/lib/auditLog';
import { VoiceRole } from '@/components/layouts/PageLayout';

export interface EssayWithHealth {
  id: string;
  slug: string;
  title: string;
  section: string;
  phase: string | null;
  published: boolean | null;
  voice_role: string | null;
  author: string | null;
  date: string | null;
  snippet: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  // Computed health fields
  healthScore: number;
  missingFields: string[];
  hasViolations: boolean;
}

export function useAdminEssays(sectionFilter?: string) {
  return useQuery({
    queryKey: ['admin-essays', sectionFilter],
    queryFn: async () => {
      // The admin list renders titles and status, never bodies. With
      // select('*') all 162 rows measured 219,390 bytes against the live
      // database; this list measured 84,164.
      let query = supabase
        .from('essays')
        .select(`
          id, slug, title, snippet, section, phase, status, published,
          voice_role, category_id, module_id, finance_section, finance_order,
          fsli_slug, topic, sort_order, author, date, read_time,
          thumbnail_url, created_at, updated_at
        `)
        .order('updated_at', { ascending: false });

      if (sectionFilter && sectionFilter !== 'all') {
        query = query.eq('section', sectionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useBulkPublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, published }: { ids: string[]; published: boolean }) => {
      // Sync status with published boolean - status is source of truth
      const newStatus = published ? 'published' : 'draft';

      // Fetch titles for audit before update
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
      queryClient.invalidateQueries({ queryKey: ['admin-essays'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}

export function useDeleteEssay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: target } = await supabase
        .from('essays')
        .select('id, title, slug, section')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase
        .from('essays')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent({
        action: 'delete',
        table_name: 'essays',
        record_id: id,
        record_title: target?.title ?? null,
        record_slug: target?.slug ?? null,
        record_section: target?.section ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-essays'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}

export function useUpdateEssay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EssayWithHealth> }) => {
      const { error } = await supabase
        .from('essays')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      const { data: target } = await supabase
        .from('essays')
        .select('title, slug, section')
        .eq('id', id)
        .maybeSingle();

      const isPublishToggle = Object.prototype.hasOwnProperty.call(data, 'published');
      await logAuditEvent({
        action: isPublishToggle
          ? data.published
            ? 'publish'
            : 'unpublish'
          : 'update',
        table_name: 'essays',
        record_id: id,
        record_title: target?.title ?? data.title ?? null,
        record_slug: target?.slug ?? data.slug ?? null,
        record_section: target?.section ?? data.section ?? null,
        changes: { fields: Object.keys(data) },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-essays'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
      queryClient.invalidateQueries({ queryKey: ['essay'] });
    },
  });
}

interface CreateEssayData {
  title: string;
  slug: string;
  section: string;
  phase?: string | null;
  voice_role?: string | null;
  published?: boolean;
  author?: string | null;
  date?: string | null;
  read_time?: string | null;
  snippet?: string | null;
  content?: string | null;
  prerequisites?: string[] | null;
  learning_outcomes?: string[] | null;
  fsli_slug?: string | null;
  topic?: string | null;
}

export function useCreateEssay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEssayData) => {
      const { data: result, error } = await supabase
        .from('essays')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'create',
        table_name: 'essays',
        record_id: result.id,
        record_title: result.title,
        record_slug: result.slug,
        record_section: result.section,
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-essays'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}
