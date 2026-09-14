import NotFound from './NotFound';
import { resolvePresentation, type EssayPresentation } from '@/lib/presentation';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState, ErrorState } from '@/components/states';
import { ArticleShell, ArticleLayout } from '@/components/editorial';
import { contentToHtml } from '@/lib/tiptap/serialize';
import { essayUrl, universalEssayUrl } from '@/lib/essayUrl';
import { isPublished } from '@/lib/publication';

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
  /** The essay's own section. This, not the route, decides where it lives. */
  section: string;
  phase: string | null;
  status: string | null;
  published: boolean | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  presentation: EssayPresentation | null;
  /** Optional Brief companion (raw jsonb) — the shell renders the toggle when present. */
  brief_json: unknown;
}

interface EssayListItem {
  slug: string;
  title: string;
}

/**
 * Labels for the phase the ESSAY says it is in — both spellings, because the
 * database stores the long slug and the readable routes use the short one.
 * `climate-finance` is here too: it is a real phase with its own route, and
 * without it the page printed the raw slug as a topic.
 */
const phaseLabels: Record<string, string> = {
  'where-we-are-now': 'Where We Are Now',
  'challenges-ahead': 'Challenges Ahead',
  'pathways-forward': 'Pathways Forward',
  now: 'Where We Are Now',
  gaps: 'Challenges Ahead',
  future: 'Pathways Forward',
  'climate-finance': 'Climate Finance',
};

export default function GreenTransitionEssayPage() {
  // `phase` is UNDEFINED on /green-transition/climate-finance/:slug, which has
  // no :phase segment. Everything below therefore derives placement from the
  // ESSAY ROW, not from the URL: the old code interpolated this param straight
  // into sibling links and minted /green-transition/undefined/<slug>.
  const { phase, slug } = useParams<{ phase?: string; slug: string }>();
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // A failed FETCH is not a missing essay. Rendering 404 on a network error
  // tells the owner their essay is gone when it is fine — the panic-then-
  // recreate path that forks work. Errors get a retry, not a tombstone.
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (slug) loadEssay();
  }, [slug, isAdmin]);

  const loadEssay = async () => {
    setLoading(true);
    setNotFound(false);
    setLoadError(false);
    try {
      // Fetch by globally unique slug — no section string matching needed
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (!isPublished(data) && !isAdmin) {
          setNotFound(true);
          setEssay(null);
        } else {
          setEssay(data as Essay);
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

  // Fetch siblings via category_id FK
  const { data: siblings } = useQuery({
    queryKey: ['green-transition-siblings', essay?.category_id],
    queryFn: async () => {
      if (!essay?.category_id) return [];
      const { data, error } = await supabase
        .from('essays')
        .select('slug, title')
        .eq('category_id', essay.category_id)
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EssayListItem[];
    },
    enabled: !!essay?.category_id,
  });

  if (loadError && !loading) {
    return (
      <div className="container min-h-[60vh] flex items-center justify-center py-16">
        <ErrorState
          title="Couldn't load this essay"
          message="This page couldn't reach the database, so it cannot tell whether this essay is here. Check your connection and try again."
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

  /**
   * WHERE THE ESSAY ACTUALLY LIVES.
   *
   * The route matched on the slug alone, so nothing so far has checked that
   * this URL's section and phase are the essay's own. An essay reached at a
   * wrong phase, or at a green-transition address when it belongs to another
   * section, rendered here under that address with breadcrumbs, sibling links
   * and a canonical tag all asserting the false home.
   *
   * So: the essay's row decides, and a URL that disagrees redirects to the one
   * it should have been. Same correction FinanceEssayPage and
   * NextBigThingEssayPage already make; `essayUrl` is the single builder, and
   * its branches are pinned to the route list by tests/unit/essayUrl.test.ts,
   * so this cannot mint an address that does not exist.
   *
   * No loop: after the redirect the pathname IS the canonical, and an essay
   * with no phase goes to /essays/:slug, whose own resolver renders it.
   */
  const canonical = essayUrl({
    slug: essay.slug,
    section: essay.section,
    phase: essay.phase,
  });
  if (canonical && canonical !== pathname) {
    return <Navigate to={canonical} replace />;
  }
  if (!canonical) {
    return <Navigate to={universalEssayUrl(essay.slug)} replace />;
  }

  // From here on, placement comes from the row. `phase` (the URL param) is
  // only used to notice that it agrees.
  const essayPhase = essay.phase ?? '';
  const phaseLabel = phaseLabels[essayPhase] || essayPhase;
  // The phase index this essay belongs to: the canonical URL minus its last
  // segment. Derived rather than rebuilt, so it cannot disagree with the
  // address the reader is on.
  const phaseHome = canonical.slice(0, canonical.lastIndexOf('/')) || '/green-transition';

  const currentIndex = siblings?.findIndex((e) => e.slug === slug) ?? -1;
  const previous = currentIndex > 0 ? siblings![currentIndex - 1] : null;
  const next =
    siblings && currentIndex >= 0 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1]
      : null;

  // Siblings share this essay's category, so they share its phase segment —
  // the essay's, never the URL's.
  const getEssayUrl = (essaySlug: string) =>
    essayUrl({ slug: essaySlug, section: 'green-transition', phase: essay.phase }) ??
    universalEssayUrl(essaySlug);

  const presentation = resolvePresentation(essay);
  const deck = presentation.deck || essay.snippet;
  const htmlContent = contentToHtml(essay.content || '');

  return (
    <ArticleShell
      seoTitle={essay.title}
      seoDescription={deck || 'Economic analysis of Indonesia green transition.'}
      seoAuthor={essay.author || undefined}
      backLink={{
        label: `Back to ${phaseLabel || 'Green Transition'}`,
        path: phaseHome,
      }}
      title={essay.title}
      deck={deck}
      author={essay.author}
      publishedAt={essay.date}
      updatedAt={essay.updated_at}
      createdAt={essay.created_at}
      readTime={essay.read_time}
      topic={phaseLabel}
      heroImage={essay.thumbnail_url}
      heroCaption={presentation.hero_caption}
      content={essay.content || ''}
      htmlContent={htmlContent}
      brief={essay.brief_json}
      keyTakeaways={presentation.key_takeaways}
      references={presentation.references}
      authorBio={presentation.author_bio}
      previous={previous}
      next={next}
      getEssayUrl={getEssayUrl}
      currentEssayId={essay.id}
      section="green-transition"
    />
  );
}
