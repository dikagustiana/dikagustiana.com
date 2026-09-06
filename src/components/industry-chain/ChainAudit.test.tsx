import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BANDS, CHAIN_COPY, JOINTS, LEGEND, LEGEND_NOTE, MARGIN_KINDS, STAGES } from '@/data/industryChain';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { ChainPlate } from './ChainPlate';

const choose = (name: string) => screen.getByRole('button', { name });

describe('audit corrections', () => {
  it.each(['reindustrialisation', 'green transition'])('resets %s without losing the selected joint or distance', async (shift) => {
    const user = userEvent.setup();
    render(<ChainPlate links={[]} />);
    await user.click(choose('finance'));
    await user.click(choose('Processing → trader / importer'));
    await user.click(choose(shift));
    await user.click(choose('No shift'));
    expect(choose('finance')).toHaveAttribute('aria-pressed', 'true');
    expect(choose('No shift')).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelector('.chain-plate')).not.toHaveAttribute('data-shift');
    expect(screen.getByRole('region', { name: 'Processing → trader / importer' })).toBeVisible();
  });

  it('retains the same map and stage elements through all composed states', async () => {
    const user = userEvent.setup();
    render(<ChainPlate links={[]} />);
    const svg = document.querySelector('.cp-svg--wide');
    const stages = Array.from(document.querySelectorAll('.cp-stage'));
    for (const shift of ['No shift', 'reindustrialisation', 'green transition']) {
      for (const lens of ['economy', 'finance']) {
        await user.click(choose(lens));
        if (choose(shift).getAttribute('aria-pressed') !== 'true') await user.click(choose(shift));
        expect(document.querySelector('.cp-svg--wide')).toBe(svg);
        expect(Array.from(document.querySelectorAll('.cp-stage'))).toEqual(stages);
      }
    }
  });

  it('opens the same detail from the reading-size connection reference and follows the active lens', async () => {
    const user = userEvent.setup();
    render(<ChainPlate links={[]} />);
    await user.click(screen.getByText(CHAIN_COPY.reference.heading));
    const joint = JOINTS.find((item) => item.id === 'j-processing-trader')!;
    const reference = document.querySelector(`[data-reference-id="${joint.id}"]`) as HTMLElement;
    expect(within(reference).getByText(MARGIN_KINDS[joint.margin].chip)).toBeVisible();
    await user.click(choose('finance'));
    expect(within(reference).getByText(joint.read.finance.chip)).toBeVisible();
    await user.click(choose(`Read: ${joint.label}`));
    expect(screen.getByRole('region', { name: joint.label })).toBeVisible();
  });

  it('announces the margin type and active reading on each SVG joint', async () => {
    const user = userEvent.setup();
    render(<ChainPlate links={[]} />);
    const joint = JOINTS[0];
    const button = choose(joint.label);
    const description = () => document.getElementById(button.getAttribute('aria-describedby')!)!.textContent;
    expect(description()).toContain(MARGIN_KINDS[joint.margin].label);
    await user.click(choose('finance'));
    expect(description()).toContain(joint.read.finance.note);
  });

  it('does not silently restore numeric identifiers or categorical net-service-revenue claims in public definitions', () => {
    expect(JSON.stringify({ BANDS, CHAIN_COPY, JOINTS, LEGEND, LEGEND_NOTE, MARGIN_KINDS, STAGES })).not.toMatch(/\d/);
    expect(MARGIN_KINDS['service-fee'].test).toContain('gross when it controls that service');
    expect(MARGIN_KINDS['service-fee'].test).toContain('commission net');
    expect(CHAIN_COPY.basis).toContain('not gross profit');
  });
});
