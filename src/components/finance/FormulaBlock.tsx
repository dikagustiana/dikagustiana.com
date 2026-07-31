/**
 * FormulaBlock — Renders LaTeX math formulas using KaTeX.
 * Display component for hand-authored essays. Not integrated into TipTap.
 */

import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FormulaBlockProps {
  formula: string;
  label?: string;
  inline?: boolean;
}

export function FormulaBlock({ formula, label, inline = false }: FormulaBlockProps) {
  const html = katex.renderToString(formula, {
    throwOnError: false,
    displayMode: !inline,
  });

  if (inline) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <div className="my-6 rounded-lg border border-border bg-muted/20 px-5 py-4">
      {label && (
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 block">
          {label}
        </span>
      )}
      <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
