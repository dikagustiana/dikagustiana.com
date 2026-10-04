/** A package that fails validation is not drawn; this says which, and why. */
import type { ValidationIssue } from '@/lib/finance-in-action/contract/validate';

const SHOWN = 5;

export function RejectedPackages({ rejected }: { rejected: { ticker: string; issues: ValidationIssue[] }[] }) {
  if (!rejected.length) return null;
  return (
    <div role="alert" className="mb-6 rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-foreground">
      <p className="font-semibold">Not shown: a model package failed its checks.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {rejected.map((r) => (
          <li key={r.ticker}>
            <span className="font-mono">{r.ticker}</span>:{' '}
            {r.issues
              .slice(0, SHOWN)
              .map((i) => `${i.path} ${i.message}`)
              .join('; ')}
            {r.issues.length > SHOWN ? `; and ${r.issues.length - SHOWN} more` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
