import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { supabase } from '@/integrations/supabase/client';
import { essayUrl, essayUrlInputFromRow } from '@/lib/essayUrl';
import { isPublished } from '@/lib/publication';

/**
 * The current-condition essay series: a stub index (Plan 2.3).
 *
 * The tracker's status line points here; the tracker is this series' data
 * appendix (PRD D5). The series lists its essays in reading order. Each title
 * shows whether or not it is published; it becomes a link only once it is, so
 * a reader is never sent to a page RLS will not serve them (owner's answer of
 * 11 October 2026).
 */
const SERIES: { slug: string; title: string }[] = [
  {
    slug: 'the-green-transition-isnt-only-about-green',
    title: "The Green Transition Isn't Only About Green: Why Indonesia Cannot Afford to Wait",
  },
  { slug: 'learn-from-the-uk-it-was-never-just-political-will', title: 'Learn from the UK: It Was Never Just Political Will' },
];

function useSeriesEssays() {
  return useQuery({
    queryKey: ['current-condition-series'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('slug, section, phase, published, fsli_slug, topic, finance_section')
        .in(
          'slug',
          SERIES.map((s) => s.slug),
        );
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function GreenTransitionCurrentCondition() {
  // Publication status is stated only from a successful read: while the
  // query is loading, or if it fails, the title shows without a status line.
  const { data, isSuccess } = useSeriesEssays();
  const bySlug = new Map((data ?? []).map((row) => [row.slug, row]));

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition', path: '/green-transition' },
        { label: 'Current condition' },
      ]}
      subNav={{ tabs: GREEN_TRANSITION_TABS }}
    >
      <SEO
        title="Current condition - Green Transition"
        description="An essay series on where Indonesia's energy transition stands, with the Green Transition Tracker as its data appendix."
      />
      <div className="container py-10">
        <div className="editorial-column space-y-8">
          <header>
            <h1 className="text-3xl font-semibold text-foreground">Current condition</h1>
            <p className="mt-4 font-sans text-[19px] leading-[1.6] text-prose-fg">
              An essay series on where Indonesia&rsquo;s energy transition stands. Its data appendix is the{' '}
              <Link to="/green-transition/tracker" className="text-accent underline underline-offset-2 hover:opacity-80">
                Green Transition Tracker
              </Link>
              .
            </p>
          </header>
          <ol className="border-t border-border">
            {SERIES.map((item) => {
              const row = bySlug.get(item.slug);
              const href = row && isPublished(row) ? essayUrl(essayUrlInputFromRow(row)) : null;
              return (
                <li key={item.slug} className="border-b border-border py-5">
                  {href ? (
                    <Link
                      to={href}
                      className="text-lg font-display font-semibold text-foreground hover:text-accent transition-colors"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <>
                      <span className="block text-lg font-display font-semibold text-foreground">{item.title}</span>
                      {isSuccess && <span className="mt-1 block text-base text-muted-foreground">Not yet published.</span>}
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </PageLayout>
  );
}
