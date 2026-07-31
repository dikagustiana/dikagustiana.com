/**
 * AnalyticsSidebar — Right-side panel for related formulas.
 * Created for future use on analytics module pages.
 * NOT mounted anywhere yet.
 */

import { FormulaBlock } from './FormulaBlock';

interface AnalyticsSidebarProps {
  formulas?: Array<{ label: string; formula: string }>;
}

export function AnalyticsSidebar({ formulas }: AnalyticsSidebarProps) {
  if (!formulas || formulas.length === 0) return null;

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Key Formulas
        </h3>
        {formulas.map((f, i) => (
          <div key={i} className="space-y-1">
            <span className="text-xs font-medium text-foreground">{f.label}</span>
            <FormulaBlock formula={f.formula} inline />
          </div>
        ))}
      </div>
    </aside>
  );
}
