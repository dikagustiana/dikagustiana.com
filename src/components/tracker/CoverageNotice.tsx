import { TRACKER_COVERAGE } from '@/data/trackerIssues';
import { fullDate } from '@/lib/formatDate';

/**
 * What period this tracker covers, whether it is still being written, and when
 * its content last changed.
 *
 * The interface used to answer only the first of those, implicitly, by calling
 * the newest issue the "latest" one. A reader arriving cold could not tell a
 * paused archive from a live quarterly — so the archive kept making a promise
 * of continuation that nothing behind it was keeping.
 *
 * `lastSubstantiveUpdate` is the date the CONTENT last changed, not the date
 * of the last deploy or the last commit touching this file. A build is not an
 * update.
 */
export function CoverageNotice({ className }: { className?: string }) {
  const paused = TRACKER_COVERAGE.state === 'paused';

  return (
    <div
      className={`border border-border bg-muted/30 px-5 py-4 ${className ?? ''}`}
      role="note"
      aria-label="Coverage status"
    >
      <p className="text-xs font-mono uppercase tracking-widest text-foreground">
        {paused ? 'Paused archive' : 'Active'} · {TRACKER_COVERAGE.coversFrom} to {TRACKER_COVERAGE.coverageEndsWith}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground max-w-[640px]">
        {TRACKER_COVERAGE.note}
      </p>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Last substantive update {fullDate(TRACKER_COVERAGE.lastSubstantiveUpdate)}.{' '}
        {TRACKER_COVERAGE.lastSubstantiveUpdateNote}
      </p>
    </div>
  );
}
