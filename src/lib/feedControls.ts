/**
 * When an essay feed earns its controls.
 *
 * A sort menu over one essay, or a search box over three, is chrome for a list
 * that fits in the reader's head. On 9 October 2026 the feeds had between zero
 * and five essays each and every one carried both. The thresholds are the
 * point at which the control starts saving the reader something; they count
 * the essays the feed holds, not the ones left after a filter, so a search
 * that narrows a long list does not make its own box disappear.
 */
export const MIN_ESSAYS_TO_SORT = 2;
export const MIN_ESSAYS_TO_SEARCH = 6;

export const canSortFeed = (essayCount: number) => essayCount >= MIN_ESSAYS_TO_SORT;
export const canSearchFeed = (essayCount: number) => essayCount >= MIN_ESSAYS_TO_SEARCH;
