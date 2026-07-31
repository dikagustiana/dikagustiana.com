import { Link } from 'react-router-dom';
import heroTexture from '@/assets/hero-manga-texture.png';

export function HeroSection() {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: '#F8F7F4',
        paddingBottom: 'clamp(520px, 42.86vw, 840px)',
      }}
    >
      {/* Manga artwork — faint archival ink texture */}
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url(${heroTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.16,
          filter: 'grayscale(100%) contrast(1.05)',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 z-10 flex items-center">
        <div className="container max-w-[1920px] mx-auto px-6 lg:px-16">
          <div className="max-w-[55%] pt-8">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-sans font-bold tracking-tight mb-8"
              style={{ color: '#0F172A', lineHeight: 1.22 }}
            >
              Let's be insane and delusional.
              <br />
              We never know how many doors will open.
            </h1>

            <p
              className="text-base sm:text-lg font-sans font-normal leading-relaxed mb-12 max-w-lg"
              style={{ color: '#334155', letterSpacing: '0.025em' }}
            >
              Bridging finance, strategy, and data to create impact.
            </p>

            <Link
              to="#main-content"
              className="inline-block px-11 py-4 text-sm font-medium rounded transition-all duration-300"
              style={{
                color: '#0F172A',
                border: '2px solid #0F172A',
                backgroundColor: 'transparent',
                letterSpacing: '0.04em',
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
