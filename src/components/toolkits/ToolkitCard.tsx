/**
 * One published toolkit on /finance/toolkits (docs/prd/finance-restructure §3): title, purpose,
 * `xlsx · v1.2 · updated 24 Oct 2026`, `From: T4 · <module>`, and a Download button that names the file.
 * Older versions sit under "Previous versions", each still downloadable: a version's file is never
 * replaced, so its link keeps opening that version.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signedToolkitUrl } from '@/lib/toolkitFile';
import {
  formatDate,
  moduleLabel,
  modulePath,
  toolkitAnchor,
  versionFileName,
  type Toolkit,
  type ToolkitVersion,
} from '@/hooks/queries/useToolkits';

function DownloadButton({ slug, version, variant }: { slug: string; version: ToolkitVersion; variant: 'default' | 'link' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = versionFileName(version);
  const go = async () => {
    setBusy(true);
    setError(null);
    const r = await signedToolkitUrl(slug, version.version);
    setBusy(false);
    if (r.ok) window.location.assign(r.url);
    else setError(r.message);
  };
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant={variant} size="sm" onClick={go} disabled={busy} className={variant === 'link' ? 'h-auto p-0' : undefined}>
        {variant === 'default' && <Download className="mr-1.5 h-4 w-4" aria-hidden />}
        Download {name}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}

export function ToolkitCard({ toolkit }: { toolkit: Toolkit }) {
  const [latest, ...previous] = toolkit.toolkit_versions;
  const module = toolkit.finance_modules;
  return (
    <article id={toolkitAnchor(toolkit.slug)} className="flex h-full scroll-mt-24 flex-col gap-3 rounded-lg border border-border p-5" data-toolkit={toolkit.slug}>
      <h2 className="text-lg font-semibold leading-snug text-foreground">{toolkit.title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{toolkit.purpose}</p>
      <p className="font-mono text-xs text-muted-foreground">
        {toolkit.format} · v{latest.version} · updated {formatDate(latest.published_at)}
      </p>
      {module && (
        <p className="text-sm text-muted-foreground">
          From:{' '}
          <Link to={modulePath(module)} className="underline-offset-4 hover:text-foreground hover:underline">
            {moduleLabel(module)}
          </Link>
        </p>
      )}
      <div className="mt-auto pt-2">
        <DownloadButton slug={toolkit.slug} version={latest} variant="default" />
      </div>
      {previous.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Previous versions</summary>
          <ul className="mt-2 space-y-2">
            {previous.map((v) => (
              <li key={v.id} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-xs text-muted-foreground">
                  v{v.version} · {formatDate(v.published_at)}
                </span>
                <DownloadButton slug={toolkit.slug} version={v} variant="link" />
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
