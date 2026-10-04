/** Shown whenever a package is not from filings: one sentence on where its figures come from (brief §5.3). */
import { PROVENANCES, byId, type Provenance } from '@/lib/finance-in-action/constants';

export function ProvenanceNote({ provenance }: { provenance: Provenance }) {
  if (provenance === 'filings') return null;
  const note = byId(PROVENANCES, provenance)?.note;
  if (!note) return null;
  return (
    <p role="note" className="mb-8 rounded-md border border-dashed border-foreground/40 bg-muted/60 px-4 py-3 text-sm text-foreground">
      {note}
    </p>
  );
}
