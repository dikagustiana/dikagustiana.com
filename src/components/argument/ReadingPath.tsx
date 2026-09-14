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
 * `compact` is the landing-page form and the full form is the About page's.
 * The full form adds the scope, the comparative test, the strongest objection
 * and the limits, which is what someone deciding whether to trust the argument
 * actually needs and what a card grid cannot carry.
 *
 * WHAT COMPACT NOW WEIGHS. The first compact form kept all five rows at their
 * full length — three essays with their reasoning and what each establishes,
 * then two extended accounts of unwritten work. Measured at 1348×936 on
 * 14 September 2026 that put the map's figure 2,820 px down the document, and
 * it advertised three readings of 10, 21 and 20 minutes to a stranger who has
 * offered three. An honest research agenda deserves to be visible; it does not
 * deserve the same introductory weight as the one completed claim.
 *
 * So compact keeps the order, every destination and every gap, and ranks them:
 * ONE necessary reading in full, the two methods grouped as optional with
 * their links live, the two gaps grouped and named. The reasoning of the four
 * subordinate steps is one disclosure away, not deleted — a reader who wants
 * to know why the fourth step is missing opens one control and reads the same
 * sentence the full form prints. Nothing here is hidden from a crawler or a
 * screen reader either: a closed `details` is in the document.
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

function StepBody({
  step,
  row,
  index,
  unreachable = false,
}: {
  step: ReadingStep;
  row?: ReadingPathRow;
  index: number;
  /** The lookup failed. Not the same as "not written", and must not say so. */
  unreachable?: boolean;
}) {
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
          {!written && step.slug && unreachable && (
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Couldn&rsquo;t check
            </span>
          )}
          {!written && !(step.slug && unreachable) && (
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

        {/* A failed lookup is not an absent essay. Saying "not written" here
            would be the same error as an error page telling a reader their
            essay is gone because the database was unreachable. */}
        {!written && step.slug && unreachable && (
          <p className="mt-2 border-l-2 border-border pl-3 text-[14px] leading-relaxed text-muted-foreground">
            This page couldn&rsquo;t reach the essay index, so it cannot say whether this step is
            published. It may be there.
          </p>
        )}

        {!written && !step.slug && step.missing && (
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

/**
 * A subordinate step in the compact path: everything that identifies it and
 * everything that would let a reader act on it — the number, the links it
 * carries, its title, whether it is written, its destination and how long it
 * is. What it does NOT carry is the paragraph explaining why it follows; that
 * sits once per group, behind one disclosure, where it is available without
 * being a prerequisite.
 */
function CompactRow({
  step,
  row,
  index,
  unreachable = false,
}: {
  step: ReadingStep;
  row?: ReadingPathRow;
  index: number;
  unreachable?: boolean;
}) {
  const href = stepHref(step, row);
  const written = !!href;

  const body = (
    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
      <span
        className={cn(
          'font-display text-[15px] font-semibold leading-snug',
          written ? 'text-foreground group-hover:text-accent transition-colors' : 'text-muted-foreground',
        )}
      >
        {step.title}
      </span>
      <LinkChips links={step.links} />
      {written && row?.read_time && (
        <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {row.read_time}
        </span>
      )}
      {!written && (
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {step.slug && unreachable ? 'Couldn\u2019t check' : 'Not written'}
        </span>
      )}
      {written && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />}
    </span>
  );

  const number = (
    <span
      aria-hidden="true"
      className={cn(
        'mt-px flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-mono',
        written ? 'border-foreground text-foreground' : 'border-dashed border-muted-foreground/60 text-muted-foreground',
      )}
    >
      {index + 1}
    </span>
  );

  return (
    <li>
      {href ? (
        <Link to={href} className="group flex items-baseline gap-3 py-3">
          {number}
          {body}
        </Link>
      ) : (
        <div className="flex items-baseline gap-3 py-3">
          {number}
          {body}
        </div>
      )}
    </li>
  );
}

/** The reasoning for a group of compact rows: present, one control away. */
function WhyThese({ summary, steps, unreachable }: { summary: string; steps: ReadingStep[]; unreachable: boolean }) {
  return (
    <details className="mt-1 border-t border-border pt-3">
      <summary className="cursor-pointer text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground">
        {summary}
      </summary>
      <div className="mt-3 space-y-4">
        {steps.map((step) => (
          <div key={step.title}>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{step.title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{step.why}</p>
            {step.establishes && (
              <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/80">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Establishes: </span>
                {step.establishes}
              </p>
            )}
            {!step.slug && step.missing && (
              <p className="mt-1.5 border-l-2 border-border pl-3 text-[14px] leading-relaxed text-muted-foreground">
                {step.missing}
              </p>
            )}
            {step.slug && unreachable && (
              <p className="mt-1.5 border-l-2 border-border pl-3 text-[14px] leading-relaxed text-muted-foreground">
                This page couldn&rsquo;t reach the essay index, so it cannot say whether this step is
                published. It may be there.
              </p>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

export function ReadingPath({ compact = false }: { compact?: boolean }) {
  const { data: rows, isLoading, isError, refetch } = useReadingPath();
  const rowFor = (step: ReadingStep) => (step.slug ? rows?.[step.slug] : undefined);
  // The order is editorial and fixed (src/data/readingPath.ts). Compact ranks
  // it without reordering it: the first step, then the rest that are written,
  // then the gaps — which is the order they are already in.
  const [first, ...rest] = READING_PATH;
  const methods = rest.filter((step) => step.slug);
  const gaps = rest.filter((step) => !step.slug);

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

        {isLoading ? (
          <ol className="mt-10 max-w-3xl divide-y divide-border border-y border-border">
            {READING_PATH.map((step) => (
              <li key={step.title} className="py-6">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-full" />
              </li>
            ))}
          </ol>
        ) : compact ? (
          <div className="mt-10 max-w-3xl">
            {/* ONE necessary reading, at full weight. */}
            <ol className="border-y border-border">
              {(() => {
                const row = rowFor(first);
                const href = stepHref(first, row);
                return (
                  <li>
                    {href ? (
                      <Link to={href} className="group block py-6">
                        <StepBody step={first} row={row} index={0} />
                      </Link>
                    ) : (
                      <div className="py-6">
                        <StepBody step={first} index={0} unreachable={isError} />
                      </div>
                    )}
                  </li>
                );
              })()}
            </ol>

            {/* The method behind it: real destinations, optional order. */}
            {methods.length > 0 && (
              <section className="mt-8" data-reading-path-group="methods">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Then, if you want the method it rests on
                </h3>
                <ol className="mt-1 divide-y divide-border border-y border-border">
                  {methods.map((step) => (
                    <CompactRow
                      key={step.title}
                      step={step}
                      row={rowFor(step)}
                      index={READING_PATH.indexOf(step)}
                      unreachable={isError}
                    />
                  ))}
                </ol>
                <WhyThese summary="Why these two follow, and what each establishes" steps={methods} unreachable={isError} />
              </section>
            )}

            {/* The gaps stay named and counted. An argument that hides its
                unwritten steps looks finished; this one is not. */}
            {gaps.length > 0 && (
              <section className="mt-8" data-reading-path-group="gaps">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Two steps of this argument are not written
                </h3>
                <ol className="mt-1 divide-y divide-border border-y border-border">
                  {gaps.map((step) => (
                    <CompactRow
                      key={step.title}
                      step={step}
                      index={READING_PATH.indexOf(step)}
                      unreachable={isError}
                    />
                  ))}
                </ol>
                <WhyThese summary="What is missing in each, and why it matters here" steps={gaps} unreachable={isError} />
              </section>
            )}
          </div>
        ) : (
          <ol className="mt-10 max-w-3xl divide-y divide-border border-y border-border">
            {READING_PATH.map((step, index) => {
              const row = rowFor(step);
              const href = stepHref(step, row);
              return (
                <li key={step.title}>
                  {href ? (
                    <Link to={href} className="group block py-6">
                      <StepBody step={step} row={row} index={index} />
                    </Link>
                  ) : (
                    <div className="py-6">
                      <StepBody step={step} index={index} unreachable={isError} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {isError && (
          <p className="mt-4 max-w-3xl text-[13px] text-muted-foreground">
            The essay index could not be reached, so no step below could be resolved to a link.{' '}
            <button
              type="button"
              onClick={() => refetch()}
              className="text-primary underline underline-offset-2"
            >
              Try again
            </button>
            .
          </p>
        )}

        <p className="mt-5 max-w-3xl text-[13px] text-muted-foreground">
          This framing was last reviewed on {fullDate(ARGUMENT.asOf)}.{' '}
          {compact && (
            <>
              <Link to="/about" className="text-primary underline underline-offset-2">
                The scope, the objection and the limits
              </Link>{' '}
              are on the About page. The same claim is on the map below:{' '}
              {/* A plain anchor, not a router Link: this is a move within the
                  page, and the reader's reduced-motion setting is honoured by
                  the CSS gate in src/index.css rather than by a handler here. */}
              <a href="#industry-chain" className="text-primary underline underline-offset-2">
                the chain, and the power decision under it
              </a>
              .
            </>
          )}
        </p>
      </div>
    </section>
  );
}
