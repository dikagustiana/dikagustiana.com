import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EssayPresentation } from '@/lib/presentation';

export interface Essay {
  id: string;
  section: string;
  phase: string | null;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  content: string | null;
  published: boolean;
  status: string | null;
  sort_order: number;
  category_id: string | null;
  voice_role: string | null;
  prerequisites: string[] | null;
  learning_outcomes: string[] | null;
  presentation: EssayPresentation | null;
  /** @deprecated legacy column, dropped by the staged _pending migration */
  economist_fields?: EssayPresentation | null;
  fsli_slug: string | null;
  topic: string | null;
  finance_section: string | null;
  finance_order: number | null;
  created_at: string;
  updated_at: string;
}

interface UseEssaysParams {
  section?: string;
  phase?: string;
  categoryId?: string;
  published?: boolean;
  limit?: number;
}

/**
 * Columns a list/card view actually renders. Deliberately excludes `content`
 * and `content_json`: a list of published essays with `select('*')` measured
 * 58,043 bytes against the live database versus 1,116 with this list, because
 * every row dragged its full body along. fa-07-01 alone is ~22k of HTML plus
 * its JSON document.
 *
 * Detail pages select their own columns including the body — that is the one
 * place it is wanted.
 */
export const ESSAY_CARD_COLUMNS = `
  id, slug, title, snippet, section, phase, author, date, read_time,
  thumbnail_url, published, status, sort_order, category_id, module_id,
  finance_section, finance_order, fsli_slug, topic, created_at, updated_at
`;

export const useEssays = (params: UseEssaysParams = {}) => {
  return useQuery({
    queryKey: ['essays', params],
    queryFn: async () => {
      let query = supabase.from('essays').select(ESSAY_CARD_COLUMNS);

      if (params.section) {
        query = query.eq('section', params.section);
      }
      if (params.phase) {
        query = query.eq('phase', params.phase);
      }
      if (params.categoryId) {
        query = query.eq('category_id', params.categoryId);
      }
      if (params.published !== undefined) {
        query = query.eq('published', params.published);
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query.order('sort_order', { ascending: true });

      if (error) throw error;
      return data as unknown as Essay[];
    },
  });
};

interface UseEssayOptions {
  enabled?: boolean;
}

export const useEssay = (slug: string, options: UseEssayOptions = {}) => {
  return useQuery({
    queryKey: ['essay', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('slug', slug)
        // maybeSingle: a row that does not exist is a not-found for the page
        // to render, not a 406 from PostgREST behind a page that looks fine.
        .maybeSingle();

      if (error) throw error;
      return data as Essay;
    },
    enabled: options.enabled !== undefined ? options.enabled : !!slug,
  });
};

/**
 * The narrow row a featured card needs — including the joined curriculum
 * placement, without which no canonical finance URL can be built.
 */
export interface FeaturedEssay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  section: string;
  phase: string | null;
  author: string | null;
  read_time: string | null;
  finance_section: string | null;
  fsli_slug: string | null;
  topic: string | null;
  finance_modules: { slug: string; track_slug: string } | null;
}

export const useFeaturedEssays = (limit = 4) => {
  return useQuery({
    queryKey: ['essays', 'featured', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        // module_id joins finance_modules for track + module slug. Without
        // them essayUrl() cannot build /finance/:track/:moduleSlug/:slug and
        // every finance card silently degrades to the universal route.
        .select(`
          id, slug, title, snippet, section, phase, author, read_time,
          finance_section, fsli_slug, topic,
          finance_modules!essays_module_id_fkey ( slug, track_slug )
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as FeaturedEssay[];
    },
  });
};

export const useEssaysByFsliSlug = (fsliSlug: string) => {
  return useQuery({
    queryKey: ['essays', 'fsli', fsliSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select(ESSAY_CARD_COLUMNS)
        .eq('fsli_slug', fsliSlug)
        .eq('published', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as unknown as Essay[];
    },
    enabled: !!fsliSlug,
  });
};

export const useEssaysByTopic = (section: string, topic: string) => {
  return useQuery({
    queryKey: ['essays', 'topic', section, topic],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select(ESSAY_CARD_COLUMNS)
        .eq('section', section)
        .eq('topic', topic)
        .eq('published', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as unknown as Essay[];
    },
    enabled: !!section && !!topic,
  });
};

export const useRelatedEssays = (currentId: string, section: string, limit = 3) => {
  return useQuery({
    queryKey: ['essays', 'related', currentId, section],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, slug, title, snippet, section, phase, author, read_time')
        .eq('section', section)
        .eq('published', true)
        .neq('id', currentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as Essay[];
    },
    enabled: !!currentId && !!section,
  });
};
