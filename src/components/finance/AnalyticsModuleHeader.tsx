/**
 * AnalyticsModuleHeader — Analytics pillar module header.
 * Data-oriented, precise typography with monospaced accents.
 */

interface AnalyticsModuleHeaderProps {
  title: string;
  thesis: string | null;
  sortOrder: number;
}

export function AnalyticsModuleHeader({ title, thesis, sortOrder }: AnalyticsModuleHeaderProps) {
  return (
    <div className="mb-10">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-lg font-mono font-bold text-primary tabular-nums">
          {String(sortOrder).padStart(2, '0')}
        </span>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">
          {title}
        </h1>
      </div>
      {thesis && (
        <p className="text-base italic text-muted-foreground leading-relaxed max-w-2xl">
          &ldquo;{thesis}&rdquo;
        </p>
      )}
    </div>
  );
}
