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
    <div className="border border-slate-200 bg-white p-6">
      <div className="inline-flex p-2 bg-slate-50 border border-slate-200">
        <Icon className="w-5 h-5 text-slate-700" />
      </div>
      <h3 className="uppercase tracking-wider text-xs font-semibold text-slate-900 mt-3">
        {title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mt-2 mb-4">{definition}</p>
      {children}
    </div>
  );
}
