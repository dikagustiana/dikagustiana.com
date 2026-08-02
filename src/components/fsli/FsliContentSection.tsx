/**
 * FsliContentSection — display-only.
 *
 * This component used to carry its own textarea + upsert straight into
 * `fsli_sections` — anonymous readers' data edited live, with no draft, no
 * publish boundary, no revision history and no autosave (the audit finding
 * about editing public data directly). That write path is DELETED, not
 * hidden: FSLI prose is authored in the writer studio as accounting essays
 * linked to the line item (`essays.fsli_slug`), which gets the full finance
 * flow for free. Saved `fsli_sections` rows still render read-only so no
 * legacy content disappears.
 */

interface FsliContentSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  /**
   * Saved prose from `fsli_sections`, fetched ONCE per page in FsliDetail.
   * Empty string means honestly empty: there is no placeholder fallback.
   */
  content: string;
  /** True while the sections query is still in flight. */
  loading?: boolean;
}

export function FsliContentSection({
  id,
  title,
  subtitle,
  content,
  loading,
}: FsliContentSectionProps) {
  return (
    <section id={id} className="py-8 border-b border-border last:border-0 scroll-mt-28">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-primary underline decoration-primary underline-offset-4">
          {title}
        </h2>
        {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      </div>

      {loading ? (
        // Skeleton shaped like a short paragraph, not a spinner.
        <div className="space-y-2" aria-hidden>
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        </div>
      ) : content ? (
        <div className="text-muted-foreground leading-relaxed">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      ) : (
        // The honest empty state: one quiet line, sized like the absence it
        // announces. Writing happens in the studio, not here.
        <p className="text-sm italic text-muted-foreground/70">Not written yet.</p>
      )}
    </section>
  );
}
