interface AccountRowProps {
  label: string;
  values: (string | number | null | undefined)[];
  combined?: string | number | null;
  elimination?: string | number | null;
  consolidated?: string | number | null;
  isHeader?: boolean;
  isSubtotal?: boolean;
  indent?: number;
}

function displayValue(val: string | number | null | undefined): string {
  if (val === '' || val === null || val === undefined) return '—';
  return String(val);
}

export function AccountRow({
  label,
  values,
  combined,
  elimination,
  consolidated,
  isHeader = false,
  isSubtotal = false,
  indent = 0,
}: AccountRowProps) {
  if (isHeader) {
    return (
      <tr className="text-xs py-2.5 border-b border-border bg-muted/50">
        <td
          colSpan={8}
          className="px-4 py-2.5 text-xs font-semibold text-foreground uppercase tracking-wider"
        >
          {label}
        </td>
      </tr>
    );
  }

  const rowClasses = `text-xs py-2.5 border-b border-border/50 ${isSubtotal ? 'font-semibold bg-muted/30' : 'hover:bg-muted/20'}`;
  const paddingLeft = indent > 0 ? `${indent * 16 + 16}px` : '16px';

  return (
    <tr className={rowClasses}>
      <td
        className="px-4 py-2.5 text-foreground whitespace-nowrap min-w-[220px]"
        style={{ paddingLeft }}
      >
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2.5 text-right text-muted-foreground tabular-nums font-mono whitespace-nowrap">
          {displayValue(v)}
        </td>
      ))}
      <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums font-mono whitespace-nowrap bg-muted/30">
        {displayValue(combined)}
      </td>
      <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums font-mono whitespace-nowrap bg-amber-50/30">
        {displayValue(elimination)}
      </td>
      <td className="px-3 py-2.5 text-right text-foreground tabular-nums font-mono whitespace-nowrap bg-accent/[0.07] font-medium">
        {displayValue(consolidated)}
      </td>
    </tr>
  );
}
