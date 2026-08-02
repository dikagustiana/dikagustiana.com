/**
 * FinanceEssayPage — Renders finance essays using the canonical ArticleShell.
 *
 * Route: /finance/:track/:essaySlug (three segments — rendered through
 * FinanceTrackChild, which owns /finance/:track/:slug and decides
 * module-vs-essay by lookup). The module is navigation and metadata, not
 * part of the address: essays move between modules while the curriculum is
 * designed, and a URL that encodes module membership breaks on every
 * reorganisation.
 */

import NotFound from './NotFound';
import { resolvePresentation, type EssayPresentation } from '@/lib/presentation';
import { universalEssayUrl } from '@/lib/essayUrl';
import { useParams, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState, ErrorState } from '@/components/states';
import { ArticleShell, ArticleLayout } from '@/components/editorial';
import { LongformArticleShell } from '@/components/editorial/LongformArticleShell';
import { contentToHtml } from '@/lib/tiptap/serialize';

interface Essay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  content: string | null;
  phase: string | null;
  status: string | null;
  published: boolean | null;
  category_id: string | null;
  module_id: string | null;
  finance_section: string | null;
  created_at: string;
  updated_at: string;
  presentation: EssayPresentation | null;
  /** The essay's actual module, joined — the URL's track is checked against this. */
  finance_modules: { slug: string; track_slug: string; title: string | null } | null;
}

interface EssayListItem {
  slug: string;
  title: string;
}

const ESSAY_SELECT =
  // The essay's OWN module, joined, is what canonicalises the URL below.
  // FK-hinted like every other embed in the repo — the unhinted form
  // breaks with an ambiguous-embed error if a second FK ever appears.
  '*, finance_modules!essays_module_id_fkey ( slug, track_slug, title )';

export default function FinanceEssayPage() {
  const params = useParams<{ track: string; slug?: string; essaySlug?: string }>();
  const track = params.track;
  // Rendered via FinanceTrackChild (:slug) — :essaySlug kept for safety.
  const essaySlug = params.slug ?? params.essaySlug;
  const { isAdmin } = useAuth();
  const [essay, setEssay] = useState<Essay | null>(null);
  // Reached by curriculum code (fa-07-01)? Then the address is legacy and
  // must redirect to the canonical human slug even if the track matches.
  const [foundByCode, setFoundByCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // A failed FETCH is not a missing essay. Rendering 404 on a network error
  // tells the owner their essay is gone when it is fine — the panic-then-
  // recreate path that forks work. Errors get a retry, not a tombstone.
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (essaySlug) loadEssay();
  }, [essaySlug, isAdmin]);

  const loadEssay = async () => {
    setLoading(true);
    setNotFound(false);
    setLoadError(false);
    setFoundByCode(false);
    try {
      // Fetch by globally UNIQUE slug (constraint added with this route shape).
      const bySlug = await supabase
        .from('essays')
        .select(ESSAY_SELECT)
        .eq('slug', essaySlug!)
        .maybeSingle();
      if (bySlug.error) throw bySlug.error;

      let data = bySlug.data;
      if (!data) {
        // Old addresses used the curriculum code, which now lives in its own
        // column. Resolve it so every pre-rename link redirects, not 404s.
        const byCode = await supabase
          .from('essays')
          .select(ESSAY_SELECT)
          .eq('code', essaySlug!)
          .maybeSingle();
        if (byCode.error) throw byCode.error;
        data = byCode.data;
        if (data) setFoundByCode(true);
      }

      if (data) {
        const isPublished = data.status === 'published';
        if (!isPublished && !isAdmin) {
          setNotFound(true);
          setEssay(null);
        } else {
          setEssay(data as unknown as Essay);
        }
      } else {
        setNotFound(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch siblings via module_id FK
  const { data: siblings } = useQuery({
    queryKey: ['finance-siblings', (essay as any)?.module_id],
    queryFn: async () => {
      if (!(essay as any)?.module_id) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('essays')
        .select('slug, title')
        .eq('module_id', (essay as any).module_id)
        .eq('status', 'published')
        .order('finance_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EssayListItem[];
    },
    enabled: !!(essay as any)?.module_id,
  });

  if (loadError && !loading) {
    return (
      <div className="container min-h-[60vh] flex items-center justify-center py-16">
        <ErrorState
          title="Couldn't load this essay"
          message="The essay is still there — this page just couldn't reach the database. Check your connection and try again."
          onRetry={loadEssay}
        />
      </div>
    );
  }

  if (notFound || (!loading && !essay)) {
    // A bad slug is a wrong URL, not a reason to silently teleport the reader
    // to the section index. NotFound says so and offers the nearest real essay.
    return <NotFound />;
  }


  if (loading) {
    return (
      <ArticleLayout>
        <LoadingState variant="article" />
      </ArticleLayout>
    );
  }

  // A valid route shape with a bad slug used to render nothing — page chrome
  // with a blank middle, which reads as a broken site rather than a wrong URL.
  // NotFound also offers the nearest real essay for a near-miss slug.
  if (!essay) return <NotFound />;

  // The URL's track claim is checked against the essay's actual placement
  // (joined module first, the row's own finance_section as fallback), and a
  // mismatch — or an address using the old curriculum code — redirects to
  // the one canonical three-segment URL rather than 404ing: the reader asked
  // for a real essay, just at the wrong address.
  const actualModule = essay.finance_modules;
  const canonicalTrack = actualModule?.track_slug ?? essay.finance_section ?? null;
  if (!canonicalTrack) {
    // No track placement means no /finance home — the universal route
    // renders unplaced essays.
    return <Navigate to={universalEssayUrl(essay.slug)} replace />;
  }
  if (canonicalTrack !== track || foundByCode) {
    return <Navigate to={`/finance/${canonicalTrack}/${essay.slug}`} replace />;
  }

  const currentIndex = siblings?.findIndex((e) => e.slug === essay.slug) ?? -1;
  const previous = currentIndex > 0 ? siblings![currentIndex - 1] : null;
  const next =
    siblings && currentIndex >= 0 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1]
      : null;

  const getEssayUrl = (slug: string) => `/finance/${track}/${slug}`;

  const presentation = resolvePresentation(essay);
  const deck = presentation.deck || essay.snippet;
  const topic = actualModule?.title ?? essay.phase ?? 'Finance';
  const htmlContent = contentToHtml(essay.content || '');
  const isLongform = track === 'finance-in-motion';

  const sharedProps = {
    seoTitle: essay.title,
    seoDescription: deck || 'Finance knowledge for decision-making.',
    seoAuthor: essay.author || undefined,
    backLink: actualModule
      ? { label: 'Back to lessons', path: `/finance/${track}/${actualModule.slug}` }
      : { label: 'Back to track', path: `/finance/${track}` },
    title: essay.title,
    deck,
    author: essay.author,
    publishedAt: essay.date,
    updatedAt: essay.updated_at,
    createdAt: essay.created_at,
    readTime: essay.read_time,
    heroImage: essay.thumbnail_url,
    heroCaption: presentation.hero_caption,
    content: essay.content || '',
    htmlContent,
    keyTakeaways: presentation.key_takeaways,
    references: presentation.references,
    authorBio: presentation.author_bio,
    previous,
    next,
    getEssayUrl,
    currentEssayId: essay.id,
    section: 'finance' as const,
  };

  if (isLongform) {
    return <LongformArticleShell {...sharedProps} />;
  }

  return (
    <ArticleShell
      {...sharedProps}
      topic={topic}
    />
  );
}
