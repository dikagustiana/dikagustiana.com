import { Link } from 'react-router-dom';
import { ArrowRight, FileText, BarChart3, BookOpen, TrendingUp, DollarSign, Award, Leaf, Globe, Lightbulb } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  FileText, BarChart3, BookOpen, TrendingUp, DollarSign, Award, Leaf, Globe, Lightbulb
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: string;
  linkUrl?: string;
  linkText?: string;
}

export function FeatureCard({ title, description, icon = 'FileText', linkUrl, linkText = 'Learn More' }: FeatureCardProps) {
  const IconComponent = iconMap[icon] || FileText;

  const CardContent = (
    <>
      <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center mb-4 border border-border">
        <IconComponent className="w-6 h-6 text-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-card-light-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">{description}</p>
      {linkUrl && (
        <span className="link-accent text-sm">
          {linkText} <ArrowRight className="w-4 h-4" />
        </span>
      )}
    </>
  );

  if (linkUrl) {
    return (
      <Link to={linkUrl} className="card-feature block">
        {CardContent}
      </Link>
    );
  }

  return <div className="card-feature">{CardContent}</div>;
}
