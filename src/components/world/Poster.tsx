/**
 * The frame's first paint, before the world's chunk has arrived: the same
 * section wrapper, the title at the rank the page gives it, and the poster
 * in a stage of the same proportions, so the page's largest paint happens
 * as soon as the route renders and nothing moves when WorldFrame takes
 * over (it draws the same image at the same place). Styled inline because
 * the world's stylesheet travels with its chunk. Only ever rendered with
 * the flag on, as the Suspense fallback of the lazy WorldSection.
 */
import { TITLE } from '@/lib/world/constants';

export function WorldPoster({ heading }: { heading: 'h1' | 'h2' }) {
  const H = heading;
  return (
    <section id="industry-chain" className="border-b border-border py-12">
      <div className="container">
        <div className="world-frame" data-world="loading" style={{ display: 'grid', gap: '0.75rem' }}>
          <header><H className="text-2xl font-display font-semibold tracking-tight">{TITLE}</H></header>
          <div className="world-frame__stage" style={{ position: 'relative', aspectRatio: '16 / 9', minHeight: 420, maxHeight: '78vh', overflow: 'hidden', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', background: 'hsl(var(--background))' }}>
            <img className="world-frame__poster" src="/world/poster-far.svg" alt="" width={1600} height={952} decoding="async" fetchPriority="high" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
