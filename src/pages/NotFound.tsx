import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { essayUrl } from "@/lib/essayUrl";

/**
 * A 404 that tries to be useful.
 *
 * "Return home" is the right answer for a genuinely random URL, and the wrong
 * answer for a mistyped essay path — the reader knows what they wanted and is
 * one segment away from it. For essay-shaped URLs this looks the last segment
 * up as a slug and offers the real essay, falling back to the track index.
 */

/** Pull the plausible slug and track out of an essay-shaped path. */
export function parseEssayishPath(pathname: string): { slug: string | null; track: string | null } {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return { slug: null, track: null };

  const ESSAY_ROOTS = new Set([
    'essays', 'finance', 'green-transition', 'development-finance',
    'the-next-big-thing', 'critical-thinking-research', 'finance-101',
  ]);
  if (!ESSAY_ROOTS.has(parts[0])) return { slug: null, track: null };

  return {
    slug: parts[parts.length - 1] ?? null,
    // /finance/:track/... — the track index is the useful fallback.
    track: parts[0] === 'finance' && parts.length >= 2 ? parts[1] : null,
  };
}

const NotFound = () => {
  const location = useLocation();
  const { slug, track } = parseEssayishPath(location.pathname);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname]);

  // Only runs for essay-shaped URLs. RLS keeps drafts invisible, so an
  // anonymous visitor cannot use this to discover unpublished work.
  const { data: candidate } = useQuery({
    queryKey: ['notfound-candidate', slug],
    enabled: !!slug,
    retry: false,
    queryFn: async () => {
      const { data } = await supabase
        .from('essays')
        .select(`
          slug, title, section, phase, finance_section, fsli_slug, topic,
          finance_modules!essays_module_id_fkey ( slug, track_slug )
        `)
        .eq('slug', slug!)
        .eq('published', true)
        .maybeSingle();
      return data as unknown as {
        slug: string; title: string; section: string; phase: string | null;
        finance_section: string | null; fsli_slug: string | null; topic: string | null;
        finance_modules: { slug: string; track_slug: string } | null;
      } | null;
    },
  });

  const candidateUrl = candidate
    ? essayUrl({
        slug: candidate.slug,
        section: candidate.section,
        phase: candidate.phase,
        track: candidate.finance_modules?.track_slug ?? candidate.finance_section,
        moduleSlug: candidate.finance_modules?.slug ?? null,
        fsliSlug: candidate.fsli_slug,
        topic: candidate.topic,
      })
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <SEO title="Page not found" description="The page you were looking for could not be found." noindex />
      <div className="text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="mb-3 text-3xl font-display font-bold">Page not found</h1>
        <p className="mb-6 max-w-md text-muted-foreground">
          The page you were looking for doesn’t exist or may have moved.
        </p>

        {candidate && candidateUrl && (
          <div className="mb-6 rounded-md border border-border bg-card p-4 text-left">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Did you mean
            </p>
            <Link to={candidateUrl} className="font-medium text-primary hover:underline">
              {candidate.title}
            </Link>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Return home
          </Link>
          {track && (
            <Link
              to={`/finance/${track}`}
              className="inline-flex min-h-[44px] items-center rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Browse this track
            </Link>
          )}
          {!track && slug && (
            <Link
              to="/finance"
              className="inline-flex min-h-[44px] items-center rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Browse essays
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
