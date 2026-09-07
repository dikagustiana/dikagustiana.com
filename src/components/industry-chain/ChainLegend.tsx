import { useId } from 'react';
import { CHAIN_COPY, CONDITION_STATUSES, LEGEND, type ConditionStatus, type LegendSwatch } from '@/data/industryChain';

function Swatch({ id }: { id: LegendSwatch }) {
  const common = { width: 28, height: 16, viewBox: '0 0 28 16', 'aria-hidden': true as const, className: 'shrink-0' };
  switch (id) {
    case 'stage':
      return <svg {...common}><rect x="1" y="2" width="26" height="12" rx="1" className="fill-background stroke-foreground" /></svg>;
    case 'node':
      return <svg {...common}><rect x="1" y="2" width="26" height="12" rx="6" className="fill-background stroke-muted-foreground" strokeDasharray="3 2" /></svg>;
    case 'layer':
      return <svg {...common}><rect y="4" width="28" height="10" className="fill-secondary" /><path d="M0 4H28 M5 4V0 M14 4V0 M23 4V0" className="stroke-muted-foreground" /></svg>;
    case 'return':
      return <svg {...common}><path d="M26 14C26 2 5 2 5 11" fill="none" className="stroke-muted-foreground" strokeDasharray="4 2" /><path d="M2 8l3 6 3-6z" className="fill-muted-foreground" /></svg>;
    case 'joint':
      return <svg {...common}><path d="M1 8h26" className="stroke-foreground" strokeWidth="1.5" /><path d="M14 2l6 6-6 6-6-6z" className="fill-background stroke-foreground" /></svg>;
    case 'conversion':
      return <svg {...common}><rect x="2" y="2" width="24" height="12" rx="2" className="fill-background stroke-foreground" /></svg>;
    case 'spread':
      return <svg {...common}><rect x="2" y="2" width="24" height="12" rx="2" className="fill-background stroke-foreground" strokeDasharray="3 2" /></svg>;
    case 'fee':
      return <svg {...common}><rect x="2" y="2" width="24" height="12" rx="2" className="fill-secondary stroke-muted-foreground" /></svg>;
    case 'money':
      return <svg {...common}><path d="M27 8H6" className="stroke-muted-foreground" strokeDasharray="2 3" /><path d="M7 4L1 8l6 4z" className="fill-muted-foreground" /></svg>;
    case 'information':
      return <svg {...common}><path d="M1 8h20" className="stroke-muted-foreground" strokeDasharray="7 2 1 2" /><path d="M21 4l6 4-6 4z" className="fill-background stroke-muted-foreground" /></svg>;
    default:
      return <svg {...common}><path d="M14 1v14" className="stroke-foreground" strokeDasharray="3 2" /></svg>;
  }
}

function StatusSwatch({ status }: { status: ConditionStatus }) {
  return <span className="cp-status-mini" data-status={status} aria-hidden="true" />;
}

const core: LegendSwatch[] = ['stage', 'node', 'layer', 'return', 'money', 'information', 'joint', 'conversion', 'spread', 'fee'];

export function ChainLegend() {
  const headingId = `${useId()}-legend`;
  return (
    <section aria-labelledby={headingId} className="mt-3 border-t border-border pt-3" data-chain-legend>
      <h3 id={headingId} className="sr-only">{CHAIN_COPY.controls.legend}</h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] leading-none text-muted-foreground">
        {core.map((id) => {
          const item = LEGEND.find((entry) => entry.id === id)!;
          return <li key={id} className="flex items-center gap-1.5" data-legend={id}><Swatch id={id} /><span>{item.label}</span></li>;
        })}
        {(Object.keys(CONDITION_STATUSES) as ConditionStatus[]).map((status) => (
          <li key={status} className="flex items-center gap-1.5" data-legend-status={status}>
            <StatusSwatch status={status} /><span>{CONDITION_STATUSES[status].label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
