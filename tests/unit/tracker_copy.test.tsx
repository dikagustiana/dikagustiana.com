/**
 * The tracker's copy rules (Plan 2.4, PRD §B6), run in CI.
 *
 * CI has no Supabase credentials, so the entries are read from the repo-side
 * source the seed migration is generated from,
 * supabase/content/tracker_entries.json, and the migration is checked to be
 * exactly what that file produces. The page is then rendered with those
 * entries through the real route table (App.tsx), with Supabase mocked at the
 * client module: nothing here can reach a network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { makeQueryResult } from './helpers/renderWithProviders';
import { CONTENT_PATH, SEED_PATH, buildSeedSql, resolveSources } from '../../scripts/tracker/seed.mjs';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => fromMock(...a),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));

import App from '@/App';
import { SECTOR_ORDER, STATUS_LABEL, TRACKER_QUARTERS, TRACKER_STANDFIRST, type TrackerEntry } from '@/lib/tracker';

interface ContentEntry {
  id: string;
  quarter: string;
  sector: string;
  status: string;
  finding: string;
  detail: string;
  sources: string[];
  verification: string;
  published: boolean;
}
interface Content {
  sources: Record<string, { title: string; issuer: string; doc_no?: string; date: string; url: string; accessed: string }>;
  entries: ContentEntry[];
}

const content: Content = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));

/** PRD §B6: none of these may appear in a published entry. */
const BANNED = ['not just', "isn't about", 'execution friction', 'institutional ambiguity', 'policy architecture', 'paused'];

const asRows = (published: boolean): TrackerEntry[] =>
  content.entries.map((e) => ({
    ...(e as unknown as TrackerEntry),
    sources: resolveSources(content, e),
    published,
  }));

function renderAt(path: string, rows: TrackerEntry[]) {
  fromMock.mockImplementation((table: string) => makeQueryResult(table === 'tracker_entry' ? rows : []));
  window.history.pushState({}, '', path);
  return render(<App />);
}

const pageH1 = () => screen.findByRole('heading', { level: 1, name: 'Indonesia Green Transition Tracker' });
const registerReady = () => screen.findByRole('heading', { level: 2, name: 'Sector register' });

beforeEach(() => {
  fromMock.mockReset();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe('tracker entries (supabase/content/tracker_entries.json)', () => {
  it('holds one entry per sector per quarter for the two quarters in this release', () => {
    const keys = content.entries.map((e) => `${e.sector}|${e.quarter}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(content.entries).toHaveLength(SECTOR_ORDER.length * TRACKER_QUARTERS.length);
    for (const e of content.entries) {
      expect(SECTOR_ORDER).toContain(e.sector);
      expect(TRACKER_QUARTERS.map((q) => q.key)).toContain(e.quarter);
      expect(Object.keys(STATUS_LABEL)).toContain(e.status);
      expect(e.id).toBe(`${e.sector}-${e.quarter.toLowerCase()}`);
    }
  });

  it.each(content.entries.map((e) => [e.id, e] as const))(
    '%s is verified and every source has an https url and a doc_no or a date',
    (_id, e) => {
      expect(e.verification).toBe('verified');
      const sources = resolveSources(content, e);
      expect(sources.length).toBeGreaterThanOrEqual(1);
      for (const s of sources) {
        expect(s.title.trim()).not.toBe('');
        expect(s.url).toMatch(/^https:\/\//);
        expect(Boolean(s.doc_no?.trim()) || /^\d{4}-\d{2}-\d{2}$/.test(s.date)).toBe(true);
        expect(s.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    },
  );

  it.each(content.entries.map((e) => [e.id, e] as const))('%s carries none of the banned phrases', (_id, e) => {
    const text = `${e.finding} ${e.detail}`.toLowerCase();
    for (const phrase of BANNED) expect(text, phrase).not.toContain(phrase);
  });

  it('cites every source in the catalogue, and no key that is not in it', () => {
    const cited = new Set(content.entries.flatMap((e) => e.sources));
    expect([...cited].sort()).toEqual(Object.keys(content.sources).sort());
  });

  it('is exactly what the seed migration inserts, and the seed publishes nothing', () => {
    expect(readFileSync(SEED_PATH, 'utf8')).toBe(buildSeedSql(content));
    expect(content.entries.every((e) => e.published === false)).toBe(true);
  });

  it('is published, after review, by a migration naming exactly these entries', () => {
    const sql = readFileSync(SEED_PATH.replace('100100_tracker_entry_seed', '120000_tracker_entry_publish'), 'utf8').replace(
      /--.*$/gm,
      '',
    );
    expect(sql).toMatch(/SET published = true\s+WHERE verification = 'verified'/);
    const ids = [...sql.matchAll(/'([a-z_]+-\d{4}q[1-4])'/g)].map((m) => m[1]);
    expect(ids.sort()).toEqual(content.entries.map((e) => e.id).sort());
  });
});

describe('the tracker page with the entries published', () => {
  it('says "paused" or "archive" at most once, and none of the banned phrases', async () => {
    renderAt('/green-transition/tracker', asRows(true));
    await registerReady();
    const text = (document.querySelector('main, #main-content')?.textContent ?? document.body.textContent ?? '').toLowerCase();
    const pauseOrArchive = (text.match(/paused|archive/g) ?? []).length;
    expect(pauseOrArchive).toBeLessThanOrEqual(1);
    for (const phrase of BANNED.filter((p) => p !== 'paused')) expect(text, phrase).not.toContain(phrase);
  });

  it('runs in the PRD order: standfirst, status line, register, Q2, Q1, sources', async () => {
    renderAt('/green-transition/tracker', asRows(true));
    await pageH1();
    await registerReady();
    const body = document.body.textContent ?? '';
    const at = (s: string) => body.indexOf(s);
    const order = [
      TRACKER_STANDFIRST,
      'Covers January–June 2025. Not updated since.',
      'Sector register',
      TRACKER_QUARTERS[1].title,
      TRACKER_QUARTERS[0].title,
      'Primary documents only',
    ].map(at);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('lists the register rows in sector order with each status in words', async () => {
    renderAt('/green-transition/tracker', asRows(true));
    await registerReady();
    const table = screen.getByRole('table');
    const rowHeaders = within(table).getAllByRole('rowheader').map((th) => th.textContent?.trim());
    expect(rowHeaders).toEqual(['Geothermal', 'Solar', 'PLN procurement', 'JETP', 'OJK taxonomy', 'Danantara', 'Other']);
    for (const e of content.entries) expect(within(table).getAllByText(e.finding).length).toBe(1);
    expect(within(table).getAllByText('Mixed').length).toBe(content.entries.filter((e) => e.status === 'mixed').length);
  });

  it('numbers every source once, and every inline [n] points at a listed source', async () => {
    renderAt('/green-transition/tracker', asRows(true));
    await registerReady();
    const listed = document.querySelectorAll('li[id^="source-"]');
    expect(listed).toHaveLength(Object.keys(content.sources).length);
    const refs = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#source-"]')];
    expect(refs.length).toBeGreaterThan(0);
    for (const a of refs) expect(document.getElementById(a.getAttribute('href')!.slice(1)), a.href).not.toBeNull();
  });

  it('uses no monospace and no eyebrow labels anywhere on the route', async () => {
    renderAt('/green-transition/tracker', asRows(true));
    await registerReady();
    expect(document.querySelector('[class*="font-mono"], .eyebrow, .eyebrow-chip')).toBeNull();
  });

  it('opens a sector to show both quarters’ detail', async () => {
    const user = userEvent.setup();
    renderAt('/green-transition/tracker', asRows(true));
    await registerReady();
    const button = screen.getByRole('button', { name: 'Geothermal' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    const detailRow = document.getElementById(button.getAttribute('aria-controls')!)!;
    expect(detailRow).not.toBeVisible();
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(detailRow).toBeVisible();
    const geo = content.entries.filter((e) => e.sector === 'geothermal');
    for (const e of geo) expect(within(detailRow).getByText(e.detail)).toBeInTheDocument();
  });

  it('marks unpublished entries and says so only when there are some (the admin view)', async () => {
    renderAt('/green-transition/tracker', asRows(false));
    await registerReady();
    expect(screen.getByRole('note')).toHaveTextContent('14 of 14 entries are not published');
    expect(screen.getAllByText('· not published', { exact: false })).toHaveLength(14);
  });

  it('shows no admin note when every entry is published', async () => {
    renderAt('/green-transition/tracker', asRows(true));
    await registerReady();
    expect(screen.queryByText(/entries are not published/)).toBeNull();
  });

  it('says plainly when nothing is published yet', async () => {
    renderAt('/green-transition/tracker', []);
    await pageH1();
    expect(await screen.findByText('No entry is published yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('the old tracker addresses', () => {
  it.each([
    ['/green-transition/tracker/q2-2025', '#q2-2025'],
    ['/green-transition/tracker/q1-2025', '#q1-2025'],
    ['/green-transition/tracker/archive', ''],
    ['/green-transition/tracker/q2-2025/policyMovement/geothermal-pricing-framework-revision', ''],
    ['/green-transition/tracker/not-an-issue', ''],
  ])('%s lands on the tracker page%s', async (path, hash) => {
    renderAt(path, asRows(true));
    await pageH1();
    await waitFor(() => expect(window.location.pathname).toBe('/green-transition/tracker'));
    expect(window.location.hash).toBe(hash);
  });

  it('the issue anchors exist on the page', async () => {
    renderAt('/green-transition/tracker', asRows(true));
    await registerReady();
    for (const q of TRACKER_QUARTERS) expect(document.getElementById(q.anchor)).not.toBeNull();
  });
});

describe('the current-condition series stub', () => {
  it('lists the opening essay as a title, not a link, while it is unpublished', async () => {
    fromMock.mockImplementation(() => makeQueryResult([]));
    window.history.pushState({}, '', '/green-transition/current-condition');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Current condition' })).toBeInTheDocument();
    const title = screen.getByText('Learn from the UK: It Was Never Just Political Will');
    expect(title.closest('a')).toBeNull();
    expect(screen.getByText('Not yet published.')).toBeInTheDocument();
  });

  it('links the essay once it is published', async () => {
    fromMock.mockImplementation((table: string) =>
      makeQueryResult(
        table === 'essays'
          ? [{ slug: 'learn-from-the-uk-it-was-never-just-political-will', section: 'green-transition', phase: null, published: true }]
          : [],
      ),
    );
    window.history.pushState({}, '', '/green-transition/current-condition');
    render(<App />);
    const link = await screen.findByRole('link', { name: 'Learn from the UK: It Was Never Just Political Will' });
    expect(link.getAttribute('href')).toMatch(/learn-from-the-uk-it-was-never-just-political-will$/);
  });
});
