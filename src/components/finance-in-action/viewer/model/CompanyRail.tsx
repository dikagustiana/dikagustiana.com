/**
 * The company rail (chain view, PROMPT-site §3.2): on a tablet or a desktop a
 * column on the left, on a phone a row that scrolls sideways. The companies
 * of the same sub-industry first, then the rest of the stage, each with its
 * ticker, name and status as a glyph plus a word. The current company is
 * marked as the current page; a company without a model is listed, not
 * linked.
 */
import { Link } from 'react-router-dom';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { companyRail } from '@/lib/finance-in-action/companyChain';
import type { CompanyEntry, Registry } from '@/lib/finance-in-action/registry';
import { modelPath } from '@/lib/finance-in-action/routes';
import { cn } from '@/lib/utils';
import { StatusMark } from '../StatusMark';

export const RAIL_LABEL = 'Companies in this stage';

function RailItem({ company: c, current }: { company: CompanyEntry; current: boolean }) {
  const body = (
    <>
      <span className="font-mono text-sm font-semibold">{c.ticker}</span>
      <span className="block max-w-[11rem] truncate text-xs text-muted-foreground md:max-w-none md:whitespace-normal">{c.name}</span>
      <StatusMark status={c.status} className="text-xs" />
    </>
  );
  const box = 'flex min-h-11 flex-col gap-0.5 rounded-md border px-3 py-2 text-left';
  if (current) {
    return (
      <span aria-current="page" className={cn(box, 'border-foreground bg-secondary text-foreground')}>
        {body}
      </span>
    );
  }
  if (!c.pkg) return <span className={cn(box, 'border-dashed border-border text-foreground')}>{body}</span>;
  return (
    <Link
      to={modelPath(c.ticker)}
      className={cn(box, 'border-border text-foreground hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
    >
      {body}
    </Link>
  );
}

export function CompanyRailNav({ reg, pkg }: { reg: Registry; pkg: ModelPackage }) {
  const { sameSubIndustry, restOfStage } = companyRail(reg, pkg);
  const sub = reg.subIndustry(pkg.meta.subIndustry);
  const group = (title: string, list: CompanyEntry[]) =>
    list.length ? (
      <div className="contents md:block">
        <p className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:mb-2 md:block">{title}</p>
        <ul className="contents md:mb-4 md:flex md:flex-col md:gap-2">
          {list.map((c) => (
            <li key={c.ticker} className="shrink-0">
              <RailItem company={c} current={c.ticker === pkg.meta.ticker} />
            </li>
          ))}
        </ul>
      </div>
    ) : null;
  return (
    <nav aria-label={RAIL_LABEL} className="mb-6 md:sticky md:top-4 md:mb-0 md:self-start">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 md:mx-0 md:block md:overflow-visible md:p-0" data-fia-rail>
        {group(sub?.name ?? pkg.meta.subIndustry, sameSubIndustry)}
        {group('Elsewhere in this stage', restOfStage)}
      </div>
    </nav>
  );
}
