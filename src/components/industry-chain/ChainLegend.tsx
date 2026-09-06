/**
 * How to read the map: the four categories, the joint and its three chip
 * forms, the two non-physical flows, the border and the shift ring, each
 * told by FORM before colour — a solid box, a dashed pill, a filled band, a
 * dashed arc, a diamond, a solid / dashed / filled chip, a dotted line with
 * a filled head, a dash-dot line with an open head, a vertical dash with a
 * chip, a ring. The words come from the data file; only the swatches live
 * here, drawn as plain paths so they need no shared marker definitions.
 */

import { useId, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CHAIN_COPY, LEGEND, LEGEND_NOTE, type LegendSwatch } from '@/data/industryChain';
import { cn } from '@/lib/utils';

function Swatch({ id }: { id: LegendSwatch }) {
  const common = { width: 40, height: 20, viewBox: '0 0 40 20', 'aria-hidden': true as const, className: 'shrink-0' };
  switch (id) {
    case 'stage':
      return (
        <svg {...common}>
          <rect x="1" y="2" width="38" height="16" rx="1.5" className="fill-background stroke-foreground" strokeWidth="1" />
        </svg>
      );
    case 'node':
      return (
        <svg {...common}>
          <rect x="1" y="3" width="38" height="14" rx="7" className="fill-background stroke-muted-foreground" strokeWidth="1" strokeDasharray="3 2.5" />
        </svg>
      );
    case 'layer':
      return (
        <svg {...common}>
          <rect x="0" y="4" width="40" height="13" className="fill-secondary" />
          <path d="M 0 4 L 40 4" className="stroke-border" strokeWidth="1" />
        </svg>
      );
    case 'return':
      return (
        <svg {...common}>
          <path d="M 36 17 C 36 3, 6 3, 6 14" fill="none" className="stroke-muted-foreground" strokeWidth="1" strokeDasharray="5 3" />
          <path d="M 3 10 L 6 16 L 9 10 Z" className="fill-muted-foreground" />
        </svg>
      );
    case 'joint':
      return (
        <svg {...common}>
          <path d="M 2 10 L 38 10" className="stroke-foreground" strokeWidth="1.7" />
          <path d="M 20 3 L 27 10 L 20 17 L 13 10 Z" className="fill-background stroke-foreground" strokeWidth="1.8" />
        </svg>
      );
    case 'conversion':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="34" height="14" rx="2" className="fill-background stroke-foreground" strokeWidth="1" />
        </svg>
      );
    case 'spread':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="34" height="14" rx="2" className="fill-background stroke-foreground" strokeWidth="1" strokeDasharray="3 2.5" />
        </svg>
      );
    case 'fee':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="34" height="14" rx="2" className="fill-secondary stroke-border" strokeWidth="1" />
        </svg>
      );
    case 'money':
      return (
        <svg {...common}>
          <path d="M 38 10 L 8 10" fill="none" className="stroke-muted-foreground" strokeWidth="1.4" strokeDasharray="2 3.5" strokeLinecap="round" />
          <path d="M 8 6 L 1 10 L 8 14 Z" className="fill-muted-foreground" />
        </svg>
      );
    case 'information':
      return (
        <svg {...common}>
          <path d="M 2 10 L 31 10" fill="none" className="stroke-muted-foreground" strokeWidth="1.1" strokeDasharray="9 3 1.5 3" />
          <path d="M 31 5.5 L 38 10 L 31 14.5 Z" className="fill-background stroke-muted-foreground" strokeWidth="1" />
        </svg>
      );
    case 'border':
      return (
        <svg {...common}>
          <path d="M 20 1 L 20 19" fill="none" className="stroke-foreground" strokeWidth="1.2" strokeDasharray="4 3" />
          <rect x="12" y="6" width="16" height="8" rx="1" className="fill-background stroke-foreground" strokeWidth="1" />
        </svg>
      );
    case 'shift':
      return (
        <svg {...common}>
          <path d="M 2 10 L 38 10" className="stroke-foreground" strokeWidth="1.2" opacity="0.4" />
          <path d="M 20 5 L 25 10 L 20 15 L 15 10 Z" className="fill-background stroke-accent-editorial" strokeWidth="1.8" />
          <circle cx="20" cy="10" r="8.5" fill="none" className="stroke-accent-editorial" strokeWidth="1.6" />
        </svg>
      );
  }
}

function Items() {
  return (
    <>
      <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {LEGEND.map((item) => (
          <li key={item.id} data-legend={item.id} className="flex items-start gap-3">
            <Swatch id={item.id} />
            <div className="min-w-0 text-sm leading-snug">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.note}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{LEGEND_NOTE}</p>
    </>
  );
}

/**
 * On a wide screen the legend is simply there, small, under the plate. On a
 * narrow one it is closed until asked for, so the chain comes first.
 */
export function ChainLegend({ collapsible = false }: { collapsible?: boolean }) {
  const headingId = `${useId()}-legend`;
  const [open, setOpen] = useState(false);

  if (!collapsible) {
    return (
      <section aria-labelledby={headingId} className="mt-6 border-t border-border pt-4">
        <h3 id={headingId} className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {CHAIN_COPY.controls.legend}
        </h3>
        <Items />
      </section>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section aria-labelledby={headingId} className="mt-6 border-t border-border pt-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-sm py-1 text-left',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            <span id={headingId} className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {CHAIN_COPY.controls.legend}
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              {open ? '−' : '+'}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Items />
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
