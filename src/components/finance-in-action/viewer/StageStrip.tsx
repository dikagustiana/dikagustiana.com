/**
 * "Models along the chain": one card per chain stage, in the chain map's
 * reading order, joined by plain connectors, then the two spanning layers as
 * full-width bands (brief §5.1). With the Connections lens on, the link layer
 * under the cards draws the register's links between their stages (§5.2).
 *
 * The strip scrolls inside its own box on a narrow screen rather than pushing
 * the page sideways.
 */
import type { ReactNode } from 'react';
import type { PositionGroup } from '@/lib/finance-in-action/registry';
import { positionAnchor } from '@/lib/finance-in-action/chain';
import { countsLine, publishedLine } from '@/lib/finance-in-action/counts';
import { STRIP_MIN_COLUMN } from '@/lib/finance-in-action/layout';
import { cn } from '@/lib/utils';

export function StageStrip({
  stages,
  layers,
  linkLayer,
}: {
  stages: PositionGroup[];
  layers: PositionGroup[];
  /** The Connections lens: drawn under the cards, on the same columns. */
  linkLayer?: ReactNode;
}) {
  const columns = `repeat(${stages.length}, minmax(${STRIP_MIN_COLUMN}, 1fr))`;
  return (
    <div className="space-y-3">
      <div
        className="overflow-x-auto rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={0}
        role="region"
        aria-label="Chain stages, scrolls sideways"
      >
        <div className="min-w-max">
          <ol className="grid gap-4 py-1" style={{ gridTemplateColumns: columns }}>
            {stages.map((g, i) => {
              const empty = !g.subIndustries.length;
              const published = publishedLine(g);
              return (
                <li
                  key={g.position.id}
                  className={cn(
                    'relative',
                    i < stages.length - 1 && 'after:absolute after:left-full after:top-1/2 after:h-px after:w-4 after:bg-foreground/40',
                  )}
                >
                  <a
                    href={`#${positionAnchor(g.position.id)}`}
                    className={cn(
                      'flex h-full min-h-[5.5rem] flex-col justify-between rounded-md border p-3 text-left hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      empty ? 'border-dashed border-border bg-background' : 'border-foreground/30 bg-card',
                    )}
                  >
                    <span className="text-sm font-semibold leading-snug text-foreground">{g.position.label}</span>
                    <span className="mt-2 text-xs text-muted-foreground">{countsLine(g)}</span>
                    {published && <span className="text-xs text-muted-foreground">{published}</span>}
                  </a>
                </li>
              );
            })}
          </ol>
          {linkLayer && <div style={{ gridTemplateColumns: columns }}>{linkLayer}</div>}
        </div>
      </div>
      <ul className="space-y-2">
        {layers.map((g) => (
          <li key={g.position.id}>
            <a
              href={`#${positionAnchor(g.position.id)}`}
              className="flex min-h-11 flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-dashed border-border bg-background px-3 py-2 hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-sm font-semibold text-foreground">{g.position.label}</span>
              <span className="text-xs text-muted-foreground">{g.position.span}</span>
              <span className="text-xs text-muted-foreground">{countsLine(g)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
