import { Link } from 'react-router-dom';
import heroTexture from '@/assets/hero-manga-texture.webp';

/**
 * The hero: the owner's statement, verbatim, over the manga ink texture.
 *
 * The artwork is a DELIBERATE KEEP — an earlier session deleted it on a
 * misread instruction and the owner reversed that. The weight problem was
 * the format, not the artwork: the 1.1 MB lossless PNG is now a 156 KB WebP
 * at the same 1536×1024. If the image ever fails to load, the paper
 * background (#F8F7F4) keeps the text readable — that is the fallback; every
 * browser this app runs in (ES2020 modules) decodes WebP.
 *
 * min-h 520px and max-w-[55%] on the text exist to accommodate the artwork.
 * Do not reclaim that space while the artwork stays.
 */
export function HeroSection() {
  return (
    <section
      className="relative w-full overflow-hidden min-h-[520px] flex items-center"
      style={{ backgroundColor: '#F8F7F4' }}
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
      <div className="relative z-10 w-full">
        <div className="container max-w-[1920px] mx-auto px-6 lg:px-16 py-16 md:py-20">
          <div className="max-w-[55%]">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-sans font-bold tracking-tight mb-8"
              style={{ color: '#0F172A', lineHeight: 1.22 }}
            >
              Let&rsquo;s get insanely, damn good at numbers.
            </h1>

            <p
              className="text-lg sm:text-xl font-sans font-normal leading-relaxed mb-6"
              style={{ color: '#0F172A', letterSpacing: '0.01em' }}
            >
              Not just on paper &mdash; it should drive everything. How numbers tell us
              the past &mdash; and the probability of the future.
            </p>

            <p
              className="text-base sm:text-lg font-sans font-normal leading-relaxed mb-12 max-w-xl"
              style={{ color: '#334155', letterSpacing: '0.025em' }}
            >
              Essays and a curriculum on corporate finance, accounting, and the
              economics of the green transition. By Dika Gustiana.
            </p>

            <Link
              to="#sections"
              className="inline-block px-11 py-4 text-sm font-medium rounded transition-[background-color,color,box-shadow] duration-300"
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
                  .getElementById('sections')
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
