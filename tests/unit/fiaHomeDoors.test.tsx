/**
 * Chain view, commit 8 (PROMPT-site §3.7, PRD K6): the homepage chain map's
 * stage boxes, at the finance distance only, carry "n models" (or "planned")
 * and link to the stage's section of Finance in Action. The index's section
 * ids and the map's links come from the same helper, and so do the counts;
 * the economy distance renders exactly as before, and the map's existing
 * keyboard order holds. SYNTHETIC fixtures only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { ChainPlate } from '@/components/industry-chain/ChainPlate';
import type { StageModelsMap } from '@/components/industry-chain/chainModelsContext';
import { stageDoors } from '@/lib/finance-in-action/stageDoors';
import { positionAnchor } from '@/lib/finance-in-action/chain';
import { positionCounts } from '@/lib/finance-in-action/counts';
import { INDEX_PATH } from '@/lib/finance-in-action/routes';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import { STAGES } from '@/data/industryChain';

const reg = previewRegistry();
const doors = stageDoors(reg);

function mount(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
const at = (distance: 'economy' | 'finance') => window.history.replaceState({}, '', distance === 'finance' ? '/?distance=finance' : '/');
/** The plate's markup, with React's per-mount ids (useId) made equal. */
const plateHtml = () => document.querySelector('figure')!.innerHTML.replace(/:r[0-9a-z]+:/g, ':id:');
const tabStops = () =>
  Array.from(document.querySelectorAll<HTMLElement>('figure a[href], figure button, figure [tabindex="0"]'))
    .filter((el) => !el.closest('[data-chain-models]') && !el.hasAttribute('data-chain-models'))
    .map((el) => el.getAttribute('aria-label') ?? el.textContent);

beforeEach(() => at('economy'));
afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('the stage doors, worked', () => {
  it('go to the anchor the index gives the stage’s section, from the same helper, with the pills’ counts', () => {
    const counts = positionCounts(reg);
    expect([...doors.keys()].sort()).toEqual(STAGES.filter((s) => (counts.get(s.id)?.companies ?? 0) > 0).map((s) => s.id).sort());
    for (const [id, d] of doors) {
      expect(d.href).toBe(`${INDEX_PATH}#${positionAnchor(id)}`);
      const c = counts.get(id)!;
      expect(d.name).toContain(`${c.companies} company model`);
      expect(d.text).toBe(c.published ? `${c.published} model${c.published === 1 ? '' : 's'}` : 'planned');
    }
    expect(doors.get('stage-extraction')).toEqual({
      href: '/finance/finance-in-action#stage-stage-extraction',
      text: '2 models',
      name: 'Geological extraction: 6 company models in Finance in Action, 2 published',
    });
  });

  it('say "planned" when a stage has companies on the slate and none published', () => {
    const live = stageDoors({ ...reg, companies: reg.companies.map((c) => ({ ...c, status: 'not_started' as const })) });
    expect(live.get('stage-processing')?.text).toBe('planned');
    expect(live.get('stage-processing')?.name).toMatch(/, planned$/);
  });
});

describe('the homepage chain map', () => {
  it('links each stage box with models at the finance distance, named for where it goes', () => {
    at('finance');
    mount(<ChainPlate stageModels={doors} />);
    for (const [id, d] of doors) {
      const link = screen.getByRole('link', { name: d.name });
      expect(link, id).toHaveAttribute('href', d.href);
      expect(link).toHaveTextContent(d.text);
    }
    expect(document.querySelector('[data-chain-models="stage-recovery"]')).toBeNull();
  });

  it('renders the economy distance exactly as it did without the doors', () => {
    mount(<ChainPlate />);
    const before = plateHtml();
    cleanup();
    mount(<ChainPlate stageModels={doors as StageModelsMap} />);
    expect(plateHtml()).toBe(before);
    expect(document.querySelector('[data-chain-models]')).toBeNull();
  });

  it('keeps the map’s existing keyboard order at the finance distance, the doors added after it', () => {
    at('finance');
    mount(<ChainPlate />);
    const before = tabStops();
    cleanup();
    at('finance');
    mount(<ChainPlate stageModels={doors} />);
    expect(tabStops()).toEqual(before);
    const all = Array.from(document.querySelectorAll('.cp-hits > *'));
    const firstDoor = all.findIndex((el) => el.hasAttribute('data-chain-models'));
    expect(firstDoor).toBeGreaterThan(0);
    expect(all.slice(firstDoor).every((el) => el.hasAttribute('data-chain-models'))).toBe(true);
  });

  it('carries the same door in the narrow column, under the stage’s name', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }),
    });
    try {
      at('finance');
      mount(<ChainPlate stageModels={doors} />);
      const box = document.querySelector('[data-id="stage-extraction"]') as HTMLElement;
      const link = within(box).getByRole('link', { name: doors.get('stage-extraction')!.name });
      expect(link).toHaveAttribute('href', '/finance/finance-in-action#stage-stage-extraction');
      expect(link).toHaveTextContent('2 models');
    } finally {
      // @ts-expect-error restore jsdom's absence of matchMedia for the next file
      delete window.matchMedia;
    }
  });
});
