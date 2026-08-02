import { useState } from 'react';
import { Share2, Check, Link2 } from 'lucide-react';
import { SITE_ORIGIN } from '@/lib/siteOrigin';

interface ShareButtonProps {
  title: string;
  className?: string;
}

/**
 * Share the essay: `navigator.share()` where the platform offers a share
 * sheet (mobile), copy-the-link everywhere else. The URL shared is the
 * CANONICAL one (production origin + path), never a preview hostname.
 */
export function ShareButton({ title, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${SITE_ORIGIN}${window.location.pathname}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Dismissed the sheet, or share failed — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (very old browser / permissions): last resort.
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground transition-colors ${className ?? ''}`}
      aria-label="Share this essay"
      title="Share this essay"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-primary" />
          Copied
        </>
      ) : (
        <>
          {typeof navigator !== 'undefined' && 'share' in navigator ? (
            <Share2 className="h-4 w-4" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          Share
        </>
      )}
    </button>
  );
}
