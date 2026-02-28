/**
 * CapitalConditionDetail — View 2: Single condition detail page.
 * Route: /finance/capital-in-motion/:conditionSlug
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export default function CapitalConditionDetail() {
  const { conditionSlug } = useParams();
  const navigate = useNavigate();

  // Support both slug and number-based lookup for backwards compat
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

      <article className="max-w-[780px] mx-auto px-6 lg:px-16 py-16">
        <div className="space-y-10">
          {/* Back link */}
          <Link
            to="/finance/finance-in-motion"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Capital in Motion
          </Link>

          {/* Header */}
          <div>
            <span className="text-xs tracking-[0.25em] uppercase text-slate-500 mb-4 block">
              {getLayerLabel(condition.layer)}
            </span>
            <h1 className="text-5xl font-black leading-tight text-slate-900 mt-2">
              {condition.title}
            </h1>
          </div>

          {/* Case */}
          <div>
            <span className="text-xs tracking-[0.25em] uppercase text-slate-500 mt-14 mb-3 block">
              Case
            </span>
            <p className="text-xl leading-loose text-slate-800">{condition.caseCompany}</p>
          </div>

          {/* Capital Tension */}
          <div>
            <span className="text-xs tracking-[0.25em] uppercase text-slate-500 mt-14 mb-3 block">
              Capital Tension
            </span>
            <p className="text-xl leading-loose text-slate-800">{condition.tension}</p>
          </div>

          {/* Quantitative Lens */}
          {condition.quantitative && (
            <div>
              {!showQuant ? (
                <button
                  onClick={() => setShowQuant(true)}
                  className="text-slate-900 underline underline-offset-4 hover:text-slate-700 transition-colors font-mono text-sm"
                >
                  Show Quantitative Lens →
                </button>
              ) : (
                <div>
                  <button
                    onClick={() => setShowQuant(false)}
                    className="text-xs tracking-[0.25em] uppercase text-slate-500 mb-3 block hover:text-slate-700 transition-colors"
                  >
                    Quantitative Lens ↑
                  </button>
                  <p className="text-xl leading-loose text-slate-800 font-mono">
                    {condition.quantitative}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Decision Rule */}
          <div>
            <span className="text-xs tracking-[0.25em] uppercase text-slate-500 mt-14 mb-3 block">
              Decision Rule
            </span>
            <p className="text-2xl font-semibold leading-snug text-slate-900">
              {condition.rule}
            </p>
          </div>

          {/* Hypothetical Model */}
          <div>
            {!showModel ? (
              <button
                onClick={() => setShowModel(true)}
                className="text-slate-900 underline underline-offset-4 hover:text-slate-700 transition-colors font-mono text-sm"
              >
                Show Hypothetical Model →
              </button>
            ) : (
              <div className="mt-1">
                <button
                  onClick={() => setShowModel(false)}
                  className="text-xs tracking-[0.25em] uppercase text-slate-500 block mb-3 hover:text-slate-700 transition-colors"
                >
                  Hypothetical Model ↑
                </button>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2 border border-slate-200 text-xs tracking-[0.25em] uppercase text-slate-500 font-medium">Metric</th>
                        <th className="text-left px-3 py-2 border border-slate-200 text-xs tracking-[0.25em] uppercase text-slate-500 font-medium">What Happened</th>
                        <th className="text-left px-3 py-2 border border-slate-200 text-xs tracking-[0.25em] uppercase text-slate-500 font-medium">What Should Have Happened</th>
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
              </div>
            )}
          </div>

          {/* Prev / Next */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            {prevCondition ? (
              <button
                onClick={() => navigate(`/finance/capital-in-motion/${prevCondition.id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Previous
              </button>
            ) : (
              <span />
            )}
            {nextCondition ? (
              <button
                onClick={() => navigate(`/finance/capital-in-motion/${nextCondition.id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Next
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      </article>
    </PageLayout>
  );
}
