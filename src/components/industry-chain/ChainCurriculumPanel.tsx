/**
 * The door from a joint into the curriculum.
 *
 * Opens only under the unit-economics lens, only for a joint the mapping
 * table has pinned a module to. Density lives here, not on the diagram:
 * module, then its lessons one level down. A lesson that is still a draft is
 * shown and labelled "Coming soon" BEFORE anyone can click it — as inert text,
 * never as a link that goes nowhere. That is the rule the finance track index
 * already follows, and this panel follows it to the letter.
 */

import { Link } from 'react-router-dom';
import { CHAIN_COPY, JOINT_LABELS, type JointId } from '@/data/industryChain';
import { essayUrl } from '@/lib/essayUrl';
import { useChainModules } from './useChainModules';

export function ChainCurriculumPanel({
  joint,
  moduleSlugs,
  onClose,
  panelId,
}: {
  joint: JointId;
  moduleSlugs: string[];
  onClose: () => void;
  panelId: string;
}) {
  const { data: modules, isLoading, isError } = useChainModules(moduleSlugs);

  return (
    <section
      id={panelId}
      aria-labelledby={`${panelId}-title`}
      className="mt-4 rounded-md border border-border bg-card p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {CHAIN_COPY.panel.heading}
          </p>
          <h3 id={`${panelId}-title`} className="mt-1 text-base font-semibold text-foreground">
            {JOINT_LABELS[joint]}
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

      {isLoading && (
        <div className="mt-4 space-y-2" aria-busy="true">
          <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
        </div>
      )}

      {isError && (
        <p className="mt-4 text-sm text-muted-foreground">
          The curriculum could not be loaded. The modules for this joint are still there; try again in a moment.
        </p>
      )}

      {modules && modules.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {modules.map((mod) => (
            <li key={mod.id} className="py-4 first:pt-0 last:pb-0">
              <Link
                to={`/finance/${mod.track_slug}/${mod.slug}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                {mod.track_title && (
                  <span className="block text-xs text-muted-foreground">{mod.track_title}</span>
                )}
                <span className="block font-semibold text-foreground group-hover:text-accent transition-colors">
                  {mod.title}
                </span>
              </Link>
              {mod.thesis && <p className="mt-1 text-sm text-muted-foreground">{mod.thesis}</p>}

              {mod.essays.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-l-2 border-border pl-4">
                  {mod.essays.map((essay) => {
                    const to = essay.published
                      ? essayUrl({ slug: essay.slug, section: 'finance', track: mod.track_slug, moduleSlug: mod.slug })
                      : null;
                    return (
                      <li key={essay.id} className="flex items-baseline gap-3 text-sm">
                        {to ? (
                          <Link to={to} className="text-foreground hover:text-accent transition-colors">
                            {essay.title}
                          </Link>
                        ) : (
                          // A real span, not a disabled link: nothing to click,
                          // nothing to focus. Muted, so it reads "planned".
                          <span className="cursor-default text-muted-foreground">{essay.title}</span>
                        )}
                        <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {essay.published ? CHAIN_COPY.panel.published : CHAIN_COPY.panel.comingSoon}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
