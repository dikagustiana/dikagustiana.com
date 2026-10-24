import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { TransitionChart } from '@/components/transition/TransitionChart';
import { ChartTrail } from '@/components/transition/ChartTrail';
import { useChartModels, useChartUsage, useSeriesHistory } from '@/hooks/queries/useTransition';
import { useTrackerEntries } from '@/hooks/queries/useTrackerEntries';
import { fullDate } from '@/lib/formatDate';
import { universalEssayUrl } from '@/lib/essayUrl';
import {
  annotationsFor,
  asOfVintage,
  clipLines,
  linesFor,
  rangeStart,
  revisions,
  type ChainLink,
  type Range,
} from '@/lib/transition/model';

const CHAIN_LABEL: Record<ChainLink, string> = {
  policy: 'Policy',
  infrastructure: 'Infrastructure',
  finance: 'Finance',
  transition: 'Transition',
  carbon_price: 'Carbon price',
  macro: 'Macro context',
};

const RANGES: Array<{ id: Range; label: string }> = [
  { id: 'all', label: 'All' },
  { id: '10y', label: '10 years' },
  { id: '5y', label: '5 years' },
];

/**
 * One chart in full (PRD, Desain, "Detail grafik"): the chart, a time range,
 * the vintage it is read as of, the policy markers, and beside it the trail,
 * the last check, the revision history and the essays that embed it.
 */
export default function TransitionChartDetail() {
  const { slug = '' } = useParams();
  const { charts, status, isLoading, isError, refetch } = useChartModels(slug);
  const chart = charts[0];
  const history = useSeriesHistory(chart?.seriesIds ?? []);
  const usage = useChartUsage(slug);
  const { data: entries } = useTrackerEntries();
  const [range, setRange] = useState<Range>('all');
  const [asOf, setAsOf] = useState<string | null>(null);

  const memberOrder = useMemo(() => {
    const out: Record<string, string[] | null> = {};
    for (const l of chart?.lines ?? []) {
      out[l.seriesId] = out[l.seriesId] ?? [];
      out[l.seriesId]!.push(l.member);
    }
    return out;
  }, [chart]);

  const vintages = useMemo(() => revisions(history.data ?? []), [history.data]);

  const lines = useMemo(() => {
    if (!chart) return [];
    if (!asOf || !history.data) return chart.lines;
    const labels = new Map(chart.lines.map((l) => [l.seriesId, l.name]));
    const rows = asOfVintage(history.data, asOf).filter((r) => chart.lines.some((l) => l.key === `${r.series_id}::${r.member}`));
    return linesFor(
      rows.map((r) => ({ ...r, label: labels.get(r.series_id) })),
      memberOrder,
    ).map((l) => ({ ...l, name: chart.lines.find((c) => c.key === l.key)?.name ?? l.name }));
  }, [chart, asOf, history.data, memberOrder]);

  const shown = clipLines(lines, rangeStart(range, lines));
  const annotations = chart ? annotationsFor(entries ?? [], chart.annotationSectors) : [];
  const seriesStatus = status.filter((s) => chart?.seriesIds.includes(s.series_id));

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition', path: '/green-transition' },
        { label: 'Transition Tracker', path: '/green-transition/tracker' },
        { label: chart?.title ?? 'Chart' },
      ]}
      subNav={{ tabs: GREEN_TRANSITION_TABS }}
    >
      <SEO
        title={chart ? `${chart.title} · Transition Tracker` : 'Transition Tracker chart'}
        description={chart?.subtitle ?? 'A sourced series from the Indonesia Green Transition Tracker.'}
      />
      <div className="container py-10">
        <div className="mx-auto max-w-5xl">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : isError ? (
            <ErrorState message="The chart could not be loaded." onRetry={refetch} />
          ) : !chart ? (
            <div className="editorial-column">
              <h1 className="text-3xl font-semibold text-foreground">No such chart</h1>
              <p className="mt-4 text-base text-muted-foreground">
                This chart is not published.{' '}
                <Link to="/green-transition/tracker" className="text-accent underline underline-offset-2">
                  Back to the Transition Tracker
                </Link>
              </p>
            </div>
          ) : (
            <>
              <header className="max-w-3xl">
                <p className="text-sm text-muted-foreground">Transition Tracker · {CHAIN_LABEL[chart.chainLink]}</p>
                <h1 className="mt-1 text-3xl font-semibold leading-tight text-foreground">{chart.title}</h1>
                {chart.subtitle && <p className="mt-3 text-base text-muted-foreground">{chart.subtitle}</p>}
              </header>

              <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="min-w-0">
                  {chart.chartType !== 'timeline' && (
                    <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
                      <div role="group" aria-label="Time range" className="inline-flex overflow-hidden rounded-md border border-border">
                        {RANGES.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            aria-pressed={range === r.id}
                            onClick={() => setRange(r.id)}
                            className={`px-3 py-1 ${range === r.id ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'}`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      {vintages.length > 1 && (
                        <label className="inline-flex items-center gap-2 text-foreground">
                          As published on
                          <select
                            className="rounded-md border border-border bg-background px-2 py-1"
                            value={asOf ?? ''}
                            onChange={(e) => setAsOf(e.target.value || null)}
                          >
                            <option value="">Latest</option>
                            {vintages.map((v) => (
                              <option key={v.vintage} value={v.vintageDate}>
                                {v.vintage}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  )}
                  <TransitionChart
                    chartType={chart.chartType}
                    lines={shown}
                    unit={chart.unit}
                    annotations={annotations}
                    title={chart.title}
                  />
                  {chart.chartType !== 'timeline' && <ChartTrail lines={shown} status={status} slug={chart.slug} />}
                </div>

                <aside className="space-y-8 text-sm">
                  {seriesStatus.map((s) => (
                    <section key={s.series_id} aria-label={`Source of ${s.title_en}`}>
                      <h2 className="font-serif text-base font-semibold text-foreground">{s.title_en}</h2>
                      <dl className="mt-2 space-y-1 text-muted-foreground">
                        <div>
                          <dt className="inline text-foreground">Source: </dt>
                          <dd className="inline">
                            <a href={s.series_url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
                              {s.source_name}
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt className="inline text-foreground">Code: </dt>
                          <dd className="inline font-mono text-xs [overflow-wrap:anywhere]">{s.source_code}</dd>
                        </div>
                        <div>
                          <dt className="inline text-foreground">Unit: </dt>
                          <dd className="inline">{s.unit}</dd>
                        </div>
                        {s.first_period && s.last_period && (
                          <div>
                            <dt className="inline text-foreground">Covers: </dt>
                            <dd className="inline">
                              {s.first_period.slice(0, 7)} to {s.last_period.slice(0, 7)}, {s.n_values} values
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt className="inline text-foreground">Definition: </dt>
                          <dd className="inline">{s.definition_note}</dd>
                        </div>
                        <div>
                          <dt className="inline text-foreground">Licence: </dt>
                          <dd className="inline">{s.source_license}</dd>
                        </div>
                        {s.last_check_at && (
                          <div>
                            <dt className="inline text-foreground">Last check: </dt>
                            <dd className="inline">
                              {fullDate(s.last_check_at.slice(0, 10))}, {s.last_check_rules} rules,{' '}
                              {s.last_check_failed ? `${s.last_check_failed} failed` : 'none failed'}
                              {s.last_check_warned ? `, ${s.last_check_warned} warning${s.last_check_warned === 1 ? '' : 's'}` : ''}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </section>
                  ))}

                  {vintages.length > 0 && (
                    <section aria-labelledby="revisions-title">
                      <h2 id="revisions-title" className="font-serif text-base font-semibold text-foreground">
                        Revision history
                      </h2>
                      <p className="mt-1 text-muted-foreground">A revision adds a vintage; the values it replaced stay readable.</p>
                      <ol className="mt-2 space-y-1">
                        {vintages.map((v) => (
                          <li key={v.vintage} className="flex justify-between gap-3 tabular-nums text-foreground">
                            <span>{v.vintage}</span>
                            <span className="text-muted-foreground">
                              {v.rows} value{v.rows === 1 ? '' : 's'}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}

                  <section aria-labelledby="usage-title">
                    <h2 id="usage-title" className="font-serif text-base font-semibold text-foreground">
                      Essays using this chart
                    </h2>
                    {(usage.data ?? []).length === 0 ? (
                      <p className="mt-1 text-muted-foreground">None yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {usage.data!.map((u) => (
                          <li key={u.essay_slug}>
                            <Link to={universalEssayUrl(u.essay_slug)} className="text-accent underline underline-offset-2">
                              {u.essay_title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
