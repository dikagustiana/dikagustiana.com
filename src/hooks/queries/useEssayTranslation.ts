import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EssayTranslation } from '@/lib/essayLanguage';
import type { TranslationState } from '@/components/editorial/useEssayLanguageView';

/** Every column the reader side uses; the row is small apart from the two bodies. */
export const TRANSLATION_COLUMNS =
  'essay_id, locale, title, snippet, content_json, brief_json, presentation, read_time, published';

/**
 * The essay's Indonesian version, for the reader. RLS already hides drafts and
 * translations of unpublished essays, so a row here is one a reader may see
 * (an admin also sees drafts; the shell checks `published` itself).
 *
 * A separate query from the essay's, on purpose: lists and cards never need
 * it, and the long body is large. No row is the ordinary case → null.
 *
 * A failed read is ALSO null, never a page error: the translation is an
 * optional layer over an essay that must render regardless (and before the
 * table exists, every read fails). The failure is logged, not thrown.
 */
export const useEssayTranslation = (essayId: string | null | undefined) => {
  return useQuery({
    queryKey: ['essay-translation', essayId, 'id'],
    queryFn: async (): Promise<EssayTranslation | null> => {
      const { data, error } = await supabase
        .from('essay_translations')
        .select(TRANSLATION_COLUMNS)
        .eq('essay_id', essayId!)
        .eq('locale', 'id')
        .maybeSingle();
      if (error) {
        console.warn('[essay-translation] read failed; showing English only', error.message);
        return null;
      }
      return (data as EssayTranslation | null) ?? null;
    },
    enabled: !!essayId,
    staleTime: 60_000,
  });
};

/**
 * The shape the article shells take (`translation` prop). Every essay page
 * calls this before its early returns and passes the result straight through.
 * A disabled query (no essay id yet) is not loading.
 */
export const useEssayTranslationState = (essayId: string | null | undefined): TranslationState => {
  const q = useEssayTranslation(essayId);
  return { data: q.data ?? null, loading: q.isLoading };
};

/**
 * Admin: every essay's Indonesian status, for the Writer's Desk badges.
 * Two small columns, no bodies. A failed read (e.g. before the table exists)
 * is an empty map, so the desk renders as it always did.
 */
export const useTranslationStatuses = (enabled = true) => {
  return useQuery({
    queryKey: ['translation-status'],
    queryFn: async (): Promise<Map<string, { published: boolean }>> => {
      const { data, error } = await supabase
        .from('essay_translations')
        .select('essay_id, published')
        .eq('locale', 'id');
      if (error) {
        console.warn('[essay-translation] status read failed', error.message);
        return new Map();
      }
      return new Map((data ?? []).map((r) => [r.essay_id, { published: r.published }]));
    },
    enabled,
  });
};
