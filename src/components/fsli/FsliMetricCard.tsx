import { cn } from '@/lib/utils';

interface FsliMetricCardProps {
  label: string;
  value: string;
  variant?: 'primary' | 'muted' | 'accent';
  className?: string;
}

export function FsliMetricCard({ label, value, variant = 'primary', className }: FsliMetricCardProps) {
  return (
    <div className={cn(
      "rounded-lg p-4 border",
      variant === 'primary' && "bg-card border-primary/30",
      variant === 'muted' && "bg-card border-muted",
      variant === 'accent' && "bg-primary text-primary-foreground border-primary",
      className
    )}>
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className={cn(
        "text-2xl font-bold",
        variant === 'primary' && "text-primary",
        variant === 'muted' && "text-muted-foreground",
        variant === 'accent' && "text-primary-foreground"
      )}>
        {variant !== 'accent' && '$'}{value}
      </div>
      {variant !== 'accent' && (
        <div className="text-xs text-muted-foreground mt-1">Thousands USD</div>
      )}
    </div>
  );
}
