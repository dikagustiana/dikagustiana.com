interface WhatChangedPanelProps {
  changed: string[];
  held: string[];
  reversed: string[];
  previousReading: string;
  currentReading: string;
}

export function WhatChangedPanel({ changed, held, reversed, previousReading, currentReading }: WhatChangedPanelProps) {
  if (!previousReading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
          What Changed Since Last Update
        </p>
        <p className="text-muted-foreground">No prior comparison — this is the first issue.</p>
      </div>
    );
  }

  const rows = [
    { label: 'Changed', items: changed },
    { label: 'Held', items: held },
    { label: 'Reversed', items: reversed },
  ];

  return (
    <div className="border border-border rounded-lg p-6 space-y-6">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        What Changed Since Last Update
      </p>

      <p className="text-sm text-foreground">
        Previous quarter: <span className="font-semibold">{previousReading}</span>
        {' → '}
        This quarter: <span className="font-semibold">{currentReading}</span>
      </p>

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">
              {row.label}
            </p>
            {row.items.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-foreground leading-relaxed space-y-1">
                {row.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None this quarter.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
