import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ReadingProgressProps {
  className?: string;
  /**
   * Selector for the element the bar measures. Defaults to the prose body:
   * measuring the whole document counted end matter and footer as "reading",
   * so the bar sat at ~88% when the article itself was already finished.
   */
  targetSelector?: string;
}

export function ReadingProgress({
  className,
  targetSelector = 'article.prose-editorial',
}: ReadingProgressProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;

    // One layout read per FRAME, not per scroll event: the handler only
    // schedules; the rAF callback does the scrollHeight read and the write.
    // No React state either — a re-render per scroll event is the same cost
    // wearing a different hat.
    const update = () => {
      raf = 0;
      // Scope to the article: 100% means the END OF THE ARTICLE has entered
      // the viewport, not the end of the footer. Falls back to the document
      // when no article exists (defensive; every consumer renders one).
      const target = document.querySelector<HTMLElement>(targetSelector);
      let progress: number;
      if (target) {
        const rect = target.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const end = top + rect.height - window.innerHeight;
        progress =
          end > top
            ? Math.min(1, Math.max(0, (window.scrollY - top) / (end - top)))
            : window.scrollY >= top
              ? 1
              : 0;
      } else {
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        progress =
          docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
      }
      if (barRef.current) {
        // scaleX, not width: transform skips layout and paint entirely.
        barRef.current.style.transform = `scaleX(${progress})`;
      }
      if (trackRef.current) {
        trackRef.current.setAttribute(
          'aria-valuenow',
          String(Math.round(progress * 100))
        );
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetSelector]);

  return (
    <div
      ref={trackRef}
      className={cn(
        'sticky top-16 left-0 right-0 h-0.5 z-40 bg-muted/30',
        className
      )}
      role="progressbar"
      aria-valuenow={0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-primary"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
