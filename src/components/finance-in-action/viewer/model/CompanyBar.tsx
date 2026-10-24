/**
 * The company bar (sheet-first PRD R1.3), in place of the tall model header,
 * low enough to leave the first screen to the model: the name and ticker and
 * the SYNTHETIC badge where it applies on one line; under them the
 * sub-industry (a link to it on the index), the facts in one sentence and
 * the status as a glyph plus a word; the Connections switch beside them. A
 * pair company the company tabs already list is not named again; one they do
 * not (a ticker with no entry on the slate) is, as "not yet modelled". The
 * provenance note, where the figures are not from filings, follows in one
 * slim line.
 */
import { Link } from 'react-router-dom';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { companyRail } from '@/lib/finance-in-action/companyChain';
import { COPY } from '@/lib/finance-in-action/copy';
import type { Registry } from '@/lib/finance-in-action/registry';
import { modelPath, subIndustryPath } from '@/lib/finance-in-action/routes';
import { companyFacts, companyFactsText } from '@/lib/finance-in-action/view/companyFacts';
import { StatusMark } from '../StatusMark';
import { SyntheticBadge } from '../SyntheticBanner';
import { ConnectionsToggle } from '../ConnectionsToggle';
import { ProvenanceNote } from './ProvenanceNote';

/** A link in a line of small type: a 44px target that does not make the line taller. */
const LINK = 'relative -my-3 inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function CompanyBar({ pkg, reg, lens, onLens }: { pkg: ModelPackage; reg: Registry; lens: boolean; onLens: (on: boolean) => void }) {
  const { meta } = pkg;
  const sub = reg.subIndustry(meta.subIndustry);
  const rail = companyRail(reg, pkg);
  const tabbed = new Set([...rail.sameSubIndustry, ...rail.restOfStage].map((c) => c.ticker));
  const pair = meta.pair.filter((t) => !tabbed.has(t));
  return (
    <header className="mb-1">
      <div className="flex flex-wrap items-center gap-x-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <div className="flex flex-wrap items-center gap-x-3">
            <h1 className="text-xl font-semibold leading-6 text-foreground">
              {meta.name} <span className="text-base font-semibold tracking-normal text-muted-foreground">{meta.ticker}</span>
            </h1>
            {meta.provenance === 'synthetic' && <SyntheticBadge />}
          </div>
          <p className="flex flex-wrap items-center gap-x-2 text-xs leading-5 text-muted-foreground">
            <Link to={subIndustryPath(meta.subIndustry)} className={LINK}>
              {sub?.name ?? meta.subIndustry}
            </Link>
            <span aria-hidden="true">·</span>
            <span data-fia-facts className="text-foreground">
              {companyFactsText(companyFacts(pkg))}
            </span>
            <StatusMark status={meta.status} className="text-xs" />
            {pair.length > 0 && (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                <span>{COPY.pairedWith}</span>
                {pair.map((t) => {
                  const c = reg.company(t);
                  return c?.pkg ? (
                    <Link key={t} to={modelPath(t)} className={LINK}>
                      {c.name} ({t})
                    </Link>
                  ) : (
                    <span key={t} className="text-foreground">
                      {c ? `${c.name} (${t})` : t}, {COPY.notYetModelled}
                    </span>
                  );
                })}
              </span>
            )}
          </p>
        </div>
        <div className="ml-auto">
          <ConnectionsToggle on={lens} onChange={onLens} />
        </div>
      </div>
      <ProvenanceNote provenance={meta.provenance} className="mb-0 mt-1 px-3 py-0 text-[11px] leading-4" />
    </header>
  );
}
