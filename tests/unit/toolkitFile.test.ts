/**
 * The toolkit-file edge function's pure parts, offline (supabase/functions/toolkit-file), and the shared R2
 * signer it uses with book-file (supabase/functions/_shared/r2.ts): requests, object keys, which version a
 * link opens, and the attachment header.
 */
import { describe, expect, it } from 'vitest';
import { presign, r2Configured, r2FromEnv, signR2 } from '../../supabase/functions/_shared/r2';
import {
  FILE_MAX_BYTES,
  XLSX_TYPE,
  attachment,
  fileName,
  objectKey,
  parseRequest,
  pickVersion,
} from '../../supabase/functions/toolkit-file/rules';

describe('the shared R2 signer', () => {
  const env: Record<string, string> = { R2_ACCOUNT_ID: 'acct', R2_BUCKET: 'dg-books-public', R2_ACCESS_KEY_ID: 'AKID', R2_SECRET_ACCESS_KEY: 'SECRET' };
  const r2 = r2FromEnv((k) => env[k]);

  it('reads the four secrets and is configured only with all four', () => {
    expect(r2).toEqual({ account: 'acct', bucket: 'dg-books-public', keyId: 'AKID', secret: 'SECRET' });
    expect(r2Configured(r2)).toBe(true);
    expect(r2Configured(r2FromEnv((k) => (k === 'R2_BUCKET' ? undefined : env[k])))).toBe(false);
  });

  it('signs path-style against the account host, exactly as presign does', async () => {
    const now = new Date('2026-10-24T00:00:00Z');
    const key = 'toolkits/driver-tree/1.2/driver-tree-v1.2.xlsx';
    const viaR2 = await signR2(r2, 'GET', key, 3600, { 'response-content-disposition': attachment(key) }, now);
    const direct = await presign({
      method: 'GET', host: 'acct.r2.cloudflarestorage.com', path: `/dg-books-public/${key}`, region: 'auto', service: 's3',
      accessKeyId: 'AKID', secretAccessKey: 'SECRET', expires: 3600, now, query: { 'response-content-disposition': attachment(key) },
    });
    expect(viaR2).toBe(direct);
    expect(new URL(viaR2).searchParams.get('response-content-disposition')).toBe('attachment; filename="driver-tree-v1.2.xlsx"');
  });
});

describe('toolkit-file requests', () => {
  it('reads by slug, the latest unless a version is asked for', () => {
    expect(parseRequest({ action: 'read', slug: 'driver-tree' })).toEqual({ ok: true, req: { action: 'read', slug: 'driver-tree', version: null } });
    expect(parseRequest({ action: 'read', slug: 'driver-tree', version: '1.0' })).toMatchObject({ ok: true, req: { version: '1.0' } });
    expect(parseRequest({ action: 'read', slug: 'driver-tree', version: '../x' }).ok).toBe(false);
    expect(parseRequest({ action: 'read', slug: '../etc' }).ok).toBe(false);
    expect(parseRequest(null).ok).toBe(false);
    expect(parseRequest({ action: 'remove', slug: 'x' }).ok).toBe(false);
  });

  it('takes an .xlsx upload up to 25 MB under a MAJOR.MINOR[.PATCH] version', () => {
    const ok = { action: 'upload', slug: 'driver-tree', version: '1.2', filename: 'Driver Tree.XLSX', contentType: XLSX_TYPE, size: 10 };
    expect(parseRequest(ok)).toEqual({ ok: true, req: { action: 'upload', slug: 'driver-tree', version: '1.2', size: 10 } });
    expect(parseRequest({ ...ok, version: '1.2.3' }).ok).toBe(true);
    expect(parseRequest({ ...ok, version: 'v1' }).ok).toBe(false);
    expect(parseRequest({ ...ok, filename: 'x.xls' }).ok).toBe(false);
    expect(parseRequest({ ...ok, contentType: 'application/pdf' }).ok).toBe(false);
    expect(parseRequest({ ...ok, size: 0 }).ok).toBe(false);
    expect(parseRequest({ ...ok, size: FILE_MAX_BYTES + 1 }).ok).toBe(false);
  });

  it('stores each version at its own key, named for the download', () => {
    expect(fileName('driver-tree', '1.2')).toBe('driver-tree-v1.2.xlsx');
    expect(objectKey('driver-tree', '1.2')).toBe('toolkits/driver-tree/1.2/driver-tree-v1.2.xlsx');
    expect(objectKey('driver-tree', '1.3')).not.toBe(objectKey('driver-tree', '1.2'));
    // The table's key shape (20261024170000_toolkits.sql, toolkit_versions_key_shape).
    expect(objectKey('driver-tree', '1.2.0')).toMatch(/^toolkits\/[a-z0-9]+(-[a-z0-9]+)*\/[0-9]+\.[0-9]+(\.[0-9]+)?\/[A-Za-z0-9_.-]{1,120}\.xlsx$/);
  });

  it('opens the asked version after a later one is published, and the latest otherwise', () => {
    const rows = [
      { version: '1.0', file_key: objectKey('t', '1.0'), published_at: '2026-10-24T01:00:00+00:00' },
      { version: '2.0', file_key: objectKey('t', '2.0'), published_at: '2026-10-24T02:00:00+00:00' },
    ];
    expect(pickVersion(rows, '1.0')?.file_key).toBe('toolkits/t/1.0/t-v1.0.xlsx');
    expect(pickVersion(rows, null)?.version).toBe('2.0');
    expect(pickVersion(rows, '3.0')).toBeNull();
    expect(pickVersion([], null)).toBeNull();
  });
});
