interface WhatChangedPanelProps {
  changed: string[];
  held: string[];
  reversed: string[];
  previousReading: string;
  currentReading: string;
  issueLabel?: string;
  previousLabel?: string;
}

export function WhatChangedPanel({
  changed,
  held,
  reversed,
  previousReading,
  currentReading,
  issueLabel,
  previousLabel,
}: WhatChangedPanelProps) {
  if (!previousReading) {
    return (
      <div className="bg-muted/40 border border-border rounded-lg p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          What Changed Since Last Update
        </p>
        <hr className="border-t border-border my-4" />
        <p className="text-muted-foreground">
          This is the first issue. No prior period comparison available.
        </p>
      </div>
    );
  }

  const columns: {
    label: string;
    items: string[];
    borderClass: string;
  }[] = [
    { label: 'Changed', items: changed, borderClass: 'border-primary' },
    { label: 'Held', items: held, borderClass: 'border-muted-foreground' },
    { label: 'Reversed', items: reversed, borderClass: 'border-destructive/50' },
  ];

  const comparisonLabel =
    issueLabel && previousLabel
      ? `${issueLabel} vs ${previousLabel}`
      : undefined;

  return (
    <div className="bg-muted/40 border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Comparison: {previousReading} → {currentReading}
        </p>
        {comparisonLabel && (
          <p className="font-mono text-xs text-muted-foreground flex-shrink-0">
            {comparisonLabel}
          </p>
        )}
      </div>

      <hr className="border-t border-border my-4" />

      {/* Three-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => (
          <div key={col.label}>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
              {col.label}
            </p>
            {col.items.length > 0 ? (
              <div className="space-y-2">
                {col.items.map((item, i) => (
                  <p
                    key={i}
                    className={`text-sm text-foreground leading-relaxed border-l-2 ${col.borderClass} pl-2`}
                  >
                    {item}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
