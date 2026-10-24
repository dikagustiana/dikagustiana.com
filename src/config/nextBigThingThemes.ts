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
 *
 * Society and Governance were retired on 2026-10-24 (docs/prd/2026-10-fia-fixes
 * item 13): their one essay moved to Growth (migration
 * 20261024150100_nbt_retire_society_governance). Their category rows stay in
 * the database, unoffered: the writer lists only the themes here.
 */
export const NEXT_BIG_THING_THEMES = [
  { id: 'technology', label: 'Technology' },
  { id: 'economy', label: 'Economy' },
  { id: 'environment', label: 'Environment' },
  // Curation: entries built around someone else's post, with the commentary
  // as the substance. Category sort_order 6.
  { id: 'growth', label: 'Growth' },
  // Was its own section until 2026-10-24 (docs/prd/foundations-of-knowing);
  // its old addresses redirect here. Category sort_order 7. The description
  // is the old section page's, shown when the feed is filtered to the theme.
  {
    id: 'development-finance',
    label: 'Development Finance',
    description:
      'How public capital is deployed, at scale, to shape economies. Sovereign funds, multilateral lenders, blended finance, and the infrastructure of development.',
  },
] as const;

/** The theme's own line under the page heading, when it has one. */
export const nextBigThingThemeDescription = (id: string | null): string | null => {
  const theme = NEXT_BIG_THING_THEMES.find((t) => t.id === id);
  return theme && 'description' in theme ? theme.description : null;
};

export type NextBigThingThemeId = (typeof NEXT_BIG_THING_THEMES)[number]['id'];

/**
 * The section index filtered to one theme. EditorialFeed reads the filter from
 * this `?theme=` parameter, so the nav, the sub-navigation tabs and the essay
 * page's back link all have to build it the same way.
 */
export const nextBigThingThemePath = (id: string) => `/the-next-big-thing?theme=${id}`;
