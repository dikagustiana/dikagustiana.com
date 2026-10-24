/**
 * CapitalConditionDetail — View 2: Single condition detail page.
 * Route: /finance/finance-in-action/capital-in-motion/:conditionSlug
 * (docs/prd/finance-restructure §1 C; the old /finance/capital-allocation/… addresses redirect here).
 *
 * Narrative longform layout — reads as a flowing essay, not a database record.
 */

import { lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import {
  CONDITIONS,
  getLayerLabel,
  CONDITION_ORDER,
  SHOW_CASE_COMPANIES,
} from '@/data/capitalConditions';
import { CAPITAL_IN_MOTION_PATH, conditionHref } from '@/lib/finance-in-action/conditions';
import { INDEX_PATH } from '@/lib/finance-in-action/routes';

/**
 * "Companies exhibiting this condition" reads the published model packages
 * through the Finance in Action viewer's registry, which exists only in the
 * builds that have the viewer (__FIA_LIVE__, production; __FIA_PREVIEW__).
 * Without either flag the section is the legacy index and the viewer is
 * compiled out (scripts/assert-no-synthetic.mjs), so the block is too.
 */
const ConditionCompanies =
  __FIA_LIVE__ || __FIA_PREVIEW__
    ? lazy(() => import('@/components/finance-in-action/viewer/ConditionCompanies').then((m) => ({ default: m.ConditionCompanies })))
    : null;

/** "an operational", "a balance sheet": the layer labels start with either. */
function withArticle(word: string): string {
  return `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;
}

export default function CapitalConditionDetail() {
  const { conditionSlug } = useParams();
  const navigate = useNavigate();

  const condition = CONDITIONS.find(
    (c) => c.id === conditionSlug || String(c.number) === conditionSlug
  );

  if (!condition) {
    return (
      <PageLayout>
        <div className="container max-w-3xl py-20 text-center">
          <p className="text-muted-foreground">Condition not found.</p>
        </div>
      </PageLayout>
    );
  }

  const currentIdx = CONDITION_ORDER.indexOf(condition.number);
  const prevCondition = currentIdx > 0
    ? CONDITIONS.find((c) => c.number === CONDITION_ORDER[currentIdx - 1])
    : null;
  const nextCondition = currentIdx < CONDITION_ORDER.length - 1
    ? CONDITIONS.find((c) => c.number === CONDITION_ORDER[currentIdx + 1])
    : null;

  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Finance in Action', path: INDEX_PATH },
        { label: 'Capital in Motion', path: CAPITAL_IN_MOTION_PATH },
        { label: condition.title },
      ]}
    >
      <SEO
        title={`${condition.title} — Capital in Motion`}
        description={condition.tension}
      />

      <article className="max-w-[860px] mx-auto px-6 lg:px-16 py-16">
        {/* Back link */}
        <Link
          to={CAPITAL_IN_MOTION_PATH}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Capital in Motion
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight text-foreground mb-8">
          {condition.title}
        </h1>

        {/* The tension, once. It used to open the page and then repeat,
            word for word, under "The Capital Tension". */}
        <p className="text-lg leading-8 text-foreground mb-6">
          {condition.tension}
        </p>

        {/* With the case company hidden, this section was one line of
            boilerplate ("This is a operational condition."), so it renders
            only when there is a case to name. */}
        {SHOW_CASE_COMPANIES && (
          <>
            <h2 className="text-2xl font-semibold text-foreground mt-16 mb-6">
              The Situation
            </h2>
            <p className="text-lg leading-8 text-foreground mb-6">
              This is {withArticle(getLayerLabel(condition.layer).toLowerCase())} condition
              observed in the case of <span className="font-medium">{condition.caseCompany}</span>.
            </p>
          </>
        )}

        {condition.quantitative && (
          <>
            <h2 className="text-2xl font-semibold text-foreground mt-16 mb-6">
              The Quantitative Lens
            </h2>
            <p className="text-lg leading-8 text-foreground mb-6 font-mono">
              {condition.quantitative}
            </p>
          </>
        )}

        <h2 className="text-2xl font-semibold text-foreground mt-16 mb-6">
          The Decision Rule
        </h2>
        <p className="text-2xl font-semibold leading-snug text-foreground mb-6">
          {condition.rule}
        </p>

        {/* Only a condition that has a model shows one; the fallback used to
            be a table of dashes behind a "Show the model" link, on all 21. */}
        {condition.hypotheticalModel && condition.hypotheticalModel.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold text-foreground mt-16 mb-6">
              Hypothetical Model
            </h2>
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 border border-border font-medium text-foreground">Metric</th>
                    <th className="text-left px-3 py-2 border border-border font-medium text-foreground">What Happened</th>
                    <th className="text-left px-3 py-2 border border-border font-medium text-foreground">What Should Have Happened</th>
                  </tr>
                </thead>
                <tbody>
                  {condition.hypotheticalModel.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 border border-border font-medium text-foreground">{row.metric}</td>
                      <td className="px-3 py-2 border border-border text-muted-foreground">{row.whatHappened}</td>
                      <td className="px-3 py-2 border border-border text-muted-foreground">{row.whatShouldHaveHappened}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Fed by the published packages' conditionIds (docs/prd/finance-restructure §1 C). */}
        {ConditionCompanies && (
          <Suspense fallback={null}>
            <ConditionCompanies number={condition.number} />
          </Suspense>
        )}

        {/* Prev / Next */}
        <div className="mt-16 pt-6 border-t border-border flex items-center justify-between">
          {prevCondition ? (
            <button
              onClick={() => navigate(conditionHref(prevCondition.number))}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>
          ) : (
            <span />
          )}
          {nextCondition ? (
            <button
              onClick={() => navigate(conditionHref(nextCondition.number))}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span />
          )}
        </div>
      </article>
    </PageLayout>
  );
}
