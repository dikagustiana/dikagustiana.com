/**
 * One sub-industry's companies: ticker, name, status, latest quarter, depth
 * and the section 05 conditions it informs (brief §5.1). A company with a
 * package links to its model page; a planned one does not, and says so.
 */
import { Link } from 'react-router-dom';
import { DEPTHS, byId } from '@/lib/finance-in-action/constants';
import { COPY } from '@/lib/finance-in-action/copy';
import { conditionHref, conditionOf, conditionShort } from '@/lib/finance-in-action/conditions';
import { periodLabel, type CompanyEntry } from '@/lib/finance-in-action/registry';
import { modelPath } from '@/lib/finance-in-action/routes';
import { StatusMark } from './StatusMark';
import { SyntheticBadge } from './SyntheticBanner';

export function CompanyList({ companies }: { companies: CompanyEntry[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {companies.map((c) => (
        <CompanyRow key={c.ticker} company={c} />
      ))}
    </ul>
  );
}

function CompanyRow({ company: c }: { company: CompanyEntry }) {
  const latest = periodLabel(c.pkg, c.latestQuarter);
  const depth = c.depth ? byId(DEPTHS, c.depth)?.label : null;
  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 py-2 md:grid-cols-[4.5rem_minmax(0,1fr)_8rem_6.5rem_6.5rem_minmax(0,12rem)]">
      <span className="font-mono text-sm font-semibold text-foreground">{c.ticker}</span>
      <span className="min-w-0">
        {c.pkg ? (
          <Link
            to={modelPath(c.ticker)}
            className="inline-flex min-h-11 items-center gap-2 font-medium text-foreground underline-offset-4 hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {c.name}
          </Link>
        ) : (
          <span className="flex min-h-11 flex-col justify-center text-foreground">
            {c.name}
            <span className="text-xs text-muted-foreground">{COPY.notStartedNoPage}</span>
          </span>
        )}
        {c.synthetic && (
          <span className="ml-2 align-middle">
            <SyntheticBadge />
          </span>
        )}
      </span>
      <span className="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-1 md:contents">
        <StatusMark status={c.status} />
        <span className="text-sm text-muted-foreground">{latest ? `As of ${latest}` : '–'}</span>
        <span className="text-sm text-muted-foreground">{depth ?? '–'}</span>
      </span>
      <span className="col-start-2 flex flex-wrap gap-x-3 md:col-start-auto">
        {c.conditionIds.map((n) => (
          <Link
            key={n}
            to={conditionHref(n)}
            title={conditionOf(n)?.title}
            aria-label={`${conditionShort(n)}: ${conditionOf(n)?.title ?? ''}`}
            className="inline-flex min-h-11 items-center text-sm text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {conditionShort(n)}
          </Link>
        ))}
      </span>
    </li>
  );
}
