import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { BANDS, CHAIN_COPY, SHIFTS, SLUGS } from '@/data/industryChain';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { ChainPlate } from './ChainPlate';

const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => window.history.replaceState({}, '', '/about'));

describe('condition layer', () => {
  it('composes one distance switch with one exclusive condition selector without remounting the map', async () => {
    const user = userEvent.setup();
    render(<ChainPlate links={[]} />);
    const svg = document.querySelector('.cp-svg--wide');
    const distance = screen.getByRole('switch', { name: /Distance: Economy/i });
    await user.click(screen.getByRole('radio', { name: /Reindustrialisation \(8\)/i }));
    expect(document.querySelector('.chain-plate')).toHaveAttribute('data-shift', 'reindustrialisation');
    expect(screen.getByRole('radio', { name: /Green transition/i })).not.toBeChecked();
    await user.click(distance);
    expect(screen.getByRole('switch', { name: /Distance: Finance/i })).toHaveAttribute('aria-checked', 'true');
    expect(document.querySelector('.chain-plate')).toHaveAttribute('data-lens', 'finance');
    expect(document.querySelector('.cp-svg--wide')).toBe(svg);
  });

  it('opens the four condition slots in an attached panel', async () => {
    const user = userEvent.setup();
    render(<ChainPlate links={[]} />);
    await user.click(screen.getByRole('radio', { name: /Green transition \(7\)/i }));
    await user.click(screen.getByRole('button', { name: /Green transition · Logistics and warehousing · Bottleneck/i }));
    const panel = await screen.findByRole('region', { name: 'Logistics and warehousing' });
    expect(panel).toHaveTextContent("Condition layer · author's reading");
    expect(panel).toHaveTextContent('Where we are now');
    expect(panel).toHaveTextContent('What is still missing');
    expect(panel).toHaveTextContent('Re-price a layer');
    expect(panel).toHaveTextContent('Who finances it');
    expect(panel).toHaveTextContent('Owner analysis pending.');
  });

  it('hydrates overlay, distance and permanent target slug from the URL', async () => {
    window.history.replaceState({}, '', '/about?lens=green&distance=finance&node=energy');
    render(<ChainPlate links={[]} />);
    expect(document.querySelector('.chain-plate')).toHaveAttribute('data-shift', 'green');
    expect(document.querySelector('.chain-plate')).toHaveAttribute('data-lens', 'finance');
    expect(await screen.findByRole('region', { name: 'Energy' })).toBeVisible();
    expect(window.location.search).toContain('node=energy');
    expect(SLUGS['band-energy']).toBe('energy');
  });

  it('shape-codes visible condition states and leaves an unwritten target unnumbered', async () => {
    const user = userEvent.setup();
    render(<ChainPlate links={[]} />);
    await user.click(screen.getByRole('radio', { name: /Green transition \(7\)/i }));
    const marks = document.querySelectorAll('.cp-marks--green .cp-mark');
    expect(marks).toHaveLength(7);
    expect(document.querySelector('.cp-marks--green [data-status="bottleneck"]')).not.toBeNull();
    expect(document.querySelector('.cp-marks--green [data-status="moving"]')).not.toBeNull();
    expect(document.querySelector('.cp-marks--green [data-status="unpriced"]')).not.toBeNull();
    expect(document.querySelector('[data-mark="band-cold-chain"]')).toBeNull();
  });

  it('removes the stacked caption, marked list and long reference accordions', async () => {
    const user = userEvent.setup();
    render(<ChainPlate links={[]} />);
    await user.click(screen.getByRole('radio', { name: /Green transition/i }));
    expect(document.querySelector('[data-shift-caption]')).toBeNull();
    expect(document.querySelector('[data-shift-moves]')).toBeNull();
    expect(document.querySelector('[data-chain-reference]')).toBeNull();
    expect(screen.queryByText('Read the chain at text size')).not.toBeInTheDocument();
    expect(document.querySelector('[data-chain-legend]')).not.toBeNull();
  });

  it('keeps service chips semantic and avoids the false GDP–margin equivalence', () => {
    expect(BANDS.find((band) => band.id === 'band-cold-chain')).toBeDefined();
    expect(BANDS.find((band) => band.id === 'band-governance')?.serviceChip).toBeUndefined();
    expect(BANDS.find((band) => band.id === 'band-regulation')?.serviceChip).toBeUndefined();
    expect(CHAIN_COPY.standfirst.toLowerCase()).not.toContain('add them up');
    expect(SHIFTS.every((shift) => shift.targets.every((target) => 'condition' in target))).toBe(true);
  });
});
