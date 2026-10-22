/**
 * Finance in Action, section 06: the index (brief §5.1, §5.2).
 *
 * The page body. It takes its registry hook as a prop so that this module
 * imports no data: FiaIndexPage (preview, __FIA_PREVIEW__) hands it the
 * fixtures plus the published models, FiaLiveIndexPage (production,
 * __FIA_LIVE__) the published models alone, and App.tsx picks one at build
 * time. With neither flag /finance/finance-in-action renders the existing
 * FinanceInActionIndex, unchanged. Filter and lens state live in the address
 * so a view can be sent.
 */
import { useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ConnectionsToggle } from '@/components/finance-in-action/viewer/ConnectionsToggle';
import { CompanyList } from '@/components/finance-in-action/viewer/CompanyList';
import { ALL, IndexFilters } from '@/components/finance-in-action/viewer/IndexFilters';
import { StageStrip } from '@/components/finance-in-action/viewer/StageStrip';
import { SyntheticBanner } from '@/components/finance-in-action/viewer/SyntheticBanner';
import { LinkRegisterIssues, RejectedPackages } from '@/components/finance-in-action/viewer/RejectedPackages';
import { LinkLayer, LinkLegend } from '@/components/finance-in-action/viewer/links/LinkLayer';
import { LinkCard } from '@/components/finance-in-action/viewer/links/LinkCard';
import { linksFrom, linksTo, placeLinks } from '@/lib/finance-in-action/links';
import type { IndustryLink } from '@/lib/finance-in-action/contract/links';
import type { Registry } from '@/lib/finance-in-action/registry';
import { COPY } from '@/lib/finance-in-action/copy';
import { chainMapHref, positionAnchor, subIndustryAnchor } from '@/lib/finance-in-action/chain';
import { conditionsUsed } from '@/lib/finance-in-action/conditions';
import { groupAlongChain, type CompanyEntry, type PositionGroup } from '@/lib/finance-in-action/registry';
import type { RegistryHook } from '@/lib/finance-in-action/registryState';
import { PublishedNote } from '@/components/finance-in-action/viewer/PublishedNote';

export const PARAM = { query: 'q', condition: 'condition', lens: 'connections', link: 'link' } as const;

function matches(c: CompanyEntry, query: string, condition: string): boolean {
  const q = query.trim().toLowerCase();
  const byText = !q || c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  const byCondition = condition === ALL || c.conditionIds.includes(Number(condition));
  return byText && byCondition;
}

export function FiaIndex({ useRegistry }: { useRegistry: RegistryHook }) {
  const { reg, published, failure, fixtures } = useRegistry();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const query = params.get(PARAM.query) ?? '';
  const condition = params.get(PARAM.condition) ?? ALL;
  const lens = params.get(PARAM.lens) === 'on';
  const linkId = lens ? params.get(PARAM.link) : null;
  const link = linkId ? reg.links.find((l) => l.id === linkId) ?? null : null;

  const update = (patch: Partial<Record<(typeof PARAM)[keyof typeof PARAM], string | null>>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const all = useMemo(() => groupAlongChain(reg), [reg]);
  const filtered = useMemo(
    () => groupAlongChain(reg, reg.companies.filter((c) => matches(c, query, condition))),
    [reg, query, condition],
  );
  const conditions = useMemo(() => conditionsUsed(reg.companies.map((c) => c.conditionIds)), [reg]);
  const stages = all.filter((g) => g.position.kind === 'stage');
  const drawn = useMemo(() => placeLinks(reg, stages.map((g) => g.position.id)), [reg, stages]);
  const openLink = (id: string) => update({ [PARAM.lens]: 'on', [PARAM.link]: id });
  const layers = all.filter((g) => g.position.kind === 'layer');
  const sections = filtered.filter((g) => g.position.kind === 'stage' || g.subIndustries.length > 0);
  const anySynthetic = reg.companies.some((c) => c.synthetic);
  const filtering = query.trim() !== '' || condition !== ALL;

  // A breadcrumb or a card can name an anchor; scroll to it once the section exists.
  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, [location.hash]);

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Finance in Action' },
      ]}
    >
      <SEO title={COPY.seoTitle} description={COPY.seoDescription} noindex />
      <div className="container max-w-5xl px-4 py-8 sm:px-8">
        {anySynthetic && <SyntheticBanner />}
        <PublishedNote state={published} failure={failure} fixtures={fixtures} />
        <RejectedPackages rejected={reg.rejected} />
        <LinkRegisterIssues issues={reg.linkIssues} />

        <header className="mb-8 max-w-3xl">
          <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{COPY.section}</span>
          {/* OWNER-REPLACEABLE: the H1 and subhead are draft copy (lib/finance-in-action/copy.ts). */}
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">{COPY.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">{COPY.subhead}</p>
        </header>

        <section aria-labelledby="fia-along-chain" className="mb-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="fia-along-chain" className="text-xl font-semibold text-foreground">
              {COPY.alongTheChain}
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={chainMapHref()}
                className="inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {COPY.openChainMap}
              </Link>
              <ConnectionsToggle on={lens} onChange={(on) => update({ [PARAM.lens]: on ? 'on' : null, [PARAM.link]: null })} />
            </div>
          </div>
          <StageStrip
            stages={stages}
            layers={layers}
            linkLayer={lens ? <LinkLayer reg={reg} drawn={drawn} columns={stages.length} selected={linkId} onSelect={openLink} /> : undefined}
          />
          {lens && <LinkLegend />}
          {link && <LinkCard key={link.id} reg={reg} link={link} onClose={() => update({ [PARAM.link]: null })} />}
        </section>

        <section aria-label="Filters" className="mb-8">
          <IndexFilters
            query={query}
            onQuery={(q) => update({ [PARAM.query]: q || null })}
            condition={condition}
            onCondition={(c) => update({ [PARAM.condition]: c === ALL ? null : c })}
            conditions={conditions}
          />
        </section>

        <div className="space-y-10">
          {sections.map((g) => (
            <PositionSection key={g.position.id} group={g} filtering={filtering} lens={lens} reg={reg} onLink={openLink} />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

function LinkMentions({ reg, code, onLink }: { reg: Registry; code: string; onLink: (id: string) => void }) {
  const out = linksFrom(reg, code);
  const into = linksTo(reg, code);
  if (!out.length && !into.length) return null;
  const item = (l: IndustryLink, word: string, other: string) => (
    <li key={`${word}-${l.id}`}>
      <button
        type="button"
        onClick={() => onLink(l.id)}
        className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {word} {reg.subIndustry(other)?.name ?? other}
      </button>
    </li>
  );
  return (
    <ul className="flex flex-wrap gap-x-4">
      {out.map((l) => item(l, COPY.feeds, l.to))}
      {into.map((l) => item(l, COPY.fedBy, l.from))}
    </ul>
  );
}

function PositionSection({
  group,
  filtering,
  lens,
  reg,
  onLink,
}: {
  group: PositionGroup;
  filtering: boolean;
  lens: boolean;
  reg: Registry;
  onLink: (id: string) => void;
}) {
  const headingId = `${positionAnchor(group.position.id)}-heading`;
  return (
    <section id={positionAnchor(group.position.id)} aria-labelledby={headingId} className="scroll-mt-24">
      <h2 id={headingId} className="mb-3 border-b border-border pb-2 text-lg font-semibold text-foreground">
        {group.position.label}
      </h2>
      {group.subIndustries.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">{COPY.noModels}</p>
      ) : (
        <div className="space-y-6">
          {group.subIndustries.map(({ subIndustry, companies }) => (
            <div key={subIndustry.code} id={subIndustryAnchor(subIndustry.code)} className="scroll-mt-24">
              <div className="mb-2">
                <h3 className="text-base font-semibold text-foreground">
                  {subIndustry.name} <span className="font-mono text-xs font-normal text-muted-foreground">{subIndustry.code}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{subIndustry.note}</p>
                {lens && <LinkMentions reg={reg} code={subIndustry.code} onLink={onLink} />}
              </div>
              {companies.length ? (
                <CompanyList companies={companies} />
              ) : (
                <p className="text-sm italic text-muted-foreground">{filtering ? COPY.noMatches : COPY.noModels}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
