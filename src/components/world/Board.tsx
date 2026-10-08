/**
 * The full board (PRD §7.7, Appendix B; mega prompt §9.4): an HTML panel in
 * the frame, typeset for reading in the site's reading typeface with tabular
 * numerals, with its own route. Eight sections in the PRD's order; every
 * figure is a button that opens the source trace through the model page's
 * inspector; Download .xlsx and Open full model reuse the model page's
 * components. A company without a published model opens with "No model
 * yet" and no figure anywhere.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inspector } from '@/components/finance-in-action/viewer/model/Inspector';
import { DownloadButton } from '@/components/finance-in-action/viewer/model/DownloadButton';
import { DriverRow } from '@/components/finance-in-action/viewer/model/DriverRow';
import { DriverTree } from '@/components/finance-in-action/viewer/model/DriverTree';
import { UnitEconomics } from '@/components/finance-in-action/viewer/model/UnitEconomics';
import { UELineDetail } from '@/components/finance-in-action/viewer/model/UELineDetail';
import { ConditionPanel } from '@/components/finance-in-action/viewer/model/ConditionPanel';
import { WorkpaperRecord } from '@/components/finance-in-action/viewer/model/WorkpaperRecord';
import { SyntheticBanner } from '@/components/finance-in-action/viewer/SyntheticBanner';
import { useModelView } from '@/components/finance-in-action/viewer/model/useModelView';
import { decoration } from '@/lib/finance-in-action/view/decorate';
import { latestReported } from '@/lib/finance-in-action/model/periods';
import { unitEconomicsAt, noVolumeAnywhere } from '@/lib/finance-in-action/unitEconomics';
import { formatForRow, formatNumber, decimalsFor } from '@/lib/finance-in-action/format';
import { modelPath } from '@/lib/finance-in-action/routes';
import { isMeasured } from '@/lib/finance-in-action/contract/links';
import { REGISTRY, subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import { linksFrom, linksTo } from '@/lib/world/registry/links.generated';
import { STATUS_VOCAB, SECTION_ORDER, NO_MODEL, TREE_UNAVAILABLE } from '@/lib/world/constants';
import { COMPARATOR_HEADING, worldPeerBand, type PeerResult } from '@/lib/world/peerBand';
import type { Piece } from '@/lib/world/thinkTank';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import type { WorldData } from './useWorldData';


export default function Board({ ticker, data, pieces, onClose, bindings, onStation }: { ticker: string; data: WorldData; pieces: readonly Piece[]; onClose: () => void; bindings?: readonly { lineId: string; label: string; stationId: string | null }[]; onStation?: (lineId: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = ticker.toUpperCase();
  const sub = REGISTRY.subIndustries.find((s) => s.companies.some((c) => c.ticker === t)) ?? null;
  const company = sub?.companies.find((c) => c.ticker === t);
  const pkg = data.packageFor(t);
  useEffect(() => { ref.current?.querySelector<HTMLElement>('h3')?.focus(); }, [ticker]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  const status = data.state === 'outage' ? STATUS_VOCAB.unavailable : pkg ? STATUS_VOCAB.published : STATUS_VOCAB.none;
  const related = pieces.filter((p) => p.tags.includes(t) || (sub && (p.tags.includes(sub.code) || p.tags.includes(sub.chainNodeId))));

  return (
    <div className="world-board" role="dialog" aria-label={`Board: ${t}`} ref={ref}>
      <div className="world-board__head">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Board</p>
          <h3 tabIndex={-1} className="text-2xl">{pkg?.meta.name ?? company?.name ?? t}</h3>
          <p className="text-sm text-muted-foreground">{t}{sub ? ` · ${sub.nameEn} (${sub.code})` : ''}{pkg ? ` · latest quarter ${pkg.periods.find((p) => p.id === pkg.meta.asOf.latestQuarter)?.label ?? pkg.meta.asOf.latestQuarter}` : ''}</p>
          <p className="text-sm"><span aria-hidden="true">{status.glyph}</span> {status.word}</p>
        </div>
        <div className="flex gap-2 items-start">
          {pkg && <Link className="world-btn" to={modelPath(t)}>Open full model</Link>}
          <button type="button" className="world-card__close" aria-label="Close the board" onClick={onClose}>×</button>
        </div>
      </div>
      {pkg?.meta.provenance === 'synthetic' && <SyntheticBanner text="SYNTHETIC package: a mock, never ships. No company and no filing stands behind these figures; a production build carries no synthetic package (scripts/assert-no-synthetic.mjs)." />}
      {pkg ? <Published pkg={pkg} data={data} related={related} bindings={bindings} onStation={onStation} /> : (
        <section aria-label="No model">
          <h4>{SECTION_ORDER[5]}</h4>
          <p>{data.state === 'outage' ? 'The published models could not be read just now, so nothing can be shown; try again later.' : `${NO_MODEL}. When a model of ${t} is published, this board will show its drivers, unit economics and peer position, each figure with its source.`}</p>
          {sub && <Chain sub={sub} data={data} />}
          <Related related={related} />
        </section>
      )}
    </div>
  );
}

function Published({ pkg, data, related, bindings, onStation }: { pkg: ModelPackage; data: WorldData; related: Piece[]; bindings?: readonly { lineId: string; label: string; stationId: string | null }[]; onStation?: (lineId: string | null) => void }) {
  const reg = data.reg!;
  const view = useModelView(pkg, false);
  const [uePeriod, setUePeriod] = useState(() => latestReported(pkg, pkg.unitEconomics.periods) ?? pkg.meta.asOf.fullStatementsTo);
  const ue = useMemo(() => unitEconomicsAt(view.wb, view.values, uePeriod), [view.wb, view.values, uePeriod]);
  const noVolume = useMemo(() => noVolumeAnywhere(view.wb, view.values), [view.wb, view.values]);
  const decorate = (key: string) => decoration({ mark: null, change: undefined, edited: false, flashing: false, flashToken: 0, row: view.rowOf(key) });
  const sub = subIndustryByCode(pkg.meta.subIndustry);
  const fiaSub = reg.subIndustry(pkg.meta.subIndustry);
  const treePeriod = pkg.meta.asOf.fullStatementsTo;
  const peers = worldPeerBand(pkg, reg.packages);
  const assumptions = pkg.sheets.flatMap((s) => s.rows.flatMap((r) => r.cells.map((c, i) => ({ c, i, r, s })).filter(({ c }) => c.kind === 'assumption')));
  const missing = pkg.sheets.flatMap((s) => s.rows.filter((r) => r.cells.some((c) => c.kind === 'missing')).map((r) => r.label));
  const unsplit = pkg.unitEconomics.lines.filter((l) => l.role === 'unsplit');
  const notPlaced = (bindings ?? []).filter((b) => b.stationId === null);
  const figure = (key: string, text: string) => <button type="button" className="world-board__figure" onClick={() => view.select(key)} aria-label={`${text}: open the source trace`}>{text}</button>;
  const sectionTitle = (i: number) => <h4>{SECTION_ORDER[i]}</h4>;

  return (
    <>
      <p className="flex gap-2 py-2"><DownloadButton view={view} /></p>
      <section aria-label={SECTION_ORDER[1]}>{sectionTitle(1)}
        <DriverRow view={view} periodId={treePeriod} feeds={new Map()} reg={reg} decorate={decorate} />
        {pkg.driverTree.nodes.length ? <DriverTree view={view} periodId={treePeriod} decorate={decorate} /> : <p className="text-sm text-muted-foreground">{TREE_UNAVAILABLE}</p>}
        {bindings?.some((b) => b.stationId) && (
          <ul className="flex flex-wrap gap-2 text-sm" aria-label="Drivers in the drawing">
            {bindings.filter((b) => b.stationId).map((b) => <li key={b.lineId}><button type="button" className="world-btn" onMouseEnter={() => onStation?.(b.lineId)} onMouseLeave={() => onStation?.(null)} onFocus={() => onStation?.(b.lineId)} onBlur={() => onStation?.(null)} onClick={() => view.select(b.lineId)} aria-label={`${b.label}: lights its station in the drawing`}>{b.label} · {b.stationId}</button></li>)}
          </ul>
        )}
      </section>
      <section aria-label={SECTION_ORDER[2]}>{sectionTitle(2)}
        <UnitEconomics view={view} reg={reg} ue={ue} periodId={uePeriod} onPeriod={setUePeriod} onlyMessage={noVolume} decorate={decorate} barNote={() => null} />
      </section>
      <section aria-label={SECTION_ORDER[3]}>{sectionTitle(3)}<Peers results={peers} /></section>
      <section aria-label={SECTION_ORDER[4]}>{sectionTitle(4)}
        <p className="text-sm">Key assumptions: {assumptions.length ? <ul>{assumptions.slice(0, 12).map(({ c, i, r, s }) => <li key={`${s.id}!${r.id}:${i}`}>{r.label}, {pkg.periods[i]?.label}: {figure(`${s.id}!${r.id}:${pkg.periods[i]?.id ?? i}`, formatForRow(c.value, r))}{c.note ? ` — ${c.note}` : ''}</li>)}</ul> : 'none recorded.'}</p>
        <p className="text-sm">What changed this quarter: the package does not carry a change record; see the workpaper.</p>
        <WorkpaperRecord pkg={pkg} />
      </section>
      <section aria-label={SECTION_ORDER[5]}>{sectionTitle(5)}
        <ul className="text-sm">
          {unsplit.map((l) => <li key={l.id} className="hatched px-1">Unsplit remainder of cost of revenue, shown hatched and never allocated{l.contains?.length ? `: contains ${l.contains.join(', ')}` : ''}.</li>)}
          {noVolume && <li>Not available: volumes not disclosed.</li>}
          {missing.length ? <li>Not disclosed in the filings: {[...new Set(missing)].join('; ')}.</li> : null}
          {notPlaced.length ? <li>Not placed in the drawing (no station matches the physical unit): {notPlaced.map((b) => b.label).join('; ')}.</li> : null}
          {!unsplit.length && !noVolume && !missing.length && !notPlaced.length && <li>Nothing the filings withhold is recorded for this model.</li>}
        </ul>
      </section>
      <section aria-label={SECTION_ORDER[6]}>{sectionTitle(6)}
        {sub && <Chain sub={sub} data={data} />}
        <ConditionPanel pkg={pkg} subIndustry={fiaSub} />
      </section>
      <section aria-label={SECTION_ORDER[7]}>{sectionTitle(7)}<Related related={related} /></section>
      <Inspector view={view}><UELineDetail view={view} ue={ue} /></Inspector>
    </>
  );
}

function Peers({ results }: { results: PeerResult[] }) {
  if (!results.length) return <p className="text-sm text-muted-foreground">No peer metric in this package.</p>;
  return (
    <ul className="grid gap-2 text-sm">
      {results.map((r) => (
        <li key={`${r.metric}-${r.period}`}>
          <strong>{r.metric}</strong> ({r.unit}, {r.period}){r.kind === 'comparator' && <span> · {COMPARATOR_HEADING}</span>}
          {r.kind === 'none' && <span className="text-muted-foreground"> · {r.reason === 'no-peer' ? 'no published peer for this period' : 'no value in the package'}</span>}
          {r.kind === 'comparator' && <Scale points={[r.self, r.other]} min={Math.min(r.self.value, r.other.value)} max={Math.max(r.self.value, r.other.value)} />}
          {r.kind === 'band' && <Scale points={r.points} min={r.min} max={r.max} median={r.median} />}
        </li>
      ))}
    </ul>
  );
}
function Scale({ points, min, max, median }: { points: { ticker: string; value: number; self: boolean }[]; min: number; max: number; median?: number }) {
  const span = max - min || 1, pos = (v: number) => `${((v - min) / span) * 100}%`;
  return (
    <div className="relative mt-1 h-8 border-b border-border" role="img" aria-label={points.map((p) => `${p.ticker} ${formatNumber(p.value, decimalsFor(p.value))}`).join(', ') + (median !== undefined ? `, median ${formatNumber(median, decimalsFor(median))}` : '')}>
      {median !== undefined && <span className="absolute top-0 h-full border-l border-dashed border-muted-foreground" style={{ left: pos(median) }} />}
      {median !== undefined && <span className="absolute inset-y-2 bg-secondary" style={{ left: pos(min), right: `${100 - ((max - min) / span) * 100}%` }} />}
      {points.map((p) => <span key={p.ticker} className={p.self ? 'absolute top-1 h-6 w-2 bg-accent' : 'absolute top-2 h-4 w-2 border border-foreground'} style={{ left: pos(p.value) }} title={`${p.ticker}: ${formatNumber(p.value, decimalsFor(p.value))}`}><span className="sr-only">{p.ticker} {formatNumber(p.value, decimalsFor(p.value))}</span></span>)}
    </div>
  );
}
function Chain({ sub, data }: { sub: NonNullable<ReturnType<typeof subIndustryByCode>>; data: WorldData }) {
  const up = linksTo(sub.code), down = linksFrom(sub.code);
  const cls = (from: string, to: string) => data.flows.find((f) => f.from === from && f.to === to)?.cls ?? 'expected';
  const fia = (from: string, to: string) => data.reg?.links.find((l) => l.from === from && l.to === to);
  const row = (from: string, to: string, other: string) => { const o = subIndustryByCode(other); const c = cls(from, to), l = fia(from, to); const measured = !!l && isMeasured(l);
    return <li key={`${from}-${to}`}>{o?.nameEn ?? other} <span className="text-muted-foreground">{measured ? STATUS_VOCAB.measured.glyph : STATUS_VOCAB.expected.glyph} {measured ? STATUS_VOCAB.measured.word : STATUS_VOCAB.expected.word}{c !== 'expected' ? ` (${c})` : ''}</span>{l && measured ? <span className="text-muted-foreground"> · cost share {formatNumber((l.costShare!.value) * 100, 1)}% · demand share {formatNumber(l.demandShare!.value * 100, 1)}%{l.intensity ? ` · ${formatNumber(l.intensity.value, decimalsFor(l.intensity.value))} ${l.intensity.unit}` : ''}</span> : null}</li>; };
  return (
    <div className="text-sm grid gap-2">
      <div>Upstream: {up.length ? <ul>{up.map((l) => row(l.from, l.to, l.from))}</ul> : 'no link recorded.'}</div>
      <div>Downstream: {down.length ? <ul>{down.map((l) => row(l.from, l.to, l.to))}</ul> : 'no link recorded.'}</div>
    </div>
  );
}
function Related({ related }: { related: Piece[] }) {
  if (!related.length) return <p className="text-sm text-muted-foreground">Nothing published about this company or its sub-industry yet.</p>;
  return <ul className="text-sm">{related.map((p) => <li key={p.slug}><Link to={`/essays/${p.slug}`}>{p.title}</Link> <span className="text-muted-foreground">{STATUS_VOCAB[p.kind].glyph} {STATUS_VOCAB[p.kind].word}</span></li>)}</ul>;
}
