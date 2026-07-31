import { LucideIcon } from 'lucide-react';

interface ConsolidationProcessStepProps {
  stepNumber: number;
  icon: LucideIcon;
  title: string;
  description: string;
  showArrow?: boolean;
}

export function ConsolidationProcessStep({
  stepNumber,
  icon: Icon,
  title,
  description,
  showArrow = false,
}: ConsolidationProcessStepProps) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="w-12 h-12 border-2 border-border bg-card flex items-center justify-center rounded-sm">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <p className="text-xs font-semibold text-muted-foreground mt-3 tracking-wide">
        STEP {String(stepNumber).padStart(2, '0')}
      </p>
      <h4 className="font-semibold text-foreground text-sm mt-1">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed mt-1 max-w-[160px]">{description}</p>
      {showArrow && (
        <div className="absolute top-6 -right-3 translate-x-full hidden lg:block">
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
            <line x1="0" y1="6" x2="18" y2="6" className="stroke-border" strokeWidth="1.5" />
            <polygon points="18,2 24,6 18,10" className="fill-border" />
          </svg>
        </div>
      )}
    </div>
  );
}
