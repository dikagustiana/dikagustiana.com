/**
 * The stage pills under the index's subhead (chain view, PROMPT-site §3.1):
 * every stage and spanning layer in chain order, each with its companies on
 * the slate and how many are published. A pill goes to its section and puts
 * the anchor in the address; on a phone the row scrolls sideways and keeps
 * the current pill in view. Positions and their order come from
 * groupAlongChain, which reads the chain map's own data (constraint 6).
 */
import { useEffect, useRef, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { positionAnchor } from '@/lib/finance-in-action/chain';
import { pillCountLine, positionCount } from '@/lib/finance-in-action/counts';
import type { PositionGroup } from '@/lib/finance-in-action/registry';
import { cn } from '@/lib/utils';

export const STAGE_PILLS_LABEL = 'Go to a stage of the chain';

const reveal = (el: Element | null | undefined, opts: ScrollIntoViewOptions) => {
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView(opts);
};

export function StagePills({ groups }: { groups: PositionGroup[] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const current = decodeURIComponent(location.hash.slice(1));
  const pills = useRef(new Map<string, HTMLAnchorElement>());

  // The current pill stays in view in the sideways row.
  useEffect(() => {
    reveal(pills.current.get(current), { block: 'nearest', inline: 'nearest' });
  }, [current]);

  const go = (e: MouseEvent<HTMLAnchorElement>, anchor: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate({ search: location.search, hash: anchor });
    reveal(document.getElementById(anchor), { block: 'start' });
  };

  return (
    <nav aria-label={STAGE_PILLS_LABEL} className="mt-5">
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 pt-1" data-fia-stage-pills>
        {groups.map((g) => {
          const anchor = positionAnchor(g.position.id);
          const count = positionCount(g);
          const isCurrent = current === anchor;
          return (
            <li key={g.position.id} className="shrink-0">
              <a
                ref={(el) => (el ? pills.current.set(anchor, el) : pills.current.delete(anchor))}
                href={`#${anchor}`}
                onClick={(e) => go(e, anchor)}
                aria-current={isCurrent ? 'location' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isCurrent ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:border-foreground',
                  g.position.kind === 'layer' && !isCurrent && 'border-dashed',
                )}
              >
                <span className="font-medium">{g.position.label}</span>
                <span className={cn('tabular-nums', isCurrent ? 'text-background' : 'text-muted-foreground')}>{pillCountLine(count)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
