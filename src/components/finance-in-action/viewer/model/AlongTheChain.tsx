/**
 * "Along the chain" (chain view, PROMPT-site §3.4, PRD D-C2): the companies
 * upstream and downstream of this one, worked from the link register, never
 * written by hand. For each link: the sub-industry at the other end, what
 * flows, whether the link is measured (a solid sample and the word) or
 * expected and not measured (a dashed sample and the words), and its
 * companies with their status, linked when they have a model. Links to the
 * energy and logistics layers are their own group. Choosing a link opens the
 * link card.
 */
import { Link } from 'react-router-dom';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { companyChain, companyRail, type ChainNeighbour } from '@/lib/finance-in-action/companyChain';
import { COPY } from '@/lib/finance-in-action/copy';
import { HALF, STRIP } from '@/lib/finance-in-action/layout';
import type { CompanyEntry, Registry } from '@/lib/finance-in-action/registry';
import { modelPath } from '@/lib/finance-in-action/routes';
import { StatusMark } from '../StatusMark';

const LINE = { w: STRIP.sample, h: STRIP.sampleHeight };

function LinkState({ measured }: { measured: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-foreground">
      <svg width={LINE.w} height={LINE.h} aria-hidden="true">
        <line
          x1={0}
          y1={LINE.h * HALF}
          x2={LINE.w}
          y2={LINE.h * HALF}
          className={measured ? 'stroke-foreground' : 'stroke-muted-foreground'}
          strokeWidth={measured ? STRIP.costBase : STRIP.dashedWidth}
          strokeDasharray={measured ? undefined : STRIP.dash}
        />
      </svg>
      {measured ? COPY.measured : COPY.expectedNotMeasured}
    </span>
  );
}

function Companies({ list }: { list: CompanyEntry[] }) {
  if (!list.length) return <p className="text-sm italic text-muted-foreground">{COPY.noCompanies}</p>;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {list.map((c) => (
        <li key={c.ticker}>
          {c.pkg ? (
            <Link
              to={modelPath(c.ticker)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm text-foreground hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-mono font-semibold">{c.ticker}</span>
              <StatusMark status={c.status} className="text-xs" />
            </Link>
          ) : (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-md border border-dashed border-border px-3 text-sm text-foreground">
              <span className="font-mono font-semibold">{c.ticker}</span>
              <StatusMark status={c.status} className="text-xs" />
              <span className="text-xs text-muted-foreground">{COPY.notYetModelled}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Neighbour({ n, onOpenLink }: { n: ChainNeighbour; onOpenLink: (id: string) => void }) {
  const name = n.subIndustry?.name ?? n.code;
  return (
    <li className="rounded-md border border-border bg-card p-3" data-chain-link={n.link.id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-foreground">
          {n.direction === 'upstream' ? `${COPY.fedBy} ${name}` : `${COPY.feeds} ${name}`}{' '}
          <span className="font-mono text-xs font-normal text-muted-foreground">{n.code}</span>
        </p>
        <LinkState measured={n.measured} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{n.link.whatFlows}</p>
      {n.position && <p className="text-xs text-muted-foreground">{n.position.label}</p>}
      <Companies list={n.companies} />
      <button
        type="button"
        onClick={() => onOpenLink(n.link.id)}
        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {COPY.openLink}
        <span className="sr-only">: {n.link.whatFlows}</span>
      </button>
    </li>
  );
}

function Group({ id, title, empty, list, onOpenLink }: { id: string; title: string; empty: string; list: ChainNeighbour[]; onOpenLink: (id: string) => void }) {
  return (
    <div aria-labelledby={id} role="group">
      <h3 id={id} className="mb-2 text-base font-semibold text-foreground">
        {title}
      </h3>
      {list.length ? (
        <ul className="space-y-3">
          {list.map((n) => (
            <Neighbour key={`${n.direction}-${n.link.id}`} n={n} onOpenLink={onOpenLink} />
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

export function AlongTheChain({ reg, pkg, onOpenLink }: { reg: Registry; pkg: ModelPackage; onOpenLink: (id: string) => void }) {
  const chain = companyChain(reg, pkg);
  const { restOfStage } = companyRail(reg, pkg);
  const subName = reg.subIndustry(pkg.meta.subIndustry)?.name ?? pkg.meta.subIndustry;
  const tickers = (list: CompanyEntry[]) => list.map((c) => c.ticker).join(', ');
  return (
    <div className="space-y-6">
      {chain.band && (
        <p className="rounded-md border border-dashed border-foreground/40 bg-muted/60 px-3 py-2 text-sm text-foreground" data-chain-band>
          {pkg.meta.ticker} sits on the {chain.band.label} layer, not on one stage: {chain.band.span?.replace(/^.*—\s*/, '') ?? chain.band.span}.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <Group id="fia-chain-up" title={COPY.upstream} empty={COPY.noUpstream} list={chain.upstream} onOpenLink={onOpenLink} />
        <div role="group" aria-labelledby="fia-chain-here">
          <h3 id="fia-chain-here" className="mb-2 text-base font-semibold text-foreground">
            {COPY.thisStage}
          </h3>
          <p className="text-sm text-foreground">
            {chain.sameSubIndustry.length ? `With ${pkg.meta.ticker} in ${subName}: ${tickers(chain.sameSubIndustry)}.` : `${pkg.meta.ticker} is alone in ${subName} so far.`}
            {restOfStage.length ? ` Elsewhere in this stage: ${tickers(restOfStage)}.` : ''}
          </p>
        </div>
        <Group id="fia-chain-down" title={COPY.downstream} empty={COPY.noDownstream} list={chain.downstream} onOpenLink={onOpenLink} />
      </div>
      {(chain.layers.length > 0 || chain.band) && (
        <Group id="fia-chain-layers" title={COPY.layersGroup} empty={COPY.noLayerLink} list={chain.layers} onOpenLink={onOpenLink} />
      )}
    </div>
  );
}
