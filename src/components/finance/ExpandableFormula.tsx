/**
 * ExpandableFormula — Collapsible section for formula derivations.
 */

import { type ReactNode, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';

interface ExpandableFormulaProps {
  label: string;
  children: ReactNode;
}

export function ExpandableFormula({ label, children }: ExpandableFormulaProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="my-4">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 pl-5 text-sm font-mono text-foreground/80 space-y-1 border-l border-border">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
