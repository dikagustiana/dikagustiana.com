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
import { SUB_INDUSTRIES, subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import { linksFrom, linksTo } from '@/lib/world/registry/links.generated';
import { INDEX_PATH, modelPath, subIndustryPath } from '@/lib/finance-in-action/routes';
import { ENERGY_DRILLDOWN, GOODS_WORD, STATUS_VOCAB, boardPath } from '@/lib/world/constants';
import type { Goods, Story } from '@/lib/world/registry/types';
import { conditionHref, conditionOf, conditionShort } from '@/lib/finance-in-action/conditions';
import { labelOf, marksFor } from '@/lib/world/presentation';
import type { LitHop, Selection } from '@/world/engine/types';
import type { FlowWeight } from '@/world/data/types';
import type { Piece } from '@/lib/world/thinkTank';

export interface CardProps {
  selection: Selection | null;
  /** The mark whose condition card is open, if the selection is a mark. */
  mark?: { shift: ShiftId; targetId: string } | null;
  /** The lit story, when nothing else is selected (PRD v2 §3.11): its title, standfirst and hops. */
  story?: { story: Story; hops: readonly LitHop[] } | null;
  lens: LensId;
  flows: readonly FlowWeight[];
  /** Measured link weights by `from>to`, from the data layer through the shell; the engine never sees them. */
  weights?: ReadonlyMap<string, string>;
  /** Whether the chain highlight shows the whole chain or one level (PRD §7.9). */
  fullChain?: boolean;
  pieces: readonly Piece[];
  onClose: () => void;
  onAction: (a: { type: 'open-board'; ticker: string } | { type: 'open-index'; code: string } | { type: 'open-thinktank' } | { type: 'select'; id: string } | { type: 'open-piece'; slug: string } | { type: 'chain-depth'; full: boolean } | { type: 'story'; id: string | null }) => void;
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

/** A company in the registry by its ticker, with its sub-industry. */
const companyByTicker = (ticker: string) => { for (const sub of SUB_INDUSTRIES) { const company = sub.companies.find((c) => c.ticker === ticker); if (company) return { sub, company }; } return null; };

const stateOf = (status: string): keyof typeof STATUS_VOCAB | undefined => (Object.keys(STATUS_VOCAB) as (keyof typeof STATUS_VOCAB)[]).find((k) => STATUS_VOCAB[k].word === status);

export function Card({ selection, mark, story, lens, flows, weights, fullChain = false, pieces, onClose, onAction }: CardProps) {
  const ref = useRef<HTMLElement>(null);
  // The card's title takes focus when it opens, so a screen reader announces it; unless the canvas has focus (the
  // keyboard is cycling with [ and ]), in which case the region's live announcement carries the title and focus stays.
  useEffect(() => { if (document.activeElement?.classList.contains('world-canvas')) return; ref.current?.querySelector<HTMLElement>('h3')?.focus(); }, [selection?.id, mark?.targetId, story?.story.id]);
  if (!selection && !mark && story) {
    // the story's card (PRD v2 §3.11): its title, its standfirst, its hops; a measured hop says so, the rest are expected
    const { story: s, hops } = story;
    const name = (code: string) => subIndustryByCode(code)?.nameEn ?? code;
    return (
      <aside className="world-card" role="region" aria-label="Story" aria-live="polite" ref={ref} data-story={s.id}>
        <div className="world-card__kind"><span>Story</span><button type="button" className="world-card__close" aria-label="Clear the story" onClick={() => onAction({ type: 'story', id: null })}>×</button></div>
        <h3 className="world-card__title" tabIndex={-1}>{s.title}</h3>
        <p>{s.standfirst}</p>
        <div className="world-card__section"><h4>{s.direction === 'upstream' ? 'Hops, against the goods' : 'Hops'}</h4>
          <ol>{hops.map((h) => { const v = h.measured ? STATUS_VOCAB.measured : STATUS_VOCAB.expected; return <li key={`${h.from}>${h.to}`}><button type="button" className="underline" onClick={() => onAction({ type: 'select', id: h.from })}>{name(h.from)}</button> → <button type="button" className="underline" onClick={() => onAction({ type: 'select', id: h.to })}>{name(h.to)}</button> <span className="text-muted-foreground"><span aria-hidden="true">{v.glyph}</span>{h.measured ? ` ${v.word}` : ''} · {GOODS_WORD[h.goods]}</span></li>; })}</ol>
        </div>
        {hops.some((h) => !h.measured) && <p className="world-card__section text-muted-foreground" data-chain-note=""><span aria-hidden="true">{STATUS_VOCAB.expected.glyph}</span> {STATUS_VOCAB.expected.word}: the hops marked so are links of the registry; a published model marks a link <span aria-hidden="true">{STATUS_VOCAB.measured.glyph}</span> {STATUS_VOCAB.measured.word}.</p>}
        <div className="world-card__foot"><button type="button" className="world-btn" onClick={() => onAction({ type: 'story', id: null })}>Clear</button></div>
      </aside>
    );
  }
  if (!selection && !mark) return null;

  if (mark) {
    const placed = marksFor(mark.shift).find((m) => m.targetId === mark.targetId);
    const c = placed?.target.condition;
    if (!placed || !c) return null;
    const s = STATUS[c.status], basis = BASIS[c.basis];
    const essays = essaysFor(mark.targetId, mark.shift);
    return (
      <aside className="world-card" role="region" aria-label="Condition" aria-live="polite" ref={ref}>
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
  const dlExtra: JSX.Element[] = [];

  // the chain as one list per direction: every link a button to the other end, its glyph, its goods class, a measured
  // link's weight; the words "expected, not measured" said once for the whole card (PRD v2 §3.9, §3.11)
  const chainLists = (code: string, onlyUp = 'Upstream', onlyDown = 'Downstream') => {
    const flowOf = (from: string, to: string) => flows.find((f) => f.from === from && f.to === to)?.cls ?? 'expected';
    const up = linksTo(code), down = linksFrom(code);
    const line = (other: string, from: string, to: string, goods: Goods, note?: string) => {
      const cls = flowOf(from, to), o = subIndustryByCode(other), v = cls === 'expected' ? STATUS_VOCAB.expected : STATUS_VOCAB.measured, w = cls === 'expected' ? null : weights?.get(`${from}>${to}`) ?? null;
      return <li key={`${from}>${to}`}><button type="button" className="underline" onClick={() => onAction({ type: 'select', id: other })}>{o?.nameEn ?? other}</button> <span className="text-muted-foreground"><span aria-hidden="true">{v.glyph}</span>{cls === 'expected' ? null : ` ${v.word}`}{w ? ` · ${w}` : ''} · <span data-goods={goods}>{GOODS_WORD[goods]}</span>{note ? ` · ${note}` : ''}</span></li>;
    };
    const anyExpected = [...up, ...down].some((l) => flowOf(l.from, l.to) === 'expected');
    return [
      <div className="world-card__section" key="up"><h4>{onlyUp}</h4>{up.length ? <ul>{up.map((l) => line(l.from, l.from, l.to, l.goods, l.note))}</ul> : <p>No link recorded.</p>}</div>,
      <div className="world-card__section" key="down"><h4>{onlyDown}</h4>{down.length ? <ul>{down.map((l) => line(l.to, l.from, l.to, l.goods, l.note))}</ul> : <p>No link recorded.</p>}</div>,
      ...(anyExpected ? [<p className="world-card__section text-muted-foreground" key="expected" data-chain-note=""><span aria-hidden="true">{STATUS_VOCAB.expected.glyph}</span> {STATUS_VOCAB.expected.word}: the links marked so come from the registry; a published model marks a link <span aria-hidden="true">{STATUS_VOCAB.measured.glyph}</span> {STATUS_VOCAB.measured.word}.</p>] : []),
    ];
  };
  const relatedTo = (tags: readonly string[]) => pieces.filter((p) => tags.some((t) => p.tags.includes(t)));
  const relatedSection = (tags: readonly string[], what: string) => { const related = relatedTo(tags); return <div className="world-card__section" key="analyses"><h4>Related analyses</h4>{related.length ? <ul>{related.map((p) => <li key={p.slug}><button type="button" className="underline" onClick={() => onAction({ type: 'open-piece', slug: p.slug })}>{p.title}</button> <span className="text-muted-foreground">{STATUS_VOCAB[p.kind].glyph} {STATUS_VOCAB[p.kind].word}</span></li>)}</ul> : <p>Nothing published about {what} yet.</p>}</div>; };
  const chainToggle = <p className="world-card__section" key="chain"><button type="button" className="world-btn" aria-pressed={fullChain} onClick={() => onAction({ type: 'chain-depth', full: !fullChain })}>{fullChain ? 'Show one level' : 'Show full chain'}</button> <span className="text-muted-foreground">{fullChain ? 'The whole chain is lit; the rest is dimmed.' : 'One level is lit; the rest is dimmed.'}</span></p>;

  if (sel.kind === 'building') {
    const s = subIndustryByCode(sel.id);
    if (s) {
      // the sub-industry's companies, each a button with its status (PRD v2 §3.11)
      sections.push(<div className="world-card__section" key="companies"><h4>Companies</h4>{s.companies.length ? <ul>{s.companies.map((c) => <li key={c.ticker}><button type="button" className="underline" onClick={() => onAction({ type: 'select', id: c.ticker })}>{c.ticker} · {c.name}</button> <span className="text-muted-foreground">{c.status === 'confirmed' ? 'confirmed' : 'proposed example'}</span></li>)}</ul> : <p>No company proposed yet.</p>}</div>);
      sections.push(...chainLists(s.code));
      if (linksTo(s.code).length || linksFrom(s.code).length) sections.push(chainToggle);
      sections.push(relatedSection([s.code, s.chainNodeId, ...s.companies.map((c) => c.ticker)], 'this sub-industry'));
      if (state === 'none') sections.push(<p className="world-card__section" key="empty">A model here would show the unit economics of a listed company in this sub-industry, its main cost drivers and where it sits against its peer. None is published yet.</p>);
      foot.push(<Link key="index" className="world-btn" to={subIndustryPath(s.code)}>Open in Finance in Action index</Link>);
    }
  } else if (sel.kind === 'company') {
    const ticker = rows.find(([k]) => k === 'Ticker')?.[1];
    const found = ticker ? companyByTicker(ticker) : null;
    if (found) {
      // the company card works without a model (PRD v2 §3.11, D-V2-12): who it is, what it does, its place in the chain
      const { sub: s, company: c } = found;
      rows.length = 0;
      rows.push(['Ticker', c.ticker]);
      dlExtra.push(<div key="sub" className="contents"><dt>Sub-industry</dt><dd><button type="button" className="underline" onClick={() => onAction({ type: 'select', id: s.code })}>{s.nameEn}</button></dd></div>);
      dlExtra.push(<div key="does" className="contents"><dt>What it does</dt><dd>{c.does ?? 'Not yet written.'}{c.doesSource ? <small className="block text-muted-foreground">Source: {c.doesSource}</small> : null}</dd></div>);
      dlExtra.push(<div key="listing" className="contents"><dt>Listing</dt><dd>{c.status === 'confirmed' ? 'Confirmed by the owner' : 'Proposed example, pending the owner’s review'}{c.status !== 'confirmed' && c.reason ? <small className="block text-muted-foreground">{c.reason}</small> : null}</dd></div>);
      sections.push(...chainLists(s.code, 'Suppliers', 'Customers'));
      sections.push(chainToggle);
      if (state !== 'published') sections.push(<div className="world-card__section" key="would"><h4>What a model would show</h4><p>The unit economics of {c.name}: what it sells, what each sale costs it and which few costs drive that, and where it stands against its peer in {s.nameEn}. None is published yet.</p></div>);
      sections.push(relatedSection([c.ticker, s.code], 'this company'));
    }
    if (ticker) foot.push(<Link key="board" className="world-btn" to={boardPath(ticker)} onClick={(e) => { e.preventDefault(); onAction({ type: 'open-board', ticker }); }}>Open board</Link>);
    for (const [label, fn] of info.actions ?? []) if (label !== 'Open board') foot.push(<button key={label} type="button" className="world-btn" onClick={fn}>{label}</button>);
    if (ticker && found) foot.push(<Link key="fia" className="world-btn" to={modelPath(ticker)}>Open in Finance in Action</Link>);
    if (!found) foot.push(<button key="chain" type="button" className="world-btn" aria-pressed={fullChain} onClick={() => onAction({ type: 'chain-depth', full: !fullChain })}>{fullChain ? 'Show one level' : 'Show full chain'}</button>);
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
    <aside className="world-card" role="region" aria-label="Selection details" aria-live="polite" ref={ref}>
      <div className="world-card__kind"><span>{info.kind}</span><button type="button" className="world-card__close" aria-label="Close the card" onClick={onClose}>×</button></div>
      <h3 className="world-card__title" tabIndex={-1}>{info.title}</h3>
      {info.status && <span className="world-card__status" data-state={state ?? ''}>{state ? <span aria-hidden="true">{STATUS_VOCAB[state].glyph}</span> : null}{info.status}</span>}
      <dl>{rows.map(([k, v]) => <div key={k} className="contents"><dt>{k}</dt><dd>{v}</dd></div>)}{dlExtra}</dl>
      {sections}
      {foot.length ? <div className="world-card__foot">{foot}</div> : null}
    </aside>
  );
}
