/**
 * The reading of one target, in one voice.
 *
 * What opens is a CARD: the element named, read at the distance that is on;
 * under a shift that marks it, one line saying what kind of claim the mark
 * is — a scenario, or an assessment against a named case — and one saying
 * what its status reads on; where what moves the element is not the price the
 * map can draw, the mechanism, named; then the essays that read the element,
 * each with the context it was read in and whether it is published. The
 * owner's reading in full and the anatomy of a joint or a layer are one
 * disclosure below, closed.
 *
 * Every line is written in the voice of the distance that is on — the other
 * distance is not shown beneath it, because two voices at once would mean the
 * distance control did nothing. A line the owner has not written is omitted,
 * never faked.
 *
 * The same body serves the popover beside the wide plate and the bottom
 * sheet on a narrow screen. All text comes from the data file.
 */

import { useContext, useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  BAND_BY_ID,
  BASIS,
  CHAIN_COPY,
  CONDITION_AS_OF,
  JOINT_BY_ID,
  LEVERS,
  MARGIN_KINDS,
  MECHANISMS,
  SHIFT_BY_ID,
  STATUS,
  STATUS_NOTE,
  bandJoints,
  chargedAtJoints,
  essaysFor,
  isWritten,
  jointLayers,
  setsTerms,
  shiftTarget,
  type Band,
  type Condition,
  type ConditionStatus,
  type EssayLink,
  type Joint,
  type LensId,
  type MarginKind,
} from '@/data/industryChain';
import { fullDate } from '@/lib/formatDate';
import { essayUrl, universalEssayUrl } from '@/lib/essayUrl';
import { cn } from '@/lib/utils';
import { ChainCurriculumList } from './ChainCurriculumList';
import { ChainLensContext } from './chainLensContext';
import { isDoor, isJointId, markNumber, targetLabel } from './chainTargets';
import { useChainEssays } from './useChainEssays';

const KICKER = 'text-[11px] uppercase tracking-[0.18em] text-muted-foreground';

/** The margin-kind token, in the same three forms the plate's joint marks use, at text size. */
export function Chip({ kind, word, className }: { kind?: MarginKind; word?: string; className?: string }) {
  const text = kind ? MARGIN_KINDS[kind].chip : word;
  if (!text) return null;
  return (
    <span
      className={cn(
        'inline-block rounded-sm border px-1.5 py-px text-[11px] font-semibold uppercase tracking-wider',
        kind === 'conversion' && 'border-foreground bg-foreground text-background',
        kind === 'node-spread' && 'border-foreground text-foreground',
        kind === 'service-fee' && 'border-border bg-secondary text-secondary-foreground',
        !kind && 'border-border text-muted-foreground',
        className,
      )}
    >
      {text}
    </span>
  );
}

/**
 * The status badge: the word and its form — a filled square for stuck, an
 * open one for moving, a dashed one for unpriced — so it matches the mark on
 * the plate without depending on colour.
 */
export function StatusBadge({ status, className }: { status: ConditionStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span
      data-status={status}
      title={s.means}
      className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground', className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-2.5 w-2.5 rounded-[2px] border-[1.5px] border-foreground',
          s.form === 'filled' && 'bg-foreground',
          s.form === 'dashed' && 'border-dashed',
        )}
      />
      {s.label}
    </span>
  );
}

function Lines({ heading, lines }: { heading: string; lines: readonly string[] }) {
  return (
    <div className="mt-4">
      <h4 className={KICKER}>{heading}</h4>
      <ul className="mt-1.5 space-y-1 border-l-2 border-border pl-3 text-sm text-foreground">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The margin cut here.
 *
 * The CONTROL TEST — principal or agent, who owns the goods, whether revenue
 * is gross or net — is an accounting question, and it shows at the finance
 * distance, where it is doing work. At the Economy distance the aggregate
 * basis — value added — is the right frame.
 */
function MarginBlock({ kind, note }: { kind: MarginKind; note?: string }) {
  const { lens } = useContext(ChainLensContext);
  const k = MARGIN_KINDS[kind];
  return (
    <div className="mt-4">
      <h4 className={KICKER}>{CHAIN_COPY.panel.marginHeading}</h4>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-2 text-base font-semibold text-foreground">
        {k.label}
        <Chip kind={kind} />
      </p>
      {note && <p className="mt-1.5 text-sm text-foreground">{note}</p>}
      <p className="mt-1.5 text-sm text-muted-foreground">{k.means}</p>
      {lens === 'finance' && <p className="mt-1 text-sm text-muted-foreground">{k.test}</p>}
      {lens === 'economy' && <p className="mt-1 text-sm text-muted-foreground">{CHAIN_COPY.basis}</p>}
    </div>
  );
}

/** The card's one paragraph: what this element is, read at the distance that is on. */
function Lead({ text }: { text: string }) {
  const { lens } = useContext(ChainLensContext);
  return (
    <p className="mt-3 text-sm leading-relaxed text-foreground" data-chain-lead data-voice={lens}>
      {text}
    </p>
  );
}

/**
 * One essay, with what it claims about this element and whether it is there
 * to be read. The link is the essay's canonical address once the index has
 * confirmed it is published; until then the universal route, which resolves
 * for every published essay. A slug the index says is not published is shown
 * as inert text, the same rule the curriculum list follows for a planned
 * lesson; an index that could not be reached is said to be unreachable,
 * which is not the same as saying no.
 */
function EssayRow({ link, row, checked, failed }: { link: EssayLink; row: ReturnType<typeof useChainEssays>['data'] extends Record<string, infer R> | undefined ? R | undefined : never; checked: boolean; failed: boolean }) {
  const published = !!row;
  const notPublished = checked && !failed && !row;
  const href = row
    ? essayUrl({
        slug: row.slug,
        section: row.section,
        phase: row.phase,
        track: row.finance_modules?.track_slug ?? row.finance_section ?? null,
        moduleSlug: row.finance_modules?.slug ?? null,
        fsliSlug: row.fsli_slug,
        topic: row.topic,
      }) ?? universalEssayUrl(link.slug)
    : universalEssayUrl(link.slug);
  const context = link.evidence
    ? CHAIN_COPY.panel.essayEvidence
    : link.under
      ? CHAIN_COPY.panel.essayUnder(SHIFT_BY_ID[link.under].label)
      : null;
  const state = published
    ? CHAIN_COPY.panel.essayPublished
    : notPublished
      ? CHAIN_COPY.panel.essayNotPublished
      : failed
        ? CHAIN_COPY.panel.essayUnchecked
        : null;
  return (
    <li data-essay={link.slug} data-essay-evidence={link.evidence || undefined} data-essay-state={published ? 'published' : notPublished ? 'not-published' : failed ? 'unchecked' : 'checking'}>
      {notPublished ? (
        <span className="cursor-default text-sm text-muted-foreground">{link.title}</span>
      ) : (
        <Link to={href} className="text-sm font-medium text-foreground underline-offset-2 hover:text-accent hover:underline">
          {link.title}
        </Link>
      )}
      {(context || state) && (
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          {context && <span className={cn(link.evidence && 'text-foreground')}>{context}</span>}
          {state && <span>{state}</span>}
        </p>
      )}
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{link.reads}</p>
    </li>
  );
}

/** The essays that read this element, checked against the index once, for the whole list. */
function EssayLinks({ links }: { links: EssayLink[] }) {
  const { data, isError, isSuccess } = useChainEssays(links.map((l) => l.slug));
  return (
    <ul className="mt-1.5 space-y-3">
      {links.map((l) => (
        <EssayRow key={`${l.slug}:${l.under ?? ''}`} link={l} row={data?.[l.slug]} checked={isSuccess} failed={isError} />
      ))}
    </ul>
  );
}

/**
 * The way deeper. Directly under the lead, because it is the point of the
 * card; and honest when there is nothing there, because most of this map is
 * not written up yet and a door that opens onto nothing is worse than a door
 * that says so.
 */
function ReadAtLength({ id }: { id: string }) {
  const { shift } = useContext(ChainLensContext);
  const links = essaysFor(id, shift);
  return (
    <div className="mt-3" data-chain-essays data-chain-essays-count={links.length}>
      <h4 className={KICKER}>{CHAIN_COPY.panel.articlesHeading}</h4>
      {links.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">{CHAIN_COPY.panel.articlesNone}</p> : <EssayLinks links={links} />}
    </div>
  );
}

/** A layer named inside a joint's panel: a button, so one panel leads to the next. */
function LayerRef({ band }: { band: Band }) {
  const { onSelect } = useContext(ChainLensContext);
  return (
    <li>
      <button
        type="button"
        onClick={(e) => onSelect(band.id, e.currentTarget)}
        className="flex flex-wrap items-baseline gap-2 rounded-sm text-left text-sm text-foreground hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span>{band.label}</span>
        <Chip kind={band.margin} />
      </button>
    </li>
  );
}

function LayerList({ heading, note, bands }: { heading: string; note?: string; bands: Band[] }) {
  if (bands.length === 0) return null;
  return (
    <div className="mt-4" data-layer-list={heading}>
      <h4 className={KICKER}>{heading}</h4>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      <ul className="mt-1.5 space-y-1">
        {bands.map((b) => (
          <LayerRef key={b.id} band={b} />
        ))}
      </ul>
    </div>
  );
}

/**
 * THE LAYERS ON A JOINT, IN THREE GROUPS, because they are not the same kind
 * of thing. A layer that attaches at the joints AND earns a fee is charged
 * at this transfer: the freight, the cold, the working capital that bridges
 * it. A layer that attaches at the joints and earns nothing sets the terms
 * the transfer happens on: the contract governing who may sell where, and the
 * rules. A layer that attaches under the functions takes nothing at this
 * transfer and is still the reason it can happen at all: asset finance and
 * energy. Attachment location alone was the test before, and it put contract
 * governance under "charged here".
 */
function JointAnatomy({ joint }: { joint: Joint }) {
  const { lens } = useContext(ChainLensContext);
  const layers = jointLayers(joint.id);
  const charged = layers.filter(chargedAtJoints);
  const terms = layers.filter(setsTerms);
  const behind = layers.filter((b) => !chargedAtJoints(b) && !setsTerms(b));
  return (
    <>
      <MarginBlock kind={joint.margin} note={joint.note} />
      {joint.alt && (
        <div className="mt-4">
          <h4 className={KICKER}>{CHAIN_COPY.panel.whenHeading}</h4>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-2 text-sm text-foreground">
            <Chip kind={joint.alt.margin} />
            <span>{joint.alt.when}</span>
          </p>
        </div>
      )}
      {/* The lines of the financial statements are the close reading. At the
          Economy distance they are the wrong unit and the wrong question. */}
      {lens === 'finance' && (
        <Lines heading={CHAIN_COPY.panel.linesHeading} lines={[...joint.lines, ...MARGIN_KINDS[joint.margin].lines]} />
      )}
      <LayerList heading={CHAIN_COPY.panel.layersHeading} bands={charged} />
      <LayerList heading={CHAIN_COPY.panel.layersTermsHeading} note={CHAIN_COPY.panel.layersTermsNote} bands={terms} />
      <LayerList heading={CHAIN_COPY.panel.layersBehindHeading} note={CHAIN_COPY.panel.layersBehindNote} bands={behind} />
    </>
  );
}

function BandAnatomy({ band }: { band: Band }) {
  const { lens } = useContext(ChainLensContext);
  const joints = bandJoints(band);
  return (
    <>
      <div className="mt-4">
        <h4 className={KICKER}>{CHAIN_COPY.panel.spanHeading}</h4>
        <p className="mt-1.5 text-sm text-foreground">{band.spanLabel}</p>
        {band.note && <p className="mt-1 text-xs text-muted-foreground">{band.note}</p>}
      </div>
      {band.margin ? (
        <MarginBlock kind={band.margin} note={band.means} />
      ) : (
        <div className="mt-4">
          <h4 className={KICKER}>{CHAIN_COPY.panel.marginHeading}</h4>
          <p className="mt-1.5 text-sm text-foreground">{band.means}</p>
        </div>
      )}
      {band.shortages && (
        <div className="mt-4">
          <h4 className={KICKER}>{CHAIN_COPY.panel.shortagesHeading}</h4>
          <ul className="mt-1.5 space-y-1 border-l-2 border-border pl-3 text-sm">
            {band.shortages.map((sh) => (
              <li key={sh.label}>
                <span className="font-medium text-foreground">{sh.label}</span>
                <span className="text-muted-foreground"> — {sh.means}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Where asset finance lands: the functions whose capacity it builds, and the layers whose capacity it also funds. */}
      {band.recipients && (
        <div className="mt-4" data-recipients={band.id}>
          <h4 className={KICKER}>{CHAIN_COPY.panel.recipientsHeading}</h4>
          <p className="mt-1.5 text-sm text-muted-foreground">{band.recipients.map((id) => targetLabel(id)).join(' · ')}</p>
          {band.financesLayers && (
            <>
              <h4 className={cn(KICKER, 'mt-2')}>{CHAIN_COPY.panel.financesLayersHeading}</h4>
              <p className="mt-1.5 text-sm text-muted-foreground">{band.financesLayers.map((id) => BAND_BY_ID[id].label).join(' · ')}</p>
            </>
          )}
        </div>
      )}
      {lens === 'finance' && <Lines heading={CHAIN_COPY.panel.linesHeading} lines={band.lines} />}
      {joints.length > 0 && (
        <div className="mt-4">
          <h4 className={KICKER}>{CHAIN_COPY.panel.ridesHeading}</h4>
          <p className="mt-1.5 text-sm text-muted-foreground">{joints.map((j) => JOINT_BY_ID[j].label).join(' · ')}</p>
        </div>
      )}
    </>
  );
}

/** The anatomy of a door, wherever it is shown. */
function Anatomy({ id }: { id: string }) {
  if (isJointId(id)) return <JointAnatomy joint={JOINT_BY_ID[id]} />;
  const band = BAND_BY_ID[id];
  return band ? <BandAnatomy band={band} /> : null;
}

/**
 * The card's paragraph: the element read at the distance that is on.
 *
 * Only the two DOORS have one, and that is not an omission. A joint and a
 * layer are the two things this map claims to read; a stage or a node is a
 * function the chain has, and what the map has to say about one under a shift
 * is the reading, not a definition.
 */
function leadFor(id: string, lens: LensId): string {
  if (isJointId(id)) return JOINT_BY_ID[id].read[lens].note;
  return BAND_BY_ID[id]?.read[lens] ?? '';
}

/** One of the four lines of a condition, in the voice that is on; nothing when the owner has not written it yet. */
function ConditionLine({ heading, text, lead }: { heading: string; text: string; lead?: string }) {
  if (!text && !lead) return null;
  return (
    <div className="mt-3" data-condition-line={heading}>
      <h4 className={KICKER}>{heading}</h4>
      <p className="mt-1 text-sm leading-relaxed text-foreground">
        {lead && <span className="font-medium">{lead}</span>}
        {lead && text && <span className="text-muted-foreground"> — </span>}
        {text}
      </p>
    </div>
  );
}

/**
 * The owner's reading in full: the four lines in their fixed order, what the
 * lever cannot do, and who pays. All in the voice that is on. The lever line
 * always names the lever, because which of the three levers moves an element
 * is structure, not diagnosis; what the lever does here is the owner's
 * sentence. Behind a disclosure, under the card.
 */
function ConditionReading({ id, condition }: { id: string; condition: Condition }) {
  const { lens } = useContext(ChainLensContext);
  const line = (note: typeof condition.now) => (isWritten(note, lens) ? note[lens] : '');
  const mechanism = condition.mechanism && condition.mechanism !== 'price' ? MECHANISMS[condition.mechanism] : null;
  return (
    <div data-condition={id} data-voice={lens}>
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{BASIS[condition.basis].label}.</span> {BASIS[condition.basis].means}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{STATUS[condition.status].label}.</span> {STATUS[condition.status].means}{' '}
        {STATUS[condition.status].reads}
      </p>
      <ConditionLine heading={CHAIN_COPY.panel.now} text={line(condition.now)} />
      <ConditionLine heading={CHAIN_COPY.panel.holds} text={line(condition.holds)} />
      <ConditionLine heading={CHAIN_COPY.panel.lever} lead={LEVERS[condition.lever].label} text={line(condition.action)} />
      {/* The lever is what the MAP can draw. Where something else is doing the
          work, the panel says which, so a capacity or contract problem is not
          silently relabelled as a repricing. */}
      {mechanism && (
        <p className="mt-1.5 border-l-2 border-border pl-3 text-sm text-muted-foreground" data-mechanism={condition.mechanism}>
          <span className="font-medium text-foreground">{mechanism.label}.</span> {mechanism.means}
        </p>
      )}
      <ConditionLine heading={CHAIN_COPY.panel.funds} text={line(condition.funds)} />
      {isWritten(condition.funds, lens) && (
        <p className="mt-1 pl-0 text-xs text-muted-foreground">{CHAIN_COPY.panel.fundsRoles}</p>
      )}
      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        {STATUS_NOTE} Reviewed {fullDate(CONDITION_AS_OF)}.
      </p>
    </div>
  );
}

export function ChainTargetPanel({
  id,
  moduleSlugs,
  onClose,
  panelId,
  inline = false,
  hideClose = false,
  children,
}: {
  id: string;
  moduleSlugs: string[];
  onClose: () => void;
  panelId: string;
  /** Under a row of the narrow-screen column rather than beside the plate. */
  inline?: boolean;
  /** Inside a sheet that has its own close control. */
  hideClose?: boolean;
  /** Anything the frame wants to say under the title — the isolation note, for instance. */
  children?: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { shift, lens } = useContext(ChainLensContext);
  const joint = isJointId(id);
  const door = isDoor(id);
  const target = shiftTarget(shift, id);
  const condition = target?.condition;
  const n = shift ? markNumber(shift, id) : 0;
  const reading = !!condition && n > 0;
  // The card's one paragraph: what this element IS, read at the distance that
  // is on. Same sentence whether a shift is on or not — a shift changes where
  // the owner says the element stands, not what it is.
  const lead = leadFor(id, lens);
  const mechanism = condition?.mechanism && condition.mechanism !== 'price' ? MECHANISMS[condition.mechanism] : null;

  const kicker = reading
    ? `${CHAIN_COPY.panel.readingKicker} · ${SHIFT_BY_ID[shift!].label} · ${CHAIN_COPY.lensName[lens]}`
    : `${joint ? CHAIN_COPY.panel.jointKicker : CHAIN_COPY.panel.bandKicker} · ${CHAIN_COPY.lensName[lens]}`;

  // The panel can open away from the target that opened it, so focus follows
  // it. Close returns focus to the target; the parent owns that half.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [id]);

  return (
    <section
      id={panelId}
      aria-labelledby={`${panelId}-title`}
      data-panel={reading ? 'reading' : 'anatomy'}
      className={cn('rounded-md border border-border bg-card p-5 text-card-foreground', inline ? 'mt-2' : '')}
    >
      {/* WHO AM I, AND HOW DO I LEAVE — kept on screen while the evidence
          scrolls. Beside the plate the panel is the scroll container, so its
          head sticks; in the sheet the sheet owns the scrolling and its own
          Close is already pinned. */}
      <div
        className={cn(
          'flex items-start justify-between gap-4',
          !inline && 'sticky top-0 z-10 -mx-5 -mt-5 rounded-t-md bg-card px-5 pb-3 pt-5',
        )}
      >
        <div className="min-w-0">
          <p className={KICKER}>
            {n > 0 && <span className="mr-2 tabular-nums text-foreground">{n}</span>}
            {kicker}
          </p>
          {/* The region is named by the title alone; the badge is read after it, not as part of the name. */}
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-sm text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span id={`${panelId}-title`}>{targetLabel(id)}</span>
            {condition && reading && <StatusBadge status={condition.status} />}
          </h3>
        </div>
        {!hideClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {CHAIN_COPY.panel.close}
          </button>
        )}
      </div>

      {children}

      {/* WHAT KIND OF CLAIM THE MARK IS, in one line each: the basis — with the
          case named where there is one — and what the status reads on. Kept
          close to the badge rather than folded, because folding either would
          make a scenario look like a finding; kept short because the long
          definitions are in the reading in full. */}
      {reading && condition && (
        <div className="mt-3 border-l-2 border-border pl-3" data-basis={condition.basis}>
          <p className="text-sm text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">{BASIS[condition.basis].label}</span>
            <span aria-hidden="true"> — </span>
            {condition.basis === 'assessed' ? (
              <>
                {BASIS.assessed.card} <span className="text-foreground" data-assessed-case>{condition.case}</span>.
              </>
            ) : (
              BASIS.scenario.card
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground" data-status-card={condition.status}>
            {STATUS[condition.status].card}
          </p>
          {mechanism && (
            <p className="mt-1 text-sm text-muted-foreground" data-mechanism-card={condition.mechanism}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">{CHAIN_COPY.panel.mechanismKicker}</span>
              <span aria-hidden="true"> — </span>
              {mechanism.label}, not a price alone.
            </p>
          )}
        </div>
      )}

      {lead && <Lead text={lead} />}
      <ReadAtLength id={id} />

      {/* Everything the panel used to open with, one disclosure down. */}
      {reading && condition && (
        <details className="mt-4 border-t border-border pt-3" data-chain-reading={id}>
          <summary className="cursor-pointer text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {CHAIN_COPY.panel.readingDisclosure}
          </summary>
          <ConditionReading id={id} condition={condition} />
        </details>
      )}

      {door ? (
        <details className="mt-4 border-t border-border pt-3" data-anatomy={id}>
          <summary className="cursor-pointer text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {joint ? CHAIN_COPY.panel.anatomyJoint : CHAIN_COPY.panel.anatomyLayer}
          </summary>
          <Anatomy id={id} />
        </details>
      ) : (
        !reading && <Anatomy id={id} />
      )}

      {joint && moduleSlugs.length > 0 && <ChainCurriculumList moduleSlugs={moduleSlugs} />}
    </section>
  );
}
