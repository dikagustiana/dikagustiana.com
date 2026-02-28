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

      <div className="py-10 container max-w-3xl">
        {/* Back link */}
        <Link
          to="/finance/finance-in-motion"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Capital in Motion
        </Link>

        {/* Header */}
        <div className="mb-8">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-primary/70 block mb-2">
            {getLayerLabel(condition.layer)}
          </span>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground tracking-tight leading-tight">
            {condition.title}
          </h1>
        </div>

        {/* Body */}
        <div className="space-y-5">
          {/* Case */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
              Case
            </span>
            <p className="text-sm text-foreground mt-0.5">{condition.caseCompany}</p>
          </div>

          {/* Capital Tension */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
              Capital Tension
            </span>
            <p className="text-sm text-muted-foreground mt-0.5">{condition.tension}</p>
          </div>

          {/* Quantitative Lens */}
          {condition.quantitative && (
            <div>
              {!showQuant ? (
                <button
                  onClick={() => setShowQuant(true)}
                  className="text-[11px] font-mono text-primary hover:text-primary/80 transition-colors"
                >
                  Show Quantitative Lens →
                </button>
              ) : (
                <div>
                  <button
                    onClick={() => setShowQuant(false)}
                    className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground mb-1 hover:text-foreground transition-colors"
                  >
                    Quantitative Lens ↑
                  </button>
                  <p className="text-sm font-mono text-muted-foreground">
                    {condition.quantitative}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Decision Rule */}
          <div className="pt-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-primary/70">
              Decision Rule
            </span>
            <p className="text-sm font-semibold text-primary mt-0.5">
              {condition.rule}
            </p>
          </div>

          {/* Hypothetical Model */}
          <div>
            {!showModel ? (
              <button
                onClick={() => setShowModel(true)}
                className="text-[11px] font-mono text-primary hover:text-primary/80 transition-colors"
              >
                Show Hypothetical Model →
              </button>
            ) : (
              <div className="mt-1">
                <button
                  onClick={() => setShowModel(false)}
                  className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground block mb-2 hover:text-foreground transition-colors"
                >
                  Hypothetical Model ↑
                </button>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 px-3 text-[10px] font-mono uppercase tracking-wider">Metric</TableHead>
                      <TableHead className="h-8 px-3 text-[10px] font-mono uppercase tracking-wider">What Happened</TableHead>
                      <TableHead className="h-8 px-3 text-[10px] font-mono uppercase tracking-wider">What Should Have Happened</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-3 py-2 text-xs font-medium">{row.metric}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-muted-foreground">{row.whatHappened}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-muted-foreground">{row.whatShouldHaveHappened}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Prev / Next */}
        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
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
    </PageLayout>
  );
}
