/**
 * What kind of piece this is, and what it therefore owes a reader.
 *
 * THE PROBLEM THIS SOLVES. The publish gate enforced finished FORM harder than
 * it enforced evidence: a title, a category, a deck, three key takeaways and
 * 500 words were hard errors on every piece, while missing references were an
 * advisory warning on one section and nothing anywhere else. So a two-hundred
 * word correction naming a source could not be published without padding, and
 * a two-thousand word argument about a current policy could be published with
 * no source at all. The gate was pointed at the wrong thing.
 *
 * WHAT A GENRE IS NOT. It is not a new section, a route, or a database
 * structure. There is no /op-ed. A genre rides in the existing `presentation`
 * jsonb payload, is optional, and renders nothing when absent — so it makes no
 * promise about work that does not exist. The four below were written against
 * the four essays actually published on 2026-09-14; assigning them is the
 * author's, and none is assigned here.
 *
 * The distinctions are about the EVIDENTIAL CONTRACT a piece is offering,
 * which is what a reader needs to calibrate against, not about tone or length.
 */

export type GenreId = 'explainer' | 'argued-position' | 'exploratory' | 'correction';

export interface Genre {
  id: GenreId;
  label: string;
  /** What the piece is for. */
  means: string;
  /** What it owes a reader — the contract it is offering. */
  contract: string;
  /**
   * The shortest length at which this genre can do its job. An editorial
   * target, not a quality measure, and deliberately not one number for all.
   */
  minWords: number;
  /** Whether the standing three-takeaway block is part of this genre's furniture. */
  takeaways: 'required' | 'optional';
  /**
   * Whether a source list is part of the contract.
   *   'required'  the piece makes claims about the present world
   *   'expected'  a warning, because most pieces of this kind cite something
   *   'optional'  a piece that makes no external factual claim owes no bibliography
   */
  sources: 'required' | 'expected' | 'optional';
}

export const GENRES: Record<GenreId, Genre> = {
  explainer: {
    id: 'explainer',
    label: 'Explainer',
    means:
      'Establishes a mechanism: how something works, and the boundary condition at which the account stops holding. Its verdict is a condition, not a position on a current question.',
    contract:
      'The mechanism has to be followed through, and the piece has to say where it does not apply. It is not offering a view on what anyone should do now.',
    minWords: 500,
    takeaways: 'required',
    sources: 'expected',
  },
  'argued-position': {
    id: 'argued-position',
    label: 'Argued position',
    means:
      'Takes a position on a matter that is live now, bounded to a case, and says what would make it wrong.',
    contract:
      'Every claim about the present state of the world carries a source. The piece names who can act, who pays, the strongest objection, and the observation that would change the conclusion. A forceful sentence is not a substitute for any of those.',
    minWords: 500,
    takeaways: 'required',
    sources: 'required',
  },
  exploratory: {
    id: 'exploratory',
    label: 'Exploratory',
    means:
      'Works a question the author has not settled. It is published because the question is worth having in public, not because it has an answer.',
    contract:
      'It says explicitly that it is provisional and what would have to be true for it to resolve either way. It must not be read as, or written as, a position.',
    minWords: 500,
    takeaways: 'optional',
    sources: 'expected',
  },
  correction: {
    id: 'correction',
    label: 'Correction or update',
    means:
      'A bounded change to something already published: a fact corrected, a claim narrowed, a conclusion withdrawn.',
    contract:
      'It states what was claimed, what is the case, and what that does to the conclusion — including where the conclusion still stands — and it names the source. It is short because it is bounded, and padding it to reach a word count would bury the three sentences that matter.',
    minWords: 80,
    takeaways: 'optional',
    sources: 'required',
  },
};

export const GENRE_IDS = Object.keys(GENRES) as GenreId[];

/** The genre a row declares, or nothing. Never guessed from a title or a length. */
export function genreOf(value: unknown): Genre | null {
  return typeof value === 'string' && value in GENRES ? GENRES[value as GenreId] : null;
}
