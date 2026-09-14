import { Link } from 'react-router-dom';
import { CHANGED_MIND } from '@/data/changedMind';
import { fullDate } from '@/lib/formatDate';
import { universalEssayUrl } from '@/lib/essayUrl';

/**
 * The revision of judgment, with its gaps shown as gaps.
 *
 * The temptation this component exists to refuse is writing the missing four
 * paragraphs. They would be better prose than what is here and every line of
 * them would be invented: the original argument, the assumption that failed,
 * the decisive evidence and the remaining uncertainty are the author's, and
 * none of them is on record. A reversal a reader cannot inspect is worth less
 * than an honest note saying so — but it is worth more than a fabricated one.
 *
 * The link out goes through the universal /essays/:slug resolver rather than
 * a hand-built path: that route forwards to the canonical URL when the essay
 * has a placement and renders it when it does not, so this cannot mint a
 * broken address the way a literal path would.
 */
export function ChangedMind() {
  return (
    <section id="changed-my-mind" className="border-b border-border py-12">
      <div className="container max-w-3xl">
        <h2 className="mb-5 font-display text-lg font-semibold text-foreground">
          {CHANGED_MIND.heading}
        </h2>

        <blockquote className="border-l-2 border-foreground pl-4">
          <p className="text-[17px] leading-relaxed text-foreground">{CHANGED_MIND.reported}</p>
          <footer className="mt-2 text-[13px] text-muted-foreground">
            Reported recollection. {CHANGED_MIND.recordNote}
          </footer>
        </blockquote>

        <div className="mt-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            The position now, in the words of the essay that carries it
          </p>
          <p className="mt-1.5 text-[17px] leading-relaxed text-foreground">
            &ldquo;{CHANGED_MIND.revisedPosition}&rdquo;
          </p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            <Link
              to={universalEssayUrl(CHANGED_MIND.revisedSource.slug)}
              className="text-primary underline underline-offset-2"
            >
              {CHANGED_MIND.revisedSource.title}
            </Link>
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {CHANGED_MIND.notTheOpposite}
          </p>
        </div>

        <div className="mt-8 border-t border-border pt-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Not written yet
          </p>
          <ul className="mt-3 space-y-3">
            {CHANGED_MIND.gaps.map((gap) => (
              <li key={gap.what} className="text-[15px] leading-relaxed">
                <span className="text-foreground">{gap.what}</span>{' '}
                <span className="text-muted-foreground">{gap.why}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-muted-foreground">
            Checked against every essay record on this site, published and draft, on{' '}
            {fullDate(CHANGED_MIND.asOf)}.
          </p>
        </div>
      </div>
    </section>
  );
}
