import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FsliPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  // The figure columns (dec_2024, dec_2023, notes_ref) are retired: they held
  // the wrong figures of PRD §A1, and 20261011130100_fsli_pages_retire_figures
  // renames them legacy_*. A line item's figures come from its audited
  // statement row (fs_line.fsli_slug, useFsLinesForSlug).
  category: string | null;
  // Added by 20261009090000_fsli_component_flag.sql, applied in production
  // (column verified present 2026-10-10). Optional only because this
  // hand-written type predates it; the generated types carry it.
  is_component?: boolean | null;
  // Added by 20261010100000_fsli_covered_by.sql, not yet in the generated
  // types: the line item whose essay covers this one. Both reads below are
  // select *, which never names it, so before the migration the key is just
  // absent (no 42703 to catch) and reads as "not covered".
  covered_by_slug?: string | null;
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
        // maybeSingle: a row that does not exist is a not-found for the page
        // to render, not a 406 from PostgREST behind a page that looks fine.
        .maybeSingle();

      if (error) throw error;
      return data as FsliPage;
    },
    enabled: !!slug,
  });
}

// useFsliSections is deleted with the fixed outline it filled: fsli_sections
// holds no written row, and the FSLI page's body is the linked essay
// (FsliDetail). The table and its rows are left in place.
