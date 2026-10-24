/**
 * The book-file edge function's pure parts, offline (supabase/functions/book-file): SigV4 presigning against
 * AWS's published example, then the request rules, object keys, file names and Content-Disposition.
 */
import { describe, expect, it } from 'vitest';
import { amzDate, presign, uriEncode } from '../../supabase/functions/_shared/r2';
import {
  FILE_MAX_BYTES,
  KEY_SHAPE,
  contentDisposition,
  contentTypeOf,
  downloadName,
  isJwt,
  objectKey,
  parseRequest,
} from '../../supabase/functions/book-file/rules';

const AWS = {
  host: 'examplebucket.s3.amazonaws.com',
  region: 'us-east-1',
  service: 's3',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  now: new Date('2013-05-24T00:00:00Z'),
};

describe('SigV4 presigning', () => {
  it("matches AWS's published presigned GET example byte for byte", async () => {
    const url = await presign({ ...AWS, method: 'GET', path: '/test.txt', expires: 86400 });
    expect(url).toBe(
      'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
    );
  });

  it('signs extra query parameters in sorted, RFC 3986-encoded order and encodes the path but its slashes', async () => {
    const url = new URL(
      await presign({
        ...AWS,
        host: 'acct.r2.cloudflarestorage.com',
        region: 'auto',
        method: 'GET',
        path: '/dg-books-public/files/a-b/1-Open Book (2).pdf',
        expires: 3600,
        query: { 'response-content-disposition': 'inline; filename="Open Book.pdf"', 'response-content-type': 'application/pdf' },
      }),
    );
    expect(url.pathname).toBe('/dg-books-public/files/a-b/1-Open%20Book%20%282%29.pdf');
    const keys = [...url.searchParams.keys()];
    expect(keys.slice(0, -1)).toEqual([...keys.slice(0, -1)].sort());
    expect(keys.at(-1)).toBe('X-Amz-Signature');
    expect(url.searchParams.get('X-Amz-Credential')).toBe('AKIAIOSFODNN7EXAMPLE/20130524/auto/s3/aws4_request');
    expect(url.searchParams.get('response-content-disposition')).toBe('inline; filename="Open Book.pdf"');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives a different signature for a different method, so a read URL cannot be used to write', async () => {
    const get = await presign({ ...AWS, method: 'GET', path: '/k.pdf', expires: 60 });
    const put = await presign({ ...AWS, method: 'PUT', path: '/k.pdf', expires: 60 });
    expect(new URL(get).searchParams.get('X-Amz-Signature')).not.toBe(new URL(put).searchParams.get('X-Amz-Signature'));
  });

  it('encodes as SigV4 wants and dates as AWS writes them', () => {
    expect(uriEncode("a b/c~d_e.f-g*h'é")).toBe('a%20b%2Fc~d_e.f-g%2Ah%27%C3%A9');
    expect(uriEncode('a b/c', true)).toBe('a%20b/c');
    expect(amzDate(new Date('2026-10-24T12:03:04.567Z'))).toBe('20261024T120304Z');
  });
});

describe('book-file requests', () => {
  it('reads by slug, inline unless a download is asked for', () => {
    expect(parseRequest({ action: 'read', slug: 'open-finance' })).toEqual({ ok: true, req: { action: 'read', slug: 'open-finance', as: 'inline' } });
    expect(parseRequest({ action: 'read', slug: 'open-finance', as: 'download' })).toMatchObject({ ok: true, req: { as: 'download' } });
    expect(parseRequest({ action: 'read', slug: '../etc' }).ok).toBe(false);
    expect(parseRequest(null).ok).toBe(false);
    expect(parseRequest({ action: 'list' }).ok).toBe(false);
  });

  it('takes an upload of a PDF or EPUB up to 50 MB, its type from its name', () => {
    expect(parseRequest({ action: 'upload', slug: 'b', filename: 'x.PDF', contentType: 'application/pdf', size: 10 })).toEqual({
      ok: true,
      req: { action: 'upload', slug: 'b', filename: 'x.PDF', contentType: 'application/pdf', size: 10 },
    });
    expect(parseRequest({ action: 'upload', slug: 'b', filename: 'x.epub', size: 10 })).toMatchObject({ req: { contentType: 'application/epub+zip' } });
    expect(parseRequest({ action: 'upload', slug: 'b', filename: 'x.exe', size: 10 }).ok).toBe(false);
    expect(parseRequest({ action: 'upload', slug: 'b', filename: 'x.pdf', contentType: 'text/html', size: 10 }).ok).toBe(false);
    expect(parseRequest({ action: 'upload', slug: 'b', filename: 'x.pdf', size: 0 }).ok).toBe(false);
    expect(parseRequest({ action: 'upload', slug: 'b', filename: 'x.pdf', size: FILE_MAX_BYTES + 1 }).ok).toBe(false);
  });

  it('removes only a book file under files/, never a cover or a path that climbs out', () => {
    expect(parseRequest({ action: 'remove', key: 'files/open-finance/1730000000000-Open_Finance.pdf' }).ok).toBe(true);
    for (const key of ['covers/b/1.jpg', 'files/b/../../x.pdf', 'files/B/1.pdf', 'other/b/1.pdf', 'files/b/1.pdf/x']) {
      expect(parseRequest({ action: 'remove', key }).ok, key).toBe(false);
    }
  });

  it('keys an upload as useBooks always has, and every key it makes is one it may remove', () => {
    const key = objectKey('open-finance', 'Open Finance (2nd ed.).pdf', 1730000000000);
    expect(key).toBe('files/open-finance/1730000000000-Open_Finance_2nd_ed._.pdf');
    expect(KEY_SHAPE.test(key)).toBe(true);
    expect(KEY_SHAPE.test(objectKey('b', '….epub', 1))).toBe(true);
    expect(contentTypeOf(key)).toBe('application/pdf');
    expect(contentTypeOf('files/b/1-x.epub')).toBe('application/epub+zip');
  });

  it('names a download after the title, and says inline or attachment with an exact UTF-8 name', () => {
    expect(downloadName('Corporate Finance: An Introduction', 'cf', 'files/cf/1-x.pdf')).toBe('Corporate Finance An Introduction.pdf');
    expect(downloadName(null, 'cf', 'files/cf/1-x.epub')).toBe('cf.epub');
    expect(contentDisposition('download', 'Akuntansi Keuangan — Édisi 2.pdf')).toBe(
      `attachment; filename="Akuntansi Keuangan  Edisi 2.pdf"; filename*=UTF-8''Akuntansi%20Keuangan%20%E2%80%94%20%C3%89disi%202.pdf`,
    );
    expect(contentDisposition('inline', 'A "quoted" (b).pdf')).toBe(`inline; filename="A quoted (b).pdf"; filename*=UTF-8''A%20%22quoted%22%20%28b%29.pdf`);
  });

  it('forwards only a JWT as a Bearer token, never a publishable key', () => {
    expect(isJwt('eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2ln')).toBe(true);
    expect(isJwt('sb_publishable_abc')).toBe(false);
  });
});
