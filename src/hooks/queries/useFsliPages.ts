import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FsliPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  notes_ref: string | null;
  dec_2024: string | null;
  dec_2023: string | null;
  category: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export function useFsliPages() {
  return useQuery({
    queryKey: ['fsli-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fsli_pages')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FsliPage[];
    },
  });
}

export function useFsliPage(slug: string) {
  return useQuery({
    queryKey: ['fsli-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fsli_pages')
        .select('*')
        .eq('slug', slug)
        // maybeSingle, not single: PostgREST answers `single()` with HTTP 406
        // when no row matches, so an unknown slug surfaced as a swallowed
        // request error behind a thin page instead of a "not found" state.
        .maybeSingle();

      if (error) throw error;
      return (data as FsliPage) ?? null;
    },
    enabled: !!slug,
  });
}

export function useFsliSections(pageSlug: string) {
  return useQuery({
    queryKey: ['fsli-sections', pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fsli_sections')
        .select('*')
        .eq('page_slug', pageSlug)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!pageSlug,
  });
}
