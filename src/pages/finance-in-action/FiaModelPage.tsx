/**
 * Finance in Action: one company's model (brief §5.3 to §5.6).
 *
 * Preview only; reached through FiaModelRoute when __FIA_PREVIEW__ is true.
 * The lens state lives in the address (?connections=on); edits never leave
 * the page (constraint 12).
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { DownloadButton } from '@/components/finance-in-action/viewer/model/DownloadButton';
import { PeriodSelect } from '@/components/finance-in-action/viewer/model/PeriodSelect';
import { UnitEconomics } from '@/components/finance-in-action/viewer/model/UnitEconomics';
import { CompanyRailNav } from '@/components/finance-in-action/viewer/model/CompanyRail';
import { KeyFigures } from '@/components/finance-in-action/viewer/model/KeyFigures';
import { ModelCard } from '@/components/finance-in-action/viewer/model/ModelCard';
import { AlongTheChain } from '@/components/finance-in-action/viewer/model/AlongTheChain';
import { CostSankey, SANKEY_TITLE } from '@/components/finance-in-action/viewer/model/CostSankey';
import { LinkCard } from '@/components/finance-in-action/viewer/links/LinkCard';
import { keyFigures } from '@/lib/finance-in-action/keyFigures';
import { UELineDetail } from '@/components/finance-in-action/viewer/model/UELineDetail';
import { DriverTree } from '@/components/finance-in-action/viewer/model/DriverTree';
import { CellEditor } from '@/components/finance-in-action/viewer/model/CellEditor';
import { ChainBreadcrumb, WhatChanged } from '@/components/finance-in-action/viewer/model/LensPanels';
import { isEditable } from '@/lib/finance-in-action/model/scenario';
import { decoration } from '@/lib/finance-in-action/view/decorate';
import { formatDelta } from '@/lib/finance-in-action/format';
import { PER_UNIT_DECIMALS, type UEBar } from '@/lib/finance-in-action/unitEconomics';
import { useModelView } from '@/components/finance-in-action/viewer/model/useModelView';
import { LENS_ROLES, type SheetId } from '@/lib/finance-in-action/constants';
import { cn } from '@/lib/utils';
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

function LensLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground" aria-label="Connections legend">
      {LENS_ROLES.map((r) => (
        <li key={r.id} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn('inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-sm border border-border px-1', r.className)}>
            {r.glyph}
          </span>
          {r.label}
        </li>
      ))}
    </ul>
  );
}

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
  const [params, setParams] = useSearchParams();
  const lens = params.get(MODEL_PARAM.lens) === 'on';
  const view = useModelView(pkg, lens);
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
  const figures = useMemo(() => keyFigures(view.wb, view.values), [view.wb, view.values]);
  const [chainLinkId, setChainLinkId] = useState<string | null>(null);
  const chainLink = chainLinkId ? reg.links.find((l) => l.id === chainLinkId) ?? null : null;
  // A link opened from the cost flow, below, is shown in "Along the chain": bring it into view.
  useEffect(() => {
    if (!chainLinkId) return;
    const card = document.getElementById('links');
    if (card && typeof card.scrollIntoView === 'function') card.scrollIntoView({ block: 'start' });
  }, [chainLinkId]);

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

  // With the lens on, a selection brings the tree and the waterfall to its
  // period, so its precedents and dependents can be marked in all three.
  useEffect(() => {
    if (!lens || !view.selected) return;
    const a = view.wb.address(view.selected);
    const period = a ? pkg.periods[a.periodIndex] : undefined;
    if (!period) return;
    if (period.kind === 'quarter') setTreePeriod(period.id);
    if (pkg.unitEconomics.periods.includes(period.id)) setUePeriod(period.id);
  }, [lens, view.selected, view.wb, pkg]);

  const editedKeys = useMemo(() => new Set(view.edits.map((e) => e.key)), [view.edits]);
  const decorate = useCallback(
    (key: string) =>
      decoration({
        mark: view.markOf(key),
        change: view.changed.get(key),
        edited: editedKeys.has(key),
        flashing: view.flash.keys.has(key),
        flashToken: view.flash.token,
        row: view.rowOf(key),
      }),
    [view, editedKeys],
  );
  const barNote = (bar: UEBar) => {
    if (!view.changed.has(bar.key) || bar.perUnit === null) return null;
    const before = unitEconomicsAt(view.wb, view.base, uePeriod).bars.find((b) => b.key === bar.key)?.perUnit ?? null;
    if (before === null) return null;
    const reduces = bar.line.role === 'cost' || bar.line.role === 'unsplit';
    const delta = reduces ? -(bar.perUnit - before) : bar.perUnit - before;
    return <span className="mt-1 px-1 text-center text-[11px] font-semibold tabular-nums text-foreground">{formatDelta(delta, PER_UNIT_DECIMALS)}</span>;
  };
  const treeIsForecast = periodById(pkg, treePeriod)?.forecast ?? false;
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
        <div className="md:grid md:grid-cols-[11rem_minmax(0,1fr)] md:items-start md:gap-6">
        <CompanyRailNav reg={reg} pkg={pkg} />
        <div className="min-w-0 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-8">
          <div className="min-w-0">
            <ModelHeader pkg={pkg} reg={reg} lens={lens} onLens={setLens} />
            <ProvenanceNote provenance={meta.provenance} />
            <KeyFigures set={figures} />

            <Section
              id="fia-drivers"
              title={COPY.howItMakesMoney}
              aside={<PeriodSelect label="Quarter" periods={quarterPeriods(pkg)} value={treePeriod} onChange={setTreePeriod} />}
            >
              <p className="mb-3 text-sm text-muted-foreground">
                {treePeriod === meta.asOf.fullStatementsTo ? `${treeLabel}, the latest quarter with full statements.` : `${treeLabel}.`} Each figure has
                the same quarter a year earlier beneath it.
              </p>
              {lens ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {treeIsForecast ? COPY.directionForecast : COPY.directionReported(pkg.unitEconomics.unit)}
                    </p>
                    <button
                      type="button"
                      aria-pressed={view.depth === 'full'}
                      onClick={() => view.setDepth(view.depth === 'full' ? 'one' : 'full')}
                      className="inline-flex min-h-11 items-center rounded-md border border-input px-3 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {view.depth === 'full' ? COPY.showOneLevel : COPY.showFullChain}
                    </button>
                  </div>
                  <LensLegend />
                  <DriverTree view={view} periodId={treePeriod} decorate={decorate} />
                </div>
              ) : (
                <DriverRow view={view} periodId={treePeriod} feeds={feeds} reg={reg} decorate={decorate} />
              )}
            </Section>

            <Section id="fia-along-chain" title={COPY.alongChainTitle}>
              <AlongTheChain reg={reg} pkg={pkg} onOpenLink={setChainLinkId} />
              {chainLink && (
                <div className="mt-6">
                  <LinkCard key={chainLink.id} reg={reg} link={chainLink} onClose={() => setChainLinkId(null)} />
                </div>
              )}
            </Section>

            <Section id="fia-unit-economics" title={`Unit economics, per ${pkg.unitEconomics.unit} sold`}>
              <UnitEconomics
                view={view}
                reg={reg}
                ue={ue}
                periodId={uePeriod}
                onPeriod={setUePeriod}
                onlyMessage={noVolume}
                decorate={decorate}
                barNote={barNote}
              />
            </Section>

            {/* Directly after the waterfall, on the waterfall's own period (chain view §3.5). */}
            <Section id="fia-cost-flow" title={SANKEY_TITLE(sub?.unitNoun ?? pkg.unitEconomics.unit)}>
              <CostSankey reg={reg} pkg={pkg} ue={ue} onlyMessage={noVolume} onOpenLink={setChainLinkId} />
            </Section>

            <Section id="fia-peers" title={`Where ${meta.ticker} sits in ${subName}`}>
              <PeerBand metrics={peers} ticker={meta.ticker} subIndustryName={subName} publishedCount={publishedPeers(reg, pkg).length} />
            </Section>

            <Section id="fia-why" title={COPY.whyThisLinkMatters}>
              <ConditionPanel pkg={pkg} subIndustry={sub} />
            </Section>

            <ModelCard
              id="fia-model"
              onReset={view.edits.length ? view.reset : undefined}
              download={<DownloadButton view={view} />}
              inspector={
                <Inspector view={view}>
                  <UELineDetail view={view} ue={ue} />
                  <ChainBreadcrumb view={view} />
                  <WhatChanged view={view} />
                </Inspector>
              }
            >
              <ModelGrid
                view={view}
                sheetId={sheet}
                onSheet={setSheet}
                decorate={decorate}
                editing={{
                  canEdit: (key) => isEditable(view.wb, key),
                  editor: (key, close) => <CellEditor view={view} cellKey={key} close={close} />,
                }}
              />
            </ModelCard>

            <Section id="fia-workpaper" title={COPY.workpaper}>
              <WorkpaperRecord pkg={pkg} />
            </Section>
          </div>
          <Inspector view={view}>
            <UELineDetail view={view} ue={ue} />
            <ChainBreadcrumb view={view} />
            <WhatChanged view={view} />
          </Inspector>
        </div>
        </div>
      </div>
    </PageLayout>
  );
}
