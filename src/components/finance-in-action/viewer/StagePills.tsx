/**
 * The stage pills under the index's subhead (chain view, PROMPT-site §3.1):
 * every stage and spanning layer in chain order, each with its companies on
 * the slate and how many are published. A pill goes to its section and puts
 * the anchor in the address; on a phone the row scrolls sideways and keeps
 * the current pill in view. Positions and their order come from
 * groupAlongChain, which reads the chain map's own data (constraint 6).
 *
 * On a model page (sheet-first PRD R1.1, mode "link") each pill goes to its
 * section of the index, and the company's own stage is the current one.
 */
import { useEffect, useRef, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { positionAnchor } from '@/lib/finance-in-action/chain';
import { pillCountLine, positionCount } from '@/lib/finance-in-action/counts';
import type { PositionGroup } from '@/lib/finance-in-action/registry';
import { positionPath } from '@/lib/finance-in-action/routes';
import { cn } from '@/lib/utils';

export const STAGE_PILLS_LABEL = 'Go to a stage of the chain';

const reveal = (el: Element | null | undefined, opts: ScrollIntoViewOptions) => {
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView(opts);
};

export function StagePills({
  groups,
  mode = 'anchor',
  currentPosition,
}: {
  groups: PositionGroup[];
  /** "anchor": the index's own sections; "link": the index from a model page. */
  mode?: 'anchor' | 'link';
  /** In link mode, the position marked current: the company's stage. */
  currentPosition?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const current = mode === 'link' ? (currentPosition ? positionAnchor(currentPosition) : '') : decodeURIComponent(location.hash.slice(1));
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
    <nav aria-label={STAGE_PILLS_LABEL} className={mode === 'anchor' ? 'mt-5' : undefined}>
      <ul className={cn('-mx-1 flex gap-2 overflow-x-auto px-1', mode === 'anchor' ? 'pb-2 pt-1' : '')} data-fia-stage-pills>
        {groups.map((g) => {
          const anchor = positionAnchor(g.position.id);
          const count = positionCount(g);
          const isCurrent = current === anchor;
          const ref = (el: HTMLAnchorElement | null) => (el ? pills.current.set(anchor, el) : pills.current.delete(anchor));
          const className = cn(
            'inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            mode === 'link' && 'focus-visible:ring-inset',
            isCurrent ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:border-foreground',
            g.position.kind === 'layer' && !isCurrent && 'border-dashed',
          );
          const body = (
            <>
              <span className="font-medium">{g.position.label}</span>
              <span className={cn('tabular-nums', isCurrent ? 'text-background' : 'text-muted-foreground')}>{pillCountLine(count)}</span>
            </>
          );
          return (
            <li key={g.position.id} className="shrink-0">
              {mode === 'link' ? (
                <Link ref={ref} to={positionPath(g.position.id)} aria-current={isCurrent ? 'location' : undefined} className={className}>
                  {body}
                </Link>
              ) : (
                <a ref={ref} href={`#${anchor}`} onClick={(e) => go(e, anchor)} aria-current={isCurrent ? 'location' : undefined} className={className}>
                  {body}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
