import { fullDate } from '@/lib/formatDate';
import { isStale, toCsv, trailOf, type Line, type SeriesStatusRow } from '@/lib/transition/model';

/**
 * The trail under every chart (PRD, Kebutuhan fungsional 9): the source, the
 * series code, when the values were pulled, their vintage, the last check, and
 * the CSV of exactly what is drawn. A reader can check any number in one click.
 */
export function ChartTrail({
  lines,
  status,
  slug,
  compact = false,
}: {
  lines: Line[];
  status: SeriesStatusRow[];
  slug: string;
  compact?: boolean;
}) {
  const trail = trailOf(lines);
  const series = status.filter((s) => lines.some((l) => l.seriesId === s.series_id));
  const stale = series.filter((s) => isStale(s));
  const failing = series.filter((s) => (s.last_check_failed ?? 0) > 0);
  // The oldest of the series' last good runs: the chart is as fresh as that.
  const checkedAt = series.flatMap((s) => (s.last_check_at ? [s.last_check_at] : [])).sort();

  const download = () => {
    const blob = new Blob([toCsv(lines)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
      {series.map((s) => (
        <p key={s.series_id}>
          <span className="text-foreground">Source:</span>{' '}
          <a href={s.series_url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:opacity-80">
            {s.source_name}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {', '}
          {s.title_en}. Code <code className="font-mono text-[11px] text-foreground">{s.source_code}</code>.
          {s.latest_vintage && <> Vintage {s.latest_vintage}.</>}
          {s.ingest === 'manual' && <> Entered by hand from the source document; each value names its page or table.</>}
          {!compact && <> Licence: {s.source_license}.</>}
        </p>
      ))}
      <p>
        {trail.lastRetrieved && <>Values pulled {fullDate(trail.lastRetrieved.slice(0, 10))}. </>}
        {checkedAt.length > 0 && (
          <>
            Last checked {fullDate(checkedAt[0].slice(0, 10))}:{' '}
            {failing.length === 0 ? 'every rule passed.' : `${failing.length} series failed a rule.`}{' '}
          </>
        )}
        {stale.length > 0 && (
          <span className="font-medium text-foreground" role="note">
            Possibly out of date: {stale.map((s) => s.title_en).join(', ')} {stale.length === 1 ? 'has' : 'have'} not been
            checked on schedule.{' '}
          </span>
        )}
        <button type="button" onClick={download} className="text-accent underline underline-offset-2 hover:opacity-80">
          Download CSV
        </button>
      </p>
    </div>
  );
}
