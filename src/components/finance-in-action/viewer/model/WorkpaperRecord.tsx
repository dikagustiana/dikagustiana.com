/** "Workpaper record" (brief §5.3): version, preparer, each gate with its status (glyph and word), approver and date. */
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { GATE_STATUSES, byId } from '@/lib/finance-in-action/constants';
import { cn } from '@/lib/utils';

export function WorkpaperRecord({ pkg }: { pkg: ModelPackage }) {
  const { workpaper, meta } = pkg;
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
      <dt className="font-medium text-muted-foreground">Model version</dt>
      <dd className="tabular-nums text-foreground">{meta.version}</dd>
      <dt className="font-medium text-muted-foreground">Prepared by</dt>
      <dd className="text-foreground">{workpaper.preparedBy ?? 'Not stated'}</dd>
      {workpaper.gates.map((g) => {
        const s = byId(GATE_STATUSES, g.status);
        return (
          <div key={g.name} className="contents">
            <dt className="font-medium text-muted-foreground">{g.name}</dt>
            <dd className="text-foreground">
              <span className={cn('inline-flex items-center gap-1.5', g.status === 'passed_with_escalation' && 'font-semibold')}>
                <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-foreground/50 text-xs">
                  {s?.glyph}
                </span>
                {s?.label}
              </span>
              {g.note && <span className="block text-muted-foreground">{g.note}</span>}
            </dd>
          </div>
        );
      })}
      <dt className="font-medium text-muted-foreground">Approved</dt>
      <dd className="text-foreground">
        {workpaper.approvedBy ? `${workpaper.approvedBy}, ${workpaper.approvedAt ?? 'date not stated'}` : 'Not approved'}
      </dd>
    </dl>
  );
}
