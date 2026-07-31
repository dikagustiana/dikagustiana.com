/**
 * CapitalConditionDetail — View 2: Single condition detail page.
 * Route: /finance/capital-in-motion/:conditionSlug
 *
 * Narrative longform layout — reads as a flowing essay, not a database record.
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import {
  CONDITIONS,
  getLayerLabel,
  CONDITION_ORDER,
} from '@/data/capitalConditions';

export default function CapitalConditionDetail() {
  const { conditionSlug } = useParams();
  const navigate = useNavigate();

  const condition = CONDITIONS.find(
    (c) => c.id === conditionSlug || String(c.number) === conditionSlug
  );

  const [showQuant, setShowQuant] = useState(false);
  const [showModel, setShowModel] = useState(false);

  if (!condition) {
    return (
      <PageLayout role="manager">
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

  const modelRows = condition.hypotheticalModel && condition.hypotheticalModel.length > 0
    ? condition.hypotheticalModel
    : [
        { metric: '—', whatHappened: '—', whatShouldHaveHappened: '—' },
        { metric: '—', whatHappened: '—', whatShouldHaveHappened: '—' },
        { metric: 'Capital Outcome', whatHappened: '—', whatShouldHaveHappened: '—' },
      ];

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Capital in Motion', path: '/finance/finance-in-motion' },
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
          to="/finance/finance-in-motion"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Capital in Motion
        </Link>

        {/* Title */}
        <h1 className="text-5xl font-bold leading-tight text-foreground mb-8">
          {condition.title}
        </h1>

        {/* Opening paragraph — the tension as narrative intro */}
        <p className="text-lg leading-8 text-slate-800 mb-6">
          {condition.tension}
        </p>

        {/* The Situation */}
        <h2 className="text-2xl font-semibold text-foreground mt-16 mb-6">
          The Situation
        </h2>
        <p className="text-lg leading-8 text-slate-800 mb-6">
          This is a <span className="font-medium">{getLayerLabel(condition.layer).toLowerCase()}</span> condition
          observed in the case of <span className="font-medium">{condition.caseCompany}</span>.
        </p>

        {/* The Capital Tension */}
        <h2 className="text-2xl font-semibold text-foreground mt-16 mb-6">
          The Capital Tension
        </h2>
        <p className="text-lg leading-8 text-slate-800 mb-6">
          {condition.tension}
        </p>

        {/* Quantitative Lens — inline narrative */}
        {condition.quantitative && (
          <>
            <h2 className="text-2xl font-semibold text-foreground mt-16 mb-6">
              The Quantitative Lens
            </h2>
            {!showQuant ? (
              <p className="text-lg leading-8 text-slate-800 mb-6">
                The numbers tell a sharper story.{' '}
                <button
                  onClick={() => setShowQuant(true)}
                  className="text-foreground underline underline-offset-4 hover:text-slate-700 transition-colors"
                >
                  Read the quantitative detail →
                </button>
              </p>
            ) : (
              <>
                <p className="text-lg leading-8 text-slate-800 mb-6 font-mono">
                  {condition.quantitative}
                </p>
                <button
                  onClick={() => setShowQuant(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 block"
                >
                  Collapse ↑
                </button>
              </>
            )}
          </>
        )}

        {/* The Decision Rule */}
        <h2 className="text-2xl font-semibold text-foreground mt-16 mb-6">
          The Decision Rule
        </h2>
        <p className="text-2xl font-semibold leading-snug text-foreground mb-6">
          {condition.rule}
        </p>

        {/* Hypothetical Model — narrative transition into table */}
        <h2 className="text-2xl font-semibold text-foreground mt-16 mb-6">
          Hypothetical Model
        </h2>
        {!showModel ? (
          <p className="text-lg leading-8 text-slate-800 mb-6">
            To make this concrete, consider a simplified model.{' '}
            <button
              onClick={() => setShowModel(true)}
              className="text-foreground underline underline-offset-4 hover:text-slate-700 transition-colors"
            >
              Show the model →
            </button>
          </p>
        ) : (
          <>
            <p className="text-lg leading-8 text-slate-800 mb-6">
              To make this concrete, consider the simplified model below.
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-700">Metric</th>
                    <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-700">What Happened</th>
                    <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-700">What Should Have Happened</th>
                  </tr>
                </thead>
                <tbody>
                  {modelRows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 border border-slate-200 font-medium text-slate-900">{row.metric}</td>
                      <td className="px-3 py-2 border border-slate-200 text-slate-600">{row.whatHappened}</td>
                      <td className="px-3 py-2 border border-slate-200 text-slate-600">{row.whatShouldHaveHappened}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setShowModel(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 block"
            >
              Collapse ↑
            </button>
          </>
        )}

        {/* Prev / Next */}
        <div className="mt-16 pt-6 border-t border-slate-200 flex items-center justify-between">
          {prevCondition ? (
            <button
              onClick={() => navigate(`/finance/capital-in-motion/${prevCondition.id}`)}
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
              onClick={() => navigate(`/finance/capital-in-motion/${nextCondition.id}`)}
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
