/**
 * The door from a joint into the curriculum.
 *
 * Rendered inside the joint's panel, only for a joint the mapping table has
 * pinned a module to. Density lives here, not on the diagram: module, then
 * its lessons one level down. A lesson that is still a draft is shown and
 * labelled "Coming soon" BEFORE anyone can click it — as inert text, never
 * as a link that goes nowhere. That is the rule the finance track index
 * already follows, and this list follows it to the letter.
 */

import { Link } from 'react-router-dom';
import { CHAIN_COPY } from '@/data/industryChain';
import { essayUrl } from '@/lib/essayUrl';
import { useChainModules } from './useChainModules';

export function ChainCurriculumList({ moduleSlugs }: { moduleSlugs: string[] }) {
  const { data: modules, isLoading, isError } = useChainModules(moduleSlugs);

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h4 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{CHAIN_COPY.panel.curriculumHeading}</h4>

      {isLoading && (
        <div className="mt-3 space-y-2" aria-busy="true">
          <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
        </div>
      )}

      {isError && (
        <p className="mt-3 text-sm text-muted-foreground">
          The curriculum could not be loaded. The modules for this joint are still there; try again in a moment.
        </p>
      )}

      {modules && modules.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {modules.map((mod) => (
            <li key={mod.id} className="py-4 first:pt-0 last:pb-0">
              <Link
                to={`/finance/${mod.track_slug}/${mod.slug}`}
                className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {mod.track_title && <span className="block text-xs text-muted-foreground">{mod.track_title}</span>}
                <span className="block font-semibold text-foreground transition-colors group-hover:text-accent">{mod.title}</span>
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
                          <Link to={to} className="text-foreground transition-colors hover:text-accent">
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
    </div>
  );
}
