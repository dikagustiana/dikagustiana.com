/**
 * The chain on a narrow screen: a column, not a shrunken plate. Every joint
 * is a tappable row that opens its reading right beneath it; the layers are
 * a list whose rows open; returns and the money and information flows sit
 * behind two toggles, off by default; the lenses write inline. And the column
 * draws exactly the records the wide plate draws — a parity test keeps the
 * two layouts from drifting apart.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import {
  BANDS,
  BORDERS,
  BYPRODUCT,
  CHAIN_COPY,
  COMPACT,
  ECONOMY_LENS,
  JOINTS,
  MARGIN_KINDS,
  NODES,
  NON_PHYSICAL,
  RETAIL,
  RETAIL_GROUP,
  RETURNS,
  STAGES,
  UNIT_LENS,
} from '@/data/industryChain';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { ChainPlate } from '@/components/industry-chain/ChainPlate';

/** A phone: the wide-plate query does not match; nothing else does either. */
function narrowScreen() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }),
  });
}

function mount(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const ids = () => new Set(Array.from(document.querySelectorAll<HTMLElement>('[data-id]')).map((el) => el.dataset.id!));

beforeEach(narrowScreen);
afterEach(() => {
  // @ts-expect-error — restore jsdom's absence of matchMedia for the next file
  delete window.matchMedia;
});

describe('the column', () => {
  it('replaces the plate: one column, no svg, the headline still first', () => {
    mount(<ChainPlate links={[]} />);
    expect(document.querySelectorAll('.cp-column[data-variant="full"]')).toHaveLength(1);
    expect(document.querySelector('svg.cp-svg')).toBeNull();
    expect(screen.getByRole('heading', { name: CHAIN_COPY.headline })).toBeInTheDocument();
  });

  it('makes every joint a tappable row, and opens its reading right beneath it', async () => {
    mount(<ChainPlate links={[]} />);
    for (const j of JOINTS) expect(screen.getByRole('button', { name: j.label })).toHaveAttribute('aria-expanded', 'false');

    const trigger = screen.getByRole('button', { name: 'Trader / importer → manufacturing' });
    await userEvent.click(trigger);
    const panel = screen.getByRole('region', { name: 'Trader / importer → manufacturing' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel).getByText(MARGIN_KINDS['node-spread'].label)).toBeInTheDocument();
    // The reading follows the row that opened it: it comes after the trigger, before the next stage box.
    const order = Array.from(
      document.querySelectorAll('[data-id="j-trader-manufacturing"], section[aria-labelledby$="-chain-panel-title"], [data-id="stage-manufacturing"]'),
    );
    expect(order.map((el) => el.tagName)).toEqual(['DIV', 'SECTION', 'DIV']);
    expect(within(panel).getByRole('heading', { level: 3 })).toHaveFocus();

    await userEvent.click(within(panel).getByRole('button', { name: CHAIN_COPY.panel.close }));
    expect(document.querySelector('section[aria-labelledby$="-chain-panel-title"]')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('shows the margin chip on every joint under the unit lens, and the slices inline', async () => {
    mount(<ChainPlate links={[]} />);
    expect(screen.queryByText(MARGIN_KINDS.conversion.chip)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    const chips = document.querySelectorAll('[data-id^="j-"] button span span:last-child');
    expect(Array.from(chips).filter((c) => Object.values(MARGIN_KINDS).some((k) => k.chip === c.textContent))).toHaveLength(JOINTS.length);
    for (const s of UNIT_LENS) expect(document.querySelector(`[data-id="${s.id}"]`), s.id).not.toBeNull();
  });

  it('writes the economy readings under the thing they read', async () => {
    mount(<ChainPlate links={[]} />);
    expect(document.querySelector('[data-id="econ-inflation"]')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'economy' }));
    for (const e of ECONOMY_LENS) expect(document.querySelector(`[data-id="${e.id}"]`), e.id).not.toBeNull();
    // anchored to a joint → inside that joint's row
    expect(document.querySelector('[data-id="j-aggregation-processing"] [data-id="econ-inflation"]')).not.toBeNull();
  });

  it('hides returns and the money and information flows behind two toggles, off by default', async () => {
    mount(<ChainPlate links={[]} />);
    for (const r of RETURNS) expect(document.querySelector(`[data-id="${r.id}"]`), r.id).toBeNull();
    for (const f of NON_PHYSICAL) expect(document.querySelector(`[data-id="${f.id}"]`), f.id).toBeNull();

    const returns = screen.getByRole('button', { name: CHAIN_COPY.controls.returns });
    expect(returns).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(returns);
    expect(returns).toHaveAttribute('aria-pressed', 'true');
    for (const r of RETURNS) expect(document.querySelector(`[data-id="${r.id}"]`), r.id).not.toBeNull();
    expect(screen.getByText(/Post-consumer organic/)).toBeInTheDocument();
    expect(screen.getByText(/Recovery → Biological primary production/)).toBeInTheDocument();

    const flows = screen.getByRole('button', { name: CHAIN_COPY.controls.nonPhysical });
    await userEvent.click(flows);
    for (const f of NON_PHYSICAL) expect(document.querySelector(`[data-id="${f.id}"]`), f.id).not.toBeNull();
    expect(screen.getByText('Trade credit · trade promotion · rebates')).toBeInTheDocument();
  });

  it('lists the five layers as rows that open, with their span in words', async () => {
    mount(<ChainPlate links={[]} />);
    const list = screen.getByRole('heading', { name: CHAIN_COPY.controls.layers }).parentElement!;
    for (const b of BANDS) expect(within(list).getByRole('button', { name: new RegExp(b.label) })).toHaveAttribute('aria-expanded', 'false');
    expect(within(list).getByText('Primary processing → finished-goods manufacturing')).toBeInTheDocument();

    await userEvent.click(within(list).getByRole('button', { name: /Credit and working capital/ }));
    const panel = screen.getByRole('region', { name: 'Credit and working capital' });
    expect(within(panel).getByText(/Finance income and finance cost/)).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: /Credit and working capital/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('cuts the chain with the two border lines at their joints', () => {
    mount(<ChainPlate links={[]} />);
    for (const b of BORDERS) expect(document.querySelector(`[data-id="${b.id}"]`), b.id).not.toBeNull();
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('closes the legend by default on a narrow screen, and opens it on request', async () => {
    mount(<ChainPlate links={[]} />);
    const trigger = screen.getByRole('button', { name: CHAIN_COPY.controls.legend });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('[data-legend="stage"]')).toBeNull();
    await userEvent.click(trigger);
    expect(document.querySelector('[data-legend="stage"]')).not.toBeNull();
  });

  it('never fixes a width or forbids wrapping, so nothing can be wider than the screen', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/components/industry-chain/ChainColumn.tsx'), 'utf8');
    expect(src).not.toMatch(/whitespace-nowrap|min-w-\[|w-\[\d/);
  });
});

describe('parity between the column and the wide plate', () => {
  const tsx = readFileSync(resolve(process.cwd(), 'src/components/industry-chain/ChainPlateSvg.tsx'), 'utf8');
  const wideSrc = tsx.split('export function ChainPlateCompact')[0];

  it('draws every record the data has, and so does the generated plate', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.controls.returns }));
    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.controls.nonPhysical }));
    await userEvent.click(screen.getByRole('button', { name: 'economy' }));
    const column = ids();
    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    for (const id of ids()) column.add(id);

    const expected = [
      ...STAGES.map((s) => s.id),
      ...NODES.map((n) => n.id),
      ...RETAIL.map((r) => r.id),
      ...JOINTS.map((j) => j.id),
      ...BANDS.map((b) => b.id),
      ...BORDERS.map((b) => b.id),
      ...RETURNS.map((r) => r.id),
      ...NON_PHYSICAL.map((f) => f.id),
      ...ECONOMY_LENS.map((e) => e.id),
      ...UNIT_LENS.map((s) => s.id),
      BYPRODUCT.id,
    ];
    for (const id of expected) {
      expect(column.has(id), `column lacks ${id}`).toBe(true);
      expect(wideSrc.includes(`data-id="${id}"`) || wideSrc.includes(`id="${id}"`), `wide plate lacks ${id}`).toBe(true);
    }
    expect(column.has(RETAIL_GROUP.id)).toBe(true);
  });
});

describe('the short version on a narrow screen', () => {
  it('draws exactly COMPACT — six stages, three groups, two layers, one return — with no doors', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(document.querySelectorAll('.cp-column[data-variant="compact"]')).toHaveLength(1);
    const expected = new Set<string>([
      ...COMPACT.sequence.flatMap((s) => (s.kind === 'stages' ? s.ids : [s.id])),
      ...COMPACT.bands,
      COMPACT.returnArrow.id,
    ]);
    expect(ids()).toEqual(expected);
    for (const j of JOINTS) expect(screen.queryByRole('button', { name: j.label })).not.toBeInTheDocument();
    expect(screen.getByText('Aggregator')).toBeInTheDocument();
    expect(screen.getByText('Distribution / wholesale')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.controls.seeFull }));
    expect(document.querySelectorAll('.cp-column[data-variant="full"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Aggregation → processing' })).toBeInTheDocument();
  });
});
