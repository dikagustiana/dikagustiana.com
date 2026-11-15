/**
 * SEO.tsx's language props (docs/prd/essay-language/05-SEO-BUILD.md §E1):
 * without them the head is what it always was; with them, the canonical keeps
 * ?lang=id, hreflang names both versions, and <html lang> is set and then
 * restored rather than removed.
 */
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { SEO } from '@/components/SEO';

const head = () => document.head;
const canonical = () => head().querySelector('link[rel="canonical"]')?.getAttribute('href');
const hreflangs = () =>
  [...head().querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')]);

function renderSEO(props: Parameters<typeof SEO>[0]) {
  return render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>,
  );
}

describe('SEO language props', () => {
  it('no props: no hreflang, no og:locale, canonical without a query', async () => {
    window.history.replaceState(null, '', '/essays/x?lang=id&utm=1');
    const r = renderSEO({ title: 'T' });
    await waitFor(() => expect(canonical()).toBe('https://dikagustiana.com/essays/x'));
    expect(hreflangs()).toEqual([]);
    expect(head().querySelector('meta[property="og:locale"]')).toBeNull();
    r.unmount();
  });

  it("lang='id': canonical keeps only ?lang=id; hreflang triple; og:locale id_ID", async () => {
    window.history.replaceState(null, '', '/essays/x?lang=id&utm=1');
    const alternates = { en: 'https://dikagustiana.com/essays/x', id: 'https://dikagustiana.com/essays/x?lang=id' };
    const r = renderSEO({ title: 'T', lang: 'id', alternates });
    await waitFor(() => expect(canonical()).toBe('https://dikagustiana.com/essays/x?lang=id'));
    expect(hreflangs()).toEqual([
      ['en', alternates.en],
      ['id', alternates.id],
      ['x-default', alternates.en],
    ]);
    expect(head().querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe('id_ID');
    r.unmount();
  });

  it('<html lang> is set while shown and restored to what it was afterwards', () => {
    document.documentElement.setAttribute('lang', 'en');
    const r = renderSEO({ title: 'T', lang: 'id' });
    expect(document.documentElement.getAttribute('lang')).toBe('id');
    r.unmount();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });
});
