/**
 * FinanceLanding — Publication-style finance landing page.
 *
 * Structure:
 *   1. Featured Essay (essays.is_selected — the ONE featuring mechanism)
 *   2. Six numbered cards (docs/prd/finance-restructure §1 A, §3), two to a
 *      row: the four curriculum tracks, 01-04, one per finance_sections row
 *      in sort_order (DB-backed and admin-editable, as before); then
 *      05 Finance in Action, with its two sub-entries, Capital in Motion and
 *      Company models, and 06 Toolkits. 05 and 06 are pages of their own,
 *      not tracks, so their cards are written here with the PRD's copy. The
 *      capital-allocation row (and a finance-in-action row, should migration
 *      20261010110000 ever be applied) is not drawn: its page moved under
 *      Finance in Action and its old address redirects.
 */

import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { CURRICULUM_CONTRACT } from '@/data/curriculumContract';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/states';
import { ArrowRight } from 'lucide-react';
import { useFeaturedFinanceEssay, useFinanceSections } from '@/hooks/queries/useFinance';
import { essayUrl, essayUrlInputFromRow, universalEssayUrl } from '@/lib/essayUrl';
import { CAPITAL_IN_MOTION_PATH } from '@/lib/finance-in-action/conditions';
import { COMPANY_MODELS_ANCHOR, INDEX_PATH } from '@/lib/finance-in-action/routes';
import { TOOLKITS_PATH } from '@/hooks/queries/useToolkits';

/** Rows of finance_sections that are not tracks any more: their pages live under 05. */
const NOT_A_TRACK = new Set(['capital-allocation', 'finance-in-action']);

/** Cards 05 and 06 (PRD §3 copy). */
const FINANCE_IN_ACTION_CARD = {
  number: '05',
  title: 'Finance in Action',
  line: 'The theory at company scale: twenty-one conditions, and the IDX companies where they are happening now.',
  href: INDEX_PATH,
  entries: [
    { label: 'Capital in Motion', href: CAPITAL_IN_MOTION_PATH },
    { label: 'Company models', href: `${INDEX_PATH}#${COMPANY_MODELS_ANCHOR}` },
  ],
};
const TOOLKITS_CARD = {
  number: '06',
  title: 'Toolkits',
  line: 'The working files behind the essays. Download, open, use.',
  href: TOOLKITS_PATH,
};

const CARD = 'flex items-start gap-4 rounded-lg border border-border p-5 hover:border-primary/40 transition-all h-full';

/** The card body: number, title, one line, arrow. */
function CardBody({ number, title, line, chip, children }: { number: string; title: string; line: string | null; chip?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <span className="text-lg font-mono font-bold text-muted-foreground tabular-nums shrink-0">{number}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h3>
          {chip}
        </div>
        {line && <p className="text-sm text-muted-foreground leading-relaxed">{line}</p>}
        {children}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
    </>
  );
}

/**
 * 05 holds two links of its own, so the card is not one anchor (an anchor
 * inside an anchor is invalid): the title opens the index, each sub-entry its
 * page, and the whole card still reacts to the pointer.
 */
function FinanceInActionCard() {
  const c = FINANCE_IN_ACTION_CARD;
  return (
    <div className={`group relative ${CARD}`} data-finance-card={c.number}>
      <CardBody number={c.number} title={c.title} line={c.line}>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {c.entries.map((e) => (
            <li key={e.href} className="relative z-10">
              <Link to={e.href} className="text-foreground underline-offset-4 hover:text-primary hover:underline">
                {e.label}
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
      <Link to={c.href} className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={c.title} />
    </div>
  );
}

export default function FinanceLanding() {
  const { data: featured, isLoading: featuredLoading } = useFeaturedFinanceEssay();
  const { data: sections, isLoading: sectionsLoading, isError: sectionsError, refetch: refetchSections } = useFinanceSections();

  return (
    <PageLayout
      width="reading"
      role="manager"
      breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Finance' }]}
    >
      <SEO
        title="Finance"
        description="Finance knowledge for decision-making. Fundamentals first, then applied finance lifecycle."
      />

      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Finance</h1>
        <div className="mb-10 max-w-2xl">
          <p className="text-base text-muted-foreground leading-relaxed">
            Finance exists to support decisions — not to produce reports.
            This section covers the ideas, the strategy, the planning, and the analysis.
          </p>
          <p className="text-base text-muted-foreground mt-3">
            Start with Fundamentals if you are building from scratch.
          </p>
          {/* Said once, at the entrance, rather than implied 159 times by a
              row label. */}
          <p className="text-base text-muted-foreground mt-3">
            {CURRICULUM_CONTRACT.standfirst}
          </p>
        </div>

        {/* Featured Essay */}
        {featuredLoading ? (
          <div className="border border-border rounded-lg p-8 mb-12">
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-8 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : featured ? (
          (() => {
            // The old hand-built `/essay/${slug}` (singular) matched no route
            // at all — a dead link behind a Featured banner. The canonical
            // builder cannot emit a URL that is not in the route table.
            const featuredHref =
              essayUrl(essayUrlInputFromRow(featured)) ?? universalEssayUrl(featured.slug);

            return (
              <Link
                to={featuredHref}
                className="block border border-border rounded-lg p-8 mb-12 hover:border-primary/40 transition-colors group"
              >
            <span className="eyebrow-chip text-primary border-primary/30 mb-4 inline-block">Featured</span>
            <h2 className="text-2xl md:text-3xl font-display font-semibold mb-3 group-hover:text-primary transition-colors">
              {featured.title}
            </h2>
            {featured.snippet && (
              <p className="text-muted-foreground text-lg leading-relaxed">
                {featured.snippet}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              {featured.author && <span>{featured.author}</span>}
              {featured.read_time && <span>{featured.read_time}</span>}
            </div>
              </Link>
            );
          })()
        ) : null}

        {/* Domain Entry Points — DB-driven */}
        {sectionsError ? (
          <ErrorState
            title="Couldn't load the tracks"
            message="The finance tracks could not be fetched just now. This is a temporary failure, not an empty syllabus."
            onRetry={() => refetchSections()}
          />
        ) : sectionsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : sections && sections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections
              .filter((domain) => !NOT_A_TRACK.has(domain.slug))
              .map((domain) => (
                <Link key={domain.id} to={`/finance/${domain.slug}`} className="group" data-finance-card={String(domain.sort_order).padStart(2, '0')}>
                  <div className={CARD}>
                    <CardBody
                      number={String(domain.sort_order).padStart(2, '0')}
                      title={domain.title}
                      line={domain.description}
                      chip={
                        domain.slug === 'fundamentals' && (
                          <span className="eyebrow-chip text-primary border-primary/30">Start here</span>
                        )
                      }
                    />
                  </div>
                </Link>
              ))}
            <FinanceInActionCard />
            <Link to={TOOLKITS_CARD.href} className="group" data-finance-card={TOOLKITS_CARD.number}>
              <div className={CARD}>
                <CardBody number={TOOLKITS_CARD.number} title={TOOLKITS_CARD.title} line={TOOLKITS_CARD.line} />
              </div>
            </Link>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
