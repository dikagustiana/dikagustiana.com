import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { Correction, EvidenceStatus, Source } from '@/data/trackerIssues';
import { EVIDENCE_LABEL, EVIDENCE_MEANS } from '@/data/trackerIssues';
import { fullDate } from '@/lib/formatDate';


/**
 * The tracker's evidence furniture: a correction, a source list, and the one
 * word that says where an entry's claims stand.
 *
 * Three rules this file exists to hold.
 *
 *   1. A CORRECTION IS NOT AN EDIT. The entry body below it is exactly what
 *      was published. The correction sits ABOVE the claim it corrects so that
 *      nobody reads the claim first and the qualification second, and it
 *      carries the date it was issued, never the date of the entry.
 *   2. A CORRECTION IS NOT A RETRACTION OF EVERYTHING. Every correction says
 *      what it does to the conclusion, including where the conclusion still
 *      stands. That is the `effect` line, and it is not optional.
 *   3. UNCHECKED IS NOT FALSE. `unsupported` means nobody has produced a
 *      source; it is a different claim from `contradicted`, and the two must
 *      never share a treatment.
 *
 * Told by shape and by word, not by colour alone: the correction is a bordered
 * block with a heading, the evidence status is a labelled line. A reader with
 * no colour vision, and a screen reader, get the same reading.
 */

export function CorrectionNotice({ correction, className }: { correction: Correction; className?: string }) {
  return (
    <div
      className={`border-l-2 border-foreground bg-muted/40 pl-4 pr-4 py-4 ${className ?? ''}`}
      role="note"
      aria-label="Correction"
    >
      <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-foreground mb-3">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        Correction issued {fullDate(correction.issuedAt)}
      </p>

      <dl className="space-y-2.5 text-[15px] leading-[1.6]">
        <div>
          <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">What was claimed</dt>
          <dd className="text-foreground/90">{correction.claim}</dd>
        </div>
        <div>
          <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">What is the case</dt>
          <dd className="text-foreground">{correction.correction}</dd>
        </div>
        <div>
          <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            What it does to the conclusion
          </dt>
          <dd className="text-foreground">{correction.effect}</dd>
        </div>
      </dl>

      {correction.sources.length > 0 && <SourceList sources={correction.sources} className="mt-4" />}
    </div>
  );
}

export function SourceList({ sources, className }: { sources: readonly Source[]; className?: string }) {
  if (sources.length === 0) return null;
  return (
    <div className={className}>
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Sources</p>
      <ul className="space-y-2.5">
        {sources.map((source) => (
          <li key={source.url} className="text-[14px] leading-snug">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1 font-medium text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span>{source.label}</span>
              <ExternalLink className="h-3 w-3 mt-1 flex-shrink-0" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <span className="block text-muted-foreground">
              Published {fullDate(source.publishedAt)}. {source.supports}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Where an entry's claims stand. Omitting `evidence` means nobody has said,
 * which is `unsupported` — the status is never absent from the page, because
 * an absent status is exactly what let unsourced assertions read as reporting.
 */
export function EvidenceNote({ status, sources }: { status?: EvidenceStatus; sources?: readonly Source[] }) {
  const resolved: EvidenceStatus = status ?? 'unsupported';
  return (
    <div className="mt-10 border-t border-border/50 pt-5">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        Evidence · {EVIDENCE_LABEL[resolved]}
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground max-w-[620px]">
        {EVIDENCE_MEANS[resolved]}
      </p>
      {sources && sources.length > 0 && <SourceList sources={sources} className="mt-4" />}
    </div>
  );
}
