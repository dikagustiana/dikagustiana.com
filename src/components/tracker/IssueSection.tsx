import { SECTOR_LABEL, entriesForQuarter, sourceNumbers, type TrackerEntry, type TrackerQuarter } from '@/lib/tracker';
import { SourceRefs } from './SourceRefs';

/**
 * One quarter as a short essay (PRD §B5, item 4): a finding-first title, then
 * one paragraph per sector, each the entry's finding and detail followed by
 * its sources. Every sentence comes from a signed-off entry; this component
 * adds no claim of its own.
 *
 * Body text is the essay size, 19px, in the sans face, under a serif heading
 * (owner's answer of 11 October 2026, docs/spec/00_discovery.md §9).
 */
export function IssueSection({
  quarter,
  entries,
  numberOf,
}: {
  quarter: TrackerQuarter;
  entries: TrackerEntry[];
  numberOf: Map<string, number>;
}) {
  const rows = entriesForQuarter(entries, quarter.key);
  if (rows.length === 0) return null;
  const titleId = `${quarter.anchor}-title`;
  return (
    <section id={quarter.anchor} aria-labelledby={titleId} className="scroll-mt-24 border-t border-border pt-10">
      <p className="text-base text-muted-foreground">
        {quarter.label} · {quarter.period}
      </p>
      <h2 id={titleId} className="mt-2 text-2xl text-foreground">
        {quarter.title}
      </h2>
      {rows.map((entry) => (
        <p key={entry.id} className="mt-6 font-sans text-[19px] leading-[1.6] text-prose-fg">
          <strong className="font-semibold">{SECTOR_LABEL[entry.sector]}.</strong> {entry.finding} {entry.detail}{' '}
          <SourceRefs numbers={sourceNumbers(entry, numberOf)} />
        </p>
      ))}
    </section>
  );
}
