import { Link } from 'react-router-dom';
import heroTexture from '@/assets/hero-manga-texture.webp';
import { scrollBehavior } from '@/lib/motion';

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
 *
 * SHAPE: exactly two text blocks (h1, then one paragraph) and then the CTA.
 * The owner's name does NOT appear here — it belongs where LinkedIn or email
 * is attached, which is the footer contact line. Do not reintroduce a byline.
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

            {/* A third paragraph was removed deliberately: it carried a byline, and the name belongs only where contact links live (the footer); its mb-12 moved up here so the CTA keeps its spacing. See docs/DECISIONS.md. */}
            <p
              className="text-lg sm:text-xl font-sans font-normal leading-relaxed mb-12"
              style={{ color: '#0F172A', letterSpacing: '0.01em' }}
            >
              Not just on paper &mdash; it should drive everything. How numbers tell us
              the past &mdash; and the probability of the future.
            </p>

            {/* Hover/press/focus are Tailwind classes, not mutated inline
                style. The previous version set style.backgroundColor from
                onMouseEnter/onMouseLeave, which meant: no focus ring at all
                (so the homepage's only CTA was invisible to keyboard users),
                no active state, and a hover tint that could stick on touch
                because mouseleave does not reliably fire there. */}
            <Link
              to="#sections"
              className="inline-block rounded border-2 border-[#0F172A] px-11 py-4 text-sm font-medium tracking-[0.04em] text-[#0F172A] transition-colors duration-200 hover:bg-[#0F172A]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F7F4] active:bg-[#0F172A]/[0.12]"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById('sections')
                  // NOT a hard-coded 'smooth'. An explicit behavior argument
                  // overrides the computed scroll-behavior, so it bypasses the
                  // prefers-reduced-motion gate in src/index.css:189-193 that
                  // the CSS rule is under. scrollBehavior() returns 'instant'
                  // for readers who asked for reduced motion.
                  ?.scrollIntoView({ behavior: scrollBehavior() });
              }}
            >
              Read the essays
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
