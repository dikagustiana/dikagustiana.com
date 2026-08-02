import { Link } from 'react-router-dom';

/**
 * The hero is the site's statement — plain type on paper, no artwork.
 * The copy is the owner's, verbatim. The 3.3 MB of hero imagery is deleted;
 * the clamp(520px…) padding that existed to hold it went with it.
 */
export function HeroSection() {
  return (
    <section
      className="w-full"
      style={{ backgroundColor: '#F8F7F4' }}
    >
      <div className="container max-w-[1920px] mx-auto px-6 lg:px-16 py-20 md:py-28">
        <div className="max-w-3xl">
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
    </section>
  );
}
