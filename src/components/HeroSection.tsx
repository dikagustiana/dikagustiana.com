import { ReactNode } from 'react';
import heroImage from '@/assets/hero-illustration.jpg';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaLink?: string;
  children?: ReactNode;
}

export function HeroSection({ title, subtitle, ctaText, ctaLink }: HeroSectionProps) {
  const scrollToContent = () => {
    const mainContent = document.getElementById('main-content');
    mainContent?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 hero-gradient" />
      
      {/* Content */}
      <div className="relative z-10 section-container text-center py-20">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6 animate-fade-in max-w-4xl mx-auto">
          {title}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {subtitle}
        </p>
        {ctaText && (
          <Button 
            size="lg"
            className="animate-fade-in-up bg-secondary hover:bg-secondary/80 text-secondary-foreground px-8 py-6 text-base"
            style={{ animationDelay: '0.4s' }}
            onClick={ctaLink ? undefined : scrollToContent}
          >
            {ctaText}
          </Button>
        )}
      </div>
    </section>
  );
}
