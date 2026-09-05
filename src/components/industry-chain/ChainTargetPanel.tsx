/**
 * The reading of one target: a joint or a layer.
 *
 * For a joint: the margin kind cut there, what it means, the control test
 * that puts it in that class, the lines of the financial statements that
 * carry it, and the layers riding on the same move — each a fee (or the
 * terms) on top of the slice. For a layer: what it does, its span, the joints
 * it rides on, and its own lines. Where the curriculum has pinned modules to
 * a joint, they follow, one level down.
 *
 * The same body serves the panel under the wide plate, the inline panel
 * under a joint row on a narrow screen, and the open state of a layer in the
 * narrow-screen list. All text comes from the data file.
 */

import { useContext, useEffect, useRef } from 'react';
import {
  BAND_BY_ID,
  CHAIN_COPY,
  JOINT_BY_ID,
  MARGIN_KINDS,
  bandJoints,
  jointLayers,
  type Band,
  type Joint,
  type MarginKind,
} from '@/data/industryChain';
import { cn } from '@/lib/utils';
import { ChainCurriculumList } from './ChainCurriculumList';
import { ChainLensContext } from './chainLensContext';
import { isJointId, targetLabel } from './chainTargets';

const KICKER = 'text-[11px] uppercase tracking-[0.18em] text-muted-foreground';

function Chip({ kind, word, className }: { kind?: MarginKind; word?: string; className?: string }) {
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

/** A layer named inside a joint's panel: a button on a wide screen, so one panel leads to the next. */
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
        <Chip kind={band.margin} word={band.chip} />
      </button>
    </li>
  );
}

function JointDetails({ joint }: { joint: Joint }) {
  const layers = jointLayers(joint.id);
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
  const joints = bandJoints(band);
  return (
    <>
      <div className="mt-4">
        <h4 className={KICKER}>{CHAIN_COPY.panel.spanHeading}</h4>
        <p className="mt-1.5 text-sm text-foreground">{band.spanLabel}</p>
        {band.note && <p className="mt-1 font-mono text-xs text-muted-foreground">{band.note}</p>}
      </div>
      {band.margin ? (
        <MarginBlock kind={band.margin} note={band.means} />
      ) : (
        <div className="mt-4">
          <h4 className={KICKER}>{CHAIN_COPY.panel.marginHeading}</h4>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-2 text-base font-semibold text-foreground">
            <Chip word={band.chip} />
          </p>
          <p className="mt-1.5 text-sm text-foreground">{band.means}</p>
        </div>
      )}
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
  return band ? <BandDetails band={band} /> : null;
}

export function ChainTargetPanel({
  id,
  moduleSlugs,
  onClose,
  panelId,
  inline = false,
}: {
  id: string;
  moduleSlugs: string[];
  onClose: () => void;
  panelId: string;
  /** Under a row of the narrow-screen column rather than under the plate. */
  inline?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const joint = isJointId(id);

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
      className={cn('rounded-md border border-border bg-card p-5', inline ? 'mt-2' : 'mt-4')}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={KICKER}>{joint ? CHAIN_COPY.panel.jointKicker : CHAIN_COPY.panel.bandKicker}</p>
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
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {CHAIN_COPY.panel.close}
        </button>
      </div>

      <TargetDetails id={id} />

      {joint && moduleSlugs.length > 0 && <ChainCurriculumList moduleSlugs={moduleSlugs} />}
    </section>
  );
}
