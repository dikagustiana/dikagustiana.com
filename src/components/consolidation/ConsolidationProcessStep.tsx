interface ConsolidationProcessStepProps {
  stepNumber: number;
  title: string;
  description: string;
}

export function ConsolidationProcessStep({
  stepNumber,
  title,
  description,
}: ConsolidationProcessStepProps) {
  return (
    <div className="border-t-2 border-border pt-3">
      <p className="text-xs font-semibold text-muted-foreground tracking-wide">
        STEP {String(stepNumber).padStart(2, '0')}
      </p>
      <h4 className="font-semibold text-foreground text-sm mt-1">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{description}</p>
    </div>
  );
}
