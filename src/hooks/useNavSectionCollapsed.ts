import { useSectionCounts } from '@/hooks/queries/useSectionCounts';
import type { NavSection } from '@/config/navConfig';

/**
 * Whether a nav section shows as a plain landing link instead of a dropdown.
 *
 * Only sections that name an `essaySection` can collapse, and they stay
 * collapsed until the count says otherwise: on 9 October 2026 both such
 * sections were empty, so starting collapsed is what keeps the header from
 * growing a chevron and then losing it on every page load. If the count query
 * fails the section stays a link to its landing page, which lists every phase.
 */
export function useNavSectionCollapsed() {
  const { data: counts, isSuccess } = useSectionCounts();
  return (section: Pick<NavSection, 'essaySection'>) =>
    !!section.essaySection && !(isSuccess && (counts?.[section.essaySection] ?? 0) > 0);
}
