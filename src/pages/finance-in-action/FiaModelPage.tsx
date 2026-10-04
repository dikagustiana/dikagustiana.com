/**
 * Finance in Action: one company's model (brief §5.3 to §5.6).
 *
 * Preview only; reached through FiaModelRoute when __FIA_PREVIEW__ is true.
 * The lens state lives in the address (?connections=on); edits never leave
 * the page (constraint 12).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ModelHeader } from '@/components/finance-in-action/viewer/model/ModelHeader';
import { ProvenanceNote } from '@/components/finance-in-action/viewer/model/ProvenanceNote';
import { DriverRow } from '@/components/finance-in-action/viewer/model/DriverRow';
import { PeerBand } from '@/components/finance-in-action/viewer/model/PeerBand';
import { ConditionPanel } from '@/components/finance-in-action/viewer/model/ConditionPanel';
import { ModelGrid } from '@/components/finance-in-action/viewer/model/ModelGrid';
import { Inspector } from '@/components/finance-in-action/viewer/model/Inspector';
import { WorkpaperRecord } from '@/components/finance-in-action/viewer/model/WorkpaperRecord';
import { PeriodSelect } from '@/components/finance-in-action/viewer/model/PeriodSelect';
import { UnitEconomics } from '@/components/finance-in-action/viewer/model/UnitEconomics';
import { UELineDetail } from '@/components/finance-in-action/viewer/model/UELineDetail';
import { useModelView } from '@/components/finance-in-action/viewer/model/useModelView';
import type { SheetId } from '@/lib/finance-in-action/constants';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import type { IndustryLink } from '@/lib/finance-in-action/contract/links';
import { COPY } from '@/lib/finance-in-action/copy';
import { positionOf } from '@/lib/finance-in-action/chain';
import { linksFrom } from '@/lib/finance-in-action/links';
import { peerBand, publishedPeers } from '@/lib/finance-in-action/peers';
import { latestReported, quarterPeriods, periodById } from '@/lib/finance-in-action/model/periods';
import { noVolumeAnywhere, unitEconomicsAt } from '@/lib/finance-in-action/unitEconomics';
import type { Registry } from '@/lib/finance-in-action/registry';
import { INDEX_PATH, MODEL_PARAM, positionPath, subIndustryPath } from '@/lib/finance-in-action/routes';

export function Section({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-12 scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
        <h2 id={id} className="text-xl font-semibold text-foreground">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function FiaModelPage({ pkg, reg }: { pkg: ModelPackage; reg: Registry }) {
  const view = useModelView(pkg);
  const [params, setParams] = useSearchParams();
  const lens = params.get(MODEL_PARAM.lens) === 'on';
  const setLens = (on: boolean) => {
    const next = new URLSearchParams(params);
    if (on) next.set(MODEL_PARAM.lens, 'on');
    else next.delete(MODEL_PARAM.lens);
    setParams(next, { replace: true });
  };
  const [sheet, setSheet] = useState<SheetId>('model');
  const [treePeriod, setTreePeriod] = useState(pkg.meta.asOf.fullStatementsTo);
  const [uePeriod, setUePeriod] = useState(() => latestReported(pkg, pkg.unitEconomics.periods) ?? pkg.meta.asOf.fullStatementsTo);
  const ue = useMemo(() => unitEconomicsAt(view.wb, view.values, uePeriod), [view.wb, view.values, uePeriod]);
  const noVolume = useMemo(() => noVolumeAnywhere(view.wb, view.values), [view.wb, view.values]);

  const { meta } = pkg;
  const sub = reg.subIndustry(meta.subIndustry);
  const position = positionOf(meta.chainStage);
  const subName = sub?.name ?? meta.subIndustry;

  /** What a sub-industry sells on is its revenue line: the node on that row carries "Feeds X". */
  const feeds = useMemo(() => {
    const map = new Map<string, IndustryLink[]>();
    const out = linksFrom(reg, meta.subIndustry);
    const revenue = pkg.unitEconomics.lines.find((l) => l.role === 'revenue');
    const node = pkg.driverTree.nodes.find((n) => n.rowRef === revenue?.rowRef);
    if (node && out.length) map.set(node.id, out);
    return map;
  }, [reg, pkg, meta.subIndustry]);

  const peers = useMemo(() => peerBand(reg, pkg), [reg, pkg]);
  const treeLabel = periodById(pkg, treePeriod)?.label ?? treePeriod;

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Finance in Action', path: INDEX_PATH },
        { label: position?.label ?? meta.chainStage, path: positionPath(meta.chainStage) },
        { label: subName, path: subIndustryPath(meta.subIndustry) },
        { label: meta.ticker },
      ]}
    >
      <SEO title={`${meta.name}: model`} description={`${meta.name}, ${subName}: the operation rebuilt from its filings.`} noindex />
      <div className="container max-w-7xl px-4 py-8 sm:px-8">
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-8">
          <div className="min-w-0">
            <ModelHeader pkg={pkg} reg={reg} lens={lens} onLens={setLens} />
            <ProvenanceNote provenance={meta.provenance} />

            <Section
              id="fia-drivers"
              title={COPY.howItMakesMoney}
              aside={<PeriodSelect label="Quarter" periods={quarterPeriods(pkg)} value={treePeriod} onChange={setTreePeriod} />}
            >
              <p className="mb-3 text-sm text-muted-foreground">
                {treePeriod === meta.asOf.fullStatementsTo ? `${treeLabel}, the latest quarter with full statements.` : `${treeLabel}.`} Each figure has
                the same quarter a year earlier beneath it.
              </p>
              <DriverRow view={view} periodId={treePeriod} feeds={feeds} reg={reg} />
            </Section>

            <Section id="fia-unit-economics" title={`Unit economics, per ${pkg.unitEconomics.unit} sold`}>
              <UnitEconomics view={view} reg={reg} ue={ue} periodId={uePeriod} onPeriod={setUePeriod} onlyMessage={noVolume} />
            </Section>

            <Section id="fia-peers" title={`Where ${meta.ticker} sits in ${subName}`}>
              <PeerBand metrics={peers} ticker={meta.ticker} subIndustryName={subName} publishedCount={publishedPeers(reg, pkg).length} />
            </Section>

            <Section id="fia-why" title={COPY.whyThisLinkMatters}>
              <ConditionPanel pkg={pkg} subIndustry={sub} />
            </Section>

            <Section id="fia-model" title={COPY.theModel}>
              <ModelGrid view={view} sheetId={sheet} onSheet={setSheet} />
            </Section>

            <Section id="fia-workpaper" title={COPY.workpaper}>
              <WorkpaperRecord pkg={pkg} />
            </Section>
          </div>
          <Inspector view={view}>
            <UELineDetail view={view} ue={ue} />
          </Inspector>
        </div>
      </div>
    </PageLayout>
  );
}
