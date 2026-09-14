/**
 * The revision of judgment, and exactly how much of it exists.
 *
 * WHY THIS FILE IS MOSTLY GAPS. The author reports having argued, as an
 * undergraduate, for the highest feasible carbon tax, and having since
 * reversed that position. That reversal is the single most useful thing about
 * the argument on this site: it is the one place a stranger can watch a
 * position being revised against evidence rather than asserted.
 *
 * Nothing published says it. Checked on 14 September 2026 against all 165
 * essay records in the production database, published and draft: one essay
 * mentions carbon pricing at all, and no essay contains the original position,
 * the reversal, or any of the language a reversal is told in.
 *
 * So this file states the ONE thing that is actually supplied — the reported
 * fact of the reversal — and names the four things that are not. It does not
 * reconstruct an undergraduate paper, invent a dated quotation, or attribute a
 * revelation to a workplace. An author's recollection can be published as a
 * recollection; it cannot be published as a record.
 *
 * AND IT DOES NOT SWAP ONE CERTAINTY FOR ANOTHER. "The highest possible carbon
 * tax" must not be replaced by an equally unqualified "infrastructure always
 * comes first". The revised position that the written work actually supports
 * is narrower than either, and it is quoted from the essay that carries it.
 */

export interface ChangedMindGap {
  /** What is missing. */
  what: string;
  /** Why its absence matters to a reader. */
  why: string;
}

export const CHANGED_MIND = {
  asOf: '2026-09-14',

  heading: 'What I changed my mind about',

  /**
   * Reported by the author, and labelled as reported. This is the whole of
   * what is supplied; every sentence beyond it would be invention.
   */
  reported:
    'As an undergraduate I argued for the highest carbon tax the economy could be made to bear. I no longer hold that position.',

  /** The revised position, quoted from the one essay that carries it. */
  revisedPosition:
    'Infrastructure is a prerequisite when clean firm power, transmission, or emissions data is the binding constraint. It is not universally first.',

  revisedSource: {
    slug: 'indonesias-reindustrialization-bet',
    title: 'Indonesia’s Reindustrialization Bet',
  },

  /** What the revised position is careful NOT to say. */
  notTheOpposite:
    'That is not "infrastructure first, carbon pricing later". A credible future price signal and an immediately high tax are different instruments with different effects, and carbon pricing is itself public policy rather than something that queues behind it. Which constraint binds is a question about a particular asset in a particular place.',

  /** The four things a reader would need, and does not have. */
  gaps: [
    {
      what: 'The original argument, as it was actually made.',
      why: 'Without it there is nothing to compare the revision against, and a reader has to take the reversal on trust.',
    },
    {
      what: 'The assumption that failed.',
      why: 'A change of position is only informative if it names the thing that turned out to be wrong.',
    },
    {
      what: 'The evidence or experience that was decisive.',
      why: 'A reversal with no cause reads as a change of taste.',
    },
    {
      what: 'What remains uncertain, and what could change it again.',
      why: 'A revised position stated without its own failure conditions has learned the wrong lesson from the first one.',
    },
  ] as ChangedMindGap[],

  /** Said plainly, because the alternative is implying a record exists. */
  recordNote:
    'The undergraduate argument is a recollection. No copy of it is available here, and nothing on this site reconstructs it.',
} as const;
