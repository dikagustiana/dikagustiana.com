/**
 * The numbered marks, their status, the line pinned on hover, the popover
 * they open, and the address they can be reached at.
 *
 * What would quietly break: a mark that opens nothing, a number that means
 * one thing on the plate and another in the column, a set of marks that
 * changes when the reader only changed the distance, a status told by colour
 * alone, a link written into an essay that stops resolving because a slug
 * moved, or a plain visit to the page that rewrites the address behind the
 * reader's back.
 *
 * jsdom has no matchMedia, so the layout hook falls back to the wide plate.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { CHAIN_COPY, LEVERS, SHIFT_BY_ID, STATUS, slugOf } from '@/data/industryChain';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({}) } }));

import { ChainPlate } from '@/components/industry-chain/ChainPlate';
import { MARK_ORDER } from '@/components/industry-chain/chainMarkOrder';
import { placeLabel, placePopover } from '@/components/industry-chain/chainPlacement';
import { hoverLine, isLit, isolationSet, markNumber, markedIds } from '@/components/industry-chain/chainTargets';
import { readChainUrl, writeChainUrl } from '@/components/industry-chain/useChainUrl';

function mount(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const word = (name: string) => screen.getByRole('button', { name, exact: true });
const marks = () =>
  Array.from(document.querySelectorAll<SVGGElement>('.cp-marks--green .cp-mark, .cp-marks--reindustrialisation .cp-mark'));
const hoverLabel = () => document.querySelector('[data-chain-hover]');

beforeEach(() => window.history.replaceState({}, '', '/about'));

describe('the reading order of a shift', () => {
  it('numbers from one, contiguously, in the order the generator laid the marks out — not the order of the data file', () => {
    for (const shift of ['reindustrialisation', 'green'] as const) {
      const ids = markedIds(shift);
      expect(ids, shift).toEqual([...MARK_ORDER[shift]]);
      expect(ids.map((id) => markNumber(shift, id)), shift).toEqual(ids.map((_, i) => i + 1));
      expect([...ids].sort(), shift).toEqual(SHIFT_BY_ID[shift].targets.map((t) => t.id).sort());
    }
  });

  it('puts the green transition at eight marks, with the four layers last because they are the bottom row', () => {
    const ids = markedIds('green');
    expect(ids).toHaveLength(8);
    expect(ids.slice(-4)).toEqual(['band-logistics', 'band-cold-chain', 'band-credit', 'band-energy']);
  });

  it('runs left to right along the chain before the layers', () => {
    expect(markedIds('reindustrialisation')[0]).toBe('border-export');
    expect(markedIds('reindustrialisation').at(-1)).toBe('stage-manufacturing');
  });

  it('gives no number at all to a target this shift does not move', () => {
    expect(markNumber('green', 'stage-manufacturing')).toBe(0);
    expect(markNumber('reindustrialisation', 'band-energy')).toBe(0);
  });

  it('lights a door only where the shift gives it a status — the same rule the overlay and the marks follow', () => {
    expect(isLit('green', 'band-logistics')).toBe(true);
    expect(isLit('green', 'j-consumption-recovery')).toBe(true);
    expect(isLit('reindustrialisation', 'band-logistics')).toBe(false);
    expect(isLit(null, 'band-logistics')).toBe(false);
    // Every lit door has a mark, and every mark is a lit element: nothing is emphasised without a status.
    for (const shift of ['reindustrialisation', 'green'] as const) {
      for (const id of markedIds(shift)) expect(isLit(shift, id), `${shift} ${id}`).toBe(true);
    }
  });
});

describe('the marks on the plate', () => {
  it('are one per marked target, each a button that says its number, its title and its status, and each inside its own overlay', async () => {
    mount(<ChainPlate links={[]} />);
    expect(marks()).toHaveLength(markedIds('green').length + markedIds('reindustrialisation').length);
    expect((document.querySelector('.chain-plate') as HTMLElement).dataset.shift).toBeUndefined();

    await userEvent.click(word('green transition'));
    const drawn = Array.from(document.querySelectorAll('.cp-marks--green .cp-mark'));
    expect(drawn).toHaveLength(8);
    expect(drawn.map((m) => m.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(screen.getByRole('button', { name: /^5\. Green transition · Logistics and warehousing · Stuck$/ })).toBeInTheDocument();
  });

  it('tells the status by form, not colour: a filled disc for stuck, an open one for moving, a dashed one for unpriced', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    expect(document.querySelector('.cp-mark[data-mark="band-logistics"]')!.classList.contains('cp-mark--stuck')).toBe(true);
    expect(document.querySelector('.cp-mark[data-mark="band-energy"]')!.classList.contains('cp-mark--moving')).toBe(true);
    expect(document.querySelector('.cp-mark[data-mark="stage-recovery"]')!.classList.contains('cp-mark--unpriced')).toBe(true);
    expect(document.querySelector('.cp-shift--green .cp-lit[data-for="stage-recovery"] .cp-lit--unpriced')).not.toBeNull();
    expect(document.querySelector('.cp-shift--green .cp-lit[data-for="band-logistics"] .cp-lit--stuck')).not.toBeNull();
    expect(STATUS.stuck.form).toBe('filled');
    expect(STATUS.unpriced.form).toBe('dashed');
  });

  it('does not renumber when only the distance changes: the shift decides what is marked, the distance only what it says', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    const before = Array.from(document.querySelectorAll('.cp-marks--green .cp-mark')).map((m) => [(m as HTMLElement).dataset.mark, m.textContent]);
    await userEvent.click(word('finance'));
    const after = Array.from(document.querySelectorAll('.cp-marks--green .cp-mark')).map((m) => [(m as HTMLElement).dataset.mark, m.textContent]);
    expect(after).toEqual(before);
  });

  it('counts itself on the control, so the reader knows the size of the overlay before turning it on', () => {
    mount(<ChainPlate links={[]} />);
    expect(document.querySelector('[data-mark-count="green"]')!.textContent).toBe('(8)');
    expect(document.querySelector('[data-mark-count="reindustrialisation"]')!.textContent).toBe('(8)');
    expect(word('green transition')).toBeInTheDocument();
  });

  it('opens a target that is not a door in its own right — a stage the overlay marks — as a reading beside its mark, and closes it when the overlay changes', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    const mark = screen.getByRole('button', { name: /Green transition · Recovery · Unpriced$/ });
    await userEvent.click(mark);
    const panel = screen.getByRole('region', { name: 'Recovery' });
    expect(panel.closest('[data-chain-popover]')).not.toBeNull();
    expect(within(panel).getByText(/Reading · Green transition · Economy/)).toBeInTheDocument();
    const condition = SHIFT_BY_ID.green.targets.find((t) => t.id === 'stage-recovery')!.condition!;
    expect(within(panel).getByText(condition.action.economy)).toBeInTheDocument();
    expect(within(panel).getByText('Unpriced')).toBeInTheDocument();
    expect(within(panel).getByText(STATUS.unpriced.means)).toBeInTheDocument();
    expect(mark).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(word('reindustrialisation'));
    expect(screen.queryByRole('region', { name: 'Recovery' })).not.toBeInTheDocument();
  });

  it('keeps the panel in the order the brief fixes and omits a line the owner has not written, never faking it', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    await userEvent.click(screen.getByRole('button', { name: /Green transition · Energy · Moving$/ }));
    const panel = screen.getByRole('region', { name: 'Energy' });
    const headings = Array.from(panel.querySelectorAll('[data-condition-line]')).map((el) => el.getAttribute('data-condition-line'));
    // Only the lever line is written so far; the others are UNWRITTEN and absent.
    expect(headings).toEqual([CHAIN_COPY.panel.lever]);
    expect(within(panel).queryByText(CHAIN_COPY.panel.now)).not.toBeInTheDocument();
    expect(within(panel).queryByText(CHAIN_COPY.panel.holds)).not.toBeInTheDocument();
    expect(within(panel).queryByText(CHAIN_COPY.panel.funds)).not.toBeInTheDocument();
    expect(within(panel).getByText(LEVERS['reprice-layer'].label)).toBeInTheDocument();
    expect(within(panel).getByText(CHAIN_COPY.panel.articlesNone)).toBeInTheDocument();
    // The title carries the badge, and the badge comes before the lines.
    const title = within(panel).getByRole('heading', { level: 3 });
    expect(within(title).getByText('Moving')).toBeInTheDocument();
    expect(panel.textContent!.indexOf('Moving')).toBeLessThan(panel.textContent!.indexOf(LEVERS['reprice-layer'].label));
  });

  it('pins one line beside a mark on hover — number, title, status, essays — and raises no tooltip role', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    expect(hoverLabel()).toBeNull();

    const mark = screen.getByRole('button', { name: /Green transition · Energy · Moving$/ });
    await userEvent.hover(mark);
    expect(hoverLabel()).not.toBeNull();
    expect(hoverLabel()!.textContent).toContain('Energy');
    expect(hoverLabel()!.textContent).toContain('Moving');
    expect(hoverLabel()!.textContent).toContain(CHAIN_COPY.mark.essayNone);
    expect(hoverLabel()!.closest('figure')).not.toBeNull();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    await userEvent.unhover(mark);
    expect(hoverLabel()).toBeNull();
  });

  it('fades a switched-off layer and its mark together without renumbering', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    await userEvent.click(screen.getByRole('switch', { name: /Hide layer: Logistics and warehousing/ }));
    expect(document.querySelector('.cp-mark[data-mark="band-logistics"]')).toHaveAttribute('data-hidden');
    expect(document.querySelector('.cp-mark[data-mark="band-logistics"]')!.textContent).toBe('5');
    expect(document.querySelector('[data-mark-count="green"]')!.textContent).toBe('(8)');
  });
});

describe('the line read on hover', () => {
  it('reads a joint as its margin kind and the service performed there, so the kind is never named alone', () => {
    const line = hoverLine('j-processing-trader', null, 'economy');
    expect(line.lead).toBe('Processing → trader / importer');
    expect(line.detail).toContain('Conversion margin');
    expect(line.detail).toContain('refines the input');
    expect(line.detail).toContain('Producer prices');
  });

  it('reads each form as its definition — the legend, one line at a time, where the question arises', () => {
    expect(hoverLine('node-distributor', null, 'economy').detail).toContain('takes title, transforms nothing');
    expect(hoverLine('stage-processing', null, 'economy').detail).toContain('changes the form of the goods');
    expect(hoverLine('stage-biological', null, 'economy').detail).toContain('Origin');
    expect(hoverLine('band-governance', null, 'economy').detail).toContain('sets the terms');
    expect(hoverLine('band-logistics', null, 'economy').detail).toContain('takes no title');
    expect(hoverLine('return-scrap', null, 'economy').detail).toContain('back up the chain');
    expect(hoverLine('branch-byproduct', null, 'economy').detail).toContain('not a return');
    expect(hoverLine('border-import', null, 'economy').lead).toContain('external sector');
    expect(hoverLine('flow-money-credit', null, 'economy').lead).toContain('Trade credit');
    expect(hoverLine('lane-economy', null, 'economy').detail).toContain('macro variable');
  });

  it('reads a marked element as its mark under the shift that marks it, and as itself under the other', () => {
    expect(hoverLine('band-logistics', 'green', 'finance')).toEqual({ lead: '5. Logistics and warehousing', detail: 'Stuck · no essay yet' });
    expect(hoverLine('band-logistics', 'reindustrialisation', 'finance').detail).toContain('takes no title');
  });

  it('pins the definition beside a stage or a node on the plate, not in a list below it', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.hover(document.querySelector('.cp-base [data-id="node-aggregation"]')!);
    expect(hoverLabel()!.textContent).toContain('Aggregation');
    expect(hoverLabel()!.textContent).toContain('takes title, transforms nothing');
    await userEvent.hover(screen.getByRole('button', { name: 'Principal–distributor contract governance' }));
    expect(hoverLabel()!.textContent).toContain('sets the terms');
    expect(document.querySelector('[data-chain-readout]')).toBeNull();
  });
});

describe('where a reading and a label are placed', () => {
  const figure = { top: 0, left: 0, width: 1200, height: 600 };
  const size = { width: 320, height: 200 };

  it('puts the popover below its anchor where there is room, above where there is not, and never outside the figure', () => {
    expect(placePopover({ top: 100, left: 500, width: 20, height: 20 }, figure, size)).toEqual({ top: 130, left: 350 });
    const low = placePopover({ top: 550, left: 500, width: 20, height: 20 }, figure, size);
    expect(low.top).toBe(550 - 10 - 200);
    const corner = placePopover({ top: 300, left: 1180, width: 20, height: 20 }, figure, { width: 320, height: 560 });
    expect(corner.left + 320).toBeLessThanOrEqual(figure.width);
    expect(corner.top).toBeGreaterThanOrEqual(0);
  });

  it('puts the label where it covers the least ink, and never over its own anchor', () => {
    const anchor = { top: 100, left: 100, width: 20, height: 20 };
    const label = { width: 120, height: 20 };
    // Nothing in the way: above, centred.
    expect(placeLabel(anchor, figure, label, [])).toEqual({ top: 74, left: 50 });
    // A box sits right above: the label goes below instead.
    const above = { top: 60, left: 0, width: 300, height: 34 };
    expect(placeLabel(anchor, figure, label, [above])).toEqual({ top: 126, left: 50 });
  });

  it('isolates a joint to its two hands and its layers, a stage to the joints that touch it, and a layer to nothing', () => {
    expect(isolationSet('j-processing-trader')).toEqual(
      new Set(['j-processing-trader', 'stage-processing', 'node-trader', 'band-logistics', 'band-cold-chain', 'band-credit', 'band-energy', 'band-regulation']),
    );
    expect(isolationSet('stage-processing')).toContain('j-extraction-processing');
    expect(isolationSet('stage-processing')).toContain('j-processing-trader');
    expect(isolationSet('band-energy')).toBeNull();
    expect(isolationSet('border-export')).toBeNull();
  });
});

describe('the map in the address bar', () => {
  it('reads the three parameters the essays will be written against, and ignores anything it does not know', () => {
    expect(readChainUrl('?lens=green&distance=finance&node=energy')).toEqual({ shift: 'green', lens: 'finance', node: 'band-energy' });
    expect(readChainUrl('?lens=nonsense&distance=sideways&node=nowhere')).toEqual({ shift: null, lens: null, node: null });
    expect(readChainUrl('')).toEqual({ shift: null, lens: null, node: null });
    expect(readChainUrl('?node=cold-chain')).toEqual({ shift: null, lens: null, node: 'band-cold-chain' });
  });

  it('writes slugs, never numbers, and keeps every parameter that belongs to someone else', () => {
    expect(writeChainUrl('?ref=newsletter', { shift: 'green', lens: 'finance', node: 'band-energy' })).toBe('?ref=newsletter&lens=green&distance=finance&node=energy');
    expect(writeChainUrl('', { shift: null, lens: 'economy', node: null })).toBe('');
    expect(slugOf('band-energy')).toBe('energy');
  });

  it('opens an overlay and a reading straight from the address, on the first paint', async () => {
    window.history.replaceState({}, '', '/about?lens=green&distance=finance&node=energy');
    mount(<ChainPlate links={[]} />);
    const plate = document.querySelector('.chain-plate') as HTMLElement;
    expect(plate.dataset.shift).toBe('green');
    expect(plate.dataset.lens).toBe('finance');
    const panel = screen.getByRole('region', { name: 'Energy' });
    expect(panel.getAttribute('data-panel')).toBe('reading');
    expect(panel.querySelector('[data-voice]')!.getAttribute('data-voice')).toBe('finance');
  });

  it('leaves a plain visit alone, and carries the state from the first change onwards', async () => {
    window.history.replaceState({}, '', '/about');
    mount(<ChainPlate links={[]} />);
    expect(window.location.search).toBe('');

    await userEvent.click(word('green transition'));
    expect(window.location.search).toBe('?lens=green');
    await userEvent.click(word('finance'));
    expect(window.location.search).toBe('?lens=green&distance=finance');
    await userEvent.click(screen.getByRole('button', { name: /Green transition · Energy · Moving$/ }));
    expect(window.location.search).toBe('?lens=green&distance=finance&node=energy');
  });

  it('refuses an address that names an element the overlay does not mark, and cleans the parameter away', () => {
    window.history.replaceState({}, '', '/about?lens=reindustrialisation&node=recovery');
    mount(<ChainPlate links={[]} />);
    expect((document.querySelector('.chain-plate') as HTMLElement).dataset.shift).toBe('reindustrialisation');
    expect(screen.queryByRole('region', { name: 'Recovery' })).not.toBeInTheDocument();
    expect(window.location.search).toBe('?lens=reindustrialisation');
  });

  it('refuses a marked element named with no overlay on at all', () => {
    window.history.replaceState({}, '', '/about?node=aggregation');
    mount(<ChainPlate links={[]} />);
    expect(screen.queryByRole('region', { name: 'Aggregation' })).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('still opens a joint or a layer named with no overlay, because those are doors at all times', () => {
    window.history.replaceState({}, '', '/about?node=credit');
    mount(<ChainPlate links={[]} />);
    expect(screen.getByRole('region', { name: 'Credit and working capital' })).toBeInTheDocument();
    expect(window.location.search).toBe('?node=credit');
  });

  it('never puts the short version on the landing page into the address: it has no doors to share', async () => {
    window.history.replaceState({}, '', '/');
    mount(<ChainPlate links={[]} variant="preview" />);
    await userEvent.click(word('green transition'));
    expect(window.location.search).toBe('');
  });
});
