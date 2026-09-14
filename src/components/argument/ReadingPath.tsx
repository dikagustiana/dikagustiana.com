import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { ARGUMENT, LINK_LABEL, READING_PATH, type ReadingStep } from '@/data/readingPath';
import { useReadingPath, type ReadingPathRow } from '@/hooks/queries/useReadingPath';
import { essayUrl } from '@/lib/essayUrl';
import { fullDate } from '@/lib/formatDate';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * The argument, and the finite path through it.
 *
 * This is the fixed entrance a stranger needs and the site did not have. The
 * hero stated a temperament, the sections list gave six doors, and the only
 * curated surface sorted hand-picked essays by creation date — so nothing on
 * the way in said what the author actually claims or where to check it.
 *
 * THE ONE RULE HERE: a step is a link only when the essay behind it is
 * published. Anything else renders as an unwritten step that says what is
 * missing. That keeps two failures out at once — a path with dead links, and
 * a path that looks complete because its gaps were hidden.
 *
 * `compact` is the landing-page form: the claim and the steps, no apparatus.
 * The full form adds the scope, the comparative test, the strongest objection
 * and the limits, which is what someone deciding whether to trust the
 * argument actually needs and what a card grid cannot carry.
 */

function stepHref(step: ReadingStep, row: ReadingPathRow | undefined): string | null {
  if (!step.slug || !row) return null;
  return essayUrl({
    slug: row.slug,
    section: row.section,
    phase: row.phase,
    track: row.finance_modules?.track_slug ?? row.finance_section ?? null,
    moduleSlug: row.finance_modules?.slug ?? null,
    fsliSlug: row.fsli_slug,
    topic: row.topic,
  });
}

function LinkChips({ links }: { links: readonly ReadingStep['links'][number][] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {links.map((link) => (
        <span
          key={link}
          className="rounded-sm border border-border px-1.5 py-0.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground"
        >
          {LINK_LABEL[link]}
        </span>
      ))}
    </span>
  );
}

function StepBody({ step, row, index }: { step: ReadingStep; row?: ReadingPathRow; index: number }) {
  const href = stepHref(step, row);
  const written = !!href;

  return (
    <div className="flex gap-4 sm:gap-5">
      {/* The number is the reading order and nothing else. It is not a rank
          and not a difficulty. */}
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-mono',
          written ? 'border-foreground text-foreground' : 'border-dashed border-muted-foreground/60 text-muted-foreground',
        )}
      >
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <LinkChips links={step.links} />
          {!written && (
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Not written
            </span>
          )}
        </div>

        <h3
          className={cn(
            'font-display text-[17px] font-semibold leading-snug',
            written ? 'text-foreground group-hover:text-accent transition-colors' : 'text-muted-foreground',
          )}
        >
          {step.title}
        </h3>

        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{step.why}</p>

        {written && step.establishes && (
          <p className="mt-2 text-[14px] leading-relaxed text-foreground/80">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Establishes:{' '}
            </span>
            {step.establishes}
          </p>
        )}

        {!written && step.missing && (
          <p className="mt-2 border-l-2 border-border pl-3 text-[14px] leading-relaxed text-muted-foreground">
            {step.missing}
          </p>
        )}

        {written && (
          <span className="mt-3 inline-flex items-center gap-3 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-primary">
              Read it
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            {row?.read_time && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {row.read_time}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export function ReadingPath({ compact = false }: { compact?: boolean }) {
  const { data: rows, isLoading } = useReadingPath();

  return (
    <section id="the-argument" className="border-b border-border py-12">
      <div className="container">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {ARGUMENT.kicker}
          </p>

          <h2 className="mb-4 font-display text-2xl font-semibold leading-snug text-foreground sm:text-[28px]">
            {ARGUMENT.question}
          </h2>

          <p className="text-[17px] leading-relaxed text-foreground">{ARGUMENT.claim}</p>

          <dl className="mt-6 space-y-4 text-[15px] leading-relaxed">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                The case it is made on
              </dt>
              <dd className="text-muted-foreground">{ARGUMENT.caseStudy}</dd>
            </div>

            {!compact && (
              <>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    What is being compared
                  </dt>
                  <dd className="text-muted-foreground">{ARGUMENT.comparativeTest}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    The strongest objection
                  </dt>
                  <dd className="text-muted-foreground">{ARGUMENT.strongestObjection}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    What would change my mind
                  </dt>
                  <dd className="text-muted-foreground">{ARGUMENT.wouldChangeIt}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    What the evidence does not cover
                  </dt>
                  <dd className="text-muted-foreground">{ARGUMENT.limits}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <ol className="mt-10 max-w-3xl divide-y divide-border border-y border-border">
          {isLoading
            ? READING_PATH.map((step) => (
                <li key={step.title} className="py-6">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-full" />
                </li>
              ))
            : READING_PATH.map((step, index) => {
                const row = step.slug ? rows?.[step.slug] : undefined;
                const href = stepHref(step, row);
                return (
                  <li key={step.title}>
                    {href ? (
                      <Link to={href} className="group block py-6">
                        <StepBody step={step} row={row} index={index} />
                      </Link>
                    ) : (
                      <div className="py-6">
                        <StepBody step={step} index={index} />
                      </div>
                    )}
                  </li>
                );
              })}
        </ol>

        <p className="mt-5 max-w-3xl text-[13px] text-muted-foreground">
          This framing was last reviewed on {fullDate(ARGUMENT.asOf)}.{' '}
          {compact && (
            <>
              <Link to="/about" className="text-primary underline underline-offset-2">
                The scope, the objection and the limits
              </Link>{' '}
              are on the About page.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
