/**
 * A status as a glyph plus its word (constraint 13): the glyph's fill tells
 * the four states apart by form, so it reads in greyscale too.
 */
import { STATUSES, byId, type ModelStatus } from '@/lib/finance-in-action/constants';
import { GLYPH, HALF } from '@/lib/finance-in-action/layout';
import { cn } from '@/lib/utils';

const C = GLYPH.size * HALF;
const R = GLYPH.radius;

function Glyph({ form }: { form: (typeof STATUSES)[number]['glyph'] }) {
  return (
    <svg width={GLYPH.size} height={GLYPH.size} viewBox={`0 0 ${GLYPH.size} ${GLYPH.size}`} aria-hidden="true" className="shrink-0">
      <circle cx={C} cy={C} r={R} fill={form === 'full' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={GLYPH.stroke} />
      {form === 'half' && <path d={`M${C} ${C - R} A${R} ${R} 0 0 0 ${C} ${C + R} Z`} fill="currentColor" />}
      {form === 'quarter' && <path d={`M${C} ${C} L${C} ${C - R} A${R} ${R} 0 0 1 ${C + R} ${C} Z`} fill="currentColor" />}
    </svg>
  );
}

export function StatusMark({ status, className }: { status: ModelStatus; className?: string }) {
  const s = byId(STATUSES, status);
  if (!s) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm text-foreground', className)}>
      <Glyph form={s.glyph} />
      {s.label}
    </span>
  );
}

export function StatusLegend({ title }: { title: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label={title}>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      {STATUSES.map((s) => (
        <span key={s.id} title={s.means}>
          <StatusMark status={s.id} />
        </span>
      ))}
    </div>
  );
}
