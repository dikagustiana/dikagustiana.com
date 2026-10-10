/**
 * The viewer's actions (PRD site sweep 2026-10, R4.3), as the reference's toolbar orders them: copy the
 * selected cell's address, full screen, and Download .xlsx as the one primary action. The download is the
 * owner's workbook itself, saved under D11's name; nothing is built in the browser.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Maximize2, Minimize2 } from 'lucide-react';
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { WORKBOOK_XLSX_URL } from '@/lib/workbook/method';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  /** The selected cell as Excel writes it on another sheet: `'Consol SoFP 24'!D9`. */
  address: string;
  fullScreen: boolean;
  onFullScreen: () => void;
  className?: string;
}

const BUTTON =
  'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [@media(pointer:coarse)]:h-11 [&_svg]:h-4 [&_svg]:w-4';
const QUIET = 'border-input bg-popover text-foreground hover:bg-secondary';

export function Toolbar({ address, fullScreen, onFullScreen, className }: ToolbarProps) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(address);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
    timer.current = setTimeout(() => setCopied('idle'), 2000);
  };

  return (
    <div className={cn('relative flex flex-wrap items-center gap-2', className)}>
      <button type="button" onClick={copy} className={cn(BUTTON, QUIET)}>
        {copied === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {COPY.copyAddress}
      </button>
      <button type="button" onClick={onFullScreen} aria-pressed={fullScreen} className={cn(BUTTON, QUIET, fullScreen && 'bg-secondary')}>
        {fullScreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
        {COPY.fullScreen}
      </button>
      <a href={WORKBOOK_XLSX_URL} download={COPY.downloadName} className={cn(BUTTON, 'border-primary bg-primary text-primary-foreground hover:bg-primary/90')}>
        <Download aria-hidden="true" />
        {COPY.download}
      </a>
      {/* Under the buttons, out of the row, so that while it is empty it moves nothing. */}
      <span role="status" className="absolute right-0 top-full mt-1 text-xs text-muted-foreground">
        {copied === 'copied' ? COPY.copied : copied === 'failed' ? COPY.copyFailed : ''}
      </span>
    </div>
  );
}
