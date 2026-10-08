/**
 * The Kawasan Industri shell (PRD §7.1, §7.11, §8.5; mega prompt rules 5, 8,
 * 12): with the flag off the chain wrappers render the schematic exactly as
 * before and nothing of the world; the search index answers from the
 * registry and the published pieces only; a room lists its section's
 * published essays and the industry room only tagged ones; a card for a
 * company without a model carries no figure; the lists are written once.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { BAND_BY_ID, CHAIN_COPY } from '@/data/industryChain';
import { makeQueryResult } from './helpers/renderWithProviders';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (...a: unknown[]) => fromMock(...a) } }));

import { IndustryChainPreview, IndustryChainSection } from '@/components/industry-chain/ChainPlate';
import { WORLD_KAWASAN } from '@/lib/world/flag';
import { searchIndex } from '@/lib/world/search';
import { piecesFor, TAG_FILE, type PublishedEssay } from '@/lib/world/thinkTank';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { ROOMS } from '@/lib/world/registry/generate';
import { ENERGY_DRILLDOWN, LAYERS, OVERLAYS, PLACES, SECTION_ORDER, STATUS_VOCAB, TOTAL_PLACED, boardPath } from '@/lib/world/constants';
import { conditionHref, conditionOf, conditionShort } from '@/lib/finance-in-action/conditions';
import { Card } from '@/components/world/Card';

function mount(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});

describe('flag off', () => {
  it('is off in tests as in production, and the wrappers render the schematic with no world markup', () => {
    expect(WORLD_KAWASAN).toBe(false);
    mount(<IndustryChainPreview />);
    expect(screen.getByRole('heading', { name: CHAIN_COPY.title, level: 1 })).toBeInTheDocument();
    expect(document.querySelector('[class*="world-"]')).toBeNull();
    expect(document.querySelector('canvas')).toBeNull();
    document.body.innerHTML = '';
    mount(<IndustryChainSection />);
    expect(screen.getByRole('heading', { name: CHAIN_COPY.title, level: 2 })).toBeInTheDocument();
    expect(document.querySelector('[class*="world-"]')).toBeNull();
  });
});

describe('search index', () => {
  const placed = REGISTRY.subIndustries.filter((s) => s.zone !== 'unplaced');
  const withCompany = placed.find((s) => s.companies.length > 0)!;
  it('answers a ticker prefix with the company, a code or name with the sub-industry, and nothing to an empty query', () => {
    const c = withCompany.companies[0];
    const hit = searchIndex(c.ticker.slice(0, 3).toLowerCase(), []).find((h) => h.kind === 'company' && h.id === c.ticker);
    expect(hit?.title).toContain(c.name);
    expect(searchIndex(withCompany.code, [])[0]).toMatchObject({ kind: 'building', id: withCompany.code });
    expect(searchIndex(withCompany.nameEn, []).some((h) => h.kind === 'building' && h.id === withCompany.code)).toBe(true);
    expect(searchIndex('   ', [])).toEqual([]);
  });
  it('never lists an unplaced sub-industry and caps the list', () => {
    const unplaced = REGISTRY.subIndustries.filter((s) => s.zone === 'unplaced');
    expect(unplaced.length).toBeGreaterThan(0);
    for (const u of unplaced) expect(searchIndex(u.code, []).some((h) => h.id === u.code)).toBe(false);
    expect(searchIndex('a', []).length).toBeLessThanOrEqual(8);
    expect(searchIndex('a', [], 3).length).toBe(3);
  });
  it('finds a think-tank piece by title', () => {
    const piece = { slug: 'x', title: 'Cold storage capacity', section: 'next-big-thing', date: null, phase: null, room: 'next-big-thing', kind: 'thesis' as const, tags: [], evidence: [], falsifier: null, tagged: false };
    expect(searchIndex('storage cap', [piece])).toEqual([{ kind: 'piece', id: 'x', title: 'Cold storage capacity', detail: 'Think tank' }]);
  });
});

describe('think-tank pieces', () => {
  const essays: PublishedEssay[] = [
    { slug: 'a', title: 'A', section: 'next-big-thing', date: '2026-01-01', phase: null },
    { slug: 'b', title: 'B', section: 'green-transition', date: null, phase: null },
    { slug: 'c', title: 'C', section: 'development-finance', date: null, phase: null },
  ];
  it('lists a room’s section, skips rooms that are off, and the industry room lists only essays tagged with a sub-industry code', () => {
    const pieces = piecesFor(ROOMS, essays);
    expect(pieces.map((p) => [p.room, p.slug])).toEqual([['next-big-thing', 'a']]);
    expect(pieces[0]).toMatchObject({ kind: 'thesis', tags: [], evidence: [], falsifier: null, tagged: false });
    const tagged = piecesFor(ROOMS, essays);
    expect(tagged.filter((p) => p.room === 'industry-analysis')).toEqual([]);
  });
  it('reads the interim tag file, which is owner-authored and empty until written', () => {
    expect(typeof TAG_FILE.about).toBe('string');
    for (const t of Object.values(TAG_FILE.entries)) {
      expect(['thesis', 'model-based']).toContain(t.kind);
      expect(Array.isArray(t.tags)).toBe(true);
    }
  });
});

describe('card', () => {
  it('renders nothing with no selection, and a company without a model shows the status word and no figure', () => {
    const noop = () => {};
    const { container } = mount(<Card selection={null} lens="economy" flows={[]} pieces={[]} onClose={noop} onAction={noop} />);
    expect(container.innerHTML).toBe('');
    document.body.innerHTML = '';
    const info = { kind: 'Company', title: 'A company', status: STATUS_VOCAB.none.word, rows: [['Ticker', 'ABCD'], ['Model', STATUS_VOCAB.none.word]] as const };
    mount(<Card selection={{ id: 'ABCD', kind: 'company', info }} lens="economy" flows={[]} pieces={[]} onClose={noop} onAction={noop} />);
    const card = screen.getByRole('region', { name: 'Selection details' });
    expect(card.textContent).toContain(STATUS_VOCAB.none.word);
    expect(card.textContent!.replace(/\d{4}-\d{2}-\d{2}/g, '')).not.toMatch(/\d/);
    expect(screen.getByRole('link', { name: 'Open board' })).toHaveAttribute('href', boardPath('ABCD'));
    expect(screen.getByRole('heading', { level: 3 })).toHaveFocus();
  });
});

describe('energy drill-down (discovery item D)', () => {
  it('the energy mark lists the band’s three lines and links to the two Capital in Motion conditions on PLN', () => {
    const noop = () => {};
    mount(<Card selection={null} mark={{ shift: 'green', targetId: ENERGY_DRILLDOWN.bandId }} lens="economy" flows={[]} pieces={[]} onClose={noop} onAction={noop} />);
    const drill = document.querySelector('[data-drilldown="energy"]')!;
    expect(drill).not.toBeNull();
    expect(drill.querySelectorAll('li').length).toBe(BAND_BY_ID['band-energy'].lines.length + ENERGY_DRILLDOWN.conditions.length);
    for (const n of ENERGY_DRILLDOWN.conditions) {
      const link = screen.getByRole('link', { name: new RegExp(conditionShort(n)) });
      expect(link).toHaveAttribute('href', conditionHref(n));
      expect(conditionOf(n)?.caseCompany).toMatch(/PLN/);
    }
    expect(drill.textContent!.replace(/Capital in Motion \d+/g, '')).not.toMatch(/\d{3}/);
  });
});

describe('lists written once', () => {
  it('places, layers, overlays, statuses and the board’s sections are each one constant with the PRD’s shape', () => {
    expect(PLACES.map((p) => p.key)).toEqual(['1', '2', '3', '4', '5', '0']);
    expect(LAYERS.map((l) => l.layer)).toEqual(['logistics', 'cold-chain', 'credit', 'energy', 'governance', 'regulation']);
    expect(OVERLAYS.map((o) => o.overlay)).toEqual(['none', 'reindustrialisation', 'green-transition']);
    for (const v of Object.values(STATUS_VOCAB)) { expect(v.glyph.length).toBeGreaterThan(0); expect(v.word.length).toBeGreaterThan(0); }
    expect(SECTION_ORDER).toHaveLength(8);
    expect(SECTION_ORDER[0]).toBe('Header');
    expect(SECTION_ORDER[7]).toBe('Related analyses');
    expect(TOTAL_PLACED).toBe(REGISTRY.subIndustries.filter((s) => s.zone !== 'unplaced').length);
    expect(boardPath('BBCA')).toBe('/finance/kawasan/bbca');
  });
});
