/**
 * "On this page" (sheet-first PRD R3): the sections under the model, in
 * their order, as anchors. On a phone the row scrolls sideways.
 */
import { useId } from 'react';
import { COPY } from '@/lib/finance-in-action/copy';

export function SectionNav({ sections }: { sections: { id: string; title: string }[] }) {
  const id = useId();
  return (
    <nav aria-labelledby={id} className="mb-8 flex items-center gap-3 border-b border-border">
      <span id={id} className="hidden shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
        {COPY.onThisPage}
      </span>
      <ul className="-mx-1 flex min-w-0 gap-x-1 overflow-x-auto px-1 text-sm">
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-3 text-accent underline-offset-4 hover:bg-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
