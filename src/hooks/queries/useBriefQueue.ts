/**
 * useBriefQueue — the data behind the admin Briefs panel.
 *
 * Two lists from one query over PUBLISHED essays:
 *   - awaiting: essays with no Brief, oldest publication first, each with its
 *     age in days. An essay published yesterday is inside the normal window;
 *     one three weeks unwritten is a different fact — the age is the
 *     information, so it is computed per row, never summarised away.
 *   - written: essays whose Brief exists, with the Brief's word count —
 *     displayed so drift from the 500–600 target (600 → 900 → 1,100) stays
 *     visible without any rule preventing it (docs/DECISIONS.md, delegated
 *     decision 3).
 *
 * The word count is DERIVED here from brief_json with the same
 * briefWordCount() the editor's live counter uses — one function, so the
 * two numbers cannot disagree and nothing stored can go stale. The query
 * selects brief_json (a few hundred words per row at most) and deliberately
 * NOT content/content_json (26,000 characters per row).
 *
 * Age since publication comes from essays.date (the stated publication
 * date), falling back to created_at: only one of the five published essays
 * has a `publish` revision row, so the date column is the source that
 * exists for all of them.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { briefWordCount, parseBriefDoc, isEmptyBrief } from '@/lib/brief';

export interface BriefQueueRow {
  id: string;
  slug: string;
  title: string;
  section: string;
  /** ISO date the essay states as its publication date. */
  publishedOn: string | null;
  /** Whole days since publishedOn (0 = published today). */
  ageDays: number;
  /** Word count of the Brief — only meaningful on the written list. */
  words: number;
}

export interface BriefQueueData {
  awaiting: BriefQueueRow[];
  written: BriefQueueRow[];
}

function ageInDays(publishedOn: string | null): number {
  if (!publishedOn) return 0;
  const then = new Date(publishedOn).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
}

export function useBriefQueue(enabled: boolean) {
  return useQuery<BriefQueueData>({
    queryKey: ['brief-queue'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, slug, title, section, date, created_at, brief_json')
        .eq('published', true);
      if (error) throw error;

      const awaiting: BriefQueueRow[] = [];
      const written: BriefQueueRow[] = [];

      for (const row of data ?? []) {
        const publishedOn = row.date || (row.created_at ? row.created_at.slice(0, 10) : null);
        const doc = parseBriefDoc(row.brief_json);
        const has = !!doc && !isEmptyBrief(doc);
        const item: BriefQueueRow = {
          id: row.id,
          slug: row.slug,
          title: row.title,
          section: row.section,
          publishedOn,
          ageDays: ageInDays(publishedOn),
          words: has ? briefWordCount(doc) : 0,
        };
        (has ? written : awaiting).push(item);
      }

      // Oldest publication first — the essay that has waited longest leads.
      awaiting.sort((a, b) => b.ageDays - a.ageDays);
      written.sort((a, b) => b.ageDays - a.ageDays);

      return { awaiting, written };
    },
  });
}
