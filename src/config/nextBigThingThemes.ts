/**
 * Single source of truth for The Next Big Thing's themes.
 *
 * The list used to be written out six times in src/ — the header dropdown, the
 * section's sub-navigation tabs, its topic filter, the essay page's topic
 * label, and two admin phase pickers — in four field-name conventions
 * (`id`/`value`, `label`/`name`), with nothing tying the copies together. Every
 * one of them now derives from this array, and each consumer adapts the shape
 * at its own site.
 *
 * ARRAY ORDER IS DISPLAY ORDER, everywhere. It matches `sort_order` on the
 * `next-big-thing-<id>` rows of `public.categories`, the database side of the
 * same list, which the publish modal reads directly. Adding a theme is
 * therefore two edits: an entry here, and a category row (a migration) with
 * the next sort_order. tests/unit/placement.test.ts ties its slug loop to this
 * array's length so the two cannot silently disagree.
 */
export const NEXT_BIG_THING_THEMES = [
  { id: 'technology', label: 'Technology' },
  { id: 'economy', label: 'Economy' },
  { id: 'society', label: 'Society' },
  { id: 'environment', label: 'Environment' },
  { id: 'governance', label: 'Governance' },
  // Curation: entries built around someone else's post, with the commentary
  // as the substance. Last on purpose — category sort_order 6.
  { id: 'growth', label: 'Growth' },
] as const;

export type NextBigThingThemeId = (typeof NEXT_BIG_THING_THEMES)[number]['id'];

/**
 * The section index filtered to one theme. EditorialFeed reads the filter from
 * this `?theme=` parameter, so the nav, the sub-navigation tabs and the essay
 * page's back link all have to build it the same way.
 */
export const nextBigThingThemePath = (id: string) => `/the-next-big-thing?theme=${id}`;
