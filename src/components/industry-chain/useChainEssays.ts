/**
 * Whether the essays the map refers to are actually published, and where.
 *
 * The map's essay associations live in the repository
 * (ESSAY_ASSOCIATIONS in src/data/industryChain.ts); essay bodies and their
 * publication state live in the CMS. A card that linked a slug and called it
 * an essay would be asserting something the repository cannot know, so the
 * panel asks — through exactly the query the reading path already uses: the
 * `essays` table, filtered on the column Row Level Security enforces, with the
 * placement fields a canonical URL is built from. A slug that comes back is
 * published and gets its canonical address; one that does not is shown as
 * not published; and when the index cannot be reached at all the card says
 * it could not check, which is not the same as saying no.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { onlyPublished } from '@/lib/publication';

export interface ChainEssayRow {
  slug: string;
  title: string;
  section: string;
  phase: string | null;
  finance_section: string | null;
  fsli_slug: string | null;
  topic: string | null;
  finance_modules: { slug: string; track_slug: string } | null;
}

export function useChainEssays(slugs: readonly string[]) {
  const key = [...slugs].sort();
  return useQuery({
    queryKey: ['chain-essays', key],
    staleTime: 5 * 60 * 1000,
    enabled: key.length > 0,
    queryFn: async (): Promise<Record<string, ChainEssayRow>> => {
      const { data, error } = await onlyPublished(
        supabase
          .from('essays')
          .select(
            `slug, title, section, phase, finance_section, fsli_slug, topic,
             finance_modules!essays_module_id_fkey ( slug, track_slug )`,
          )
          .in('slug', key),
      );
      if (error) throw error;
      const rows = (data ?? []) as unknown as ChainEssayRow[];
      return Object.fromEntries(rows.map((row) => [row.slug, row]));
    },
  });
}
