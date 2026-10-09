/**
 * What is behind a door, in as few words as the truth needs.
 *
 * On 14 September 2026 three of these five sections held nothing at all, and
 * the list could not show it: every row looked identical, so a stranger found
 * the emptiness only by walking in. This is a COUNT, not a description — the
 * rule against six sibling sentences under six headings (docs/DECISIONS.md,
 * 2026-08-03) is about generated prose, and a number is not prose.
 *
 * Takes `loaded` rather than inferring it from the count, because the count
 * map has no key for a section with nothing in it: an absent key means zero,
 * and an unresolved query also means absent. Collapsing those two was how the
 * three EMPTY sections — the ones this exists for — rendered blank.
 *
 * Returns null until the query resolves: no number is better than a zero that
 * turns into a two.
 */
export function sectionStanding(loaded: boolean, count: number | undefined, alsoHolds?: string): string | null {
  if (!loaded) return null;
  count = count ?? 0;
  const essays = count === 0 ? 'Nothing written yet' : `${count} essay${count === 1 ? '' : 's'}`;
  return alsoHolds ? `${essays} \u00b7 ${alsoHolds}` : essays;
}
