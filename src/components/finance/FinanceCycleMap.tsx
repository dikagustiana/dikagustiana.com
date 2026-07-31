/**
 * FinanceCycleMap — Visual interconnection map showing how the 4 pillars
 * connect in a continuous cycle.
 *
 * Fundamentals → Strategy → Planning → Analytics → Decision ↩
 *
 * Pure CSS/flexbox. No external dependencies.
 */

const stages = [
  { label: 'Fundamentals', section: '01' },
  { label: 'Strategy', section: '02' },
  { label: 'Planning', section: '03' },
  { label: 'Analytics', section: '04' },
  { label: 'Decision', section: '↩' },
];

export function FinanceCycleMap() {
  return (
    <div className="my-8 py-6 px-4 rounded-lg border border-border bg-muted/20">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4 text-center">
        The Finance Cycle
      </p>
      <div className="flex items-center justify-center gap-1 md:gap-2 flex-wrap">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-1 md:gap-2">
            <div className={`
              flex flex-col items-center justify-center px-3 py-2 rounded border
              ${i === stages.length - 1
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-background'
              }
            `}>
              <span className="text-[10px] font-mono text-muted-foreground/60">{stage.section}</span>
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">{stage.label}</span>
            </div>
            {i < stages.length - 1 && (
              <span className="text-muted-foreground/40 text-xs font-mono">→</span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/60 text-center mt-3 font-mono">
        Decision feeds back into Fundamentals. The cycle never stops.
      </p>
    </div>
  );
}
