/**
 * The plate's behaviour: the headline is the entry point and is verbatim, the
 * two lens words are the only controls and exclude each other, an unmapped
 * joint is not a target at all, a mapped one opens the curriculum panel, and a
 * draft lesson is labelled "Coming soon" as inert text rather than a link.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { makeQueryResult } from './helpers/renderWithProviders';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

import { ChainPlate } from '@/components/industry-chain/ChainPlate';
import type { ChainModuleLink } from '@/data/chainCurriculumMap';

function mount(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const plate = () => document.querySelector('.chain-plate') as HTMLElement;

beforeEach(() => fromMock.mockReset());

describe('ChainPlate at rest', () => {
  it('leads with the headline, verbatim', () => {
    mount(<ChainPlate />);
    expect(
      screen.getByRole('heading', { name: 'Nothing here is complicated. It only looks that way from the wrong distance.' }),
    ).toBeInTheDocument();
  });

  it('has no lens on, and both lens words unpressed', () => {
    mount(<ChainPlate />);
    expect(plate().dataset.lens).toBeUndefined();
    expect(screen.getByRole('button', { name: 'economy' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'unit economics' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('offers no joint targets when nothing is mapped', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    expect(document.querySelectorAll('.cp-joint')).toHaveLength(0);
    expect(screen.queryByText(/Select a highlighted joint/)).not.toBeInTheDocument();
  });
});

describe('the two lenses', () => {
  it('turn on from the sentence, one at a time', async () => {
    mount(<ChainPlate />);
    await userEvent.click(screen.getByRole('button', { name: 'economy' }));
    expect(plate().dataset.lens).toBe('economy');
    expect(screen.getByRole('button', { name: 'economy' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    expect(plate().dataset.lens).toBe('unit');
    expect(screen.getByRole('button', { name: 'economy' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'unit economics' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('turn off again from the same word', async () => {
    mount(<ChainPlate />);
    const unit = screen.getByRole('button', { name: 'unit economics' });
    await userEvent.click(unit);
    await userEvent.click(unit);
    expect(plate().dataset.lens).toBeUndefined();
  });
});

describe('a joint with a module pinned to it', () => {
  const links: ChainModuleLink[] = [
    { joint: 'j-manufacturing-distribution', moduleSlug: 'working-capital', moduleClass: 'chain-located' },
    { joint: 'j-retail-consumption', moduleSlug: 'somewhere-else', moduleClass: 'chain-wide' },
  ];

  function stubCurriculum() {
    fromMock.mockImplementation((table: string) => {
      if (table === 'finance_modules') {
        return makeQueryResult([
          { id: 'mod-1', slug: 'working-capital', title: 'Working Capital', track_slug: 'operating', thesis: 'Who finances whom.', sort_order: 1 },
        ]);
      }
      if (table === 'finance_sections') return makeQueryResult([{ slug: 'operating', title: 'Operating Finance' }]);
      if (table === 'essay_structure') {
        return makeQueryResult([
          { id: 'e-1', slug: 'dso-dio-dpo', title: 'DSO, DIO and DPO', snippet: null, author: null, module_id: 'mod-1', finance_order: 1, published: true },
          { id: 'e-2', slug: 'trade-credit', title: 'Trade credit as transmission', snippet: null, author: null, module_id: 'mod-1', finance_order: 2, published: false },
        ]);
      }
      return makeQueryResult([]);
    });
  }

  it('is a target only under the unit-economics lens, and only for chain-located rows', async () => {
    stubCurriculum();
    mount(<ChainPlate links={links} />);
    expect(document.querySelectorAll('.cp-joint')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'economy' }));
    expect(document.querySelectorAll('.cp-joint')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    // One joint, drawn once per layout (wide and tall).
    const targets = screen.getAllByRole('button', { name: 'Manufacturing → distribution' });
    expect(targets).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Retail → consumption' })).not.toBeInTheDocument();
  });

  it('opens the panel with the module, and its lessons one level down', async () => {
    stubCurriculum();
    mount(<ChainPlate links={links} />);
    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Manufacturing → distribution' })[0]);

    const panel = await screen.findByRole('region', { name: 'Manufacturing → distribution' });
    await waitFor(() => expect(within(panel).getByText('Working Capital')).toBeInTheDocument());
    expect(within(panel).getByRole('link', { name: /Working Capital/ })).toHaveAttribute('href', '/finance/operating/working-capital');
    expect(within(panel).getByText('Operating Finance')).toBeInTheDocument();
  });

  it('links a published lesson and leaves a draft inert, labelled before any click', async () => {
    stubCurriculum();
    mount(<ChainPlate links={links} />);
    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Manufacturing → distribution' })[0]);
    const panel = await screen.findByRole('region', { name: 'Manufacturing → distribution' });
    await waitFor(() => expect(within(panel).getByText('DSO, DIO and DPO')).toBeInTheDocument());

    expect(within(panel).getByRole('link', { name: 'DSO, DIO and DPO' })).toHaveAttribute('href', '/finance/operating/dso-dio-dpo');
    expect(within(panel).queryByRole('link', { name: 'Trade credit as transmission' })).not.toBeInTheDocument();
    expect(within(panel).getByText('Trade credit as transmission')).toBeInTheDocument();
    expect(within(panel).getByText('Coming soon')).toBeInTheDocument();
    expect(within(panel).getByText('Published')).toBeInTheDocument();
  });

  it('closes the panel when the lens is switched off', async () => {
    stubCurriculum();
    mount(<ChainPlate links={links} />);
    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Manufacturing → distribution' })[0]);
    await screen.findByRole('region', { name: 'Manufacturing → distribution' });
    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    expect(screen.queryByRole('region', { name: 'Manufacturing → distribution' })).not.toBeInTheDocument();
  });
});
