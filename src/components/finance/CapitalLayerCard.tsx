/**
 * CapitalLayerCard — Full-width layer introduction card.
 * Light theme. Warm grey. Minimal. Institutional.
 */

interface CapitalLayerCardProps {
  layerNumber: string;
  layerName: string;
  narrative: string;
}

export function CapitalLayerCard({ layerNumber, layerName, narrative }: CapitalLayerCardProps) {
  return (
    <div className="bg-muted/40 border border-border rounded-sm px-6 py-5 mb-4">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/70 block mb-1">
        Layer {layerNumber}
      </span>
      <h2 className="text-lg font-display font-bold text-foreground tracking-tight mb-2">
        {layerName}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
        {narrative}
      </p>
    </div>
  );
}
