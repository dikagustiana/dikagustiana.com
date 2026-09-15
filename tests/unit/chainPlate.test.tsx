/**
 * The plate on a wide screen: the headline is the entry point and is
 * verbatim; the two lens words are the distance control and one of them is
 * always on, economy at rest; the two shift words are the shift control,
 * exclusive, neither on at rest; the two compose — a reading speaks in the
 * voice of the distance that is on, and only that voice; every joint carries
 * its chip at rest and the chip re-reads with the distance; every joint and
 * every layer is a door whose reading opens beside it and stays open while a
 * control changes; nothing sits under the plate but the controls; the
 * curriculum follows only where a module is pinned; a draft lesson is
 * labelled "Planned" as inert text; and the short version expands in
 * place.
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
import { BANDS, CHAIN_COPY, JOINTS, MARGIN_KINDS, OVERVIEW_GROUPS, OVERVIEW_HIDES, SHIFT_BY_ID, jointLayers } from '@/data/industryChain';

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
const word = (name: string) => screen.getByRole('button', { name, exact: true });
const chipWords = () => Array.from(document.querySelectorAll('.cp-joint-chip text')).map((t) => t.textContent);
const litIds = () => Array.from(document.querySelectorAll<SVGGElement>('.cp-hit[data-lit]')).map((g) => g.dataset.id).sort();
const voice = (panel: HTMLElement) => panel.querySelector('[data-voice]')!.getAttribute('data-voice');

beforeEach(() => {
  fromMock.mockReset();
  window.history.replaceState({}, '', '/about');
});

describe('ChainPlate at rest', () => {
  it('leads with the map’s own title, at the rank the page gives it', () => {
    mount(<ChainPlate />);
    expect(screen.getByRole('heading', { name: CHAIN_COPY.title, level: 2 })).toBeInTheDocument();
    expect(document.querySelector('[data-chain-standfirst]')!.textContent).toBe(CHAIN_COPY.standfirst);
    // Inside About the map sits under that page's heading. On the landing page
    // nothing precedes it, so the same title carries the page's h1.
    expect(document.querySelector('h1')).toBeNull();
  });

  it('takes the page’s main heading when nothing precedes it', () => {
    mount(<ChainPlate heading="h1" />);
    expect(screen.getByRole('heading', { name: CHAIN_COPY.title, level: 1 })).toBeInTheDocument();
  });

  it('reads the chain from far — economy on, finance off — with no shift and both shift words unpressed', () => {
    mount(<ChainPlate />);
    expect(plate().dataset.lens).toBe('economy');
    expect(plate().dataset.shift).toBeUndefined();
    expect(word('economy')).toHaveAttribute('aria-pressed', 'true');
    expect(word('finance')).toHaveAttribute('aria-pressed', 'false');
    expect(word('reindustrialisation')).toHaveAttribute('aria-pressed', 'false');
    expect(word('green transition')).toHaveAttribute('aria-pressed', 'false');
  });

  it('draws the wide plate once, as a group, with every joint and every layer a door even when nothing is mapped', () => {
    mount(<ChainPlate links={[]} />);
    expect(document.querySelectorAll("svg.cp-svg--wide")).toHaveLength(1);
    expect(document.querySelector('.cp-column')).toBeNull();
    for (const j of JOINTS) expect(joint(j.label)).toHaveAttribute('aria-expanded', 'false');
    for (const b of BANDS) expect(screen.getByRole('button', { name: b.label })).toHaveAttribute('aria-expanded', 'false');
  });

  it('puts a chip on every joint at rest, reading it as an economy, and marks the joint in the form of its margin kind', () => {
    mount(<ChainPlate links={[]} />);
    expect(chipWords().sort()).toEqual(JOINTS.map((j) => j.read.economy.chip).sort());
    for (const j of JOINTS) {
      const mark = document.querySelector(`.cp-hit[data-id="${j.id}"] .cp-joint-mark`)!;
      expect(mark.classList.contains(`cp-joint-mark--${MARGIN_KINDS[j.margin].mark}`), j.id).toBe(true);
    }
    expect(litIds()).toEqual([]);
  });

  it('puts nothing under the plate: no legend, no reference, no hint, no caption — the definitions are read on the elements', () => {
    mount(<ChainPlate />);
    expect(screen.queryByRole('heading', { name: 'How to read the map' })).not.toBeInTheDocument();
    expect(screen.queryByText('Read the chain at text size')).not.toBeInTheDocument();
    expect(screen.queryByText('How the two distances relate')).not.toBeInTheDocument();
    expect(document.querySelector('[data-chain-readout]')).toBeNull();
    expect(document.querySelector('[data-chain-reference]')).toBeNull();
    expect(screen.queryByText(/Select a joint to read the margin/)).not.toBeInTheDocument();
    // The footnote became one line, and it sits UNDER the map now: it is a
    // caveat about a drawing, and it used to stand above the drawing it was
    // about. Nothing else follows the figure at rest.
    const figure = document.querySelector('figure')!;
    const scope = document.querySelector('[data-chain-scope]')!;
    expect(scope.textContent).toContain('principal from agent');
    expect(figure.nextElementSibling).toBe(scope);
    expect(scope.nextElementSibling).toBeNull();
  });

  it('gives every layer its own switch, on by default, that fades the band without removing it', async () => {
    mount(<ChainPlate links={[]} />);
    const sw = screen.getByRole('switch', { name: /Hide layer: Energy/ });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(document.querySelector('.cp-band-hit[data-id="band-energy"]')).not.toHaveAttribute('data-hidden');
    await userEvent.click(sw);
    expect(screen.getByRole('switch', { name: /Show layer: Energy/ })).toHaveAttribute('aria-checked', 'false');
    expect(document.querySelector('.cp-band-hit[data-id="band-energy"]')).toHaveAttribute('data-hidden');
    // The band is still a door while it is off.
    expect(screen.getByRole('button', { name: 'Energy' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: /Show layer: Energy/ }));
    expect(document.querySelector('.cp-band-hit[data-id="band-energy"]')).not.toHaveAttribute('data-hidden');
  });

  it('fades every drawing of a switched-off layer: its band, its shift outline, its mark and, for energy, the arrows into the stages', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    const stubs = document.querySelectorAll('.cp-energy-in');
    expect(stubs.length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('switch', { name: /Hide layer: Energy/ }));
    expect(document.querySelector('.cp-shift--green .cp-lit[data-for="band-energy"]')).toHaveAttribute('data-hidden');
    expect(document.querySelector('.cp-mark[data-mark="band-energy"]')).toHaveAttribute('data-hidden');
    stubs.forEach((el) => expect(el).toHaveAttribute('data-hidden'));
    // Another layer's outline is untouched.
    expect(document.querySelector('.cp-shift--green .cp-lit[data-for="band-logistics"]')).not.toHaveAttribute('data-hidden');

    await userEvent.click(screen.getByRole('switch', { name: /Show layer: Energy/ }));
    expect(document.querySelector('.cp-shift--green .cp-lit[data-for="band-energy"]')).not.toHaveAttribute('data-hidden');
    stubs.forEach((el) => expect(el).not.toHaveAttribute('data-hidden'));
  });
});

describe('a page frame that opens the map with a shift on', () => {
  it('starts with that overlay marked, and lets an address override it', () => {
    mount(<ChainPlate links={[]} initialShift="green" />);
    expect(plate().dataset.shift).toBe('green');
    expect(word('green transition')).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelectorAll('.cp-marks--green .cp-mark')).toHaveLength(8);
  });

  it('yields to the address when the address names an overlay', () => {
    window.history.replaceState({}, '', '/about?lens=reindustrialisation');
    mount(<ChainPlate links={[]} initialShift="green" />);
    expect(plate().dataset.shift).toBe('reindustrialisation');
  });
});

describe('the distance control', () => {
  it('steps in from the sentence: every chip re-reads as finance, the lane says so, and the map itself does not change', async () => {
    mount(<ChainPlate links={[]} />);
    const before = document.querySelectorAll('.cp-base *').length;
    await userEvent.click(word('finance'));
    expect(plate().dataset.lens).toBe('finance');
    expect(word('finance')).toHaveAttribute('aria-pressed', 'true');
    expect(word('economy')).toHaveAttribute('aria-pressed', 'false');
    expect(chipWords().sort()).toEqual(JOINTS.map((j) => j.read.finance.chip).sort());
    expect(document.querySelectorAll('.cp-base *').length).toBe(before);
  });

  it('is a position, not a switch: pressing the distance that is on leaves it on', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('economy'));
    expect(plate().dataset.lens).toBe('economy');
    await userEvent.click(word('finance'));
    await userEvent.click(word('finance'));
    expect(plate().dataset.lens).toBe('finance');
    await userEvent.click(word('economy'));
    expect(plate().dataset.lens).toBe('economy');
  });

  it('isolates an open joint at finance: the joint, its two hands and its layers stay, the rest steps back — and economy brings it back', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('finance'));
    await userEvent.click(joint('Processing → trader / importer'));
    expect(plate().dataset.isolate).toBe('j-processing-trader');
    expect(document.querySelector('.cp-base [data-id="stage-processing"]')).not.toHaveAttribute('data-dim');
    expect(document.querySelector('.cp-base [data-id="node-trader"]')).not.toHaveAttribute('data-dim');
    expect(document.querySelector('.cp-hit[data-id="j-processing-trader"]')).not.toHaveAttribute('data-dim');
    expect(document.querySelector('.cp-band-hit[data-id="band-logistics"]')).not.toHaveAttribute('data-dim');
    expect(document.querySelector('.cp-base [data-id="node-distributor"]')).toHaveAttribute('data-dim');
    expect(document.querySelector('.cp-hit[data-id="j-wholesale-retail"]')).toHaveAttribute('data-dim');
    // Governance does not ride on this joint, so it steps back too.
    expect(document.querySelector('.cp-band-hit[data-id="band-governance"]')).toHaveAttribute('data-dim');

    await userEvent.click(word('economy'));
    expect(plate().dataset.isolate).toBeUndefined();
    expect(document.querySelector('[data-dim]')).toBeNull();
  });

  it('does not isolate at economy, where the whole chain is the reading', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(joint('Processing → trader / importer'));
    expect(plate().dataset.isolate).toBeUndefined();
    expect(document.querySelector('[data-dim]')).toBeNull();
  });
});

describe('the shift control', () => {
  it('turns one shift on from its word and marks exactly its doors, in the form of their status', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('reindustrialisation'));
    const s = SHIFT_BY_ID.reindustrialisation;
    expect(plate().dataset.shift).toBe('reindustrialisation');
    expect(word('reindustrialisation')).toHaveAttribute('aria-pressed', 'true');
    const doors = s.targets.map((t) => t.id).filter((id) => JOINTS.some((j) => j.id === id) || BANDS.some((b) => b.id === id)).sort();
    expect(litIds()).toEqual(doors);
    expect(document.querySelector('.cp-shift--reindustrialisation .cp-lit[data-for="border-import"]')).toHaveAttribute('data-status', 'stuck');
    expect(document.querySelector('.cp-shift--reindustrialisation .cp-lit[data-for="stage-processing"]')).toHaveAttribute('data-status', 'moving');
    // Nothing is written under the plate for it.
    expect(document.querySelector('[data-shift-caption]')).toBeNull();
    expect(document.querySelector('[data-shift-moves]')).toBeNull();
  });

  it('never shows two shifts at once: the other word switches, the same word turns it off', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('reindustrialisation'));
    await userEvent.click(word('green transition'));
    expect(plate().dataset.shift).toBe('green');
    expect(word('reindustrialisation')).toHaveAttribute('aria-pressed', 'false');
    expect(word('green transition')).toHaveAttribute('aria-pressed', 'true');
    expect(litIds()).toEqual(['band-capital', 'band-cold-chain', 'band-energy', 'band-logistics', 'j-consumption-recovery']);

    await userEvent.click(word('green transition'));
    expect(plate().dataset.shift).toBeUndefined();
    expect(litIds()).toEqual([]);
  });

  it('says what is on in the status line, marks counted in words', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    expect(screen.getByRole('status').textContent).toContain('Green transition · 8 marks');
    await userEvent.click(word('finance'));
    expect(screen.getByRole('status').textContent).toContain('Finance');
  });
});

describe('the two controls compose', () => {
  it('opens a marked element as a reading in one voice, and re-reads it in the other voice when the distance changes', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    await userEvent.click(screen.getByRole('button', { name: /Green transition · Energy · Moving$/ }));
    const panel = () => screen.getByRole('region', { name: 'Energy' });
    const target = SHIFT_BY_ID.green.targets.find((t) => t.id === 'band-energy')!.condition!;
    expect(panel().getAttribute('data-panel')).toBe('reading');
    expect(voice(panel())).toBe('economy');
    expect(within(panel()).getByText(target.action.economy)).toBeInTheDocument();
    expect(within(panel()).queryByText(target.action.finance)).not.toBeInTheDocument();
    expect(within(panel()).getByText('Moving')).toBeInTheDocument();

    await userEvent.click(word('finance'));
    expect(voice(panel())).toBe('finance');
    expect(within(panel()).getByText(target.action.finance)).toBeInTheDocument();
    expect(within(panel()).queryByText(target.action.economy)).not.toBeInTheDocument();
  });

  it('keeps a door open while a control changes: the same joint, from close, then as a reading under the shift, then anatomy again', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(joint('Trader / importer → manufacturing'));
    const panel = () => screen.getByRole('region', { name: 'Trader / importer → manufacturing' });
    const j = JOINTS.find((x) => x.id === 'j-trader-manufacturing')!;
    expect(panel().getAttribute('data-panel')).toBe('anatomy');
    expect(voice(panel())).toBe('economy');
    expect(within(panel()).getByText(j.read.economy.note)).toBeInTheDocument();
    expect(within(panel()).queryByText(j.read.finance.note)).not.toBeInTheDocument();

    await userEvent.click(word('finance'));
    expect(voice(panel())).toBe('finance');
    expect(within(panel()).getByText(j.read.finance.note)).toBeInTheDocument();

    await userEvent.click(word('reindustrialisation'));
    const target = SHIFT_BY_ID.reindustrialisation.targets.find((t) => t.id === 'j-trader-manufacturing')!.condition!;
    expect(panel().getAttribute('data-panel')).toBe('reading');
    expect(within(panel()).getByText(target.action.finance)).toBeInTheDocument();
    expect(within(panel()).getByText('Stuck')).toBeInTheDocument();
    // The anatomy is folded under the reading, not gone.
    expect(within(panel()).getByText(CHAIN_COPY.panel.anatomyJoint)).toBeInTheDocument();

    await userEvent.click(word('economy'));
    expect(within(panel()).getByText(target.action.economy)).toBeInTheDocument();

    await userEvent.click(word('green transition'));
    expect(panel().getAttribute('data-panel')).toBe('anatomy');
  });

  it('never shows the two voices stacked in one panel', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(word('green transition'));
    await userEvent.click(screen.getByRole('button', { name: /Green transition · Logistics and warehousing/ }));
    const panel = screen.getByRole('region', { name: 'Logistics and warehousing' });
    // The reading and the folded anatomy beneath it both speak — in the same voice.
    const voices = Array.from(panel.querySelectorAll('[data-voice]')).map((el) => el.getAttribute('data-voice'));
    expect(voices.length).toBeGreaterThan(0);
    expect(new Set(voices)).toEqual(new Set(['economy']));
    expect(screen.queryByText(/From far — as an economy/)).not.toBeInTheDocument();
    expect(screen.queryByText(/From close — as finance/)).not.toBeInTheDocument();
  });
});

describe('a joint as a door, with nothing mapped', () => {
  it('opens its reading beside the plate, and keeps the accounting apparatus for the finance distance', async () => {
    // Changing distance has to change the explanatory WORK, not just the
    // label. The principal/agent control test and the lines of the financial
    // statements are accounting questions; showing them at the Economy
    // distance meant a reader stepping back to an aggregate consequence still
    // had to pass through a gross-versus-net test to get there.
    mount(<ChainPlate links={[]} />);
    const trigger = joint('Aggregation → processing');
    await userEvent.click(trigger);

    const panel = screen.getByRole('region', { name: 'Aggregation → processing' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(panel.closest('[data-chain-popover]')).not.toBeNull();
    expect(panel.closest('figure')).not.toBeNull();
    expect(within(panel).getByText(/At this joint/)).toBeInTheDocument();
    expect(within(panel).getByText(MARGIN_KINDS['node-spread'].label)).toBeInTheDocument();
    const j = JOINTS.find((x) => x.id === 'j-aggregation-processing')!;
    expect(within(panel).getByText(j.read.economy.note)).toBeInTheDocument();
    expect(within(panel).queryByText(j.read.finance.note)).not.toBeInTheDocument();
    expect(within(panel).queryByText(CHAIN_COPY.panel.curriculumHeading)).not.toBeInTheDocument();

    // At Economy: no control test, no statement lines; the aggregate basis
    // instead — value added, which is what actually adds up.
    expect(within(panel).queryByText(MARGIN_KINDS['node-spread'].test)).not.toBeInTheDocument();
    expect(within(panel).queryByText(CHAIN_COPY.panel.linesHeading)).not.toBeInTheDocument();
    expect(within(panel).getByText(CHAIN_COPY.basis)).toBeInTheDocument();

    // At Finance: both are back.
    await userEvent.click(screen.getByRole('button', { name: 'finance' }));
    const close = screen.getByRole('region', { name: 'Aggregation → processing' });
    expect(within(close).getByText(MARGIN_KINDS['node-spread'].test)).toBeInTheDocument();
    expect(within(close).getByText(CHAIN_COPY.panel.linesHeading)).toBeInTheDocument();
    expect(
      within(close).getByText(/the aggregator pays the producer before the processor pays it/),
    ).toBeInTheDocument();
  });

  /**
   * Three lists, not one. A layer that attaches at the joint AND earns a fee
   * is charged at this transfer; one that attaches there and earns nothing
   * sets its terms; asset finance and energy attach under the functions and
   * stand behind it. V5's two lists used attachment alone as the test, which
   * put contract governance under "charged at this transfer" — a layer that
   * earns nothing was said to take a cut of the move.
   */
  it('splits the layers on a joint into the ones charged there, the ones setting its terms and the ones standing behind it, and each leads to its layer', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(joint('Distributor → wholesaler'));
    const panel = screen.getByRole('region', { name: 'Distributor → wholesaler' });
    const layers = within(panel).getByText(CHAIN_COPY.panel.layersHeading).parentElement!;
    const terms = within(panel).getByText(CHAIN_COPY.panel.layersTermsHeading).parentElement!;
    const behind = within(panel).getByText(CHAIN_COPY.panel.layersBehindHeading).parentElement!;

    for (const b of jointLayers('j-distributor-wholesaler')) {
      const list = b.attaches === 'joints' && b.margin ? layers : b.margin === undefined ? terms : behind;
      expect(within(list).getByRole('button', { name: new RegExp(b.label) }), b.id).toBeInTheDocument();
    }
    expect(within(terms).getByRole('button', { name: /Principal–distributor contract governance/ })).toBeInTheDocument();
    expect(within(terms).getByRole('button', { name: /Regulation and standards/ })).toBeInTheDocument();
    expect(within(layers).queryByRole('button', { name: /Principal–distributor contract governance/ })).not.toBeInTheDocument();
    expect(within(layers).getByRole('button', { name: /Cold chain/ })).toBeInTheDocument();
    expect(within(layers).getByRole('button', { name: /Working capital and trade credit/ })).toBeInTheDocument();
    // Charged at a transfer is a claim about where the fee is cut. Neither of
    // these is cut there, and both belong in the panel all the same.
    expect(within(behind).getByRole('button', { name: /Energy/ })).toBeInTheDocument();
    expect(within(behind).getByRole('button', { name: /Asset and project finance/ })).toBeInTheDocument();
    expect(within(layers).queryByRole('button', { name: /Asset and project finance/ })).not.toBeInTheDocument();
    expect(within(layers).queryByRole('button', { name: /Contract capacity/ })).not.toBeInTheDocument();

    await userEvent.click(within(layers).getByRole('button', { name: /Working capital and trade credit/ }));
    const band = screen.getByRole('region', { name: 'Working capital and trade credit' });
    expect(band).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Distributor → wholesaler' })).not.toBeInTheDocument();

    // Closing that reading returns the reader to the door they came through.
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

  it('closes on Escape and on a click outside the reading, and opens from the chip as well as from the diamond', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(joint('Production → aggregation'));
    expect(screen.getByRole('region', { name: 'Production → aggregation' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Production → aggregation' })).not.toBeInTheDocument();

    await userEvent.click(document.querySelector('.cp-joint-chip[data-for="j-production-aggregation"]')!);
    expect(screen.getByRole('region', { name: 'Production → aggregation' })).toBeInTheDocument();
    await userEvent.click(document.querySelector('[data-chain-standfirst]')!);
    expect(screen.queryByRole('region', { name: 'Production → aggregation' })).not.toBeInTheDocument();
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
  it('opens its span, its fee, its one voice, its lines and the joints it rides on', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Logistics and warehousing' }));
    const panel = screen.getByRole('region', { name: 'Logistics and warehousing' });
    expect(within(panel).getByText(/Enabling layer/)).toBeInTheDocument();
    expect(within(panel).getByText('The whole chain')).toBeInTheDocument();
    expect(within(panel).getByText(MARGIN_KINDS['service-fee'].label)).toBeInTheDocument();
    const band = BANDS.find((b) => b.id === 'band-logistics')!;
    expect(within(panel).getByText(band.read.economy)).toBeInTheDocument();
    expect(within(panel).queryByText(band.read.finance)).not.toBeInTheDocument();
    expect(within(panel).getByText(/Production → aggregation · Extraction → processing/)).toBeInTheDocument();
    // The statement lines are the close reading; at Economy they are the
    // wrong unit and the wrong question.
    expect(
      within(panel).queryByText(/Right-of-use assets and lease liabilities, where the warehouse is leased/),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'finance' }));
    expect(
      within(screen.getByRole('region', { name: 'Logistics and warehousing' })).getByText(
        /Right-of-use assets and lease liabilities, where the warehouse is leased/,
      ),
    ).toBeInTheDocument();
  });

  it('shows a layer that only sets the terms without a margin kind or a chip word', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Principal–distributor contract governance' }));
    const panel = screen.getByRole('region', { name: 'Principal–distributor contract governance' });
    expect(within(panel).queryByText('Terms')).not.toBeInTheDocument();
    expect(within(panel).queryByText(MARGIN_KINDS['service-fee'].label)).not.toBeInTheDocument();
    expect(within(panel).getByText(/It earns nothing itself; it decides who earns/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'finance' }));
    expect(
      within(screen.getByRole('region', { name: 'Principal–distributor contract governance' })).getByText(
        /consideration payable to a customer/,
      ),
    ).toBeInTheDocument();
  });

  it('opens the cold chain and the energy layer as doors of their own', async () => {
    mount(<ChainPlate links={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cold chain' }));
    expect(within(screen.getByRole('region', { name: 'Cold chain' })).getByText(BANDS.find((b) => b.id === 'band-cold-chain')!.read.economy)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Energy' }));
    const panel = screen.getByRole('region', { name: 'Energy' });
    expect(within(panel).getByText(/The whole chain/)).toBeInTheDocument();
    expect(within(panel).getByText(BANDS.find((b) => b.id === 'band-energy')!.read.economy)).toBeInTheDocument();
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
    expect(within(panel).getByText(CHAIN_COPY.panel.comingSoon)).toBeInTheDocument();
    expect(within(panel).getByText('Published')).toBeInTheDocument();
  });

  it('keeps the reading open when the distance changes — the same joint, read from close', async () => {
    stubCurriculum();
    mount(<ChainPlate links={links} />);
    await userEvent.click(joint('Manufacturing → distribution'));
    await screen.findByRole('region', { name: 'Manufacturing → distribution' });
    await userEvent.click(word('finance'));
    const panel = screen.getByRole('region', { name: 'Manufacturing → distribution' });
    expect(voice(panel)).toBe('finance');
  });
});

/**
 * THE OVERVIEW ON THE LANDING PAGE.
 *
 * What these tests used to pin: a short plate with no doors, no chips and no
 * marks, whose distance and shift words were withheld because neither had
 * anything to act on, plus one bounded question and one labelled action that
 * flew the reader into a written case. The owner deleted the opening case and
 * the guided route and asked for the map itself at the top of the page, so the
 * contract is now the opposite: the overview is the same map at a coarser
 * grouping, every control acts there, and the reader chooses.
 */
describe('the overview on the landing page', () => {
  it('opens at the overview with every door and every chip, and the detail swaps in place', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(document.querySelectorAll('svg.cp-svg--compact')).toHaveLength(1);
    expect(document.querySelector('svg.cp-svg--wide')).toBeNull();
    expect(plate().dataset.level).toBe('overview');

    // Ten of the eleven joints are doors here; the eleventh is inside a group.
    for (const j of JOINTS) {
      const door = screen.queryByRole('button', { name: j.label });
      if (OVERVIEW_HIDES.includes(j.id)) expect(door, j.id).toBeNull();
      else expect(door, j.id).toBeInTheDocument();
    }
    expect(document.querySelector('.cp-joint-chip')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'How to read the map' })).not.toBeInTheDocument();

    const opens = screen.getAllByRole('button', { name: CHAIN_COPY.controls.seeFull });
    expect(opens, 'one at each end of a figure taller than the screen').toHaveLength(2);
    for (const open of opens) expect(open).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(opens[0]);

    expect(document.querySelector('svg.cp-svg--compact')).toBeNull();
    expect(document.querySelectorAll('svg.cp-svg--wide')).toHaveLength(1);
    expect(plate().dataset.level).toBe('detail');
    expect(screen.getByRole('button', { name: 'Distributor → wholesaler' })).toBeInTheDocument();

    // Two ways back once it is open — beside the controls and under the map.
    // A figure taller than the screen has two ends, and an exit at each is not
    // two answers to the same question.
    const back = screen.getAllByRole('button', { name: CHAIN_COPY.controls.seeCompact });
    expect(back).toHaveLength(2);
    expect(back[0]).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(back[0]);
    expect(document.querySelectorAll('svg.cp-svg--compact')).toHaveLength(1);
  });

  /*
   * The coupling this inverts: a distance and a scenario also swapped the
   * whole plate, so pressing the ALREADY-ACTIVE Economy, or the already-active
   * No shift, which changes nothing at all, expanded the map. A reader cannot
   * learn what a control means while it is also doing something else.
   *
   * The coupling existed because the short plate could honour neither control.
   * The overview can honour both, so both are offered there and each changes
   * only what it names.
   */
  it('offers the distance and both overlays at the overview, because both now have something to change there', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(word('finance')).toBeInTheDocument();
    expect(word('green transition')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: CHAIN_COPY.controls.noShift })).toBeInTheDocument();

    await userEvent.click(word('finance'));
    expect(plate().dataset.lens).toBe('finance');
    expect(plate().dataset.level, 'a distance is not a level').toBe('overview');

    await userEvent.click(word('green transition'));
    expect(plate().dataset.shift).toBe('green');
    expect(plate().dataset.level, 'a scenario is not a level').toBe('overview');
    expect(document.querySelectorAll('.cp-mark').length).toBeGreaterThan(0);
  });

  it('changes only what each control names, and never the detail level', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    await userEvent.click(screen.getAllByRole('button', { name: CHAIN_COPY.controls.seeFull })[0]);

    await userEvent.click(word('finance'));
    expect(plate().dataset.lens).toBe('finance');
    expect(document.querySelectorAll('svg.cp-svg--wide')).toHaveLength(1);

    await userEvent.click(word('green transition'));
    expect(plate().dataset.shift).toBe('green');
    expect(plate().dataset.lens).toBe('finance');

    // Pressing an already-active neutral state changes nothing, including the
    // detail level. This is the click that used to swap the whole plate.
    await userEvent.click(word('economy'));
    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.controls.noShift }));
    await userEvent.click(screen.getByRole('button', { name: CHAIN_COPY.controls.noShift }));
    expect(plate().dataset.level).toBe('detail');
    expect(plate().dataset.lens).toBe('economy');
    expect(plate().dataset.shift).toBeUndefined();
    expect(document.querySelectorAll('svg.cp-svg--wide')).toHaveLength(1);
  });

  /**
   * Going back to the overview used to drop the shift, because the short plate
   * had no marks to carry. It has them now, so the level control changes the
   * level and nothing else — the same rule the other two controls obey.
   */
  it('carries the distance and the overlay across a change of level, in both directions', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    await userEvent.click(word('finance'));
    await userEvent.click(word('green transition'));

    await userEvent.click(screen.getAllByRole('button', { name: CHAIN_COPY.controls.seeFull })[0]);
    expect(plate().dataset.level).toBe('detail');
    expect(plate().dataset.lens).toBe('finance');
    expect(plate().dataset.shift).toBe('green');

    await userEvent.click(screen.getAllByRole('button', { name: CHAIN_COPY.controls.seeCompact })[0]);
    expect(plate().dataset.level).toBe('overview');
    expect(plate().dataset.lens).toBe('finance');
    expect(plate().dataset.shift).toBe('green');
  });

  it('keeps the title and puts no opening case, no question and no guided route in front of the map', () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(screen.getByRole('heading', { name: CHAIN_COPY.title })).toBeInTheDocument();
    expect(document.querySelector('[data-chain-opening]')).toBeNull();
    expect('opening' in CHAIN_COPY, 'v3’s pilot block is gone from the data too').toBe(false);
    // The controls are the entrance: the sentences that name them, and the
    // note saying what the level control does and does not do.
    expect(document.querySelector('[data-chain-shift-lead]')).not.toBeNull();
    expect(document.querySelector('[data-chain-level-note]')!.textContent).toBe(CHAIN_COPY.controls.levelNote);
  });

  it('opens a door at the overview without expanding anything', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    // The transfer into use crosses a group's edge, so it is a door at the overview.
    await userEvent.click(joint('Retail → consumption'));
    expect(screen.getByRole('region', { name: 'Retail → consumption' })).toBeInTheDocument();
    expect(plate().dataset.level).toBe('overview');
    // A transfer inside the collapsed box is not: it comes back with the detail.
    expect(screen.queryByRole('button', { name: 'Wholesale → retail' })).toBeNull();
  });

  it('draws the five groups as frames at both levels, and the asset-finance band under its recipients', () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    for (const g of Object.values(OVERVIEW_GROUPS)) expect(document.querySelector(`.cp-group[data-id="${g.id}"]`), g.id).not.toBeNull();
    const capital = document.querySelector('.cp-band-hit[data-id="band-capital"]')!;
    expect(capital.getAttribute('data-attaches')).toBe('recipients');
    expect(capital.querySelectorAll('.cp-tick--asset').length).toBeGreaterThanOrEqual(4);
    // The energy band carries its own anatomy: generation, the network along its edge, a connection under each function.
    const energy = document.querySelector('.cp-band-hit[data-id="band-energy"]')!;
    expect(energy.querySelector('.cp-energy-gen')).not.toBeNull();
    expect(energy.querySelector('.cp-energy-net')).not.toBeNull();
    expect(energy.querySelectorAll('.cp-energy-conn').length).toBeGreaterThanOrEqual(5);
    expect(energy.querySelector('[data-energy-legend]')!.textContent).toContain(CHAIN_COPY.energy.connection);
  });

  it('names what moves a lit layer inside its band under the shift — a contract on energy, a risk transfer on asset finance — and nothing at rest', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    expect(document.querySelector('.cp-band-hit .cp-callout--mechanism')).toBeNull();
    await userEvent.click(word('green transition'));
    expect(document.querySelector('.cp-band-hit[data-id="band-energy"] .cp-callout--mechanism')).toHaveAttribute('data-mechanism', 'contract');
    expect(document.querySelector('.cp-band-hit[data-id="band-energy"] .cp-callout--mechanism')!.textContent).toBe('A contract is renegotiated');
    expect(document.querySelector('.cp-band-hit[data-id="band-capital"] .cp-callout--mechanism')).toHaveAttribute('data-mechanism', 'risk-allocation');
    // Logistics is re-priced in the plain sense: no mechanism chip.
    expect(document.querySelector('.cp-band-hit[data-id="band-logistics"] .cp-callout--mechanism')).toBeNull();
    await userEvent.click(word('reindustrialisation'));
    expect(document.querySelector('.cp-band-hit .cp-callout--mechanism')).toBeNull();
  });

  it('offers the way back beside the controls as well as under the map', async () => {
    mount(<ChainPlate variant="preview" links={[]} />);
    await userEvent.click(screen.getAllByRole('button', { name: CHAIN_COPY.controls.seeFull })[0]);
    const exits = screen.getAllByRole('button', { name: CHAIN_COPY.controls.seeCompact });
    expect(exits).toHaveLength(2);
    for (const exit of exits) expect(exit).toHaveAttribute('aria-expanded', 'true');
  });
});
