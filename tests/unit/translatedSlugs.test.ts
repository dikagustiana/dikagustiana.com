/**
 * The build's read of which essays have a published Indonesian version
 * (scripts/lib/publishedEssays.mjs fetchTranslatedSlugs). Loud on failure,
 * except a table that does not exist yet — so code merged before the
 * migration does not break every deploy.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchTranslatedSlugs } from '../../scripts/lib/publishedEssays.mjs';

const args = { supabaseUrl: 'https://x.supabase.co', key: 'k' };
const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.restoreAllMocks());

describe('fetchTranslatedSlugs', () => {
  it('returns the slugs of published translations', async () => {
    const spy = respond(200, [{ essays: { slug: 'a' } }, { essays: { slug: 'b' } }, { essays: null }]);
    const r = await fetchTranslatedSlugs(args);
    expect([...r.slugs]).toEqual(['a', 'b']);
    expect(r.tableMissing).toBe(false);
    const url = String(spy.mock.calls[0][0]);
    expect(url).toContain('/rest/v1/essay_translations?');
    expect(url).toContain('locale=eq.id');
    expect(url).toContain('published=eq.true');
  });

  it.each(['PGRST205', '42P01'])('a missing table (%s) is an empty set, flagged', async (code) => {
    respond(404, { code, message: 'relation does not exist' });
    const r = await fetchTranslatedSlugs(args);
    expect(r.slugs.size).toBe(0);
    expect(r.tableMissing).toBe(true);
  });

  it('any other failure throws', async () => {
    respond(500, { message: 'boom' });
    await expect(fetchTranslatedSlugs(args)).rejects.toThrow('HTTP 500');
  });

  it('a 404 that is not a missing table throws', async () => {
    respond(404, { code: 'PGRST000', message: 'other' });
    await expect(fetchTranslatedSlugs(args)).rejects.toThrow('HTTP 404');
  });
});
