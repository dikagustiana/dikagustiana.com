interface ProcessStepProps {
  number: number;
  title: string;
  description: string;
}

export function ProcessStep({ number, title, description }: ProcessStepProps) {
  const label = String(number).padStart(2, '0');

  return (
    <div className="flex flex-col items-center text-center flex-1 min-w-0">
      {/* Circle */}
      <div className="w-10 h-10 rounded-full border-2 border-accent flex items-center justify-center text-accent text-sm font-semibold shrink-0">
        {label}
      </div>
      {/* Title */}
      <h4 className="font-semibold text-foreground text-sm mt-3 mb-1">{title}</h4>
      {/* Description */}
      <p className="text-muted-foreground text-xs leading-relaxed max-w-[180px]">{description}</p>
    </div>
  );
}
