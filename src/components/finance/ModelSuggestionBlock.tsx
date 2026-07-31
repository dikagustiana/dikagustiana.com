/**
 * ModelSuggestionBlock — Callout block suggesting an Excel model structure.
 * Used in Planning pillar essays to reference model templates.
 */

import { FileSpreadsheet } from 'lucide-react';

interface ModelSuggestionBlockProps {
  title: string;
  description: string;
  tabs?: string[];
  keyFormulas?: string[];
}

export function ModelSuggestionBlock({ title, description, tabs, keyFormulas }: ModelSuggestionBlockProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-5 my-6">
      <div className="flex items-center gap-2 mb-3">
        <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-auto">
          Model Reference
        </span>
      </div>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {tabs && tabs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <span
                key={tab}
                className="text-xs font-mono bg-background border border-border rounded px-2 py-1 text-muted-foreground"
              >
                {tab}
              </span>
            ))}
          </div>
        )}
        {keyFormulas && keyFormulas.length > 0 && (
          <div className="space-y-1 pt-1">
            {keyFormulas.map((formula, i) => (
              <code
                key={i}
                className="block text-xs font-mono text-foreground/80 bg-background border border-border rounded px-2.5 py-1.5"
              >
                {formula}
              </code>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
