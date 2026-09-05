/**
 * The industry chain, at two distances.
 *
 * The headline is the entry point of the page and it is a claim the page has
 * to pay for: "Nothing here is complicated. It only looks that way from the
 * wrong distance." The sentence under it is the control — the two lens names
 * in it are the two buttons. No toggle bar, no announced chrome: step back and
 * the chain reads as an economy; step in and it reads as one unit of goods
 * with its price sliced at every joint.
 *
 * The base map is complete without any interaction. A lens is an overlay: it
 * dims the base enough to stand out and never hides it. One lens at a time.
 * Under the unit-economics lens, a joint the mapping table has pinned a
 * module to becomes a door into the curriculum; every other joint stays
 * quiet.
 *
 * Self-contained: drop it on any page. The plate itself is generated
 * (ChainPlateSvg.tsx) from src/data/industryChain.ts.
 */

import { useCallback, useId, useMemo, useState } from 'react';
import { CHAIN_COPY, JOINT_IDS, type JointId, type LensId } from '@/data/industryChain';
import { CHAIN_MODULE_LINKS, locatedModulesByJoint, type ChainModuleLink } from '@/data/chainCurriculumMap';
import { cn } from '@/lib/utils';
import { ChainLensContext } from './chainLensContext';
import { ChainPlateTall, ChainPlateWide } from './ChainPlateSvg';
import { ChainCurriculumPanel } from './ChainCurriculumPanel';
import './chain-plate.css';

const FOCUS =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** One of the two lens names inside the sentence. Text, not a widget. */
function LensWord({
  id,
  active,
  onToggle,
  children,
}: {
  id: LensId;
  active: boolean;
  onToggle: (id: LensId) => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onToggle(id)}
      className={cn(
        'inline border-b pb-px font-medium text-foreground transition-colors',
        active
          ? id === 'economy'
            ? 'border-b-2 border-accent text-accent'
            : 'border-b-2 border-accent-editorial'
          : 'border-dotted border-muted-foreground hover:border-solid hover:border-foreground',
        FOCUS,
      )}
    >
      {children}
    </button>
  );
}

export function ChainPlate({ links = CHAIN_MODULE_LINKS }: { links?: readonly ChainModuleLink[] }) {
  const panelId = `${useId()}-chain-panel`;
  const [lens, setLens] = useState<LensId | null>(null);
  const [selectedJoint, setSelectedJoint] = useState<JointId | null>(null);

  const modulesByJoint = useMemo(() => locatedModulesByJoint(links), [links]);
  const activeJoints = useMemo(
    () => new Set(JOINT_IDS.filter((j) => (modulesByJoint[j]?.length ?? 0) > 0)),
    [modulesByJoint],
  );

  const toggleLens = useCallback((next: LensId) => {
    setLens((current) => (current === next ? null : next));
    setSelectedJoint(null);
  }, []);

  const onSelectJoint = useCallback((joint: JointId) => {
    setSelectedJoint((current) => (current === joint ? null : joint));
  }, []);

  const lensState = useMemo(
    () => ({ lens, activeJoints, selectedJoint, onSelectJoint, panelId }),
    [lens, activeJoints, selectedJoint, onSelectJoint, panelId],
  );

  const { lead } = CHAIN_COPY;

  return (
    <div className="chain-plate" data-lens={lens ?? undefined}>
      <header className="max-w-3xl">
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl [text-wrap:balance]">
          {CHAIN_COPY.headline}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          {lead.before}
          <LensWord id="economy" active={lens === 'economy'} onToggle={toggleLens}>
            {lead.economy}
          </LensWord>
          {lead.middle}
          <LensWord id="unit" active={lens === 'unit'} onToggle={toggleLens}>
            {lead.unit}
          </LensWord>
          {lead.after}
        </p>
      </header>

      <ChainLensContext.Provider value={lensState}>
        <figure className="mt-8" aria-label={`${CHAIN_COPY.lensName.economy} and ${CHAIN_COPY.lensName.unit}`}>
          <ChainPlateWide />
          <ChainPlateTall />
        </figure>
      </ChainLensContext.Provider>

      {lens === 'unit' && activeJoints.size > 0 && !selectedJoint && (
        <p className="mt-3 text-xs text-muted-foreground">{CHAIN_COPY.panel.hint}</p>
      )}

      {lens === 'unit' && selectedJoint && modulesByJoint[selectedJoint] && (
        <ChainCurriculumPanel
          joint={selectedJoint}
          moduleSlugs={modulesByJoint[selectedJoint] ?? []}
          onClose={() => setSelectedJoint(null)}
          panelId={panelId}
        />
      )}
    </div>
  );
}

/** The plate as an About section: no heading of its own — the headline is the heading. */
export function IndustryChainSection() {
  return (
    <section className="border-b border-border py-12">
      <div className="container max-w-6xl">
        <ChainPlate />
      </div>
    </section>
  );
}
