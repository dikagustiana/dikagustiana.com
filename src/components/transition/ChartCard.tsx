import { Link } from 'react-router-dom';
import { TransitionChart } from './TransitionChart';
import { ChartTrail } from './ChartTrail';
import { annotationsFor, chartPath, type ChartModel, type SeriesStatusRow } from '@/lib/transition/model';
import type { TrackerEntry } from '@/lib/tracker';

/**
 * One chart as the tracker index and an essay show it: the finding as its
 * title, the chart, and the trail. `variant="embed"` sits inside an essay's
 * column on its own ground, so it reads as evidence, not illustration (PRD,
 * Desain: "Latar embed berbeda dari teks esai").
 */
export function ChartCard({
  chart,
  status,
  entries,
  variant = 'index',
}: {
  chart: ChartModel;
  status: SeriesStatusRow[];
  entries: TrackerEntry[];
  variant?: 'index' | 'embed';
}) {
  const annotations = annotationsFor(entries, chart.annotationSectors);
  const Heading = variant === 'embed' ? 'p' : 'h3';
  return (
    <article
      className={
        variant === 'embed'
          ? 'not-prose my-10 rounded-md border border-border bg-muted/40 p-4 sm:p-5'
          : 'border-t border-border pt-6'
      }
      aria-labelledby={`chart-${chart.slug}-title`}
    >
      <Heading id={`chart-${chart.slug}-title`} className="font-serif text-lg font-semibold leading-snug text-foreground">
        {chart.title}
      </Heading>
      {chart.subtitle && <p className="mt-1 text-sm text-muted-foreground">{chart.subtitle}</p>}
      <div className="mt-4">
        <TransitionChart
          chartType={chart.chartType}
          lines={chart.lines}
          unit={chart.unit}
          annotations={annotations}
          compact
          title={chart.title}
        />
      </div>
      {chart.chartType === 'timeline' ? (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Markers: the verified, published entries of the tracker register, each sourced to the regulation, plan or release
          itself (the Transition Tracker lists every source).
        </p>
      ) : (
        <ChartTrail lines={chart.lines} status={status} slug={chart.slug} compact />
      )}
      <p className="mt-2 text-xs">
        <Link to={chartPath(chart.slug)} className="text-accent underline underline-offset-2 hover:opacity-80">
          {variant === 'embed' ? 'Open in the Transition Tracker' : 'Sources, checks and revisions'}&nbsp;→
        </Link>
      </p>
    </article>
  );
}
