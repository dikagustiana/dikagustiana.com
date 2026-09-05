/**
 * The plate on a wide screen: the headline is the entry point and is
 * verbatim, the two lens words are the only lens controls and exclude each
 * other, every joint and every layer is a door that opens the reading of its
 * margin, the curriculum follows only where a module is pinned, a draft
 * lesson is labelled "Coming soon" as inert text, and the short version
 * expands in place.
 *
 * jsdom has no matchMedia, so the layout hook falls back to the wide plate
 * here; the column has its own file.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { makeQueryResult } from './helpers/renderWithProviders';
import { BANDS, CHAIN_COPY, JOINTS, MARGIN_KINDS } from '@/data/industryChain';

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
const joint = (label: string) => screen.getByRole('button', { name: label });

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

  it('draws the wide plate once, as a group, with every joint and every layer a door even when nothing is mapped', () => {
    mount(<ChainPlate links={[]} />);
    expect(document.querySelectorAll('svg.cp-svg--wide')).toHaveLength(1);
    expect(document.querySelector('.cp-column')).toBeNull();
    for (const j of JOINTS) expect(joint(j.label)).toHaveAttribute('aria-expanded', 'false');
    for (const b of BANDS) expect(screen.getByRole('button', { name: b.label })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the legend with the four categories and the principal–agent note', () => {
    mount(<ChainPlate />);
    expect(screen.getByRole('heading', { name: CHAIN_COPY.controls.legend })).toBeInTheDocument();
    for (const id of ['stage', 'node', 'layer', 'return']) expect(document.querySelector(`[data-legend="${id}"]`)).not.toBeNull();
    expect(screen.getByText(/PSAK 72 principal–agent test/)).toBeInTheDocument();
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

  it('under unit economics, hint at the joints until one is selected', async () => {
    mount(<ChainPlate />);
    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    expect(screen.getByText(CHAIN_COPY.panel.hint)).toBeInTheDocument();
    await userEvent.click(joint('Wholesale → retail'));
    expect(screen.queryByText(CHAIN_COPY.panel.hint)).not.toBeInTheDocument();
  });
});

describe('a joint as a door, with nothing mapped', () => {
  it('opens its reading under no lens: the margin kind, the meaning, the test, and the lines of the accounts', async () => {
    mount(<ChainPlate links={[]} />);
    const trigger = joint('Aggregation → processing');
    await userEvent.click(trigger);

    const panel = screen.getByRole('region', { name: 'Aggregation → processing' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(within(panel).getByText(CHAIN_COPY.panel.jointKicker)).toBeInTheDocument();
    expect(within(panel).getByText(MARGIN_KINDS['node-spread'].label)).toBeInTheDocument();
    expect(within(panel).getByText(MARGIN_KINDS['node-spread'].test)).toBeInTheDocument();
    expect(within(panel).getByText(/the aggregator pays the producer before the processor pays it/)).toBeInTheDocument();
    expect(within(panel).getByText(CHAIN_COPY.panel.linesHeading)).toBeInTheDocument();
    expect(within(panel).queryByText(CHAIN_COPY.panel.curriculumHeading)).not.toBeInTheDocument();
  });

  it('names the layers riding on the move, and one of them leads to that layer', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(joint('Distributor → wholesaler'));
    const panel = screen.getByRole('region', { name: 'Distributor → wholesaler' });
    const layers = within(panel).getByText(CHAIN_COPY.panel.layersHeading).parentElement!;
    expect(within(layers).getByRole('button', { name: /Principal–distributor contract governance/ })).toBeInTheDocument();
    expect(within(layers).queryByRole('button', { name: /Contract capacity/ })).not.toBeInTheDocument();

    await userEvent.click(within(layers).getByRole('button', { name: /Credit and working capital/ }));
    const band = screen.getByRole('region', { name: 'Credit and working capital' });
    expect(band).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Distributor → wholesaler' })).not.toBeInTheDocument();

    // Closing that reading returns the reader to the door they came through,
    // not to the top of the page: the layer link inside the panel is gone.
    await userEvent.click(within(band).getByRole('button', { name: CHAIN_COPY.panel.close }));
    expect(joint('Distributor → wholesaler')).toHaveFocus();
  });

  it('reads manufacturing → distribution both ways', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(joint('Manufacturing → distribution'));
    const panel = screen.getByRole('region', { name: 'Manufacturing → distribution' });
    expect(within(panel).getByText(MARGIN_KINDS.conversion.label)).toBeInTheDocument();
    expect(within(panel).getByText(CHAIN_COPY.panel.whenHeading)).toBeInTheDocument();
    expect(within(panel).getByText(/brand owner sells goods a toller made for it/)).toBeInTheDocument();
  });

  it('moves focus to the reading when it opens, and back to the door when it closes', async () => {
    mount(<ChainPlate links={[]} />);
    const trigger = joint('Retail → consumption');
    await userEvent.click(trigger);
    const panel = screen.getByRole('region', { name: 'Retail → consumption' });
    expect(within(panel).getByRole('heading', { level: 3 })).toHaveFocus();
    await userEvent.click(within(panel).getByRole('button', { name: CHAIN_COPY.panel.close }));
    expect(screen.queryByRole('region', { name: 'Retail → consumption' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('toggles closed from the same door, and one reading replaces another', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(joint('Production → aggregation'));
    expect(screen.getByRole('region', { name: 'Production → aggregation' })).toBeInTheDocument();
    await userEvent.click(joint('Extraction → processing'));
    expect(screen.queryByRole('region', { name: 'Production → aggregation' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Extraction → processing' })).toBeInTheDocument();
    await userEvent.click(joint('Extraction → processing'));
    expect(screen.queryByRole('region', { name: 'Extraction → processing' })).not.toBeInTheDocument();
    expect(document.querySelector('section[aria-labelledby$="-chain-panel-title"]')).toBeNull();
  });
});

describe('a layer as a door', () => {
  it('opens its span, its fee or its terms, its lines and the joints it rides on', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Contract capacity' }));
    const panel = screen.getByRole('region', { name: 'Contract capacity' });
    expect(within(panel).getByText(CHAIN_COPY.panel.bandKicker)).toBeInTheDocument();
    expect(within(panel).getByText('Primary processing → finished-goods manufacturing')).toBeInTheDocument();
    expect(within(panel).getByText(MARGIN_KINDS['service-fee'].label)).toBeInTheDocument();
    expect(within(panel).getByText(/Tolling fee revenue, net/)).toBeInTheDocument();
    expect(within(panel).getByText(/Processing → trader \/ importer · Trader \/ importer → manufacturing · Packaging → manufacturing/)).toBeInTheDocument();
  });

  it('shows a layer that only sets the terms without a margin kind', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Principal–distributor contract governance' }));
    const panel = screen.getByRole('region', { name: 'Principal–distributor contract governance' });
    expect(within(panel).getByText('Terms')).toBeInTheDocument();
    expect(within(panel).queryByText(MARGIN_KINDS['service-fee'].label)).not.toBeInTheDocument();
    expect(within(panel).getByText(/consideration payable to a customer/)).toBeInTheDocument();
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

  it('follows the margin with the module, and its lessons one level down — only for chain-located rows', async () => {
    stubCurriculum();
    mount(<ChainPlate links={links} />);
    await userEvent.click(joint('Manufacturing → distribution'));

    const panel = await screen.findByRole('region', { name: 'Manufacturing → distribution' });
    expect(within(panel).getByText(CHAIN_COPY.panel.curriculumHeading)).toBeInTheDocument();
    await waitFor(() => expect(within(panel).getByText('Working Capital')).toBeInTheDocument());
    expect(within(panel).getByRole('link', { name: /Working Capital/ })).toHaveAttribute('href', '/finance/operating/working-capital');
    expect(within(panel).getByText('Operating Finance')).toBeInTheDocument();

    await userEvent.click(joint('Retail → consumption'));
    const other = screen.getByRole('region', { name: 'Retail → consumption' });
    expect(within(other).queryByText(CHAIN_COPY.panel.curriculumHeading)).not.toBeInTheDocument();
  });

  it('links a published lesson and leaves a draft inert, labelled before any click', async () => {
    stubCurriculum();
    mount(<ChainPlate links={links} />);
    await userEvent.click(joint('Manufacturing → distribution'));
    const panel = await screen.findByRole('region', { name: 'Manufacturing → distribution' });
    await waitFor(() => expect(within(panel).getByText('DSO, DIO and DPO')).toBeInTheDocument());

    expect(within(panel).getByRole('link', { name: 'DSO, DIO and DPO' })).toHaveAttribute('href', '/finance/operating/dso-dio-dpo');
    expect(within(panel).queryByRole('link', { name: 'Trade credit as transmission' })).not.toBeInTheDocument();
    expect(within(panel).getByText('Trade credit as transmission')).toBeInTheDocument();
    expect(within(panel).getByText('Coming soon')).toBeInTheDocument();
    expect(within(panel).getByText('Published')).toBeInTheDocument();
  });

  it('closes the reading when a lens is switched', async () => {
    stubCurriculum();
    mount(<ChainPlate links={links} />);
    await userEvent.click(joint('Manufacturing → distribution'));
    await screen.findByRole('region', { name: 'Manufacturing → distribution' });
    await userEvent.click(screen.getByRole('button', { name: 'unit economics' }));
    expect(screen.queryByRole('region', { name: 'Manufacturing → distribution' })).not.toBeInTheDocument();
  });
});

describe('the short version on the landing page', () => {
  it('opens short — no doors, no legend — with one button that swaps in the full chain in place', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(document.querySelectorAll('svg.cp-svg--compact')).toHaveLength(1);
    expect(document.querySelector('svg.cp-svg--wide')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aggregation → processing' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: CHAIN_COPY.controls.legend })).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: CHAIN_COPY.controls.seeFull });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);

    expect(document.querySelector('svg.cp-svg--compact')).toBeNull();
    expect(document.querySelectorAll('svg.cp-svg--wide')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Aggregation → processing' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: CHAIN_COPY.controls.legend })).toBeInTheDocument();
    const back = screen.getByRole('button', { name: CHAIN_COPY.controls.seeCompact });
    expect(back).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(back);
    expect(document.querySelectorAll('svg.cp-svg--compact')).toHaveLength(1);
  });

  it('treats a lens as a closer look: pressing a lens word opens the full chain with that lens on', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'economy' }));
    expect(plate().dataset.lens).toBe('economy');
    expect(document.querySelectorAll('svg.cp-svg--wide')).toHaveLength(1);
  });

  it('keeps the same headline and lead sentence as the full version', () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(screen.getByRole('heading', { name: CHAIN_COPY.headline })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'unit economics' })).toBeInTheDocument();
  });
});
