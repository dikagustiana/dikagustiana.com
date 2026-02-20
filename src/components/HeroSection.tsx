import { Link } from 'react-router-dom';
import heroImage from '@/assets/hero-swordsman.png';

export function HeroSection() {
  return (
    <section className="relative w-full h-[85vh] min-h-[600px] overflow-hidden bg-[hsl(215,28%,8%)]">
      {/* Background image — right-aligned, heavily darkened */}
      <div
        className="absolute inset-0 bg-cover bg-right bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        {/* Heavy dark overlay — 85% opacity, desaturated */}
        <div className="absolute inset-0 bg-[hsl(215,28%,6%)] opacity-[0.85]" />
        {/* Left-to-right gradient for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, hsl(215 28% 6% / 0.98) 0%, hsl(215 28% 6% / 0.92) 40%, hsl(215 28% 6% / 0.7) 65%, hsl(215 28% 6% / 0.5) 100%)',
          }}
        />
        {/* Desaturation filter on the image layer */}
        <div className="absolute inset-0 mix-blend-saturation bg-[hsl(215,20%,15%)] opacity-60" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container max-w-[1920px] mx-auto px-6 lg:px-16">
          <div className="max-w-2xl">
            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-sans font-bold text-white leading-[1.15] tracking-tight mb-6">
              Let's be insane and delusional.
              <br />
              We never know how many doors will open.
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg text-[hsl(215,15%,65%)] font-sans font-normal leading-relaxed mb-10 max-w-lg">
              Bridging finance, strategy, and data to create impact.
            </p>

            {/* Ghost CTA */}
            <Link
              to="#main-content"
              className="inline-block px-8 py-3 border border-white/30 text-white text-sm font-medium tracking-wide rounded-sm transition-all duration-300 hover:border-white/60 hover:bg-white/5"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById('main-content')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore My Work
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
