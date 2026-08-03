/**
 * EssayBySlug — the universal `/essays/:slug` route.
 *
 * Two jobs:
 *   1. It is the shape people guess and the shape old links use, so when the
 *      essay has a canonical placement URL this redirects there.
 *   2. It is the actual home for essays with no placement. `site-rebuild-note`
 *      is published, has no module, track or phase, and before this route
 *      existed it was reachable at no working URL at all: the homepage linked
 *      it to `/essays/...` (no route → 404) and `/finance-101/essays/:slug`
 *      throws the slug away and redirects to `/finance`.
 *
 * Slug is globally unique, so the lookup needs nothing else.
 */

import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingState, ErrorState } from '@/components/states';
import { ArticleShell } from '@/components/editorial';
import { contentToHtml } from '@/lib/tiptap/serialize';
import { resolvePresentation, type EssayPresentation } from '@/lib/presentation';
import { essayUrl, universalEssayUrl } from '@/lib/essayUrl';
import NotFound from './NotFound';

interface Row {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  content: string | null;
  section: string;
  phase: string | null;
  finance_section: string | null;
  fsli_slug: string | null;
  topic: string | null;
  published: boolean | null;
  created_at: string;
  updated_at: string;
  presentation: EssayPresentation | null;
  brief_json: unknown;
  finance_modules: { slug: string; track_slug: string } | null;
}

const ROW_SELECT = `
  id, slug, title, snippet, author, date, read_time, thumbnail_url,
  content, section, phase, finance_section, fsli_slug, topic,
  published, created_at, updated_at, presentation, brief_json,
  finance_modules!essays_module_id_fkey ( slug, track_slug )
`;

export default function EssayBySlug() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['essay-by-slug', slug],
    enabled: !!slug,
    queryFn: async () => {
      const bySlug = await supabase
        .from('essays')
        .select(ROW_SELECT)
        .eq('slug', slug!)
        .maybeSingle();
      if (bySlug.error) throw bySlug.error;
      if (bySlug.data) {
        return { row: bySlug.data as unknown as Row, byCode: false };
      }
      // Old addresses used the curriculum code (fa-07-01), which now lives in
      // its own column. Every pre-rename link lands here eventually — the
      // legacy four-segment route and /finance-101/essays both forward to
      // /essays/:slug — so this ONE fallback is the general redirect shape.
      const byCode = await supabase
        .from('essays')
        .select(ROW_SELECT)
        .eq('code', slug!)
        .maybeSingle();
      if (byCode.error) throw byCode.error;
      return byCode.data ? { row: byCode.data as unknown as Row, byCode: true } : null;
    },
  });
  const essay = data?.row ?? null;
  const foundByCode = data?.byCode ?? false;

  if (isLoading) return <LoadingState />;
  // A failed fetch is not a missing essay — an outage rendered as 404 tells
  // the reader (and the owner) the essay is gone when it is fine.
  if (isError) {
    return (
      <ErrorState
        title="Couldn't load this essay"
        message="The essay is still there — this page just couldn't reach the database. Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }
  // RLS hides drafts from anonymous readers, so "not found" here covers both
  // "no such essay" and "not published for you" — deliberately the same answer.
  if (!essay) return <NotFound />;

  const canonical = essayUrl({
    slug: essay.slug,
    section: essay.section,
    phase: essay.phase,
    track: essay.finance_modules?.track_slug ?? essay.finance_section,
    moduleSlug: essay.finance_modules?.slug ?? null,
    fsliSlug: essay.fsli_slug,
    topic: essay.topic,
  });

  // A placement-bearing essay belongs at its canonical URL; this route is only
  // ever a doorway to it. The guard against redirecting to ourselves is what
  // stops an infinite loop for placement-less essays. An essay reached by its
  // old curriculum code redirects even without placement — /essays/<code> is
  // never an address, /essays/<slug> is.
  if (canonical && canonical !== universalEssayUrl(essay.slug)) {
    return <Navigate to={canonical} replace />;
  }
  if (foundByCode) {
    return <Navigate to={universalEssayUrl(essay.slug)} replace />;
  }

  const presentation = resolvePresentation(essay);
  const deck = presentation.deck || essay.snippet;

  return (
    <ArticleShell
      seoTitle={essay.title}
      seoDescription={deck || undefined}
      seoAuthor={essay.author || undefined}
      backLink={{ label: 'Back to home', path: '/' }}
      title={essay.title}
      deck={deck}
      author={essay.author}
      publishedAt={essay.date}
      updatedAt={essay.updated_at}
      createdAt={essay.created_at}
      readTime={essay.read_time}
      heroImage={essay.thumbnail_url}
      heroCaption={presentation.hero_caption}
      content={essay.content || ''}
      htmlContent={contentToHtml(essay.content || '')}
      brief={essay.brief_json}
      keyTakeaways={presentation.key_takeaways}
      references={presentation.references}
      authorBio={presentation.author_bio}
      currentEssayId={essay.id}
      section="finance"
      topic={essay.section}
    />
  );
}
