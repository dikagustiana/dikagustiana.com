/**
 * NarrativeModuleHeader — For "Finance in Motion" case-study modules.
 *
 * Used when module_meta.variant === 'narrative'.
 * Cinematic, story-driven header with scenario framing.
 */

interface NarrativeModuleHeaderProps {
  title: string;
  thesis: string | null;
  sortOrder: number;
}

export function NarrativeModuleHeader({ title, thesis, sortOrder }: NarrativeModuleHeaderProps) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary border border-primary/30 rounded px-2 py-0.5">
          Case Study
        </span>
        <span className="text-xs font-mono text-muted-foreground/50">
          {String(sortOrder).padStart(2, '0')}
        </span>
      </div>
      <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight leading-tight mb-4">
        {title}
      </h1>
      {thesis && (
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl border-l-2 border-primary/30 pl-4">
          {thesis}
        </p>
      )}
    </div>
  );
}
