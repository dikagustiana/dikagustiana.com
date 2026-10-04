/**
 * The register's links, drawn under the stage strip on the same columns
 * (brief §5.2). A measured link is two solid lines, a thick one weighted by
 * its cost share and a thin one weighted by its demand share; an unmeasured
 * link is one dashed line labelled "expected, not measured", whatever its
 * placeholders say (constraint 10). Each link's label is the control that
 * opens its card.
 */
import { isMeasured } from '@/lib/finance-in-action/contract/links';
import { SYNTHETIC_MARK } from '@/lib/finance-in-action/contract/validate';
import { COPY } from '@/lib/finance-in-action/copy';
import { formatPercent } from '@/lib/finance-in-action/format';
import { HALF, STRIP } from '@/lib/finance-in-action/layout';
import type { Registry } from '@/lib/finance-in-action/registry';
import { linkName, type DrawnLink } from '@/lib/finance-in-action/links';
import { cn } from '@/lib/utils';

export function LinkLayer({
  reg,
  drawn,
  columns,
  selected,
  onSelect,
}: {
  reg: Registry;
  drawn: DrawnLink[];
  columns: number;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const lanes = Math.max(1, ...drawn.map((d) => d.lane + 1));
  const drawing = STRIP.laneStart + (lanes - 1) * STRIP.laneStep;
  const height = drawing + STRIP.laneFoot + STRIP.labelRow;
  const width = columns * STRIP.column;
  const cx = (col: number) => col * STRIP.column + STRIP.column * HALF;
  const laneY = (lane: number) => STRIP.laneStart + lane * STRIP.laneStep;

  return (
    <div className="relative" style={{ height }}>
      <svg className="absolute inset-x-0 top-0 w-full" style={{ height: drawing + STRIP.laneFoot }} viewBox={`0 0 ${width} ${drawing + STRIP.laneFoot}`} preserveAspectRatio="none" aria-hidden="true">
        {drawn.map(({ link, from, to, lane }) => {
          const y = laneY(lane);
          const path = (dy: number) => `M${cx(from)} 0 C${cx(from)} ${y + dy}, ${cx(to)} ${y + dy}, ${cx(to)} 0`;
          const active = selected === link.id;
          if (!isMeasured(link) || !link.costShare || !link.demandShare) {
            return (
              <path
                key={link.id}
                d={path(0)}
                fill="none"
                strokeDasharray={STRIP.dash}
                strokeWidth={active ? STRIP.dashedWidth * 2 : STRIP.dashedWidth}
                vectorEffect="non-scaling-stroke"
                className="stroke-muted-foreground"
              />
            );
          }
          return (
            <g key={link.id} className={active ? 'stroke-foreground' : 'stroke-foreground/70'}>
              <path
                d={path(-STRIP.pairOffset * HALF)}
                fill="none"
                strokeWidth={STRIP.costBase + link.costShare.value * STRIP.costScale}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
              />
              <path
                d={path(STRIP.pairOffset)}
                fill="none"
                strokeWidth={STRIP.demandBase + link.demandShare.value * STRIP.demandScale}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>
      <ul className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2">
        {drawn.map(({ link }) => {
          const measured = isMeasured(link) && !!link.costShare && !!link.demandShare;
          const name = linkName(reg, link);
          const detail =
            measured && link.costShare && link.demandShare
              ? `cost share ${formatPercent(link.costShare.value)}, demand share ${formatPercent(link.demandShare.value)}`
              : COPY.expectedNotMeasured;
          const short = `${reg.subIndustry(link.from)?.unitNoun ?? link.from} to ${reg.subIndustry(link.to)?.unitNoun ?? link.to}${
            link.whatFlows.includes(SYNTHETIC_MARK) ? ` (${SYNTHETIC_MARK})` : ''
          }`;
          return (
            <li key={link.id}>
              <button
                type="button"
                onClick={() => onSelect(link.id)}
                aria-pressed={selected === link.id}
                aria-label={`${name}: ${detail}`}
                title={`${name}: ${link.whatFlows}`}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border bg-background px-2 text-xs text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected === link.id ? 'border-foreground font-semibold' : 'border-border',
                  !measured && 'border-dashed',
                )}
              >
                <LineSample measured={measured} />
                {short}: {detail}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LineSample({ measured }: { measured: boolean }) {
  return (
    <svg width={STRIP.sample} height={STRIP.sampleHeight} aria-hidden="true" className="shrink-0">
      {measured ? (
        <>
          <line x1="0" y1={STRIP.sampleHeight * HALF * HALF} x2={STRIP.sample} y2={STRIP.sampleHeight * HALF * HALF} className="stroke-foreground" strokeWidth={STRIP.costBase} />
          <line x1="0" y1={STRIP.sampleHeight - STRIP.demandBase} x2={STRIP.sample} y2={STRIP.sampleHeight - STRIP.demandBase} className="stroke-foreground" strokeWidth={STRIP.demandBase} />
        </>
      ) : (
        <line x1="0" y1={STRIP.sampleHeight * HALF} x2={STRIP.sample} y2={STRIP.sampleHeight * HALF} className="stroke-muted-foreground" strokeWidth={STRIP.dashedWidth} strokeDasharray={STRIP.dash} />
      )}
    </svg>
  );
}

export function LinkLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground" aria-label="Link legend">
      <li className="inline-flex items-center gap-2">
        <svg width="32" height="10" aria-hidden="true">
          <line x1="0" y1="5" x2="32" y2="5" className="stroke-foreground" strokeWidth={STRIP.costBase + STRIP.costScale * HALF * HALF} strokeLinecap="round" />
        </svg>
        Cost share: how much the downstream stage depends on the upstream price
      </li>
      <li className="inline-flex items-center gap-2">
        <svg width="32" height="10" aria-hidden="true">
          <line x1="0" y1="5" x2="32" y2="5" className="stroke-foreground" strokeWidth={STRIP.demandBase + STRIP.demandScale * HALF * HALF} strokeLinecap="round" />
        </svg>
        Demand share: how much the upstream stage depends on downstream volume
      </li>
      <li className="inline-flex items-center gap-2">
        <svg width="32" height="10" aria-hidden="true">
          <line x1="0" y1="5" x2="32" y2="5" className="stroke-muted-foreground" strokeWidth={STRIP.dashedWidth} strokeDasharray={STRIP.dash} />
        </svg>
        Expected link, not yet measured
      </li>
    </ul>
  );
}
