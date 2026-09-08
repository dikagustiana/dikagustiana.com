/**
 * The chain on a narrow screen: a column, not a shrunken plate. Every joint
 * is a tappable row whose mark is the form of its margin kind and whose chip
 * is the joint read at the distance that is on; a reading opens as a bottom
 * sheet, because a phone has no hover and no room beside a row; the layers
 * are a list whose rows open the same way; returns and the money and
 * information flows sit behind two toggles, off by default; a shift outlines
 * the rows it moves in the form of their status and writes the status and the
 * lever's work beneath each, in one voice. There is no legend: every form
 * carries its own definition. And the column draws exactly the records the
 * wide plate draws — a parity test keeps the two layouts from drifting.
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
  DEFINE,
  JOINTS,
  LEVERS,
  MARGIN_KINDS,
  NODES,
  NON_PHYSICAL,
  RETAIL,
  RETAIL_GROUP,
  RETURNS,
  SHIFT_BY_ID,
  STAGES,
  STATUS,
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
const word = (name: string) => screen.getByRole('button', { name, exact: true });
const rowChips = () => Array.from(document.querySelectorAll('[data-id^="j-"] button [data-chip]')).map((c) => c.textContent);
/** The one reading open, wherever the sheet has put it. */
const region = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  narrowScreen();
  window.history.replaceState({}, '', '/about');
});
afterEach(() => {
  // @ts-expect-error — restore jsdom's absence of matchMedia for the next file
  delete window.matchMedia;
});

describe('the column', () => {
  it('replaces the plate: one column, no svg, the headline still first, nothing under it', () => {
    mount(<ChainPlate links={[]} />);
    expect(document.querySelectorAll('.cp-column[data-variant="full"]')).toHaveLength(1);
    expect(document.querySelector('svg.cp-svg')).toBeNull();
    expect(screen.getByRole('heading', { name: CHAIN_COPY.headline })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'How to read the map' })).not.toBeInTheDocument();
    expect(screen.queryByText('How the two distances relate')).not.toBeInTheDocument();
  });

  it('makes every joint a tappable row marked in the form of its margin kind, and opens its reading as a bottom sheet', async () => {
    mount(<ChainPlate links={[]} />);
    for (const j of JOINTS) {
      expect(screen.getByRole('button', { name: j.label })).toHaveAttribute('aria-expanded', 'false');
      expect(document.querySelector(`[data-id="${j.id}"] [data-mark-form]`)!.getAttribute('data-mark-form')).toBe(MARGIN_KINDS[j.margin].mark);
    }

    const trigger = screen.getByRole('button', { name: 'Trader / importer → manufacturing' });
    await userEvent.click(trigger);
    const panel = region('Trader / importer → manufacturing');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel.closest('[data-chain-sheet]')).not.toBeNull();
    expect(panel.closest('[role="dialog"]')).not.toBeNull();
    expect(within(panel).getByText(MARGIN_KINDS['node-spread'].label)).toBeInTheDocument();
    // One voice: the economy reading, and not the finance one beneath it.
    const j = JOINTS.find((x) => x.id === 'j-trader-manufacturing')!;
    expect(within(panel).getByText(j.read.economy.note)).toBeInTheDocument();
    expect(within(panel).queryByText(j.read.finance.note)).not.toBeInTheDocument();
    expect(within(panel).getByRole('heading', { level: 3 })).toHaveFocus();

    // The sheet carries the one close control; the panel does not repeat it.
    expect(within(panel).queryByRole('button', { name: CHAIN_COPY.panel.close })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.panel.close }));
    expect(document.querySelector('section[aria-labelledby$="-chain-panel-title"]')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('puts the economy chip on every joint row at rest, and swaps every one for its finance chip from the sentence', async () => {
    mount(<ChainPlate links={[]} />);
    expect(rowChips().sort()).toEqual(JOINTS.map((j) => j.read.economy.chip).sort());
    await userEvent.click(word('finance'));
    expect(rowChips().sort()).toEqual(JOINTS.map((j) => j.read.finance.chip).sort());
    expect(document.querySelector('.chain-plate')!.getAttribute('data-lens')).toBe('finance');
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

  it('lists the six layers as rows that open, with their span in words, and no chip word on a layer that only sets the terms', async () => {
    mount(<ChainPlate links={[]} />);
    const list = screen.getByRole('heading', { name: CHAIN_COPY.controls.layers }).parentElement!;
    for (const b of BANDS) expect(within(list).getByRole('button', { name: new RegExp(b.label) })).toHaveAttribute('aria-expanded', 'false');
    expect(within(list).getAllByText('The whole chain').length).toBeGreaterThan(0);
    expect(within(list).getByRole('button', { name: /^Energy/ })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: /^Cold chain/ })).toBeInTheDocument();
    expect(within(list).queryByText('Terms')).not.toBeInTheDocument();
    expect(within(list).queryByText('Rules')).not.toBeInTheDocument();

    const credit = within(list).getByRole('button', { name: /Credit and working capital/ });
    await userEvent.click(credit);
    const panel = region('Credit and working capital');
    expect(within(panel).getByText(/Finance income and finance cost/)).toBeInTheDocument();
    expect(credit).toHaveAttribute('aria-expanded', 'true');
  });

  it('cuts the chain with the two border lines at their joints', () => {
    mount(<ChainPlate links={[]} />);
    for (const b of BORDERS) expect(document.querySelector(`[data-id="${b.id}"]`), b.id).not.toBeNull();
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('carries no legend: each form says what it is on the element itself', () => {
    mount(<ChainPlate links={[]} />);
    expect(document.querySelector('[data-legend]')).toBeNull();
    expect(document.querySelector('[data-id="node-aggregation"]')!.getAttribute('title')).toBe(DEFINE.node);
    expect(document.querySelector('[data-id="stage-processing"]')!.getAttribute('title')).toBe(DEFINE.stage);
    expect(document.querySelector('[data-id="stage-biological"]')!.getAttribute('title')).toBe(DEFINE.origin);
    expect(document.querySelector('[data-id="node-retail"]')!.getAttribute('title')).toBe(DEFINE.retail);
    const button = screen.getByRole('button', { name: 'Processing → trader / importer' });
    expect(document.getElementById(button.getAttribute('aria-describedby')!)!.textContent).toContain(MARGIN_KINDS.conversion.label);
  });

  it('never fixes a width or forbids wrapping, so nothing can be wider than the screen', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/components/industry-chain/ChainColumn.tsx'), 'utf8');
    expect(src).not.toMatch(/whitespace-nowrap|min-w-\[|w-\[\d/);
  });
});

describe('a shift on a narrow screen', () => {
  it('outlines exactly the rows it moves in the form of their status, writes the status and the lever beneath each in one voice, and nothing under the column', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('reindustrialisation'));
    const s = SHIFT_BY_ID.reindustrialisation;
    const lit = Array.from(document.querySelectorAll<HTMLElement>('[data-id][data-lit]')).map((el) => el.dataset.id!).sort();
    expect(lit).toEqual(s.targets.map((t) => t.id).sort());
    for (const t of s.targets) {
      const note = document.querySelector(`[data-lit-note="${t.id}"]`)!;
      expect(note.getAttribute('data-status'), t.id).toBe(t.condition!.status);
      expect(note.textContent, t.id).toContain(STATUS[t.condition!.status].label);
      expect(note.textContent, t.id).toContain(LEVERS[t.condition!.lever].label);
      expect(note.textContent, t.id).toContain(t.condition!.action.economy);
      expect(note.textContent, t.id).not.toContain(t.condition!.action.finance);
    }
    expect(document.querySelector('[data-shift-caption]')).toBeNull();

    await userEvent.click(word('finance'));
    for (const t of s.targets) {
      expect(document.querySelector(`[data-lit-note="${t.id}"]`)!.textContent, t.id).toContain(t.condition!.action.finance);
    }
  });

  it('shows the post-consumer loop under recovery when the green transition is on, without opening the returns list', async () => {
    mount(<ChainPlate links={[]} />);
    expect(document.querySelector('[data-lit-returns]')).toBeNull();
    await userEvent.click(word('green transition'));
    const loop = document.querySelector('[data-lit-returns="stage-recovery"]')!;
    expect(loop).not.toBeNull();
    expect(within(loop as HTMLElement).getByText('Post-consumer material')).toBeInTheDocument();
    expect(within(loop as HTMLElement).getByText('Post-consumer organic')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: CHAIN_COPY.controls.returns })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.controls.returns }));
    expect(document.querySelector('[data-lit-returns]')).toBeNull();
    expect(document.querySelector('[data-id="return-postconsumer-material"][data-lit]')).not.toBeNull();
    expect(document.querySelector('[data-id="return-scrap"][data-lit]')).toBeNull();
  });
});

describe('parity between the column and the wide plate', () => {
  const tsx = readFileSync(resolve(process.cwd(), 'src/components/industry-chain/ChainPlateSvg.tsx'), 'utf8');
  const wideSrc = tsx.split('export function ChainPlateCompact')[0];

  it('draws every record the data has, and so does the generated plate', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.controls.returns }));
    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.controls.nonPhysical }));
    const column = ids();

    const expected = [
      ...STAGES.map((s) => s.id),
      ...NODES.map((n) => n.id),
      ...RETAIL.map((r) => r.id),
      RETAIL_GROUP.id,
      ...JOINTS.map((j) => j.id),
      ...BANDS.map((b) => b.id),
      ...BORDERS.map((b) => b.id),
      ...RETURNS.map((r) => r.id),
      ...NON_PHYSICAL.map((f) => f.id),
      BYPRODUCT.id,
    ];
    for (const id of expected) {
      expect(column.has(id), `column lacks ${id}`).toBe(true);
      expect(wideSrc.includes(`data-id="${id}"`) || wideSrc.includes(`id="${id}"`), `wide plate lacks ${id}`).toBe(true);
    }
  });
});

describe('the short version on a narrow screen', () => {
  it('draws exactly COMPACT — six stages, three groups, two layers, one return — with no doors', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(document.querySelectorAll('.cp-column[data-variant="compact"]')).toHaveLength(1);
    const expected = new Set<string>([...COMPACT.sequence.flatMap((s) => (s.kind === 'stages' ? s.ids : [s.id])), ...COMPACT.bands, COMPACT.returnArrow.id]);
    expect(ids()).toEqual(expected);
    for (const j of JOINTS) expect(screen.queryByRole('button', { name: j.label })).not.toBeInTheDocument();
    expect(screen.getByText('Aggregator')).toBeInTheDocument();
    expect(screen.getByText('Distribution / wholesale')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.controls.seeFull }));
    expect(document.querySelectorAll('.cp-column[data-variant="full"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Aggregation → processing' })).toBeInTheDocument();
  });
});

describe('a mark on a narrow screen', () => {
  it('opens the reading it promises as a bottom sheet: the number is the control, and the sheet speaks in the one voice that is on', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));

    const badge = screen.getByRole('button', { name: /^4\. Green transition · Recovery · Unpriced$/ });
    expect(badge).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(badge);

    const panel = region('Recovery');
    expect(panel.closest('[data-chain-sheet]')).not.toBeNull();
    const target = SHIFT_BY_ID.green.targets.find((t) => t.id === 'stage-recovery')!.condition!;
    expect(within(panel).getByText(target.action.economy)).toBeInTheDocument();
    expect(within(panel).queryByText(target.action.finance)).not.toBeInTheDocument();
    expect(within(panel).getByText('Unpriced')).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders the reading a shared address asks for, so a link made on the wide plate still lands on a phone', () => {
    window.history.replaceState({}, '', '/about?lens=green&node=recovery');
    mount(<ChainPlate links={[]} />);
    expect(document.querySelector('.cp-column[data-variant="full"]')).not.toBeNull();
    expect(region('Recovery')).toBeInTheDocument();
  });

  it('opens one reading per target, never two', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    await userEvent.click(screen.getByRole('button', { name: 'Consumption → recovery' }));
    expect(screen.getAllByRole('region', { name: 'Consumption → recovery' })).toHaveLength(1);
  });
});
