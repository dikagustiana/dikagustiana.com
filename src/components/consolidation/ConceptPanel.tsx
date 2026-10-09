import { ReactNode } from 'react';

interface ConceptPanelProps {
  title: string;
  definition: string;
  children?: ReactNode;
}

export function ConceptPanel({ title, definition, children }: ConceptPanelProps) {
  return (
    <div className="border border-border bg-card p-6">
      <h3 className="uppercase tracking-wider text-xs font-semibold text-foreground">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mt-2 mb-4">{definition}</p>
      {children}
    </div>
  );
}
