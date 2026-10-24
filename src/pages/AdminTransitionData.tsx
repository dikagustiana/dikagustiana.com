/**
 * /admin/transition-data (docs/prd/transition-data-layer, Fase 2; Desain,
 * "Admin data transisi"), behind RequireAdmin.
 *
 *   - the series registry with status, values, the last gate run, what is
 *     staged, and manual series past their review date;
 *   - for one series: one value or a pasted CSV, previewed and checked beside
 *     each row before it is staged; the staged rows; the rules run on them;
 *     and Publish, which calls the same gate the fetcher calls. Publish is off
 *     until something is staged, and an R7 warning must be ticked;
 *   - the charts: the finding a title states, published or not, and the
 *     author's status line for each link of the chain;
 *   - the fetcher's recent runs.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  previewStage,
  useAdminTransition,
  useDiscardStage,
  usePublishSeries,
  useStageRows,
  useUpdateChain,
  useUpdateChart,
  type AdminChain,
  type AdminChart,
  type AdminSeries,
  type CheckRow,
  type GateResult,
  type StageRow,
} from '@/hooks/queries/useTransitionAdmin';
import { checkRow, MANUAL_CSV_COLUMNS, MANUAL_CSV_OPTIONAL, parseManualCsv, type ManualRow } from '@/lib/transition/manualEntry';
import { chartPath } from '@/lib/transition/model';

const newToken = (): string => crypto.randomUUID();

function errorText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

function CheckList({ checks }: { checks: CheckRow[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {checks.map((c) => (
        <li key={`${c.rule_id}-${c.run_at ?? ''}`} className="flex gap-2">
          <span
            className={`w-12 shrink-0 font-semibold ${c.passed ? 'text-foreground' : c.severity === 'fail' ? 'text-destructive' : 'text-amber-700'}`}
          >
            {c.passed ? '✓' : c.severity === 'fail' ? '✗ fail' : '! warn'}
          </span>
          <span className="w-12 shrink-0 font-mono text-xs leading-5">{c.rule_id}</span>
          <span className="min-w-0 [overflow-wrap:anywhere]">{c.detail}</span>
        </li>
      ))}
    </ul>
  );
}

const EMPTY_FORM = { period_start: '', member: '', value: '', vintage: '', source_url: '', source_locator: '', period_label: '' };

function SeriesPanel({ series, stage, checks }: { series: AdminSeries; stage: StageRow[]; checks: CheckRow[] }) {
  const { toast } = useToast();
  const stageRows = useStageRows();
  const discard = useDiscardStage();
  const publish = usePublishSeries();
  const [mode, setMode] = useState<'one' | 'csv'>('one');
  const [form, setForm] = useState(EMPTY_FORM);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<CheckRow[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<GateResult | null>(null);

  const mine = stage.filter((s) => s.series_id === series.id);
  // One open token per series: manual rows join the admin's open stage; an
  // API stage left by the fetcher (an R7 hold) is its own token.
  const tokens = [...new Set(mine.map((s) => s.stage_token))];
  const [chosen, setChosen] = useState<string | null>(null);
  const token = chosen && tokens.includes(chosen) ? chosen : tokens[0] ?? null;
  const staged = mine.filter((s) => s.stage_token === token);
  const manualToken = mine.find((s) => s.ingest === 'manual')?.stage_token ?? null;

  const one = checkRow(form, series);
  const parsed = useMemo(() => (csv.trim() ? parseManualCsv(csv, series) : null), [csv, series]);
  const csvGood = parsed?.rows.filter((r) => r.row).map((r) => r.row!) ?? [];
  const csvBad = parsed?.rows.filter((r) => !r.row) ?? [];

  const lastRun = checks.filter((c) => c.series_id === series.id);
  const lastRunAt = lastRun[0]?.run_at;
  const lastChecks = lastRun.filter((c) => c.run_at === lastRunAt).sort((a, b) => a.rule_id.localeCompare(b.rule_id));
  const r7Failed = preview?.some((c) => c.rule_id === 'R7' && !c.passed) ?? false;

  const add = (rows: ManualRow[]) => {
    const t = manualToken ?? newToken();
    stageRows.mutate(
      { seriesId: series.id, token: t, rows },
      {
        onSuccess: () => {
          setChosen(t);
          setPreview(null);
          setForm({ ...EMPTY_FORM, vintage: form.vintage, source_url: form.source_url });
          setCsv('');
          toast({ title: `${rows.length} row(s) staged`, description: 'Run the checks, then publish.' });
        },
        onError: (e) => toast({ title: 'Not staged', description: errorText(e), variant: 'destructive' }),
      },
    );
  };

  const runPreview = async () => {
    if (!token) return;
    try {
      setPreview(await previewStage(series.id, token));
      setConfirm(false);
    } catch (e) {
      toast({ title: 'Checks did not run', description: errorText(e), variant: 'destructive' });
    }
  };

  const doPublish = () => {
    if (!token) return;
    publish.mutate(
      { seriesId: series.id, token, confirm },
      {
        onSuccess: (r) => {
          setResult(r);
          setPreview(null);
          toast({
            title: r.published ? 'Published' : 'Not published',
            description: r.published
              ? `${r.rows_published} new or revised, ${r.rows_unchanged} unchanged.`
              : r.failed
                ? `${r.failed} rule(s) failed. The rows stay staged.`
                : 'R7 warnings wait for confirmation.',
            variant: r.published ? 'default' : 'destructive',
          });
        },
        onError: (e) => toast({ title: 'Publish failed', description: errorText(e), variant: 'destructive' }),
      },
    );
  };

  const field = (name: keyof typeof EMPTY_FORM, label: string, props: Record<string, string> = {}) => (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input className="mt-1" value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} {...props} />
    </label>
  );

  return (
    <section aria-labelledby="series-panel-title" className="rounded-md border border-border p-5">
      <h2 id="series-panel-title" className="font-serif text-xl font-semibold">
        {series.title_en}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-mono">{series.id}</span> · {series.source_id} · {series.unit} · frequency {series.frequency} ·{' '}
        {series.ingest} · R7 threshold {Math.round(series.r7_threshold * 100)}%
      </p>
      <p className="mt-2 text-sm">{series.definition_note}</p>

      {series.ingest === 'manual' && (
        <div className="mt-6">
          <div role="tablist" className="inline-flex overflow-hidden rounded-md border border-border text-sm">
            {(['one', 'csv'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                {m === 'one' ? 'One value' : 'Paste CSV'}
              </button>
            ))}
          </div>

          {mode === 'one' ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {field('period_start', `Period start (${series.frequency === 'event' ? 'the date' : `on the ${series.frequency} grid`})`, { placeholder: 'YYYY-MM-DD' })}
              {field('value', `Value (${series.unit})`, { inputMode: 'decimal' })}
              {field('vintage', 'Vintage: the source document’s date', { placeholder: 'YYYY-MM-DD' })}
              {field('period_label', 'Period label (optional)', { placeholder: '2025-Q1' })}
              {field('source_url', 'Source URL (the primary document, https)')}
              {field('source_locator', 'Locator: page, table or paragraph')}
              {field('member', 'Member (optional)')}
              <div className="sm:col-span-2">
                {one.errors.length > 0 && form.period_start + form.value !== '' && (
                  <ul className="mb-2 list-disc pl-5 text-sm text-destructive">
                    {one.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
                <Button type="button" disabled={!one.row || stageRows.isPending} onClick={() => one.row && add([one.row])}>
                  Add to staging
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                A header row with <code>{MANUAL_CSV_COLUMNS.join(', ')}</code>, optionally{' '}
                <code>{MANUAL_CSV_OPTIONAL.join(', ')}</code>. Commas, tabs or semicolons; a paste from a spreadsheet works.
              </p>
              <Textarea rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} className="font-mono text-xs" aria-label="CSV" />
              {parsed && (
                <div className="text-sm">
                  {parsed.headerErrors.map((e) => (
                    <p key={e} className="text-destructive">
                      {e}
                    </p>
                  ))}
                  {parsed.rows.length > 0 && (
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="pr-2">Line</th>
                            <th className="pr-2">Period</th>
                            <th className="pr-2">Value</th>
                            <th className="pr-2">Vintage</th>
                            <th className="pr-2">Locator</th>
                            <th>Problem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.rows.map((r) => (
                            <tr key={r.line} className={r.row ? '' : 'text-destructive'}>
                              <td className="pr-2">{r.line}</td>
                              <td className="pr-2">{r.row?.period_start}</td>
                              <td className="pr-2 tabular-nums">{r.row?.value}</td>
                              <td className="pr-2">{r.row?.vintage}</td>
                              <td className="pr-2">{r.row?.source_locator}</td>
                              <td>{r.errors.join('; ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              <Button type="button" disabled={csvGood.length === 0 || csvBad.length > 0 || stageRows.isPending} onClick={() => add(csvGood)}>
                Stage {csvGood.length} row(s)
              </Button>
              {csvBad.length > 0 && <p className="text-sm text-destructive">Fix the {csvBad.length} row(s) marked above first.</p>}
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-semibold">Staged</h3>
        {tokens.length > 1 && (
          <label className="mt-2 block text-sm">
            Stage{' '}
            <select className="rounded border border-border bg-background px-2 py-1" value={token ?? ''} onChange={(e) => setChosen(e.target.value)}>
              {tokens.map((t) => (
                <option key={t} value={t}>
                  {t.slice(0, 8)} · {mine.find((s) => s.stage_token === t)?.ingest}
                </option>
              ))}
            </select>
          </label>
        )}
        {staged.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Nothing staged.</p>
        ) : (
          <>
            <div className="mt-2 max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pr-2">Member</th>
                    <th className="pr-2">Period</th>
                    <th className="pr-2">Value</th>
                    <th className="pr-2">Vintage</th>
                    <th className="pr-2">Source</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {staged.map((s) => (
                    <tr key={s.id}>
                      <td className="pr-2">{s.member}</td>
                      <td className="pr-2">{s.period_label ?? s.period_start}</td>
                      <td className="pr-2 tabular-nums">{s.value}</td>
                      <td className="pr-2">{s.vintage}</td>
                      <td className="pr-2 [overflow-wrap:anywhere]">{s.source_locator ?? s.source_url}</td>
                      <td>
                        <button type="button" className="text-destructive hover:underline" onClick={() => discard.mutate({ ids: [s.id] })}>
                          Discard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => void runPreview()}>
                Run the checks
              </Button>
              <Button type="button" variant="outline" onClick={() => discard.mutate({ ids: staged.map((s) => s.id) })}>
                Discard all {staged.length}
              </Button>
            </div>
          </>
        )}

        {preview && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold">Checks on this stage (not recorded)</h4>
            <div className="mt-2">
              <CheckList checks={preview} />
            </div>
            {r7Failed && (
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1" />
                <span>I have checked each R7 change against the source document and confirm it is a real revision.</span>
              </label>
            )}
          </div>
        )}

        <div className="mt-4">
          <Button
            type="button"
            disabled={staged.length === 0 || publish.isPending || (r7Failed && !confirm)}
            onClick={doPublish}
          >
            Publish through the gate
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            Re-runs R0–R8, records the run, and publishes only if no fail rule failed.
          </p>
        </div>

        {result && (
          <p className="mt-3 text-sm" role="status">
            {result.published
              ? `Published: ${result.rows_published} new or revised row(s), ${result.rows_unchanged} unchanged.`
              : `Not published: ${result.failed} failed, ${result.warnings} warning(s).`}
          </p>
        )}
      </div>

      {lastChecks.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold">Last gate run · {lastRunAt?.slice(0, 16).replace('T', ' ')}</h3>
          <div className="mt-2">
            <CheckList checks={lastChecks} />
          </div>
        </div>
      )}
    </section>
  );
}

function ChartsPanel({ charts, chain }: { charts: AdminChart[]; chain: AdminChain[] }) {
  const { toast } = useToast();
  const update = useUpdateChart();
  const updateChain = useUpdateChain();
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const save = (slug: string, values: Record<string, unknown>) =>
    update.mutate(
      { slug, values },
      {
        onSuccess: () => toast({ title: 'Chart saved' }),
        onError: (e) =>
          toast({
            title: 'Not saved',
            description: errorText(e).includes('ds_chart_published_has_finding')
              ? 'A chart publishes only with a finding as its title, not the bracketed placeholder.'
              : errorText(e),
            variant: 'destructive',
          }),
      },
    );

  return (
    <section aria-labelledby="charts-title" className="mt-12">
      <h2 id="charts-title" className="font-serif text-2xl font-semibold">
        Charts and the chain
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A title states the finding in one sentence. A bracketed title is a placeholder and cannot be published. A chart
        shows only its published series.
      </p>

      <div className="mt-6 space-y-6">
        {chain.map((l) => (
          <div key={l.chain_link} className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{l.title}</h3>
              <span className="text-sm text-muted-foreground">{l.question}</span>
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-muted-foreground">Status line (yours; empty shows the chart count)</span>
              <div className="mt-1 flex gap-2">
                <Input
                  value={statuses[l.chain_link] ?? l.status_text ?? ''}
                  onChange={(e) => setStatuses({ ...statuses, [l.chain_link]: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    updateChain.mutate(
                      { link: l.chain_link, status_text: (statuses[l.chain_link] ?? l.status_text ?? '').trim() || null },
                      { onSuccess: () => toast({ title: 'Status saved' }), onError: (e) => toast({ title: 'Not saved', description: errorText(e), variant: 'destructive' }) },
                    )
                  }
                >
                  Save
                </Button>
              </div>
            </label>

            <ul className="mt-4 space-y-3">
              {charts
                .filter((c) => c.chain_link === l.chain_link)
                .map((c) => (
                  <li key={c.slug} className="border-t border-border pt-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{c.slug}</span> · {c.chart_type}
                      {c.published ? <Badge>Published</Badge> : <Badge variant="outline">Draft</Badge>}
                      {c.published && (
                        <Link to={chartPath(c.slug)} className="text-accent hover:underline">
                          open
                        </Link>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Input
                        className="min-w-0 flex-1"
                        aria-label={`Title of ${c.slug}`}
                        value={titles[c.slug] ?? c.title}
                        onChange={(e) => setTitles({ ...titles, [c.slug]: e.target.value })}
                      />
                      <Button type="button" variant="outline" onClick={() => save(c.slug, { title: (titles[c.slug] ?? c.title).trim() })}>
                        Save title
                      </Button>
                      <Button type="button" variant={c.published ? 'outline' : 'default'} onClick={() => save(c.slug, { published: !c.published })}>
                        {c.published ? 'Unpublish' : 'Publish'}
                      </Button>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminTransitionData() {
  const { data, isLoading, error, refetch } = useAdminTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const series = data?.series ?? [];
  const current = series.find((s) => s.id === selected) ?? null;

  return (
    <PageLayout
      variant="dashboard"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Admin', path: '/admin/dashboard' },
        { label: 'Transition data' },
      ]}
    >
      <SEO title="Transition data — Admin" description="Series, manual entry and the publish gate of the transition data layer." />
      <div className="container py-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Transition data</h1>
          <Link to="/green-transition/tracker" className="text-sm text-accent hover:underline">
            See the Transition Tracker →
          </Link>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={errorText(error)} onRetry={() => void refetch()} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3">Series</th>
                    <th className="py-2 pr-3">Link</th>
                    <th className="py-2 pr-3">Ingest</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Values</th>
                    <th className="py-2 pr-3">Last gate</th>
                    <th className="py-2 pr-3">Staged</th>
                    <th className="py-2 pr-3">Review due</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((s) => {
                    const run = data!.checks.find((c) => c.series_id === s.id && c.rule_id === 'GATE');
                    const staged = data!.stage.filter((x) => x.series_id === s.id).length;
                    const count = data!.counts.find((c) => c.series_id === s.id);
                    const overdue = s.ingest === 'manual' && s.review_due && s.review_due < today;
                    return (
                      <tr
                        key={s.id}
                        className={`cursor-pointer border-b border-border/60 hover:bg-muted/50 ${selected === s.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelected(s.id)}
                      >
                        <td className="py-2 pr-3">
                          <button type="button" className="text-left hover:underline" onClick={() => setSelected(s.id)}>
                            <span className="block">{s.title_en}</span>
                            <span className="block font-mono text-xs text-muted-foreground">{s.id}</span>
                          </button>
                        </td>
                        <td className="py-2 pr-3">{s.chain_link}</td>
                        <td className="py-2 pr-3">{s.ingest}</td>
                        <td className="py-2 pr-3">
                          <Badge variant={s.status === 'published' ? 'default' : 'outline'}>{s.status}</Badge>
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{count?.n_values ?? 0}</td>
                        <td className="py-2 pr-3">
                          {run ? (
                            <span className={run.passed ? '' : 'text-destructive'}>
                              {run.run_at?.slice(0, 10)} · {run.passed ? 'published' : 'held'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">never</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{staged || ''}</td>
                        <td className={`py-2 pr-3 ${overdue ? 'font-semibold text-destructive' : ''}`}>
                          {s.review_due ?? ''}
                          {overdue ? ' · overdue' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-8">
              {current ? (
                <SeriesPanel key={current.id} series={current} stage={data!.stage} checks={data!.checks} />
              ) : (
                <p className="text-sm text-muted-foreground">Choose a series to enter values, run the checks or publish.</p>
              )}
            </div>

            <ChartsPanel charts={data!.charts} chain={data!.chain} />

            <section aria-labelledby="runs-title" className="mt-12">
              <h2 id="runs-title" className="font-serif text-2xl font-semibold">
                Fetcher runs
              </h2>
              {data!.runs.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No run yet. The workflow “Transition data fetch” runs weekly once its secrets are set.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {data!.runs.map((r) => (
                    <li key={r.id}>
                      <span className={r.status === 'ok' ? '' : 'font-semibold text-destructive'}>{r.status}</span> · {r.source_id} ·{' '}
                      {r.started_at.slice(0, 16).replace('T', ' ')} · {r.rows_staged} staged
                      {r.run_url && (
                        <>
                          {' '}
                          ·{' '}
                          <a href={r.run_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                            log
                          </a>
                        </>
                      )}
                      {r.error && <pre className="mt-1 whitespace-pre-wrap text-xs text-destructive">{r.error}</pre>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </PageLayout>
  );
}
