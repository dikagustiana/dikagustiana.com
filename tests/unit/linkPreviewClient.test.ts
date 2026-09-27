/**
 * fetchLinkPreview: the editor's call to the link-preview edge function. Every
 * outcome is `{ ok: true, data }` or `{ ok: false, message }`, never a throw,
 * and only the known fields, as strings, reach the dialog.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

const { fetchLinkPreview, LINK_PREVIEW_FALLBACK_MESSAGE } = await import('@/lib/linkPreview');

const FETCHED = {
  title: 'Where’s the “intelligence explosion”?',
  description: 'Ramez Naam gives a skeptic’s take on Recursive Self-Improvement.',
  author: 'Ramez Naam',
  authorUrl: 'https://substack.com/@rameznaam',
  siteName: 'Noahpinion',
  publishedAt: '2026-09-27',
  resolvedAt: '2026-09-27T08:00:00.000Z',
};
const URL_A = 'https://www.noahpinion.blog/p/wheres-the-intelligence-explosion';

beforeEach(() => invoke.mockReset());

describe('fetchLinkPreview: every failure is a sentence, never a throw', () => {
  it('passes the fields through as strings, and nothing else', async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true, data: { ...FETCHED, title: 42, extra: '<b>' } }, error: null });
    expect(await fetchLinkPreview(URL_A)).toEqual({ ok: true, data: { ...FETCHED, title: '' } });
    expect(invoke).toHaveBeenCalledWith('link-preview', { body: { url: URL_A } });
  });

  it("relays the function's own sentence for a resolution failure", async () => {
    invoke.mockResolvedValueOnce({
      data: { ok: false, reason: 'timeout', message: 'The link did not answer within 5 seconds.' },
      error: null,
    });
    expect(await fetchLinkPreview(URL_A)).toEqual({ ok: false, message: 'The link did not answer within 5 seconds.' });
  });

  it("reads the sentence out of a non-2xx answer (the function's 403)", async () => {
    const forbidden = new Response(
      JSON.stringify({ ok: false, reason: 'forbidden', message: 'Only the site owner can fetch link details.' }),
      { status: 403 },
    );
    invoke.mockResolvedValueOnce({ data: null, error: Object.assign(new Error('non-2xx'), { context: forbidden }) });
    expect(await fetchLinkPreview(URL_A)).toEqual({ ok: false, message: 'Only the site owner can fetch link details.' });
  });

  it('falls back to one plain sentence for anything else', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: new Error('relay down') });
    expect(await fetchLinkPreview(URL_A)).toEqual({ ok: false, message: LINK_PREVIEW_FALLBACK_MESSAGE });
    invoke.mockRejectedValueOnce(new TypeError('network'));
    expect(await fetchLinkPreview(URL_A)).toEqual({ ok: false, message: LINK_PREVIEW_FALLBACK_MESSAGE });
    invoke.mockResolvedValueOnce({ data: 'not json', error: null });
    expect(await fetchLinkPreview(URL_A)).toEqual({ ok: false, message: LINK_PREVIEW_FALLBACK_MESSAGE });
  });
});
