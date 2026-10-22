/**
 * Chain view, commit 7 (PROMPT-site §3.6): the link card's split along the
 * chain at company level. Two selects, published companies only, default
 * the first on each side, the result labelled with both tickers, and never an
 * average. A side with no published company keeps "not yet available".
 * SYNTHETIC fixtures only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeQueryResult } from './helpers/renderWithProviders';
import { renderFiaPage } from './helpers/renderFiaPage';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => fromMock(...a),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));

import FiaIndexPage from '@/pages/finance-in-action/FiaIndexPage';
import { DOWNSTREAM_COMPANY, UPSTREAM_COMPANY } from '@/components/finance-in-action/viewer/links/LinkCard';
import { COPY } from '@/lib/finance-in-action/copy';
import { formatNumber } from '@/lib/finance-in-action/format';
import { commonPeriod, displayScale, sideEconomics, splitAlongChain } from '@/lib/finance-in-action/linkMath';
import { PER_UNIT_DECIMALS } from '@/lib/finance-in-action/unitEconomics';
import { previewRegistry } from '@/lib/finance-in-action/preview';

const INDEX = '/finance/finance-in-action';
const openCard = (id: string) => renderFiaPage(<FiaIndexPage />, { path: INDEX, url: `${INDEX}?connections=on&link=${id}` });
const reg = previewRegistry();
const syn = reg.links.find((l) => l.id === 'syn-coal-to-cement')!;
const pkg = (t: string) => reg.company(t)!.pkg!;

/** The split's figures as the card shows them, for one company on each side. */
function expectedSplit(up: string, down: string): string[] {
  const period = commonPeriod(syn, pkg(up), pkg(down))!;
  const scale = displayScale(pkg(down));
  return splitAlongChain(syn, sideEconomics(pkg(up), period), sideEconomics(pkg(down), period), { upstream: 'coal', downstream: 'cement', unit: 'tonne' }).map((l) =>
    l.value === null ? COPY.notAvailable : formatNumber(l.value / scale.divisor, PER_UNIT_DECIMALS),
  );
}
const shownSplit = (card: HTMLElement) =>
  within(card.querySelector('h4')!.parentElement!.querySelector('table')!)
    .getAllByRole('row')
    .map((r) => r.querySelector('td')!.textContent);

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});

describe('the link card, company level', () => {
  it('lists published companies only on each side and defaults to the first', async () => {
    openCard('syn-coal-to-cement');
    const up = (await screen.findByLabelText(UPSTREAM_COMPANY)) as HTMLSelectElement;
    const down = screen.getByLabelText(DOWNSTREAM_COMPANY) as HTMLSelectElement;
    expect(Array.from(up.options).map((o) => o.value)).toEqual(['SCOA', 'XCOA']);
    // XCEM is a preview, not published, so it is not offered.
    expect(Array.from(down.options).map((o) => o.value)).toEqual(['SCEM']);
    expect(up.value).toBe('SCOA');
    expect(down.value).toBe('SCEM');
  });

  it('labels the result with both tickers and shows that pair’s figures', async () => {
    openCard('syn-coal-to-cement');
    await screen.findByLabelText(UPSTREAM_COMPANY);
    const card = document.getElementById('links')!;
    expect(card.querySelector('[data-split-pair]')).toHaveTextContent(/^SCOA to SCEM/);
    expect(shownSplit(card)).toEqual(expectedSplit('SCOA', 'SCEM'));
  });

  it('reads the chosen company alone, never an average of the published ones', async () => {
    openCard('syn-coal-to-cement');
    await userEvent.selectOptions(await screen.findByLabelText(UPSTREAM_COMPANY), 'XCOA');
    const card = document.getElementById('links')!;
    expect(card.querySelector('[data-split-pair]')).toHaveTextContent(/^XCOA to SCEM/);
    const xcoa = expectedSplit('XCOA', 'SCEM');
    expect(shownSplit(card)).toEqual(xcoa);
    expect(xcoa).not.toEqual(expectedSplit('SCOA', 'SCEM'));
  });

  it('keeps "not yet available" and offers no select when a side has no published company', async () => {
    openCard('coal-to-cement');
    await screen.findByRole('heading', { name: /One tonne of cement, split along the chain/ });
    expect(screen.queryByLabelText(UPSTREAM_COMPANY)).toBeNull();
    expect(screen.queryByLabelText(DOWNSTREAM_COMPANY)).toBeNull();
    const card = document.getElementById('links')!;
    expect(card.querySelector('[data-split-pair]')).toBeNull();
    expect(shownSplit(card).every((t) => t === COPY.notAvailable)).toBe(true);
  });
});
