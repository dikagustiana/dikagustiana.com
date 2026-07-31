interface KeyConceptCardProps {
  title: string;
  description: string;
}

export function KeyConceptCard({ title, description }: KeyConceptCardProps) {
  return (
    <div className="border border-border bg-card p-5">
      <h4 className="font-semibold text-foreground text-sm mb-2">{title}</h4>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
