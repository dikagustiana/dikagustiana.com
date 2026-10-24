import { ExternalLink, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { publicReferences } from '@/lib/editorial/referenceAnnotations';

interface Reference {
  label: string;
  url?: string;
}

interface ReferencesProps {
  references: (string | Reference)[];
  className?: string;
  /**
   * For a reader, not an admin (docs/prd/2026-10-fia-fixes item 10): drop the
   * VERIFIED / UNVERIFIED / UNAVAILABLE / MISNUMBERED notes, and an UNAVAILABLE
   * reference the body does not cite. `citedIndexes` are the body's citations.
   */
  hideAnnotations?: boolean;
  citedIndexes?: Set<number>;
}

export function References({ references, className, hideAnnotations = false, citedIndexes }: ReferencesProps) {
  const shown = hideAnnotations ? publicReferences(references ?? [], citedIndexes ?? new Set()) : references;
  if (!shown || shown.length === 0) return null;

  const normalizedRefs = shown.map(ref =>
    typeof ref === 'string' ? { label: ref } : ref
  );

  return (
    <div className={cn(
      "border-t border-border pt-8 mt-10",
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">References</h3>
      </div>
      <ol className="space-y-2 text-sm list-decimal list-inside">
        {normalizedRefs.map((ref, idx) => (
          <li key={idx} className="text-muted-foreground">
            {ref.url ? (
              <a 
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                {ref.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              ref.label
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
