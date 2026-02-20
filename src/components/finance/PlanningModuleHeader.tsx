/**
 * PlanningModuleHeader — Planning pillar module header.
 * Shows a practical, tool-oriented header with a model-reference accent.
 */

interface PlanningModuleHeaderProps {
  title: string;
  thesis: string | null;
  sortOrder: number;
}

export function PlanningModuleHeader({ title, thesis, sortOrder }: PlanningModuleHeaderProps) {
  return (
    <div className="mb-10">
      <div className="flex items-baseline gap-3 mb-4">
        <div className="flex items-center justify-center h-8 w-8 rounded border border-border bg-muted/50">
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {String(sortOrder).padStart(2, '0')}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">
          {title}
        </h1>
      </div>
      {thesis && (
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          {thesis}
        </p>
      )}
    </div>
  );
}
