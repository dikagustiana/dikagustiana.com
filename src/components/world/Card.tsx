/**
 * One card at a time (PRD §7.11): the object's kind, name and status in the
 * title row, rows in the body, actions in the footer. The engine gives the
 * basic rows; the card adds what the registry, the chain data and the
 * published data say about the same object, by kind. Right dock on a wide
 * screen, bottom sheet on a phone (world.css).
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BAND_BY_ID, JOINT_BY_ID, STATUS, BASIS, type JointId, type LensId, type ShiftId, essaysFor } from '@/data/industryChain';
import { subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import { linksFrom, linksTo } from '@/lib/world/registry/links.generated';
import { INDEX_PATH, subIndustryPath } from '@/lib/finance-in-action/routes';
import { ENERGY_DRILLDOWN, STATUS_VOCAB, boardPath } from '@/lib/world/constants';
import { conditionHref, conditionOf, conditionShort } from '@/lib/finance-in-action/conditions';
import { labelOf, marksFor } from '@/lib/world/presentation';
import type { Selection } from '@/world/engine/types';
import type { FlowWeight } from '@/world/data/types';
import type { Piece } from '@/lib/world/thinkTank';

export interface CardProps {
  selection: Selection | null;
  /** The mark whose condition card is open, if the selection is a mark. */
  mark?: { shift: ShiftId; targetId: string } | null;
  lens: LensId;
  flows: readonly FlowWeight[];
  /** Measured link weights by `from>to`, from the data layer through the shell; the engine never sees them. */
  weights?: ReadonlyMap<string, string>;
  /** Whether the chain highlight shows the whole chain or one level (PRD §7.9). */
  fullChain?: boolean;
  pieces: readonly Piece[];
  onClose: () => void;
  onAction: (a: { type: 'open-board'; ticker: string } | { type: 'open-index'; code: string } | { type: 'open-thinktank' } | { type: 'select'; id: string } | { type: 'open-piece'; slug: string } | { type: 'chain-depth'; full: boolean }) => void;
}

/** The energy drill-down, v0 (discovery item D): the band's three lines and the two PLN conditions, by number. */
function EnergyDrillDown() {
  const band = BAND_BY_ID[ENERGY_DRILLDOWN.bandId];
  if (!band) return null;
  return (
    <div className="world-card__section" data-drilldown="energy">
      <h4>{ENERGY_DRILLDOWN.label}</h4>
      <ul>{band.lines.map((l) => <li key={l}>{l}</li>)}</ul>
      <ul>{ENERGY_DRILLDOWN.conditions.map((n) => { const c = conditionOf(n); return <li key={n}><Link to={conditionHref(n)}>{conditionShort(n)}{c ? ` · ${c.title}` : ''}</Link>{c?.caseCompany ? ` (${c.caseCompany})` : ''}</li>; })}</ul>
    </div>
  );
}

const stateOf = (status: string): keyof typeof STATUS_VOCAB | undefined => (Object.keys(STATUS_VOCAB) as (keyof typeof STATUS_VOCAB)[]).find((k) => STATUS_VOCAB[k].word === status);

export function Card({ selection, mark, lens, flows, weights, fullChain = false, pieces, onClose, onAction }: CardProps) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>('h3')?.focus(); }, [selection?.id, mark?.targetId]);
  if (!selection && !mark) return null;

  if (mark) {
    const placed = marksFor(mark.shift).find((m) => m.targetId === mark.targetId);
    const c = placed?.target.condition;
    if (!placed || !c) return null;
    const s = STATUS[c.status], basis = BASIS[c.basis];
    const essays = essaysFor(mark.targetId, mark.shift);
    return (
      <aside className="world-card" role="region" aria-label="Condition" ref={ref}>
        <div className="world-card__kind"><span>Condition mark {placed.n}</span><button type="button" className="world-card__close" aria-label="Close the card" onClick={onClose}>×</button></div>
        <h3 className="world-card__title" tabIndex={-1}>{placed.label}</h3>
        <span className="world-card__status" data-state={c.status}><span aria-hidden="true">{s.form === 'filled' ? '●' : s.form === 'open' ? '○' : '◌'}</span>{s.label}</span>
        <p>{s.card}</p>
        <div className="world-card__section"><h4>Basis</h4><p>{basis.label}: {basis.card}{c.case ? ` ${c.case}` : ''}</p></div>
        {([['Now', c.now], ['What holds it', c.holds], ['What the lever does here', c.action], ['Who finances the move', c.funds]] as const).map(([h, note]) => note[lens].trim() ? <div className="world-card__section" key={h}><h4>{h}</h4><p>{note[lens]}</p></div> : null)}
        <div className="world-card__section"><h4>Evidence</h4>
          {essays.length ? <ul>{essays.map((e) => <li key={e.slug}><Link to={`/essays/${e.slug}`}>{e.title}</Link>{e.evidence ? ' (the evidence behind this reading)' : ''} — {e.reads}</li>)}</ul> : <p>No essay carries this reading yet.</p>}
        </div>
        {mark.targetId === ENERGY_DRILLDOWN.bandId && <EnergyDrillDown />}
      </aside>
    );
  }

  const sel = selection!;
  const info = sel.info;
  const state = stateOf(info.status);
  const rows = [...info.rows];
  const sections: JSX.Element[] = [];
  const foot: JSX.Element[] = [];

  if (sel.kind === 'building') {
    const s = subIndustryByCode(sel.id);
    if (s) {
      const flowOf = (from: string, to: string) => flows.find((f) => f.from === from && f.to === to)?.cls ?? 'expected';
      const up = linksTo(s.code), down = linksFrom(s.code);
      const line = (code: string, from: string, to: string) => { const cls = flowOf(from, to); const o = subIndustryByCode(code); const v = cls === 'expected' ? STATUS_VOCAB.expected : STATUS_VOCAB.measured; const w = cls === 'expected' ? null : weights?.get(`${from}>${to}`) ?? null; return <li key={code}><button type="button" className="underline" onClick={() => onAction({ type: 'select', id: code })}>{o?.nameEn ?? code}</button> <span className="text-muted-foreground">{v.glyph} {v.word}{w ? ` · ${w}` : ''}</span></li>; };
      sections.push(<div className="world-card__section" key="up"><h4>Upstream</h4>{up.length ? <ul>{up.map((l) => line(l.from, l.from, l.to))}</ul> : <p>No link recorded.</p>}</div>);
      sections.push(<div className="world-card__section" key="down"><h4>Downstream</h4>{down.length ? <ul>{down.map((l) => line(l.to, l.from, l.to))}</ul> : <p>No link recorded.</p>}</div>);
      if (up.length || down.length) sections.push(<p className="world-card__section" key="chain"><button type="button" className="world-btn" aria-pressed={fullChain} onClick={() => onAction({ type: 'chain-depth', full: !fullChain })}>{fullChain ? 'Show one level' : 'Show full chain'}</button> <span className="text-muted-foreground">{fullChain ? 'The whole chain is lit; the rest is dimmed.' : 'One level is lit; the rest is dimmed.'}</span></p>);
      const related = pieces.filter((p) => p.tags.includes(s.code) || p.tags.includes(s.chainNodeId) || s.companies.some((c) => p.tags.includes(c.ticker)));
      sections.push(<div className="world-card__section" key="analyses"><h4>Related analyses</h4>{related.length ? <ul>{related.map((p) => <li key={p.slug}><button type="button" className="underline" onClick={() => onAction({ type: 'open-piece', slug: p.slug })}>{p.title}</button> <span className="text-muted-foreground">{STATUS_VOCAB[p.kind].glyph} {STATUS_VOCAB[p.kind].word}</span></li>)}</ul> : <p>Nothing published about this sub-industry yet.</p>}</div>);
      if (state === 'none') sections.push(<p className="world-card__section" key="empty">A model here would show the unit economics of a listed company in this sub-industry, its main cost drivers and where it sits against its peer. None is published yet.</p>);
      foot.push(<Link key="index" className="world-btn" to={subIndustryPath(s.code)}>Open in Finance in Action index</Link>);
      for (const c of s.companies) foot.push(<button key={c.ticker} type="button" className="world-btn" onClick={() => onAction({ type: 'select', id: c.ticker })}>{c.ticker}</button>);
    }
  } else if (sel.kind === 'company') {
    const ticker = rows.find(([k]) => k === 'Ticker')?.[1];
    if (ticker) foot.push(<Link key="board" className="world-btn" to={boardPath(ticker)} onClick={(e) => { e.preventDefault(); onAction({ type: 'open-board', ticker }); }}>Open board</Link>);
    for (const [label, fn] of info.actions ?? []) if (label !== 'Open board') foot.push(<button key={label} type="button" className="world-btn" onClick={fn}>{label}</button>);
    foot.push(<button key="chain" type="button" className="world-btn" aria-pressed={fullChain} onClick={() => onAction({ type: 'chain-depth', full: !fullChain })}>{fullChain ? 'Show one level' : 'Show full chain'}</button>);
  } else if (sel.kind === 'gate' || sel.kind === 'signpost') {
    const jointId = rows.find(([k]) => k === 'Joint')?.[1] as JointId | undefined;
    const j = jointId ? JOINT_BY_ID[jointId] : undefined;
    if (j) {
      sections.push(<div className="world-card__section" key="read"><h4>{lens === 'economy' ? 'Read as an economy' : 'Read as finance'}</h4><p><strong>{j.read[lens].chip}.</strong> {j.read[lens].note}</p></div>);
      sections.push(<div className="world-card__section" key="joint"><h4>The joint itself</h4><p>{j.note}</p><ul>{j.lines.map((l) => <li key={l}>{l}</li>)}</ul></div>);
      if (sel.kind === 'gate') sections.push(<p className="world-card__section" key="diamond">{j.margin === 'conversion' ? 'A filled diamond on the schematic: a stage sells here.' : j.margin === 'node-spread' ? 'An open diamond on the schematic: a node sells here, taking title without transforming the goods.' : 'A square on the schematic: a fee is paid here.'}</p>);
    }
  } else if (sel.kind === 'layer') {
    const band = BAND_BY_ID[sel.id];
    if (band) sections.push(<div className="world-card__section" key="band"><p>{band.means}</p><p>{band.read[lens]}</p><ul>{band.lines.map((l) => <li key={l}>{l}</li>)}</ul></div>);
    if (sel.id === ENERGY_DRILLDOWN.bandId) sections.push(<EnergyDrillDown key="drill" />);
  } else if (sel.kind === 'thinktank') {
    foot.push(<button key="tt" type="button" className="world-btn" onClick={() => onAction({ type: 'open-thinktank' })}>Open the think tank</button>);
  } else {
    for (const [label, fn] of info.actions ?? []) foot.push(<button key={label} type="button" className="world-btn" onClick={fn}>{label}</button>);
  }
  if (sel.kind === 'building' && info.actions) for (const [label, fn] of info.actions) if (!label.startsWith('Open in')) foot.push(<button key={label} type="button" className="world-btn" onClick={fn}>{label}</button>);
  void INDEX_PATH; void labelOf;

  return (
    <aside className="world-card" role="region" aria-label="Selection details" ref={ref}>
      <div className="world-card__kind"><span>{info.kind}</span><button type="button" className="world-card__close" aria-label="Close the card" onClick={onClose}>×</button></div>
      <h3 className="world-card__title" tabIndex={-1}>{info.title}</h3>
      {info.status && <span className="world-card__status" data-state={state ?? ''}>{state ? <span aria-hidden="true">{STATUS_VOCAB[state].glyph}</span> : null}{info.status}</span>}
      <dl>{rows.map(([k, v]) => <div key={k} className="contents"><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {sections}
      {foot.length ? <div className="world-card__foot">{foot}</div> : null}
    </aside>
  );
}
