import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ReadingProgressProps {
  className?: string;
}

export function ReadingProgress({ className }: ReadingProgressProps) {
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
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
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
  }, []);

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
