import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ConceptPanelProps {
  icon: LucideIcon;
  title: string;
  definition: string;
  children?: ReactNode;
}

export function ConceptPanel({ icon: Icon, title, definition, children }: ConceptPanelProps) {
  return (
    <div className="border border-border bg-card p-6">
      <div className="inline-flex p-2 bg-muted border border-border">
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <h3 className="uppercase tracking-wider text-xs font-semibold text-foreground mt-3">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mt-2 mb-4">{definition}</p>
      {children}
    </div>
  );
}
