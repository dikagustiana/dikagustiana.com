/**
 * CapitalConditionCard — Clean editorial list item.
 * No borders, no boxes. Just title, case, layer tag, arrow.
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
      className="w-full text-left py-5 flex items-center gap-4 group"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-display font-semibold text-foreground leading-snug mb-1">
          {condition.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-1">
          {condition.caseCompany}
        </p>
        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-primary/70">
          {getLayerLabel(condition.layer)}
        </span>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-foreground/60 transition-colors" />
    </button>
  );
}
