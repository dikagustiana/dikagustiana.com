/**
 * CapitalConditionCard — Institutional condition card.
 * Light theme. Compressed. No decoration. Modular.
 */

import { useState } from 'react';

export interface CapitalCondition {
  id: string;
  number: number;
  title: string;
  case: string;
  tension: string;
  quantitative: string;
  rule: string;
  layer: 'operational' | 'balance-sheet' | 'portfolio' | 'transition' | 'valuation';
}

interface CapitalConditionCardProps {
  condition: CapitalCondition;
}

export function CapitalConditionCard({ condition }: CapitalConditionCardProps) {
  const [showQuant, setShowQuant] = useState(false);

  return (
    <div className="py-5 border-b border-border last:border-b-0">
      {/* Number + Title */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0">
          {String(condition.number).padStart(2, '0')}
        </span>
        <h3 className="text-base font-display font-semibold text-foreground leading-snug">
          {condition.title}
        </h3>
      </div>

      <div className="pl-7 space-y-2.5">
        {/* Case */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            Case
          </span>
          <p className="text-sm text-foreground mt-0.5">{condition.case}</p>
        </div>

        {/* Capital Tension */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            Capital Tension
          </span>
          <p className="text-sm text-muted-foreground mt-0.5">{condition.tension}</p>
        </div>

        {/* Quantitative Lens — text link toggle */}
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
                <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                  Quantitative Lens
                </span>
                <p className="text-sm font-mono text-muted-foreground mt-0.5">
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
      </div>
    </div>
  );
}
