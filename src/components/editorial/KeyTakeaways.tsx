import { cn } from '@/lib/utils';

interface KeyTakeawaysProps {
  takeaways: string[];
  className?: string;
}

// Heading follows the reading path's vocabulary ("establishes"); owner
// question Q19 may restore "Key takeaways". No icon and no numbered circles:
// an ordered list already numbers itself.
export const TAKEAWAYS_HEADING = 'What this essay establishes';

export function KeyTakeaways({ takeaways, className }: KeyTakeawaysProps) {
  if (!takeaways || takeaways.length === 0) return null;

  return (
    <div className={cn(
      "bg-muted/50 border border-border rounded-lg p-6 my-10",
      className
    )}>
      <h3 className="font-semibold text-foreground mb-4">{TAKEAWAYS_HEADING}</h3>
      <ol className="list-decimal space-y-3 pl-5 text-muted-foreground marker:text-foreground">
        {takeaways.map((takeaway, idx) => (
          <li key={idx} className="pl-1">{takeaway}</li>
        ))}
      </ol>
    </div>
  );
}
