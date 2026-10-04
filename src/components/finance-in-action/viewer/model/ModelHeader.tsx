/**
 * The model page's header (brief §5.3): name and ticker, sub-industry, pair
 * (with "not yet modelled" where a pair company has no package), latest
 * quarter and the quarter full statements run to, status, the Connections
 * switch, and Download .xlsx as the only primary action.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { COPY } from '@/lib/finance-in-action/copy';
import { periodLabel, type Registry } from '@/lib/finance-in-action/registry';
import { modelPath, subIndustryPath } from '@/lib/finance-in-action/routes';
import { StatusMark } from '../StatusMark';
import { SyntheticBadge } from '../SyntheticBanner';
import { ConnectionsToggle } from '../ConnectionsToggle';

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{term}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function ModelHeader({
  pkg,
  reg,
  lens,
  onLens,
  download,
}: {
  pkg: ModelPackage;
  reg: Registry;
  lens: boolean;
  onLens: (on: boolean) => void;
  /** The one primary action. */
  download?: ReactNode;
}) {
  const { meta } = pkg;
  const sub = reg.subIndustry(meta.subIndustry);
  return (
    <header className="mb-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
            {meta.name} <span className="font-mono text-xl font-semibold text-muted-foreground md:text-2xl">{meta.ticker}</span>
          </h1>
          {meta.provenance === 'synthetic' && (
            <div className="mt-2">
              <SyntheticBadge />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ConnectionsToggle on={lens} onChange={onLens} />
          {download}
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact term="Sub-industry">
          <Link to={subIndustryPath(meta.subIndustry)} className="text-accent underline-offset-4 hover:underline">
            {sub?.name ?? meta.subIndustry}
          </Link>
        </Fact>
        <Fact term="Pair">
          {meta.pair.length === 0 ? (
            '–'
          ) : (
            <ul className="space-y-0.5">
              {meta.pair.map((t) => {
                const c = reg.company(t);
                return (
                  <li key={t}>
                    {c?.pkg ? (
                      <Link to={modelPath(t)} className="text-accent underline-offset-4 hover:underline">
                        {c.name} ({t})
                      </Link>
                    ) : (
                      <span>
                        {c ? `${c.name} (${t})` : t}, {COPY.notYetModelled}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Fact>
        <Fact term="Latest quarter">
          {periodLabel(pkg, meta.asOf.latestQuarter)}; full statements to {periodLabel(pkg, meta.asOf.fullStatementsTo)}
        </Fact>
        <Fact term="Status">
          <StatusMark status={meta.status} />
        </Fact>
      </dl>
    </header>
  );
}
