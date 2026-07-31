/**
 * StrategicModuleHeader — Board-level module header.
 *
 * Used when module_meta.variant === 'board'.
 * Understated, authoritative typography with no decoration.
 */

interface StrategicModuleHeaderProps {
  title: string;
  thesis: string | null;
  sortOrder: number;
}

export function StrategicModuleHeader({ title, thesis, sortOrder }: StrategicModuleHeaderProps) {
  return (
    <div className="mb-10">
      <span className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block">
        Module {String(sortOrder).padStart(2, '0')}
      </span>
      <h1 className="text-2xl md:text-3xl font-display font-semibold text-foreground tracking-tight leading-tight mb-4">
        {title}
      </h1>
      {thesis && (
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          {thesis}
        </p>
      )}
    </div>
  );
}
