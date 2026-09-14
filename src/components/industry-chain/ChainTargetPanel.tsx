/**
 * The reading of one target, in one voice.
 *
 * Under a shift that marks the target, the panel is the owner's READING of
 * its condition, in the order the brief fixes and never reorders: the name
 * and its status badge; where it stands; what holds it; the lever and what it
 * does here; who finances it; the essays that read it. Every line is written
 * in the voice of the distance that is on — the other distance is not shown
 * beneath it, because two voices at once would mean the distance control did
 * nothing. A line the owner has not written is omitted, never faked. The
 * anatomy of a joint or a layer is folded beneath the reading, closed.
 *
 * At rest — or for a joint or layer a shift does not mark — the panel is the
 * ANATOMY: the margin kind cut there, what it means, the control test that
 * puts it in that class, the joint read at the distance that is on, the lines
 * of the financial statements that carry it, and the layers riding on the
 * same move; for a layer, what it does, its span, its lines and the joints
 * it rides on. Where the curriculum has pinned modules to a joint, they
 * follow, one level down.
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
  isWritten,
  jointLayers,
  shiftTarget,
  type Band,
  type Condition,
  type ConditionStatus,
  type Joint,
  type LensId,
  type MarginKind,
} from '@/data/industryChain';
import { fullDate } from '@/lib/formatDate';
import { universalEssayUrl } from '@/lib/essayUrl';
import { cn } from '@/lib/utils';
import { ChainCurriculumList } from './ChainCurriculumList';
import { ChainLensContext } from './chainLensContext';
import { isDoor, isJointId, markNumber, targetLabel } from './chainTargets';

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
 * is gross or net — is an accounting question, and it used to show at both
 * distances. That is what made the two distances differ only in label: a
 * reader stepping back to the Economy still had to pass through a
 * gross-versus-net test to reach an aggregate consequence. It now shows at the
 * finance distance, where it is doing work. Accounting keeps its own section
 * of the site; what it does not get is to frame the map from far away.
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

/**
 * THE CARD: what this element is, read at the distance that is on, and the
 * essay that argues it. Nothing else.
 *
 * What this replaces: a panel that opened with four hundred words — the
 * margin kind and its control test, the statement lines, the layers riding on
 * the move, the four lines of a reading, the mechanism, who finances it, the
 * funding-roles note — with the essays last, under all of it. A reader who
 * clicked a joint got an encyclopedia entry, and the map became the place the
 * writing happened instead of the way into it.
 *
 * The owner's rule is that a reader goes deeper into a relation THROUGH an
 * essay. So the card is one paragraph and a door, and everything the panel
 * used to say first is one disclosure below, unchanged.
 */
function Lead({ text }: { text: string }) {
  const { lens } = useContext(ChainLensContext);
  return (
    <p className="mt-3 text-sm leading-relaxed text-foreground" data-chain-lead data-voice={lens}>
      {text}
    </p>
  );
}

/**
 * The way deeper. Directly under the lead, because it is the point of the
 * card; and honest when there is nothing there, because most of this map is
 * not written up yet and a door that opens onto nothing is worse than a door
 * that says so.
 */
function ReadAtLength({ articles }: { articles: readonly { slug: string; title: string }[] }) {
  return (
    <div className="mt-3" data-chain-essays>
      <h4 className={KICKER}>{CHAIN_COPY.panel.articlesHeading}</h4>
      {articles.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{CHAIN_COPY.panel.articlesNone}</p>
      ) : (
        <ul className="mt-1.5 space-y-1 text-sm">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link to={universalEssayUrl(a.slug)} className="text-foreground underline-offset-2 hover:text-accent hover:underline">
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
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

function JointAnatomy({ joint }: { joint: Joint }) {
  const { lens } = useContext(ChainLensContext);
  const layers = jointLayers(joint.id);
  const charged = layers.filter((b) => b.attaches === 'joints');
  const behind = layers.filter((b) => b.attaches !== 'joints');
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
      {/* Two groups, because they are two different claims. See
          CHAIN_COPY.panel.layersHeading for why one list would have said that
          the money which built the warehouse takes a cut of the move. */}
      {charged.length > 0 && (
        <div className="mt-4">
          <h4 className={KICKER}>{CHAIN_COPY.panel.layersHeading}</h4>
          <ul className="mt-1.5 space-y-1">
            {charged.map((b) => (
              <LayerRef key={b.id} band={b} />
            ))}
          </ul>
        </div>
      )}
      {behind.length > 0 && (
        <div className="mt-4">
          <h4 className={KICKER}>{CHAIN_COPY.panel.layersBehindHeading}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{CHAIN_COPY.panel.layersBehindNote}</p>
          <ul className="mt-1.5 space-y-1">
            {behind.map((b) => (
              <LayerRef key={b.id} band={b} />
            ))}
          </ul>
        </div>
      )}
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
 * is the reading, not a definition. So a marked stage gets its status, its
 * basis and its essays, and no invented sentence about what a stage is.
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
 * sentence.
 *
 * This sits behind a disclosure now, under the card. Two things do NOT, and
 * both are refusals that would be dishonest to fold away:
 *
 *   BASIS. A mark is a promise of a diagnosis, and most of these marks are
 *   scenarios set from worked examples with their four lines unwritten. A
 *   panel that omitted the empty lines and said nothing else made sixteen
 *   illustrations look like sixteen findings — concise, and settled. So the
 *   card carries the basis label and what it means, before anything is read.
 *
 *   WHAT THE STATUS READS ON. Stuck, Moving and Unpriced measure an obstacle,
 *   an activity and a payment condition. They are not three values of one
 *   dial, and an element can be more than one at once. That is on the card
 *   too, beside the badge that would otherwise look like a rating.
 */
function ConditionReading({ id, condition }: { id: string; condition: Condition }) {
  const { lens } = useContext(ChainLensContext);
  const line = (note: typeof condition.now) => (isWritten(note, lens) ? note[lens] : '');
  const mechanism = condition.mechanism && condition.mechanism !== 'price' ? MECHANISMS[condition.mechanism] : null;
  return (
    <div data-condition={id} data-voice={lens}>
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
  // The essays that read this element. Under a shift the marked target names
  // its own; otherwise the element's own, so a card always leads somewhere or
  // says plainly that it does not.
  // Under a shift, the marked target names its own essays. With no shift on
  // there is nowhere in the data for an element to name one, so the card says
  // so rather than pretending the door leads somewhere.
  const articles = target?.articles ?? [];

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
          scrolls. A long reading has its own scroll area, and beside the plate
          that scroll used to carry the reading's title and its Close control
          away with it, so the reader lost the name of the thing they were
          reading exactly when it got detailed. In the sheet the sheet owns the
          scrolling and its own Close is already pinned, so this only sticks
          where it is the scroll container itself. */}
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

      {/* THE CARD. A mark that promises a diagnosis says on the card what kind
          of claim it is and what its status reads on: folding either away
          would make a scenario look like a finding, which is the one thing
          the condition layer must never do. */}
      {reading && condition && (
        <>
          <div className="mt-3 border-l-2 border-border pl-3" data-basis={condition.basis}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">{BASIS[condition.basis].label}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{BASIS[condition.basis].means}</p>
          </div>
          <p className="mt-3 text-sm text-foreground">{STATUS[condition.status].means}</p>
          <p className="mt-1 text-sm text-muted-foreground">{STATUS[condition.status].reads}</p>
        </>
      )}

      {lead && <Lead text={lead} />}
      <ReadAtLength articles={articles} />

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
