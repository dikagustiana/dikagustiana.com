import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

// The dead write mutations that lived here (useBulkPublish, useDeleteEssay,
// useUpdateEssay, useCreateEssay) were removed in the 2026-10 review: nothing
// imported them, they bypassed the Writer Studio's guarded writes, and
// useDeleteEssay hard-DELETEd essay rows — the behaviour the live admin flow
// deliberately replaced with archiving (useUnifiedContent.useDeleteContent).
// Writes belong to useUnifiedContent's mutations and the Writer Studio.
