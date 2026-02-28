/**
 * CapitalConditionCard — Grid card for main page.
 * Clicking navigates to detail page.
 */

import { ArrowRight } from 'lucide-react';
import { getLayerLabel } from '@/data/capitalConditions';
import type { CapitalCondition } from '@/data/capitalConditions';

interface CapitalConditionCardProps {
  condition: CapitalCondition;
  onClick: () => void;
}

export function CapitalConditionCard({ condition, onClick }: CapitalConditionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-sm px-5 py-4 hover:border-foreground/30 transition-colors group flex items-start gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {String(condition.number).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-primary/70">
            {getLayerLabel(condition.layer)}
          </span>
        </div>
        <h3 className="text-sm font-display font-semibold text-foreground leading-snug mb-1.5">
          {condition.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {condition.caseCompany}
        </p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 mt-3 shrink-0 group-hover:text-foreground/60 transition-colors" />
    </button>
  );
}
