/**
 * Finance in Action: one company's model (brief §5.3 to §5.6), sheet first
 * (docs/company-models/sheet-first): the stage pills, the company tabs, the
 * company bar and the key figures, then the model itself, on the first
 * screen; the sections that explain it follow, in reading order, with a
 * row of anchors to each.
 *
 * Preview only; reached through FiaModelRoute when __FIA_PREVIEW__ is true.
 * The lens state lives in the address (?connections=on); edits, the sheet in
 * view, the zoom and the inspector's fold live with the page and never leave
 * it (constraint 12).
 */
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { StagePills } from '@/components/finance-in-action/viewer/StagePills';
import { CompanyTabs } from '@/components/finance-in-action/viewer/model/CompanyTabs';
import { CompanyBar } from '@/components/finance-in-action/viewer/model/CompanyBar';
import { DriverRow } from '@/components/finance-in-action/viewer/model/DriverRow';
import { PeerBand } from '@/components/finance-in-action/viewer/model/PeerBand';
import { ConditionPanel } from '@/components/finance-in-action/viewer/model/ConditionPanel';
import { CellLegend, ModelGrid, type GridPlace } from '@/components/finance-in-action/viewer/model/ModelGrid';
import { Inspector } from '@/components/finance-in-action/viewer/model/Inspector';
import { WorkpaperRecord } from '@/components/finance-in-action/viewer/model/WorkpaperRecord';
import { DownloadButton } from '@/components/finance-in-action/viewer/model/DownloadButton';
import { PeriodSelect } from '@/components/finance-in-action/viewer/model/PeriodSelect';
import { UnitEconomics } from '@/components/finance-in-action/viewer/model/UnitEconomics';
import { KeyFigures } from '@/components/finance-in-action/viewer/model/KeyFigures';
import { ModelCard } from '@/components/finance-in-action/viewer/model/ModelCard';
import { FormulaBar } from '@/components/finance-in-action/viewer/model/FormulaBar';
import { SheetTabs } from '@/components/finance-in-action/viewer/model/SheetTabs';
import { ZoomControl } from '@/components/finance-in-action/viewer/model/ZoomControl';
import { StatusLine } from '@/components/finance-in-action/viewer/model/StatusLine';
import { SectionNav } from '@/components/finance-in-action/viewer/model/SectionNav';
import { AlongTheChain } from '@/components/finance-in-action/viewer/model/AlongTheChain';
import { CostSankey } from '@/components/finance-in-action/viewer/model/CostSankey';
import { LinkCard } from '@/components/finance-in-action/viewer/links/LinkCard';
import { keyFigures } from '@/lib/finance-in-action/keyFigures';
import { UELineDetail } from '@/components/finance-in-action/viewer/model/UELineDetail';
import { DriverTree } from '@/components/finance-in-action/viewer/model/DriverTree';
import { CellEditor } from '@/components/finance-in-action/viewer/model/CellEditor';
import { ChainBreadcrumb, WhatChanged } from '@/components/finance-in-action/viewer/model/LensPanels';
import { isEditable } from '@/lib/finance-in-action/model/scenario';
import { decoration } from '@/lib/finance-in-action/view/decorate';
import { NUMBER_CONVENTION, formatDelta } from '@/lib/finance-in-action/format';
import { PER_UNIT_DECIMALS, type UEBar } from '@/lib/finance-in-action/unitEconomics';
import { useModelView } from '@/components/finance-in-action/viewer/model/useModelView';
import { LENS_ROLES } from '@/lib/finance-in-action/constants';
import { INSPECTOR_OPEN_FROM, LIMITS } from '@/lib/finance-in-action/layout';
import { cn } from '@/lib/utils';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import type { IndustryLink } from '@/lib/finance-in-action/contract/links';
import { COPY } from '@/lib/finance-in-action/copy';
import { positionOf } from '@/lib/finance-in-action/chain';
import { linksFrom } from '@/lib/finance-in-action/links';
import { peerBand, publishedPeers } from '@/lib/finance-in-action/peers';
import { useFxRates } from '@/lib/finance-in-action/useFxRates';
import { latestReported, quarterPeriods, periodById } from '@/lib/finance-in-action/model/periods';
import { noVolumeAnywhere, unitEconomicsAt } from '@/lib/finance-in-action/unitEconomics';
import { groupAlongChain, type Registry } from '@/lib/finance-in-action/registry';
import { INDEX_PATH, MODEL_PARAM, positionPath, subIndustryPath } from '@/lib/finance-in-action/routes';
import { addressMissText, addressOf, formulaBarContent } from '@/lib/finance-in-action/view/sheetAddress';
import { CHECK_COLUMNS, CHECKS_SHEET, checksAddress, checksRows, goTo, viewSheets, type ViewSheetId } from '@/lib/finance-in-action/view/checksSheet';

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
        <h2 id={id} className="scroll-mt-24 text-xl font-semibold text-foreground">
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
  const rates = useFxRates();
  const setLens = (on: boolean) => {
    const next = new URLSearchParams(params);
    if (on) next.set(MODEL_PARAM.lens, 'on');
    else next.delete(MODEL_PARAM.lens);
    setParams(next, { replace: true });
  };
  const [treePeriod, setTreePeriod] = useState(pkg.meta.asOf.fullStatementsTo);
  const [uePeriod, setUePeriod] = useState(() => latestReported(pkg, pkg.unitEconomics.periods) ?? pkg.meta.asOf.fullStatementsTo);
  const ue = useMemo(() => unitEconomicsAt(view.wb, view.values, uePeriod), [view.wb, view.values, uePeriod]);
  const noVolume = useMemo(() => noVolumeAnywhere(view.wb, view.values), [view.wb, view.values]);
  const figures = useMemo(() => keyFigures(view.wb, view.values), [view.wb, view.values]);
  const groups = useMemo(() => groupAlongChain(reg), [reg]);
  const [chainLinkId, setChainLinkId] = useState<string | null>(null);
  const chainLink = chainLinkId ? reg.links.find((l) => l.id === chainLinkId) ?? null : null;
  // A link opened from the cost flow, below, is shown in "Along the chain": bring it into view.
  useEffect(() => {
    if (!chainLinkId) return;
    const card = document.getElementById('links');
    if (card && typeof card.scrollIntoView === 'function') card.scrollIntoView({ block: 'start' });
  }, [chainLinkId]);

  // The model card: the sheet in view, the Checks sheet's cursor, a place to jump to, zoom, the inspector's fold.
  const [sheet, setSheet] = useState<ViewSheetId>('model');
  const [checksCursor, setChecksCursor] = useState<GridPlace | null>(null);
  const [reveal, setReveal] = useState<GridPlace | null>(null);
  const [zoom, setZoom] = useState<number>(LIMITS.zoomDefault);
  const [inspectorOpen, setInspectorOpen] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(INSPECTOR_OPEN_FROM).matches);
  const inspectorId = useId();
  const checks = useMemo(() => checksRows(pkg, view.wb, view.values), [pkg, view.wb, view.values]);
  const tabs = viewSheets(pkg);
  const tab = tabs.find((t) => t.id === sheet) ?? tabs[0];

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

  const peers = useMemo(() => peerBand(reg, pkg, rates), [reg, pkg, rates]);

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
  const { markOf, changed, flash, rowOf } = view;
  const decorate = useCallback(
    (key: string) =>
      decoration({
        mark: markOf(key),
        change: changed.get(key),
        edited: editedKeys.has(key),
        flashing: flash.keys.has(key),
        flashToken: flash.token,
        row: rowOf(key),
      }),
    [markOf, changed, flash, rowOf, editedKeys],
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

  /** A tab: the new sheet opens with nothing selected (DESIGN §5). */
  const changeSheet = (id: ViewSheetId) => {
    setSheet(id);
    setChecksCursor(null);
    setReveal(null);
    view.select(null);
  };
  /** Goes to a cell of a package sheet: its sheet, the selection, and the grid's focus. */
  const goToKey = (key: string) => {
    const a = view.wb.address(key);
    if (!a) return;
    setSheet(a.sheet);
    setChecksCursor(null);
    view.select(key);
    setReveal({ r: a.rowIndex, c: a.periodIndex });
  };
  /** The name box's Go To: null when it went, else why not. */
  const onGo = (typed: string): string | null => {
    const to = goTo(view.wb, typed, sheet, checks.length);
    if (!to.ok) return addressMissText(typed, to.reason);
    if (to.sheet === CHECKS_SHEET.id) {
      setSheet(CHECKS_SHEET.id);
      setChecksCursor({ r: to.r, c: to.c });
      view.select(checks[to.r].key);
      setReveal({ r: to.r, c: to.c });
    } else goToKey(to.key);
    return null;
  };

  const onChecks = sheet === CHECKS_SHEET.id;
  const checkCell = onChecks && checksCursor ? checks[checksCursor.r]?.cells[checksCursor.c] : undefined;
  const bar = !onChecks && view.selected ? formulaBarContent(view.wb, view.selected, view.values) : null;
  const barText = onChecks ? checkCell?.formula ?? checkCell?.text ?? '' : bar?.text ?? '';
  const address = onChecks ? (checksCursor ? checksAddress(checksCursor.r, checksCursor.c) : '') : view.selected ? addressOf(view.wb, view.selected)?.text ?? '' : '';
  const editKey = bar?.editable ? view.selected : null;

  const sections = [
    { id: 'fia-drivers', title: COPY.howItMakesMoney },
    { id: 'fia-unit-economics', title: COPY.unitEconomicsTitle(pkg.unitEconomics.unit) },
    { id: 'fia-cost-flow', title: COPY.sankeyTitle(sub?.unitNoun ?? pkg.unitEconomics.unit) },
    { id: 'fia-along-chain', title: COPY.alongChainTitle },
    { id: 'fia-peers', title: COPY.whereItSits(meta.ticker, subName) },
    { id: 'fia-why', title: COPY.whyThisLinkMatters },
    { id: 'fia-workpaper', title: COPY.workpaper },
  ];
  const title = (id: string) => sections.find((x) => x.id === id)!.title;

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
      <div className="container max-w-7xl px-4 pb-8 pt-1 sm:px-8">
        <div className="mb-1 space-y-1">
          <StagePills groups={groups} mode="link" currentPosition={meta.chainStage} />
          <CompanyTabs reg={reg} pkg={pkg} />
        </div>
        <CompanyBar pkg={pkg} reg={reg} lens={lens} onLens={setLens} />
        <KeyFigures set={figures} />

        <ModelCard
          id="fia-model"
          onReset={view.edits.length ? view.reset : undefined}
          download={<DownloadButton view={view} />}
          legend={<CellLegend />}
          formulaBar={
            <FormulaBar
              address={address}
              onGo={onGo}
              text={barText}
              edit={editKey ? { label: view.rowOf(editKey)?.label ?? '', editor: (close) => <CellEditor view={view} cellKey={editKey} close={close} /> } : null}
            />
          }
          inspectorId={inspectorId}
          inspectorOpen={inspectorOpen}
          onInspector={setInspectorOpen}
          inspector={
            <Inspector view={view} id={inspectorId} expanded={inspectorOpen}>
              <UELineDetail view={view} ue={ue} />
              <ChainBreadcrumb view={view} />
              <WhatChanged view={view} />
            </Inspector>
          }
          footer={
            <>
              <SheetTabs pkg={pkg} current={tab.id} onSheet={changeSheet} />
              <div className="flex min-w-0 flex-1 items-center justify-end gap-3 px-2">
                <StatusLine
                  view={view}
                  sheetLabel={tab.label}
                  place={onChecks && checksCursor ? { row: checks[checksCursor.r].label, column: CHECK_COLUMNS[checksCursor.c].label } : null}
                />
                <ZoomControl zoom={zoom} onZoom={setZoom} />
              </div>
            </>
          }
          note={
            <p className="text-xs text-muted-foreground">
              {tab.means} {onChecks ? '' : `${COPY.unitColumn} `}
              {NUMBER_CONVENTION}
            </p>
          }
        >
          <ModelGrid
            key={sheet}
            view={view}
            sheetId={tab.id}
            decorate={decorate}
            zoom={zoom}
            reveal={reveal}
            editing={{
              canEdit: (key) => isEditable(view.wb, key),
              editor: (key, close) => <CellEditor view={view} cellKey={key} close={close} />,
            }}
            checks={onChecks ? { rows: checks, cursor: checksCursor, onCursor: setChecksCursor, onOpen: goToKey } : undefined}
          />
        </ModelCard>

        <SectionNav sections={sections} />

        <Section
          id="fia-drivers"
          title={title('fia-drivers')}
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

        <Section id="fia-unit-economics" title={title('fia-unit-economics')}>
          <UnitEconomics
            view={view}
            reg={reg}
            ue={ue}
            periodId={uePeriod}
            onPeriod={setUePeriod}
            onlyMessage={noVolume}
            decorate={decorate}
            barNote={barNote}
            rates={rates}
          />
        </Section>

        {/* Directly after the waterfall, on the waterfall's own period (chain view §3.5). */}
        <Section id="fia-cost-flow" title={title('fia-cost-flow')}>
          <CostSankey reg={reg} pkg={pkg} ue={ue} onlyMessage={noVolume} onOpenLink={setChainLinkId} />
        </Section>

        <Section id="fia-along-chain" title={title('fia-along-chain')}>
          <AlongTheChain reg={reg} pkg={pkg} onOpenLink={setChainLinkId} />
          {chainLink && (
            <div className="mt-6">
              <LinkCard key={chainLink.id} reg={reg} link={chainLink} onClose={() => setChainLinkId(null)} />
            </div>
          )}
        </Section>

        <Section id="fia-peers" title={title('fia-peers')}>
          <PeerBand metrics={peers} ticker={meta.ticker} subIndustryName={subName} publishedCount={publishedPeers(reg, pkg).length} />
        </Section>

        <Section id="fia-why" title={title('fia-why')}>
          <ConditionPanel pkg={pkg} subIndustry={sub} />
        </Section>

        <Section id="fia-workpaper" title={title('fia-workpaper')}>
          <WorkpaperRecord pkg={pkg} />
        </Section>
      </div>
    </PageLayout>
  );
}
