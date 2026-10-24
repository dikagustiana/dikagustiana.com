import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useChartModels } from '@/hooks/queries/useTransition';
import { useTrackerEntries } from '@/hooks/queries/useTrackerEntries';
import { ChartCard } from './ChartCard';

/**
 * A Transition Tracker chart inside an essay (the `chartEmbed` node). It reads
 * the same published views as the tracker page, so the number in the essay is
 * the number on the tracker.
 *
 * On the public page an unpublished or unknown chart renders nothing. In the
 * editor it renders a placeholder that names the chart and says it will not
 * show, reading ds_chart directly (admin-only under RLS).
 *
 * Default export: the essay page loads it lazily, so an essay with no chart
 * downloads none of the chart code.
 */
export default function ChartEmbed({ slug, isEditing = false }: { slug: string; isEditing?: boolean }) {
  const { charts, status, isLoading } = useChartModels(slug || undefined);
  const { data: entries } = useTrackerEntries();
  const chart = slug ? charts[0] : undefined;

  const draft = useQuery({
    queryKey: ['transition', 'embed-draft', slug],
    enabled: isEditing && !!slug && !isLoading && !chart,
    queryFn: async () => {
      const { data } = await supabase.from('ds_chart' as never).select('slug, title, published').eq('slug', slug).maybeSingle();
      return data as unknown as { slug: string; title: string; published: boolean } | null;
    },
  });

  if (!slug) {
    return isEditing ? <p className="my-6 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">A chart with no slug. Remove it and insert it again.</p> : null;
  }
  if (isLoading) return <Skeleton className="my-10 h-72 w-full" />;
  if (!chart) {
    if (!isEditing) return null;
    return (
      <div className="my-6 rounded-md border border-dashed border-border p-4 text-sm">
        <p className="font-semibold text-foreground">{draft.data?.title ?? slug}</p>
        <p className="mt-1 text-muted-foreground">
          {draft.data
            ? 'This chart is not published, so readers will not see it. Publish it in Admin → Transition data.'
            : `No chart named “${slug}”. Readers will not see this block.`}
        </p>
      </div>
    );
  }
  return <ChartCard chart={chart} status={status} entries={entries ?? []} variant="embed" />;
}
