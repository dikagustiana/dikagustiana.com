import { Button } from '@/components/ui/button';
import { useFsPublish } from '@/hooks/queries/useFs';
import type { FsPeriod } from '@/lib/fs';

/**
 * The admin's publish action for a draft period (PRD §A4, §A8). Disabled while
 * the latest run has a failure; the server re-runs every rule anyway and
 * refuses a failing period whatever this button says.
 */
export function FsPublishButton({ period, failing }: { period: FsPeriod; failing: number }) {
  const publish = useFsPublish();
  const result = publish.data;
  const blocked = failing > 0;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 text-sm sm:flex-row sm:items-center">
      <span className="flex-1 text-muted-foreground">
        Draft: visible to admins only.{' '}
        {blocked
          ? `Publishing is blocked while ${failing} ${failing === 1 ? 'check fails' : 'checks fail'}.`
          : 'Publishing re-runs every check on the stored figures first.'}
      </span>
      <Button
        type="button"
        size="sm"
        disabled={blocked || publish.isPending}
        onClick={() => publish.mutate(period.id)}
      >
        {publish.isPending ? 'Checking…' : 'Publish'}
      </Button>
      {publish.isError && (
        <span role="alert" className="text-destructive">
          {(publish.error as Error).message}
        </span>
      )}
      {result && !result.published && (
        <span role="status" className="text-destructive">
          Not published: {result.failed} of {result.rules} checks failed.
        </span>
      )}
    </div>
  );
}
