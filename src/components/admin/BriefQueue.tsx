/**
 * BriefQueue — the Briefs panel on the Writer's Desk.
 *
 * A LIST, deliberately not a notification: a reminder for optional work gets
 * ignored, then habitually ignored, then becomes noise that masks something
 * that matters. This panel makes no demand — it is here when the owner wants
 * it (docs/DECISIONS.md, delegated decision 2).
 *
 * Top list: published essays with no Brief, age since publication, oldest
 * first. An essay leaves it the moment its Brief exists — at ANY length
 * (existence, not word count, is the exit; decision 3). Bottom list: essays
 * whose Brief is written, each with the Brief's word count, so drift from
 * the 500–600 target is visible without any rule enforcing it.
 *
 * Every row links to the Brief's own writing surface — never to the long
 * editor.
 */

import { Link } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import { useBriefQueue } from '@/hooks/queries/useBriefQueue';
import { BRIEF_TARGET_MAX, BRIEF_TARGET_MIN } from '@/lib/brief';
import { cn } from '@/lib/utils';

function briefEditorPath(row: { section: string; slug: string }): string {
  return `/admin/writer/${row.section}/${row.slug}/brief`;
}

function ageLabel(days: number): string {
  if (days === 0) return 'published today';
  if (days === 1) return '1 day since publication';
  return `${days} days since publication`;
}

export function BriefQueue({ enabled }: { enabled: boolean }) {
  const { data, isLoading, error } = useBriefQueue(enabled);

  if (!enabled) return null;

  return (
    <section
      aria-label="Briefs"
      data-testid="brief-queue"
      className="mb-8 rounded-lg border border-border bg-background"
    >
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Briefs</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The 500–600-word companion, written after the long essay. Oldest wait first.
        </p>
      </div>

      {isLoading ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Couldn't load the Brief queue — reload to retry.
        </p>
      ) : (
        <>
          {/* ── Awaiting: the queue proper. ── */}
          {data && data.awaiting.length > 0 ? (
            <ul data-testid="brief-queue-awaiting" className="divide-y divide-border">
              {data.awaiting.map(row => (
                <li key={row.id}>
                  <Link
                    to={briefEditorPath(row)}
                    className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/50"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {row.title}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {ageLabel(row.ageDays)}
                    </span>
                    <PenLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-muted-foreground">
              No published essay is missing its Brief.
            </p>
          )}

          {/* ── Written: word counts on display, so drift is visible. ── */}
          {data && data.written.length > 0 && (
            <div className="border-t border-border">
              <p className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Written
              </p>
              <ul data-testid="brief-queue-written" className="divide-y divide-border">
                {data.written.map(row => {
                  const inTarget = row.words >= BRIEF_TARGET_MIN && row.words <= BRIEF_TARGET_MAX;
                  return (
                    <li key={row.id}>
                      <Link
                        to={briefEditorPath(row)}
                        className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-secondary/50"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground group-hover:text-primary">
                          {row.title}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 text-xs tabular-nums',
                            inTarget ? 'text-muted-foreground' : 'font-medium text-foreground',
                          )}
                          title={`Target ${BRIEF_TARGET_MIN}–${BRIEF_TARGET_MAX} words`}
                        >
                          {row.words} words
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
