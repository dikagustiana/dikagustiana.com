import { CHAIN_ORDER, type ChainLink, type ChainRow, type ChartModel, type SeriesStatusRow } from '@/lib/transition/model';
import type { TrackerEntry } from '@/lib/tracker';
import { ChartCard } from './ChartCard';

/**
 * The tracker's charts in the order of the sequencing thesis: policy →
 * infrastructure → finance → transition → carbon price, then the macro
 * context. The five link cards come first, each with its question and the
 * author's status line; a link with no published chart says so.
 */
export function ChainSection({
  chain,
  charts,
  status,
  entries,
}: {
  chain: ChainRow[];
  charts: ChartModel[];
  status: SeriesStatusRow[];
  entries: TrackerEntry[];
}) {
  const links = [...chain].sort((a, b) => CHAIN_ORDER.indexOf(a.chain_link) - CHAIN_ORDER.indexOf(b.chain_link));
  const chartsOf = (link: ChainLink) => charts.filter((c) => c.chainLink === link);
  const sequence = links.filter((l) => l.chain_link !== 'macro');

  return (
    <section aria-labelledby="chain-title" className="border-t border-border pt-10">
      <h2 id="chain-title" className="text-2xl text-foreground">
        Where the chain is stuck
      </h2>
      <p className="mt-2 text-base text-muted-foreground">
        Policy has to come before infrastructure, infrastructure before finance, finance before the transition itself,
        and a carbon price last. Each link below is read from sourced series; every number names its source, code and
        the date it was pulled.
      </p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {sequence.map((l, i) => {
          const n = chartsOf(l.chain_link).length;
          return (
            <li key={l.chain_link} className="rounded-md border border-border p-3">
              <a href={`#chain-${l.chain_link}`} className="block hover:opacity-80">
                <span className="text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="block font-serif text-base font-semibold text-foreground">{l.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{l.question}</span>
                <span className="mt-2 block text-sm text-foreground">
                  {l.status_text ?? (n === 0 ? 'No chart published yet.' : `${n} chart${n === 1 ? '' : 's'}.`)}
                </span>
              </a>
            </li>
          );
        })}
      </ol>

      {links.map((l) => {
        const list = chartsOf(l.chain_link);
        if (list.length === 0) return null;
        return (
          <section key={l.chain_link} id={`chain-${l.chain_link}`} aria-labelledby={`chain-${l.chain_link}-title`} className="mt-10 scroll-mt-24">
            <h3 id={`chain-${l.chain_link}-title`} className="text-xl text-foreground">
              {l.title}
            </h3>
            <p className="mt-1 text-base text-muted-foreground">{l.question}</p>
            <div className="mt-4 space-y-8">
              {list.map((c) => (
                <ChartCard key={c.slug} chart={c} status={status} entries={entries} />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
