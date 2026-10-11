import { fullDate } from '@/lib/formatDate';
import type { TrackerSource } from '@/lib/tracker';

/**
 * The consolidated, numbered source list (PRD §B5, item 5). The numbers are
 * the ones the inline [n] references use (numberSources in src/lib/tracker.ts).
 */
export function SourceList({ sources }: { sources: TrackerSource[] }) {
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby="sources-title" className="border-t border-border pt-10">
      <h2 id="sources-title" className="text-2xl text-foreground">
        Sources
      </h2>
      <p className="mt-2 text-base text-muted-foreground">
        Primary documents only: the regulation, decision, plan or official release itself.
      </p>
      <ol className="mt-6 space-y-4">
        {sources.map((source, i) => {
          const n = i + 1;
          return (
            <li key={source.url} id={`source-${n}`} className="flex scroll-mt-24 gap-3 text-base leading-relaxed text-foreground">
              <span className="w-9 shrink-0 tabular-nums text-muted-foreground">[{n}]</span>
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {source.issuer && <>{source.issuer}. </>}
                <cite className="not-italic font-semibold">{source.title}</cite>.{' '}
                {source.doc_no && <>{source.doc_no}. </>}
                {source.date && <>{fullDate(source.date)}. </>}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2 hover:opacity-80"
                >
                  Open the document
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                {source.accessed && <span className="text-muted-foreground"> · accessed {fullDate(source.accessed)}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
