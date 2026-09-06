/**
 * The numbered marks, and the address they can be reached at.
 *
 * What would quietly break: a mark that opens nothing, a number that means
 * one thing on the plate and another in the column, a set of marks that
 * changes when the reader only changed the distance, a link written into an
 * essay that stops resolving because a slug moved, or a plain visit to the
 * page that rewrites the address behind the reader's back.
 *
 * jsdom has no matchMedia, so the layout hook falls back to the wide plate.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { CHAIN_COPY, SHIFT_BY_ID, slugOf } from '@/data/industryChain';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({}) } }));

import { ChainPlate } from '@/components/industry-chain/ChainPlate';
import { MARK_ORDER } from '@/components/industry-chain/chainMarkOrder';
import { markNumber, markedIds } from '@/components/industry-chain/chainTargets';
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
const readout = () => document.querySelector('[data-chain-readout]')!;

beforeEach(() => window.history.replaceState({}, '', '/about'));

describe('the reading order of a shift', () => {
  it('numbers from one, contiguously, in the order the generator laid the marks out — not the order of the data file', () => {
    for (const shift of ['reindustrialisation', 'green'] as const) {
      const ids = markedIds(shift);
      expect(ids, shift).toEqual([...MARK_ORDER[shift]]);
      expect(ids.map((id) => markNumber(shift, id)), shift).toEqual(ids.map((_, i) => i + 1));
      // Every target the data lists is placed; nothing is dropped on the floor.
      expect([...ids].sort(), shift).toEqual(SHIFT_BY_ID[shift].targets.map((t) => t.id).sort());
    }
  });

  it('puts the green transition at seven marks, with the layers last because they are the bottom row', () => {
    const ids = markedIds('green');
    expect(ids).toHaveLength(7);
    expect(ids.slice(-3)).toEqual(['band-logistics', 'band-credit', 'band-energy']);
  });

  it('gives no number at all to a target this shift does not move', () => {
    expect(markNumber('green', 'stage-manufacturing')).toBe(0);
    expect(markNumber('reindustrialisation', 'band-energy')).toBe(0);
  });
});

describe('the marks on the plate', () => {
  it('are one per marked target, each a button that says its number and its title, and each inside its own overlay', async () => {
    mount(<ChainPlate links={[]} />);
    // Both overlays' marks are in the drawing; which of them is shown — and
    // therefore which are in the tab order — is the wrapper's data-shift and
    // display:none, checked in the browser rather than in jsdom.
    expect(marks()).toHaveLength(markedIds('green').length + markedIds('reindustrialisation').length);
    expect((document.querySelector('.chain-plate') as HTMLElement).dataset.shift).toBeUndefined();

    await userEvent.click(word('green transition'));
    const drawn = Array.from(document.querySelectorAll('.cp-marks--green .cp-mark'));
    expect(drawn).toHaveLength(7);
    expect(drawn.map((m) => m.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(screen.getByRole('button', { name: /^5\. Green transition · Logistics and warehousing$/ })).toBeInTheDocument();
  });

  it('does not renumber when only the distance changes: the shift decides what is marked, the distance only what it says', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    const before = Array.from(document.querySelectorAll('.cp-marks--green .cp-mark')).map((m) => [
      (m as HTMLElement).dataset.mark,
      m.textContent,
    ]);
    await userEvent.click(word('finance'));
    const after = Array.from(document.querySelectorAll('.cp-marks--green .cp-mark')).map((m) => [
      (m as HTMLElement).dataset.mark,
      m.textContent,
    ]);
    expect(after).toEqual(before);
  });

  it('counts itself on the control, so the reader knows the size of the overlay before turning it on', () => {
    mount(<ChainPlate links={[]} />);
    expect(document.querySelector('[data-mark-count="green"]')!.textContent).toBe('(7)');
    expect(document.querySelector('[data-mark-count="reindustrialisation"]')!.textContent).toBe('(8)');
    // The count is decoration for the eye; the button's name stays the word itself.
    expect(word('green transition')).toBeInTheDocument();
  });

  it('opens a target that is not a door in its own right — a stage the overlay marks — and closes it when the overlay changes', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    await userEvent.click(screen.getByRole('button', { name: /Green transition · Recovery$/ }));
    const panel = screen.getByRole('region', { name: 'Recovery' });
    expect(within(panel).getByText(CHAIN_COPY.panel.markKicker)).toBeInTheDocument();
    expect(within(panel).getByText(SHIFT_BY_ID.green.targets.find((t) => t.id === 'stage-recovery')!.read.economy)).toBeInTheDocument();

    // Reindustrialisation does not mark the recovery stage, and a panel with
    // no mark behind it would be a reading the map no longer offers.
    await userEvent.click(word('reindustrialisation'));
    expect(screen.queryByRole('region', { name: 'Recovery' })).not.toBeInTheDocument();
  });

  it('reads under the plate instead of over it: pointing writes one line, and raises nothing that could cover a neighbour', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    expect(readout().textContent).toBe(CHAIN_COPY.mark.rest);

    await userEvent.hover(screen.getByRole('button', { name: /Green transition · Energy$/ }));
    expect(readout().textContent).toContain('Energy');
    expect(readout().textContent).toContain(CHAIN_COPY.mark.essayNone);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    await userEvent.unhover(screen.getByRole('button', { name: /Green transition · Energy$/ }));
    expect(readout().textContent).toBe(CHAIN_COPY.mark.rest);
  });
});

describe('the readout, at rest and under the pointer', () => {
  it('names the margin kind cut at a joint, so the three kinds read as words and not only as a chip border', async () => {
    mount(<ChainPlate links={[]} />);
    expect(readout().textContent).toBe(CHAIN_COPY.panel.hint);

    await userEvent.hover(screen.getByRole('button', { name: 'Processing → trader / importer' }));
    expect(readout().textContent).toContain('Processing → trader / importer');
    expect(readout().textContent).toContain('Conversion margin');
    expect(readout().textContent).toContain('Basic industry');

    await userEvent.hover(screen.getByRole('button', { name: 'Wholesale → retail' }));
    expect(readout().textContent).toContain('Node spread');
  });

  it('names what a layer charges for', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.hover(screen.getByRole('button', { name: 'Principal–distributor contract governance' }));
    expect(readout().textContent).toContain('Principal–distributor contract governance');
    expect(readout().textContent).toContain('Terms');
  });
});

describe('the map in the address bar', () => {
  it('reads the three parameters the essays will be written against, and ignores anything it does not know', () => {
    expect(readChainUrl('?lens=green&distance=finance&node=energy')).toEqual({
      shift: 'green',
      lens: 'finance',
      node: 'band-energy',
    });
    expect(readChainUrl('?lens=nonsense&distance=sideways&node=nowhere')).toEqual({ shift: null, lens: null, node: null });
    expect(readChainUrl('')).toEqual({ shift: null, lens: null, node: null });
  });

  it('writes slugs, never numbers, and keeps every parameter that belongs to someone else', () => {
    expect(writeChainUrl('?ref=newsletter', { shift: 'green', lens: 'finance', node: 'band-energy' })).toBe(
      '?ref=newsletter&lens=green&distance=finance&node=energy',
    );
    // The resting distance is not worth carrying: a link that names one means it.
    expect(writeChainUrl('', { shift: null, lens: 'economy', node: null })).toBe('');
    expect(slugOf('band-energy')).toBe('energy');
  });

  it('opens an overlay and a panel straight from the address, on the first paint', async () => {
    window.history.replaceState({}, '', '/about?lens=green&distance=finance&node=energy');
    mount(<ChainPlate links={[]} />);
    const plate = document.querySelector('.chain-plate') as HTMLElement;
    expect(plate.dataset.shift).toBe('green');
    expect(plate.dataset.lens).toBe('finance');
    expect(screen.getByRole('region', { name: 'Energy' })).toBeInTheDocument();
  });

  it('leaves a plain visit alone, and carries the state from the first change onwards', async () => {
    window.history.replaceState({}, '', '/about');
    mount(<ChainPlate links={[]} />);
    expect(window.location.search).toBe('');

    await userEvent.click(word('green transition'));
    expect(window.location.search).toBe('?lens=green');
    await userEvent.click(word('finance'));
    expect(window.location.search).toBe('?lens=green&distance=finance');
    await userEvent.click(screen.getByRole('button', { name: /Green transition · Energy$/ }));
    expect(window.location.search).toBe('?lens=green&distance=finance&node=energy');
  });

  it('refuses an address that names an element the overlay does not mark, and cleans the parameter away', () => {
    // A stage is a door only while the overlay that marks it is on. Opening it
    // regardless would put a panel with a heading and nothing beneath it on
    // the page — the empty panel the map must never show.
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
