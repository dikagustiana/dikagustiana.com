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
  DEFINE,
  JOINTS,
  LEVERS,
  MARGIN_KINDS,
  NODES,
  NON_PHYSICAL,
  OVERVIEW_GROUPS,
  OVERVIEW_HIDES,
  OVERVIEW_INTERNAL_JOINTS,
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
  it('replaces the plate: one column, no svg, the title still first, nothing under it', () => {
    mount(<ChainPlate links={[]} />);
    expect(document.querySelectorAll('.cp-column[data-level="detail"]')).toHaveLength(1);
    expect(document.querySelector('svg.cp-svg')).toBeNull();
    expect(screen.getByRole('heading', { name: CHAIN_COPY.title })).toBeInTheDocument();
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

  it('lists every layer as a row that opens, with its span in words, and no chip word on a layer that only sets the terms', async () => {
    mount(<ChainPlate links={[]} />);
    const list = screen.getByRole('heading', { name: CHAIN_COPY.controls.layers }).parentElement!;
    for (const b of BANDS) expect(within(list).getByRole('button', { name: new RegExp(b.label) })).toHaveAttribute('aria-expanded', 'false');
    expect(within(list).getAllByText('The whole chain').length).toBeGreaterThan(0);
    expect(within(list).getByRole('button', { name: /^Energy/ })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: /^Cold chain/ })).toBeInTheDocument();
    expect(within(list).queryByText('Terms')).not.toBeInTheDocument();
    expect(within(list).queryByText('Rules')).not.toBeInTheDocument();

    const credit = within(list).getByRole('button', { name: /Working capital and trade credit/ });
    await userEvent.click(credit);
    const panel = region('Working capital and trade credit');
    expect(within(panel).getByText(BANDS.find((b) => b.id === 'band-credit')!.read.economy)).toBeInTheDocument();
    expect(credit).toHaveAttribute('aria-expanded', 'true');
    // The statement lines belong to the close reading; the column obeys the
    // same rule as the plate, because it renders the same panel.
    expect(within(panel).queryByText(/Finance income and finance cost/)).not.toBeInTheDocument();

    // The sheet is a modal, so the distance control is not reachable while it
    // is open: close, switch, reopen.
    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.panel.close }));
    await userEvent.click(word('finance'));
    await userEvent.click(screen.getByRole('button', { name: /Working capital and trade credit/ }));
    expect(
      within(region('Working capital and trade credit')).getByText(/Finance income and finance cost/),
    ).toBeInTheDocument();
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

describe('the overview on a narrow screen', () => {
  /**
   * V5 asks the narrow layout to START from the existing column and reduce the
   * initial detail by the SAME grouping rules the plate uses — not to become an
   * article or a card per element. So this is the same column with two boxes
   * grouped, one joint folded inside one of them, and everything else present:
   * the joints still open, the layers still open, the marks still land.
   */
  it('is the same column with the same groups applied, not a different drawing', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(document.querySelectorAll('.cp-column[data-level="overview"]')).toHaveLength(1);

    const drawn = ids();
    for (const hidden of OVERVIEW_HIDES) expect(drawn.has(hidden), `overview draws ${hidden}`).toBe(false);
    for (const g of Object.values(OVERVIEW_GROUPS)) {
      expect(drawn.has(g.id), `overview lacks ${g.id}`).toBe(true);
      expect(screen.getByRole('heading', { name: g.label })).toBeInTheDocument();
    }

    // Every stage, border, layer and by-product survives the grouping.
    for (const st of STAGES) expect(drawn.has(st.id), st.id).toBe(true);
    for (const b of BORDERS) expect(drawn.has(b.id), b.id).toBe(true);
    for (const b of BANDS) expect(drawn.has(b.id), b.id).toBe(true);
    expect(drawn.has(BYPRODUCT.id)).toBe(true);

    // And the doors still open at the overview — which the old short column,
    // with no joints and no layer list at all, could not do.
    for (const j of JOINTS) {
      const row = screen.queryByRole('button', { name: j.label });
      if (OVERVIEW_INTERNAL_JOINTS.includes(j.id as (typeof OVERVIEW_INTERNAL_JOINTS)[number])) {
        expect(row, `${j.id} is inside a group`).toBeNull();
      } else {
        expect(row, j.id).toHaveAttribute('aria-expanded', 'false');
      }
    }
  });

  it('leaves out the examples and the sub-formats, and puts them back on detail', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    // The five retail formats, the retail node, the distributor and the
    // wholesaler are one box, which names the three functions inside it.
    for (const r of RETAIL) expect(screen.queryByText(r.label), r.id).not.toBeInTheDocument();
    const box = document.querySelector('[data-id="group-distribution-retail"]')!;
    expect(box.textContent).toContain(RETAIL_GROUP.label);
    expect(box.textContent).toContain('Distributor');
    expect(box.textContent).toContain(CHAIN_COPY.controls.transfersInside(2));
    expect(screen.queryByRole('button', { name: 'Wholesale → retail' })).toBeNull();
    // The lanes into each origin and the components of demand are examples,
    // not links in the chain.
    for (const lane of STAGES.find((x) => x.id === 'stage-biological')!.lanes!) {
      expect(screen.queryByText(new RegExp(lane)), lane).not.toBeInTheDocument();
    }

    await userEvent.click(screen.getAllByRole('button', { name: CHAIN_COPY.controls.seeFull })[0]);
    expect(document.querySelectorAll('.cp-column[data-level="detail"]')).toHaveLength(1);
    for (const r of RETAIL) expect(screen.getByText(r.label), r.id).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Distributor → wholesaler' })).toBeInTheDocument();
  });

  it('carries both overlays and both distances at the overview, because it has marks and chips to change', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    await userEvent.click(word('green transition'));
    expect(document.querySelectorAll('.cp-column[data-level="overview"]')).toHaveLength(1);
    const lit = Array.from(document.querySelectorAll<HTMLElement>('[data-id][data-lit]')).map((el) => el.dataset.id!).sort();
    expect(lit).toEqual(SHIFT_BY_ID.green.targets.map((t) => t.id).sort());

    const joint = JOINTS.find((x) => x.id === 'j-retail-consumption')!;
    expect(screen.getByText(joint.read.economy.chip)).toBeInTheDocument();
    await userEvent.click(word('finance'));
    expect(screen.getByText(joint.read.finance.chip)).toBeInTheDocument();
    expect(document.querySelectorAll('.cp-column[data-level="overview"]')).toHaveLength(1);
  });
});

/**
 * THE NARROW OVERVIEW IS THE SWIMLANE ON ITS SIDE. V5's narrow overview ran
 * every joint row in sequence and then listed the seven layers as a catalogue
 * after all of them. The layers now run beside the groups they span, as bars
 * ticked where each attaches, so a phone reader meets the enabling conditions
 * beside the functions they enable.
 */
describe('the layers alongside the narrow overview', () => {
  it('draws every layer as a bar beside the groups it spans, ticked where it attaches, and no catalogue after the chain', () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(screen.queryByRole('heading', { name: CHAIN_COPY.controls.layers })).not.toBeInTheDocument();
    expect(screen.getByText(CHAIN_COPY.controls.layersAlongside)).toBeInTheDocument();
    for (const b of BANDS) {
      const bar = screen.getByRole('button', { name: b.label });
      expect(bar.classList.contains('cp-bar'), b.id).toBe(true);
      expect(bar.textContent, b.id).toContain(b.short);
      expect(bar.getAttribute('aria-expanded'), b.id).toBe('false');
      const row = bar.style.gridRow;
      expect(row, `${b.id} spans grid rows`).toMatch(/^\d+ \/ \d+$/);
    }
    // A whole-chain layer spans from the first group to the last; governance only the downstream half.
    const rows = (label: string) => screen.getByRole('button', { name: label }).style.gridRow.split(' / ').map(Number);
    const [lStart, lEnd] = rows('Logistics and warehousing');
    const [gStart, gEnd] = rows('Principal–distributor contract governance');
    expect(gStart).toBeGreaterThan(lStart);
    expect(gEnd).toBeLessThan(lEnd);
    expect(rows('Energy')).toEqual([lStart, lEnd]);
    // Ticks: a fee at the joints for logistics, an input under the groups for energy, an asset under the recipients for capital, none for the rules.
    expect(document.querySelectorAll('[data-bar-tick="fee"]').length).toBeGreaterThan(0);
    // Energy is an input into every stage, so its bar is ticked at every group that holds one — four of the five; the distribution box holds none.
    const groupsWithAStage = Object.values(OVERVIEW_GROUPS).filter((g) => g.members.some((m) => STAGES.some((s) => s.id === m))).length;
    expect(groupsWithAStage).toBe(4);
    expect(document.querySelectorAll('[data-bar-tick="up"]').length).toBe(groupsWithAStage);
    expect(document.querySelectorAll('[data-bar-tick="asset"]').length).toBeGreaterThanOrEqual(4);
    expect(document.querySelectorAll('[data-bar-tick="terms"]').length).toBeGreaterThan(0);
  });

  it('opens a layer’s reading from its bar, and carries the mark’s number on the bar under a shift', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    await userEvent.click(word('green transition'));
    const energy = screen.getByRole('button', { name: /Green transition · Energy · Moving$/ });
    expect(energy.classList.contains('cp-bar')).toBe(true);
    expect(energy.querySelector('[data-mark-n]')!.textContent).toBe(String(SHIFT_BY_ID.green.targets.length));
    // Working capital carries no green mark; asset finance does.
    expect(screen.getByRole('button', { name: 'Working capital and trade credit' }).querySelector('[data-mark-n]')).toBeNull();
    expect(screen.getByRole('button', { name: /Green transition · Asset and project finance · Moving$/ })).toBeInTheDocument();
    await userEvent.click(energy);
    const panel = region('Energy');
    expect(panel.closest('[data-chain-sheet]')).not.toBeNull();
    expect(panel.querySelector('[data-basis="assessed"]')).not.toBeNull();
    expect(energy).toHaveAttribute('aria-expanded', 'true');
  });

  it('folds the transfers inside an open group, but shows one the shift marks without the fold', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    const fold = document.querySelector('[data-group-fold="group-processing"]') as HTMLDetailsElement;
    expect(fold).not.toBeNull();
    expect(fold.open).toBe(false);
    expect(fold.textContent).toContain(CHAIN_COPY.controls.transfersInside(2));
    await userEvent.click(word('reindustrialisation'));
    // Processing → trader is marked, so it comes out of the fold; aggregation → processing stays in it.
    const marked = screen.getByRole('button', { name: 'Processing → trader / importer' });
    expect(marked.closest('details')).toBeNull();
    expect(screen.getByRole('button', { name: 'Aggregation → processing' }).closest('details')).not.toBeNull();
    expect(document.querySelector('[data-lit-note="j-processing-trader"]')).not.toBeNull();
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
    expect(document.querySelector('.cp-column[data-level="detail"]')).not.toBeNull();
    expect(region('Recovery')).toBeInTheDocument();
  });

  /**
   * A link now lands at the level that can draw it. Recovery is on the
   * overview, so a shared address opens there and stays there; the joint
   * inside the distribution box is not, so that address opens the detail
   * rather than a reading with no element under it.
   */
  it('stays at the overview for an element the overview draws, and opens the detail only for one it does not', () => {
    window.history.replaceState({}, '', '/?lens=green&node=recovery');
    const first = mount(<ChainPlate variant="preview" links={[]} />);
    expect(document.querySelector('.cp-column[data-level="overview"]')).not.toBeNull();
    expect(region('Recovery')).toBeInTheDocument();
    first.unmount();

    window.history.replaceState({}, '', '/?node=distributor-wholesaler');
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(document.querySelector('.cp-column[data-level="detail"]')).not.toBeNull();
    expect(region('Distributor → wholesaler')).toBeInTheDocument();
  });

  it('opens one reading per target, never two', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    await userEvent.click(screen.getByRole('button', { name: 'Consumption → recovery' }));
    expect(screen.getAllByRole('region', { name: 'Consumption → recovery' })).toHaveLength(1);
  });
});
