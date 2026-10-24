/**
 * The company tabs (sheet-first PRD R1.2), in place of the rail on the left:
 * one row across the top, so the grid has the page's width. The companies of
 * the same sub-industry first, then, after a labelled divider, the rest of
 * the stage (companyRail, the rail's own order). Each tab carries a monogram
 * of its ticker (no issuer logo, D-S8), the ticker, and the status as a glyph
 * plus a word; the name is in its accessible name. The current company is
 * marked as the current page and is not a link; a company without a model is
 * listed, not linked. A link keeps the address's query, so Connections stays
 * on from one company to the next. On a phone the row scrolls sideways and
 * keeps the current tab in view.
 */
import { useId, useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { companyRail } from '@/lib/finance-in-action/companyChain';
import { COPY } from '@/lib/finance-in-action/copy';
import type { CompanyEntry, Registry } from '@/lib/finance-in-action/registry';
import { MONOGRAM_LETTERS } from '@/lib/finance-in-action/layout';
import { modelPath } from '@/lib/finance-in-action/routes';
import { cn } from '@/lib/utils';
import { StatusMark } from '../StatusMark';

export const COMPANY_TABS_LABEL = 'Companies in this stage';

/** Two letters of the ticker, in a square: a mark of the company that is not its logo. */
function Monogram({ ticker }: { ticker: string }) {
  return (
    <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-[11px] font-semibold text-foreground">
      {ticker.slice(0, MONOGRAM_LETTERS)}
    </span>
  );
}

function Tab({ company: c, current, search }: { company: CompanyEntry; current: boolean; search: string }) {
  const body = (
    <>
      <Monogram ticker={c.ticker} />
      <span className="flex flex-col leading-tight">
        <span className="font-mono text-sm font-semibold">{c.ticker}</span>
        <StatusMark status={c.status} className="text-[11px]" />
      </span>
      <span className="sr-only">, {c.name}</span>
    </>
  );
  const box = 'relative flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border px-2.5 py-1 text-left';
  if (current) {
    return (
      <span aria-current="page" title={c.name} className={cn(box, 'border-foreground bg-secondary text-foreground')} data-fia-tab-current>
        {body}
      </span>
    );
  }
  if (!c.pkg) {
    return (
      <span title={c.name} className={cn(box, 'border-dashed border-border text-foreground')}>
        {body}
      </span>
    );
  }
  return (
    <Link
      to={{ pathname: modelPath(c.ticker), search }}
      title={c.name}
      className={cn(box, 'border-border bg-card text-foreground hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring')}
    >
      {body}
    </Link>
  );
}

export function CompanyTabs({ reg, pkg }: { reg: Registry; pkg: ModelPackage }) {
  const { search } = useLocation();
  const { sameSubIndustry, restOfStage } = companyRail(reg, pkg);
  const sub = reg.subIndustry(pkg.meta.subIndustry);
  const row = useRef<HTMLDivElement>(null);
  const id = useId();

  // The current tab stays in view in the sideways row, without moving the page.
  useLayoutEffect(() => {
    const el = row.current;
    const tab = el?.querySelector<HTMLElement>('[data-fia-tab-current]');
    if (!el || !tab) return;
    const left = tab.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
    if (left < el.scrollLeft || left + tab.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollLeft = left;
  }, [pkg.meta.ticker]);

  const groups = [
    { title: sub?.name ?? pkg.meta.subIndustry, list: sameSubIndustry },
    { title: COPY.elsewhereInStage, list: restOfStage },
  ].filter((g) => g.list.length);

  return (
    <nav aria-label={COMPANY_TABS_LABEL}>
      <div ref={row} className="-mx-1 flex items-center gap-2 overflow-x-auto px-1" data-fia-tabs>
        {groups.map((g, gi) => (
          <div key={g.title} className={cn('flex shrink-0 items-center gap-2', gi > 0 && 'ml-2 border-l border-border pl-4')}>
            <span id={`${id}-${gi}`} className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.title}
            </span>
            <ul aria-labelledby={`${id}-${gi}`} className="flex items-center gap-2">
              {g.list.map((c) => (
                <li key={c.ticker} className="shrink-0">
                  <Tab company={c} current={c.ticker === pkg.meta.ticker} search={search} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
