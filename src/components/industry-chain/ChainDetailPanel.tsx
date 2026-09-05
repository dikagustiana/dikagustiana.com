/**
 * The one panel every element writes into. It holds no content of its own —
 * labels come from CHAIN_META, values from the resolved element.
 *
 * `aria-live="polite"` because selection changes the panel without moving
 * focus, so a screen reader has to be told the panel changed.
 */

import { Link } from 'react-router-dom';
import { CHAIN_META } from '@/data/industryChain';
import { universalEssayUrl } from '@/lib/essayUrl';
import type { PanelModel } from './chainModel';

const P = CHAIN_META.panel;

export function ChainDetailPanel({
  panelId,
  model,
  lensLabel,
  litUnderLens,
}: {
  panelId: string;
  model: PanelModel | null;
  /** The active macro variable, if the lens is on. */
  lensLabel?: string;
  /** Whether the element in the panel is part of that lens. */
  litUnderLens: boolean;
}) {
  return (
    <div
      id={panelId}
      role="region"
      aria-label={P.regionLabel}
      aria-live="polite"
      className="min-h-[9.5rem] rounded-md border border-border bg-card p-4"
    >
      {!model ? (
        <div>
          <p className="text-sm text-muted-foreground">{P.empty}</p>
          <p className="mt-1 text-xs text-muted-foreground/80">{P.emptyHint}</p>
        </div>
      ) : (
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {model.categoryLabel}
          </p>
          <h4 className="mt-1 text-base font-semibold text-foreground">{model.label}</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{model.definition}</p>

          {model.detail.length > 0 && (
            <ul className="mt-2 space-y-1">
              {model.detail.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-muted-foreground">
                  {line}
                </li>
              ))}
            </ul>
          )}

          {model.rows.length > 0 && (
            <dl className="mt-3 space-y-2">
              {model.rows.map((row) => (
                <div key={row.label}>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-foreground/90">{row.values.join(' · ')}</dd>
                </div>
              ))}
            </dl>
          )}

          {model.micro && (
            <div className="mt-3 border-l-2 border-accent pl-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {P.micro}
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{model.micro.label}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {model.micro.description}
              </p>
            </div>
          )}

          {litUnderLens && lensLabel && (
            <p className="mt-3 text-xs text-muted-foreground">
              {P.underLens}: <span className="font-medium text-foreground">{lensLabel}</span>
            </p>
          )}

          {model.essaySlugs.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {P.essays}
              </p>
              <ul className="mt-1 space-y-0.5">
                {model.essaySlugs.map((slug) => (
                  <li key={slug}>
                    <Link
                      to={universalEssayUrl(slug)}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      {slug}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
