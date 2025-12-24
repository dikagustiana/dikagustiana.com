import { CheckCircle2 } from 'lucide-react';

interface FsliHeroSectionProps {
  title: string;
  description: string;
  keyPoints: string[];
  imageUrl?: string;
}

export function FsliHeroSection({ title, description, keyPoints, imageUrl }: FsliHeroSectionProps) {
  const defaultImage = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop';

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      {/* Image Block */}
      <div className="space-y-2">
        <div className="rounded-lg overflow-hidden bg-muted aspect-[4/3]">
          <img 
            src={imageUrl || defaultImage}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
        <p className="text-xs text-muted-foreground">Photo: Unsplash</p>
      </div>

      {/* Key Points Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-4">Key points</h3>
        <ul className="space-y-4">
          {keyPoints.map((point, index) => (
            <li key={index} className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-sm leading-relaxed">
                {point}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}