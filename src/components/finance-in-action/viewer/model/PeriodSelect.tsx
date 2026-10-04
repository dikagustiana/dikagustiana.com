/** A native period picker: no animation, keyboard and touch friendly, 44px tall. */
import { useId } from 'react';
import type { Period } from '@/lib/finance-in-action/contract/types';

export function PeriodSelect({
  label,
  periods,
  value,
  onChange,
}: {
  label: string;
  periods: Period[];
  value: string;
  onChange: (id: string) => void;
}) {
  const id = useId();
  return (
    <span className="inline-flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {p.forecast ? ' (forecast)' : ''}
          </option>
        ))}
      </select>
    </span>
  );
}
