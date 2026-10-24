/**
 * /finance/toolkits (docs/prd/finance-restructure §1 E, §3): one card per published toolkit, in a
 * two-column list. The files are uploaded by the owner from /admin/toolkits; until the first is published
 * the page says so.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { ToolkitCard } from '@/components/toolkits/ToolkitCard';
import { useToolkits } from '@/hooks/queries/useToolkits';

export const TOOLKITS_INTRO = 'The working files behind the essays. Download, open, use.';
export const TOOLKITS_EMPTY = 'No toolkit is published yet.';

export default function ToolkitsPage() {
  const { data, isLoading, isError, refetch } = useToolkits();
  const { hash } = useLocation();
  // A module page links to its toolkit's card (#toolkit-<slug>); scroll there once the cards exist.
  useEffect(() => {
    if (!hash || !data) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView();
  }, [hash, data]);
  return (
    <PageLayout
      width="reading"
      role="manager"
      breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Finance', path: '/finance' }, { label: 'Toolkits' }]}
    >
      <SEO title="Toolkits" description={TOOLKITS_INTRO} />
      <div className="container max-w-3xl py-8">
        <h1 className="mb-2 font-display text-3xl font-bold md:text-4xl">Toolkits</h1>
        <p className="mb-10 text-base text-muted-foreground">{TOOLKITS_INTRO}</p>
        {isError ? (
          <ErrorState
            title="Couldn't load the toolkits"
            message="The toolkits could not be fetched just now. This is a temporary failure, not an empty list."
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.map((t) => (
              <ToolkitCard key={t.id} toolkit={t} />
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">{TOOLKITS_EMPTY}</p>
        )}
      </div>
    </PageLayout>
  );
}
