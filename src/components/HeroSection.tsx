import { Link } from 'react-router-dom';
import heroTexture from '@/assets/hero-manga-texture.png';

export function HeroSection() {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: '#F5F5F3',
        /* 21:9 aspect ratio via padding */
        paddingBottom: 'clamp(500px, 42.86vw, 820px)',
      }}
    >
      {/* Manga artwork as subtle ink texture */}
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url(${heroTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.22,
          filter: 'grayscale(100%) contrast(1.1)',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Content — positioned in left-center third */}
      <div className="absolute inset-0 z-10 flex items-center">
        <div className="container max-w-[1920px] mx-auto px-6 lg:px-16">
          <div className="max-w-[60%]">
            {/* Headline */}
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-sans font-bold leading-[1.18] tracking-tight mb-6"
              style={{ color: '#0F172A' }}
            >
              Let's be insane and delusional.
              <br />
              We never know how many doors will open.
            </h1>

            {/* Sub-headline */}
            <p
              className="text-base sm:text-lg font-sans font-normal leading-relaxed mb-10 max-w-lg tracking-wide"
              style={{ color: '#475569' }}
            >
              Bridging finance, strategy, and data to create impact.
            </p>

            {/* Ghost CTA */}
            <Link
              to="#main-content"
              className="inline-block px-10 py-3.5 text-sm font-medium tracking-wide rounded transition-all duration-300"
              style={{
                color: '#0F172A',
                border: '1.5px solid #0F172A',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(15, 23, 42, 0.06)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById('main-content')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Enter the Think Tank
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
