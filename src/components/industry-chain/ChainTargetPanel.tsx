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
  CHAIN_COPY,
  JOINT_BY_ID,
  LEVERS,
  MARGIN_KINDS,
  SHIFT_BY_ID,
  STATUS,
  bandJoints,
  isWritten,
  jointLayers,
  shiftTarget,
  type Band,
  type Condition,
  type ConditionStatus,
  type Joint,
  type MarginKind,
} from '@/data/industryChain';
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

function MarginBlock({ kind, note }: { kind: MarginKind; note?: string }) {
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
      <p className="mt-1 text-sm text-muted-foreground">{k.test}</p>
    </div>
  );
}

/** The one reading that is on. The other distance is not shown: moving the control is how it is read. */
function OneVoice({ text }: { text: string }) {
  const { lens } = useContext(ChainLensContext);
  return (
    <div className="mt-4" data-voice={lens}>
      <h4 className={KICKER}>{CHAIN_COPY.lensName[lens]}</h4>
      <p className="mt-1.5 text-sm text-foreground">{text}</p>
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
  return (
    <>
      <MarginBlock kind={joint.margin} note={joint.note} />
      <OneVoice text={joint.read[lens].note} />
      {joint.alt && (
        <div className="mt-4">
          <h4 className={KICKER}>{CHAIN_COPY.panel.whenHeading}</h4>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-2 text-sm text-foreground">
            <Chip kind={joint.alt.margin} />
            <span>{joint.alt.when}</span>
          </p>
        </div>
      )}
      <Lines heading={CHAIN_COPY.panel.linesHeading} lines={[...joint.lines, ...MARGIN_KINDS[joint.margin].lines]} />
      {layers.length > 0 && (
        <div className="mt-4">
          <h4 className={KICKER}>{CHAIN_COPY.panel.layersHeading}</h4>
          <ul className="mt-1.5 space-y-1">
            {layers.map((b) => (
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
      <OneVoice text={band.read[lens]} />
      <Lines heading={CHAIN_COPY.panel.linesHeading} lines={band.lines} />
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
 * The owner's reading: status, then the four lines in their fixed order, then
 * the essays. All in the voice that is on. The lever line always names the
 * lever, because which of the three levers moves an element is structure,
 * not diagnosis; what the lever does here is the owner's sentence.
 */
function ConditionReading({ id, condition }: { id: string; condition: Condition }) {
  const { shift, lens } = useContext(ChainLensContext);
  const articles = shiftTarget(shift, id)?.articles ?? [];
  const line = (note: typeof condition.now) => (isWritten(note, lens) ? note[lens] : '');
  return (
    <div data-condition={id} data-voice={lens}>
      <p className="mt-3 text-sm text-muted-foreground">{STATUS[condition.status].means}</p>
      <ConditionLine heading={CHAIN_COPY.panel.now} text={line(condition.now)} />
      <ConditionLine heading={CHAIN_COPY.panel.holds} text={line(condition.holds)} />
      <ConditionLine heading={CHAIN_COPY.panel.lever} lead={LEVERS[condition.lever].label} text={line(condition.action)} />
      <ConditionLine heading={CHAIN_COPY.panel.funds} text={line(condition.funds)} />
      <div className="mt-4" data-shift-articles={id}>
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
      <div className="flex items-start justify-between gap-4">
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

      {reading && condition ? (
        <>
          <ConditionReading id={id} condition={condition} />
          {door && (
            <details className="mt-4 border-t border-border pt-3" data-anatomy={id}>
              <summary className="cursor-pointer text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {joint ? CHAIN_COPY.panel.anatomyJoint : CHAIN_COPY.panel.anatomyLayer}
              </summary>
              <Anatomy id={id} />
            </details>
          )}
        </>
      ) : (
        <Anatomy id={id} />
      )}

      {joint && moduleSlugs.length > 0 && <ChainCurriculumList moduleSlugs={moduleSlugs} />}
    </section>
  );
}
