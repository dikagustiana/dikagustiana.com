import type { Section } from "@/hooks/queries/useSections";

export const FIGURE_ENABLED_SECTION_SLUGS = ["next-big-thing", "green-transition", "accounting", "finance", "critical-thinking"] as const;
export type FigureEnabledSectionSlug = (typeof FIGURE_ENABLED_SECTION_SLUGS)[number];

export function normalizeSectionValue(section: string | null | undefined): string {
  return (section ?? "").trim();
}

export function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function looksLikeSlug(value: string): boolean {
  // conservative: lowercase words separated by single hyphens
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Canonical section slug resolution for the admin editor.
 *
 * Rules:
 * - If sections are available, resolve by slug (exact match) or by id -> slug.
 * - Otherwise, if the value already looks like a slug, accept it.
 * - Otherwise return empty.
 */
export function resolveSectionSlug(
  sectionValue: string,
  sections?: Section[] | null,
): string {
  const value = normalizeSectionValue(sectionValue);
  if (!value) return "";

  // If the canonical sections list is available, ONLY accept values that resolve to a known section.
  if (sections && sections.length > 0) {
    const bySlug = sections.find((s) => s.slug === value);
    if (bySlug) return bySlug.slug;

    const byId = sections.find((s) => s.id === value);
    if (byId) return byId.slug;

    return "";
  }

  // Otherwise, fall back only when it already looks like a slug.
  // (Prevents UUID/garbage from being treated as a slug, while still allowing deep-linking before sections load.)
  if (looksLikeSlug(value)) return value;

  return "";
}

export function isFigureEnabledSection(resolvedSlug: string): resolvedSlug is FigureEnabledSectionSlug {
  return (FIGURE_ENABLED_SECTION_SLUGS as readonly string[]).includes(resolvedSlug);
}
