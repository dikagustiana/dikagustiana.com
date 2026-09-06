/** A reading-size companion to the overview, derived from the same records. */
import { useContext } from 'react';
import {
  BANDS, BORDERS, BYPRODUCT, CHAIN_COPY, FLOW_KIND_LABELS, JOINTS,
  MARGIN_KINDS, NODES, NON_PHYSICAL, RETAIL, RETAIL_GROUP, RETURNS, STAGES,
  shiftTarget,
} from '@/data/industryChain';
import { ChainLensContext } from './chainLensContext';
import { Chip } from './ChainTargetPanel';

const labelOf = (id: string) =>
  [...STAGES, ...NODES, ...RETAIL, RETAIL_GROUP].find((item) => item.id === id)?.label ?? id;
const summary = 'cursor-pointer py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ChainReference() {
  const { lens, shift, selected, onSelect, panelId } = useContext(ChainLensContext);
  return (
    <details className="cp-reference mt-5 border-y border-border" data-chain-reference>
      <summary className={summary}>{CHAIN_COPY.reference.heading}</summary>
      <p className="mb-4 text-sm text-muted-foreground">{CHAIN_COPY.reference.hint}</p>
      <section aria-label={CHAIN_COPY.reference.joints}>
        <h3 className="text-sm font-semibold">{CHAIN_COPY.reference.joints} · {CHAIN_COPY.lensName[lens]}</h3>
        <ul className="mt-2 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
          {JOINTS.map((joint) => {
            const target = shiftTarget(shift, joint.id);
            return (
              <li key={joint.id} className="border-b border-border py-2" data-reference-id={joint.id}>
                <button type="button" aria-label={`Read: ${joint.label}`} aria-expanded={selected === joint.id}
                  aria-controls={selected === joint.id ? panelId : undefined}
                  onClick={(e) => onSelect(joint.id, e.currentTarget)}
                  className="flex min-h-11 w-full flex-col items-start gap-1 rounded-sm text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="font-medium">{joint.label}</span>
                  <span className="flex flex-wrap items-center gap-2"><Chip kind={joint.margin} /><span>{joint.read[lens].chip}</span></span>
                </button>
                {target && <p className="mt-1 border-l-2 border-accent pl-2 text-sm">{target.read[lens]}</p>}
              </li>
            );
          })}
        </ul>
      </section>
      <details className="mt-4 border-t border-border">
        <summary className={summary}>{CHAIN_COPY.reference.functions}</summary>
        <ul className="grid gap-3 sm:grid-cols-2">
          {STAGES.map((stage) => <li key={stage.id} className="rounded-sm border border-foreground p-3 text-sm">
            <strong>{stage.label}</strong>
            {stage.lanes && <p className="mt-1">{stage.lanes.join(' · ')}</p>}
            {stage.demand && <p className="mt-1">{stage.demand.join(' · ')}</p>}
            {stage.detail && <p className="mt-1 text-muted-foreground">{stage.detail}</p>}
          </li>)}
        </ul>
        <ul className="my-3 flex flex-wrap gap-2">
          {[...NODES, ...RETAIL].map((node) => <li key={node.id} className="rounded-full border border-dashed border-muted-foreground px-3 py-2 text-sm">
            {node.label}{node.recursion && <span className="block">↳ {node.recursion}</span>}
          </li>)}
        </ul>
        <p className="text-sm">↘ {BYPRODUCT.label}</p>
        {BORDERS.map((border) => <p key={border.id} className="mt-2 border-l border-dashed border-foreground pl-3 text-sm"><strong>{border.label}</strong> · {border.note}</p>)}
      </details>
      <details className="mt-4 border-t border-border">
        <summary className={summary}>{CHAIN_COPY.reference.layers}</summary>
        <ul className="space-y-2">
          {BANDS.map((band) => <li key={band.id} className="border-t border-border bg-secondary p-3 text-sm">
            <button type="button" aria-label={`Read: ${band.label}`} onClick={(e) => onSelect(band.id, e.currentTarget)}
              className="min-h-11 rounded-sm text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {band.label} · {band.margin ? MARGIN_KINDS[band.margin].label : band.chip}
            </button>
            <p>{band.spanLabel}{band.note && ` · ${band.note}`}</p>
            <p className="mt-1 text-muted-foreground">{band.read[lens]}</p>
          </li>)}
        </ul>
      </details>
      <details className="mt-4 border-t border-border">
        <summary className={summary}>{CHAIN_COPY.reference.returns}</summary>
        <ul className="space-y-3 text-sm">
          {RETURNS.map((flow) => <li key={flow.id} className="border-l border-dashed border-muted-foreground pl-3">
            <strong>↶ {flow.label}</strong><p>{labelOf(flow.from)} → {labelOf(flow.to)}</p>
            {flow.note && <p className="text-muted-foreground">{flow.note}</p>}
          </li>)}
        </ul>
      </details>
      <details className="mt-4 border-t border-border">
        <summary className={summary}>{CHAIN_COPY.reference.flows}</summary>
        <ul className="space-y-3 pb-4 text-sm">
          {NON_PHYSICAL.map((flow) => <li key={flow.id} className={flow.kind === 'money' ? 'cp-text-money' : 'cp-text-information'}>
            <strong>{FLOW_KIND_LABELS[flow.kind]} · {flow.direction === 'upstream' ? '←' : '→'} {flow.label}</strong>
            <p className="text-muted-foreground">{flow.note}</p>
          </li>)}
        </ul>
      </details>
    </details>
  );
}
