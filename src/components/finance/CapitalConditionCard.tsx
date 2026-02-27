/**
 * CapitalConditionCard — Accordion-style card for capital allocation conditions.
 * Institutional design. Dark-on-dark. No decoration.
 */

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

export interface CapitalCondition {
  id: string;
  number: number;
  title: string;
  case: string;
  tension: string;
  implication: string;
  rule: string;
  group: 'operational' | 'balance-sheet' | 'portfolio' | 'transition' | 'valuation';
}

interface CapitalConditionCardProps {
  condition: CapitalCondition;
  showQuantitative: boolean;
}

export function CapitalConditionCard({ condition, showQuantitative }: CapitalConditionCardProps) {
  return (
    <AccordionItem value={condition.id} className="border-b border-[hsl(215_20%_22%)] last:border-b-0">
      <AccordionTrigger className="py-5 hover:no-underline group text-left">
        <div className="flex items-baseline gap-4 w-full pr-4">
          <span className="text-xs font-mono text-[hsl(215_12%_45%)] tabular-nums shrink-0">
            {String(condition.number).padStart(2, '0')}
          </span>
          <span className="text-[15px] font-semibold text-[hsl(0_0%_92%)] group-hover:text-[hsl(0_0%_100%)] transition-colors leading-snug">
            {condition.title}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-[calc(1rem+1.25rem)] space-y-4 pb-2">
          {/* Case */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[hsl(215_12%_45%)]">
              Indonesian Case
            </span>
            <p className="text-sm text-[hsl(0_0%_82%)] mt-1">{condition.case}</p>
          </div>

          {/* Tension */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[hsl(215_12%_45%)]">
              Capital Tension
            </span>
            <p className="text-sm text-[hsl(0_0%_76%)] mt-1 leading-relaxed">{condition.tension}</p>
          </div>

          {/* Quantitative Implication — togglable */}
          {showQuantitative && condition.implication && (
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[hsl(215_12%_45%)]">
                Quantitative Implication
              </span>
              <p className="text-sm text-[hsl(0_0%_70%)] mt-1 leading-relaxed font-mono">
                {condition.implication}
              </p>
            </div>
          )}

          {/* Decision Rule */}
          <div className="pt-2 border-t border-[hsl(215_20%_18%)]">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[hsl(142_71%_45%_/_0.6)]">
              Decision Rule
            </span>
            <p className="text-sm font-semibold text-[hsl(0_0%_95%)] mt-1">
              {condition.rule}
            </p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
