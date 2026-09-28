/**
 * The build's one read of the published essays. The prerender's pages, the
 * share cards and their labels all come from this select, so there is no
 * second list of essays and no second list of section or theme names.
 *
 * The two embeds carry the card's label: the section's name through the
 * essay's category, and the finance track's title through its module. Both
 * tables are public reads, as they are for the site itself.
 */
export const ESSAY_SELECT = [
  'slug',
  'title',
  'snippet',
  'section',
  'phase',
  'finance_section',
  'fsli_slug',
  'topic',
  'thumbnail_url',
  'date',
  'created_at',
  'updated_at',
  'presentation',
  'finance_modules!essays_module_id_fkey(slug,track_slug,finance_sections!finance_modules_track_slug_fkey(title))',
  'categories!essays_category_id_fkey(name,sections!categories_section_id_fkey(name))',
].join(',');

/** Every published essay row, or a thrown Error naming the HTTP status. */
export async function fetchPublishedEssays({ supabaseUrl, key }) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/essays?published=eq.true&select=${encodeURIComponent(ESSAY_SELECT)}`,
    { headers: { apikey: key, authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`essay fetch failed — HTTP ${res.status}`);
  return res.json();
}
