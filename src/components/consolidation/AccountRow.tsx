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
  const baseClasses = 'text-xs py-2.5 border-b border-slate-100';

  if (isHeader) {
    return (
      <tr className={`${baseClasses} bg-slate-50`}>
        <td
          colSpan={8}
          className="px-4 py-2.5 text-xs font-semibold text-slate-700 uppercase tracking-wider"
        >
          {label}
        </td>
      </tr>
    );
  }

  const rowClasses = `${baseClasses} ${isSubtotal ? 'font-semibold bg-slate-50/50' : 'hover:bg-slate-50/30'}`;
  const paddingLeft = indent > 0 ? `${indent * 16 + 16}px` : '16px';

  return (
    <tr className={rowClasses}>
      <td
        className="px-4 py-2.5 text-slate-800 whitespace-nowrap min-w-[220px]"
        style={{ paddingLeft }}
      >
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2.5 text-right text-slate-600 tabular-nums font-mono whitespace-nowrap">
          {displayValue(v)}
        </td>
      ))}
      <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums font-mono whitespace-nowrap bg-slate-50/50">
        {displayValue(combined)}
      </td>
      <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums font-mono whitespace-nowrap bg-amber-50/30">
        {displayValue(elimination)}
      </td>
      <td className="px-3 py-2.5 text-right text-emerald-800 tabular-nums font-mono whitespace-nowrap bg-emerald-50/40 font-medium">
        {displayValue(consolidated)}
      </td>
    </tr>
  );
}
