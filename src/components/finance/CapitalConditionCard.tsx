/**
 * CapitalConditionCard — Substack-style editorial list item.
 * Bold title, description snippet, subtle metadata line.
 */

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
      className="w-full text-left py-6 group block"
    >
      <h3 className="text-lg md:text-xl font-display font-bold text-foreground leading-snug mb-1.5 group-hover:text-primary/80 transition-colors">
        {condition.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-2 max-w-xl line-clamp-2">
        {condition.tension}
      </p>
      <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground/70">
        {getLayerLabel(condition.layer)} · {condition.caseCompany}
      </span>
    </button>
  );
}
