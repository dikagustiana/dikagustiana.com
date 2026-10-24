/**
 * The viewer's one control (site cleanup 2026-10, A3, A6, A8; 03-DESIGN §1–2): Full screen, and in full
 * screen its Exit. Copy cell address and Download .xlsx are gone.
 *
 * Out of full screen it is a quiet button with its label, above the tabs at the right. In full screen it
 * stands at the right end of the tabs row: the Minimize2 icon, its label "Exit" from `md` up, named "Exit
 * full screen" for a screen reader at every width.
 */
import { Maximize2, Minimize2 } from 'lucide-react';
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { cn } from '@/lib/utils';

interface FullScreenButtonProps {
  fullScreen: boolean;
  onToggle: () => void;
  className?: string;
}

const BUTTON =
  'inline-flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-popover px-3 text-[13px] font-medium text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [@media(pointer:coarse)]:h-11 [&_svg]:h-4 [&_svg]:w-4';

export function FullScreenButton({ fullScreen, onToggle, className }: FullScreenButtonProps) {
  if (fullScreen) {
    return (
      <button type="button" onClick={onToggle} aria-label={COPY.exitFullScreen} title={COPY.exitFullScreen} className={cn(BUTTON, 'px-2.5 md:px-3', className)}>
        <Minimize2 aria-hidden="true" />
        <span className="hidden md:inline">{COPY.exit}</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onToggle} className={cn(BUTTON, className)}>
      <Maximize2 aria-hidden="true" />
      {COPY.fullScreen}
    </button>
  );
}
