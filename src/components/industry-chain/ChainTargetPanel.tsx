/**
 * The reading of one target: a joint or a layer.
 *
 * For a joint: the margin kind cut there, what it means, the control test
 * that puts it in that class, the joint read at both distances — the one
 * that is on first — the lines of the financial statements that carry it,
 * and the layers riding on the same move. For a layer: what it does, its
 * span, its two readings, its own lines, and the joints it rides on. Under a
 * shift that moves this target, what moves here, at the distance that is
 * on. Where the curriculum has pinned modules to a joint, they follow, one
 * level down.
 *
 * Under an overlay the author's four-part condition reading leads; anatomy
 * is secondary and collapsible. The same body sits in a wide popover and a
 * narrow bottom sheet. All text comes from the data file.
 */

import { useContext, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BAND_BY_ID,
  CHAIN_COPY,
  CONDITION_STATUSES,
  JOINT_BY_ID,
  LEVERS,
  MARGIN_KINDS,
  bandJoints,
  jointLayers,
  shiftTarget,
  type Band,
  type Joint,
  type LensId,
  type LensNote,
  type MarginKind,
} from '@/data/industryChain';
import { universalEssayUrl } from '@/lib/essayUrl';
import { cn } from '@/lib/utils';
import { ChainCurriculumList } from './ChainCurriculumList';
import { ChainLensContext } from './chainLensContext';
import { isDoor, isJointId, markNumber, targetLabel } from './chainTargets';

const KICKER = 'text-[11px] uppercase tracking-[0.18em] text-muted-foreground';

/** The margin-kind marker, in the same three forms the plate's chips use. */
export function Chip({ kind, word, className }: { kind?: MarginKind; word?: string; className?: string }) {
  const text = kind ? MARGIN_KINDS[kind].chip : word;
  if (!text) return null;
  return (
    <span
      className={cn(
        'inline-block rounded-sm border px-1.5 py-px text-[11px] font-semibold uppercase tracking-wider',
        kind === 'conversion' && 'border-foreground text-foreground',
        kind === 'node-spread' && 'border-dashed border-foreground text-foreground',
        kind === 'service-fee' && 'border-border bg-secondary text-secondary-foreground',
        !kind && 'border-border text-muted-foreground',
        className,
      )}
    >
      {text}
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

/** The two distances, the one that is on first and in full strength. */
function TwoDistances({ read, lens }: { read: LensNote; lens: LensId }) {
  const order: LensId[] = lens === 'economy' ? ['economy', 'finance'] : ['finance', 'economy'];
  return (
    <div className="mt-4">
      <h4 className={KICKER}>{CHAIN_COPY.panel.readHeading}</h4>
      <dl className="mt-1.5 space-y-1.5 text-sm">
        {order.map((l) => (
          <div key={l} data-distance={l} data-active={l === lens || undefined}>
            <dt className={cn('inline font-medium', l === lens ? 'text-foreground' : 'text-muted-foreground')}>
              {CHAIN_COPY.distance[l]}.{' '}
            </dt>
            <dd className={cn('inline', l === lens ? 'text-foreground' : 'text-muted-foreground')}>{read[l]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * The essays the owner has attached to this target under this shift.
 *
 * Deliberately not inferred from anything: a target with no essays yet shows
 * nothing here rather than a promise. `/essays/:slug` resolves for every
 * published essay and redirects to the canonical URL where one exists, so a
 * row needs no placement fields to be a working link.
 */
function ShiftArticles({ id }: { id: string }) {
  const { shift } = useContext(ChainLensContext);
  const articles = shiftTarget(shift, id)?.articles ?? [];
  if (articles.length === 0) return null;
  return (
    <div className="mt-4" data-shift-articles={id}>
      <h4 className={KICKER}>{CHAIN_COPY.panel.articlesHeading}</h4>
      <ul className="mt-1.5 space-y-1 text-sm">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link to={universalEssayUrl(a.slug)} className="text-foreground underline-offset-2 hover:text-accent hover:underline">
              {a.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConditionField({ heading, value }: { heading: string; value: string }) {
  return (
    <div>
      <dt className={KICKER}>{heading}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-foreground">
        {value || <span className="italic text-muted-foreground">{CHAIN_COPY.panel.ownerPending}</span>}
      </dd>
    </div>
  );
}

/** The author's bounded condition reading; the selected distance chooses every prose slot. */
function ConditionDetails({ id }: { id: string }) {
  const { shift, lens } = useContext(ChainLensContext);
  const target = shiftTarget(shift, id);
  if (!shift || !target) return null;
  const condition = target.condition;
  const status = CONDITION_STATUSES[condition.status];
  return (
    <div className="mt-4 border-l-2 border-accent-editorial pl-4" data-condition-panel={shift}>
      <p className={KICKER}>{CHAIN_COPY.panel.conditionKicker} · {CHAIN_COPY.lensName[lens]}</p>
      <dl className="mt-3 space-y-4">
        <div>
          <dt className={KICKER}>{CHAIN_COPY.panel.statusHeading}</dt>
          <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="cp-status-mini" data-status={condition.status} aria-hidden="true" />
            {status.label}
          </dd>
        </div>
        <ConditionField heading={CHAIN_COPY.panel.currentHeading} value={condition.current[lens]} />
        <ConditionField heading={CHAIN_COPY.panel.missingHeading} value={condition.missing[lens]} />
        <div>
          <dt className={KICKER}>{CHAIN_COPY.shift.leverKicker}</dt>
          <dd className="mt-1 text-sm leading-relaxed text-foreground">
            {condition.lever.map((id) => LEVERS[id].label).join(' · ')}
          </dd>
        </div>
        <ConditionField heading={CHAIN_COPY.panel.financedHeading} value={condition.financedBy[lens]} />
      </dl>
      <ShiftArticles id={id} />
    </div>
  );
}

/**
 * A marked target that is neither a joint nor a layer — a stage, a node, a
 * border, a return. It has no margin of its own to answer for; what it has is
 * what the shift does to it, at both distances, and the essays that read it.
 */
function MarkDetails() {
  return null;
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
        <Chip kind={band.margin} word={band.serviceChip} />
      </button>
    </li>
  );
}

function JointDetails({ joint }: { joint: Joint }) {
  const { lens } = useContext(ChainLensContext);
  const layers = jointLayers(joint.id);
  return (
    <>
      <MarginBlock kind={joint.margin} note={joint.note} />
      <TwoDistances read={{ economy: joint.read.economy.note, finance: joint.read.finance.note }} lens={lens} />
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

function BandDetails({ band }: { band: Band }) {
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
          <p className="mt-1.5 flex flex-wrap items-baseline gap-2 text-base font-semibold text-foreground">
            <Chip word={band.serviceChip} />
          </p>
          <p className="mt-1.5 text-sm text-foreground">{band.means}</p>
        </div>
      )}
      <TwoDistances read={band.read} lens={lens} />
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

/** The body of a reading, without the frame. */
function TargetDetails({ id }: { id: string }) {
  if (isJointId(id)) return <JointDetails joint={JOINT_BY_ID[id]} />;
  const band = BAND_BY_ID[id];
  return band ? <BandDetails band={band} /> : <MarkDetails />;
}

export function ChainTargetPanel({
  id,
  moduleSlugs,
  onClose,
  panelId,
}: {
  id: string;
  moduleSlugs: string[];
  onClose: () => void;
  panelId: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { shift } = useContext(ChainLensContext);
  const conditionTarget = shift && markNumber(shift, id) > 0 ? shiftTarget(shift, id) : undefined;
  const joint = isJointId(id);
  const n = shift ? markNumber(shift, id) : 0;
  const kicker = joint ? CHAIN_COPY.panel.jointKicker : isDoor(id) ? CHAIN_COPY.panel.bandKicker : CHAIN_COPY.panel.markKicker;

  // The panel can open far from the target that opened it (under a tall
  // plate, or under a row half a screen up), so focus follows it. Close
  // returns focus to the target; the parent owns that half.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: false });
  }, [id]);

  return (
    <section
      id={panelId}
      aria-labelledby={`${panelId}-title`}
      className="bg-background"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={KICKER}>
            {kicker}
            {n > 0 && <span className="ml-2 tabular-nums text-foreground">{n}</span>}
          </p>
          <h3
            id={`${panelId}-title`}
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            {targetLabel(id)}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {CHAIN_COPY.panel.close}
        </button>
      </div>

      {conditionTarget ? (
        <>
          <ConditionDetails id={id} />
          {isDoor(id) && (
            <details className="mt-5 border-t border-border pt-3">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-foreground">
                {CHAIN_COPY.panel.baseHeading}
              </summary>
              <TargetDetails id={id} />
            </details>
          )}
        </>
      ) : (
        <>
          <TargetDetails id={id} />
          {joint && moduleSlugs.length > 0 && <ChainCurriculumList moduleSlugs={moduleSlugs} />}
        </>
      )}
    </section>
  );
}
