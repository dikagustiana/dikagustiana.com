import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyTakeawaysProps {
  takeaways: string[];
  className?: string;
}

export function KeyTakeaways({ takeaways, className }: KeyTakeawaysProps) {
  if (!takeaways || takeaways.length === 0) return null;

  return (
    <div className={cn(
      "bg-muted/50 border border-border rounded-lg p-6 my-10",
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Key Takeaways</h3>
      </div>
      <ul className="space-y-3">
        {takeaways.map((takeaway, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center mt-0.5">
              {idx + 1}
            </span>
            <span className="text-muted-foreground">{takeaway}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
