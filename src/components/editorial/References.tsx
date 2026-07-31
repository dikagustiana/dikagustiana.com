import { ExternalLink, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reference {
  label: string;
  url?: string;
}

interface ReferencesProps {
  references: (string | Reference)[];
  className?: string;
}

export function References({ references, className }: ReferencesProps) {
  if (!references || references.length === 0) return null;

  const normalizedRefs = references.map(ref => 
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
