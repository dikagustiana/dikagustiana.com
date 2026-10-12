import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { FS_TABS, type FsTab } from '@/lib/fs';

/**
 * The four statement tabs (PRD §A7). A tablist of buttons on the site's own
 * tokens; the repo has no tabs primitive and this adds no dependency. Arrow
 * keys, Home and End move between tabs, as the ARIA tabs pattern expects.
 */
export function FsTabs({ active, onChange, panelId }: { active: FsTab; onChange: (tab: FsTab) => void; panelId: string }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = FS_TABS.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(FS_TABS[next].key);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Statements" className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border">
      {FS_TABS.map((t, i) => {
        const selected = t.key === active;
        return (
          <button
            key={t.key}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="tab"
            id={`fs-tab-${t.key}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              '-mb-px border-b-2 py-2 text-sm font-medium transition-colors',
              selected ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.tab}
          </button>
        );
      })}
    </div>
  );
}
