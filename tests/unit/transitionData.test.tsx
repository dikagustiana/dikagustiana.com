/**
 * The transition data layer on the client (docs/prd/transition-data-layer):
 * the model that turns the public views into lines, manual entry's checks,
 * the chart, the tracker page's chain, a chart's own page, and the
 * chartEmbed node through the five-place content contract. Supabase is
 * mocked at the client module; every view answers from the fixtures below.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { makeQueryResult } from './helpers/renderWithProviders';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => fromMock(...a),
    rpc: vi.fn(),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));

import { Editor } from '@tiptap/core';
import App from '@/App';
import { getSchemaExtensions } from '@/lib/tiptap/extensions';
import { tiptapJsonToHtml, tiptapJsonToMarkdown } from '@/lib/tiptap/serialize';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { buildInsertItems } from '@/lib/tiptap/insertMenu';
import { ArticleBody } from '@/components/editorial/ArticleBody';
import { TransitionChart } from '@/components/transition/TransitionChart';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import GreenTransitionTracker from '@/pages/GreenTransitionTracker';
import TransitionChartDetail from '@/pages/TransitionChartDetail';
import {
  annotationsFor,
  asOfVintage,
  chartsFromCatalog,
  formatValue,
  isStale,
  linesFor,
  quarterEnd,
  rangeStart,
  revisions,
  toCsv,
  withData,
  type ChartCatalogRow,
  type ChartDataRow,
  type HistoryRow,
  type Line,
} from '@/lib/transition/model';
import { checkRow, parseManualCsv, parseNumber } from '@/lib/transition/manualEntry';
import { niceTicks, yearTicks } from '@/lib/transition/scale';
import type { TrackerEntry } from '@/lib/tracker';

// --- Fixtures, shaped as the views return them -------------------------------

const CATALOG: ChartCatalogRow[] = [
  {
    chart_slug: 'grid-carbon-intensity', title: 'Grid carbon intensity has not fallen since 2020.',
    subtitle: 'Carbon intensity of electricity, gCO2e/kWh', chain_link: 'transition', chart_type: 'line',
    annotation_sectors: ['pln_procurement'], chart_sort: 2, chart_updated_at: '2026-10-24T00:00:00Z',
    series_id: 'ember.idn.co2_intensity', label: 'Carbon intensity', role: 'primary', members: null, series_sort: 1,
    unit: 'gCO2e/kWh', frequency: 'A', is_projection: false, series_title: 'Carbon intensity of electricity',
    source_code: 'carbon-intensity/yearly', source_name: 'Ember',
  },
];

const obs = (period: string, value: number, vintage = '2026-10-17', extra: Partial<ChartDataRow> = {}): ChartDataRow => ({
  chart_slug: 'grid-carbon-intensity', series_id: 'ember.idn.co2_intensity', label: 'Carbon intensity', role: 'primary',
  series_sort: 1, member: '', period_start: period, period_label: period.slice(0, 4), value, unit: 'gCO2e/kWh',
  is_projection: false, vintage, retrieved_at: '2026-10-17T19:13:00Z',
  source_url: 'https://ember-energy.org/data/yearly-electricity-data/', source_code: 'carbon-intensity/yearly',
  source_locator: null, ...extra,
});

const DATA = [obs('2020-01-01', 650), obs('2021-01-01', 660), obs('2022-01-01', 655)];

const STATUS = [{
  series_id: 'ember.idn.co2_intensity', title_en: 'Carbon intensity of electricity', title_id: 'Intensitas karbon listrik',
  unit: 'gCO2e/kWh', frequency: 'A', chain_link: 'transition', ingest: 'api', is_projection: false,
  definition_note: 'Ember yearly carbon intensity of generation for Indonesia.', source_code: 'carbon-intensity/yearly',
  series_url: 'https://ember-energy.org/data/yearly-electricity-data/', review_due: null, source_id: 'ember',
  source_name: 'Ember', source_homepage: 'https://ember-energy.org/data/api/', source_license: 'CC BY 4.0',
  n_values: 3, first_period: '2020-01-01', last_period: '2022-01-01', last_retrieved_at: '2026-10-17T19:13:00Z',
  latest_vintage: '2026-10-17', last_check_at: new Date().toISOString(), last_check_rules: 9, last_check_failed: 0,
  last_check_warned: 0,
}];

const CHAIN = [
  { chain_link: 'policy', title: 'Policy', question: 'Are the rules in place?', status_text: null, sort_order: 1 },
  { chain_link: 'infrastructure', title: 'Infrastructure', question: 'Is it being built?', status_text: null, sort_order: 2 },
  { chain_link: 'finance', title: 'Finance', question: 'Is capital available?', status_text: null, sort_order: 3 },
  { chain_link: 'transition', title: 'Transition', question: 'Is it getting cleaner?', status_text: 'Stalled since 2020.', sort_order: 4 },
  { chain_link: 'carbon_price', title: 'Carbon price', question: 'Does carbon carry a price?', status_text: null, sort_order: 5 },
  { chain_link: 'macro', title: 'Macro context', question: 'What economy?', status_text: null, sort_order: 6 },
];

const ENTRY: TrackerEntry = {
  id: 'pln_procurement-2025q2', quarter: '2025Q2', sector: 'pln_procurement', status: 'advanced',
  finding: 'ESDM ratified RUPTL 2025–2034.', detail: 'Detail.', verification: 'verified', published: true,
  sources: [{ title: 'Kepmen 188', url: 'https://jdih.esdm.go.id/dokumen/view?id=2584', date: '2025-05-26' }],
};

const HISTORY: HistoryRow[] = [
  { ...obs('2020-01-01', 640, '2026-10-10'), vintage_date: '2026-10-10', published_at: '2026-10-10T00:00:00Z' },
  { ...obs('2020-01-01', 650, '2026-10-17'), vintage_date: '2026-10-17', published_at: '2026-10-17T00:00:00Z' },
  { ...obs('2021-01-01', 660, '2026-10-17'), vintage_date: '2026-10-17', published_at: '2026-10-17T00:00:00Z' },
];

function views(withCharts: boolean) {
  fromMock.mockImplementation((table: string) => {
    const answers: Record<string, unknown> = {
      tracker_entry: [ENTRY],
      v_chain: CHAIN,
      v_chart_catalog: withCharts ? CATALOG : [],
      v_chart_data: withCharts ? DATA : [],
      v_series_status: withCharts ? STATUS : [],
      v_series_history: withCharts ? HISTORY : [],
      v_chart_usage: withCharts ? [{ chart_slug: 'grid-carbon-intensity', essay_slug: 'pilot', essay_title: 'The pilot essay' }] : [],
    };
    return makeQueryResult(answers[table] ?? []);
  });
}

beforeEach(() => {
  fromMock.mockReset();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

// --- The model ---------------------------------------------------------------

describe('transition model', () => {
  it('orders charts by the sequencing chain, then their sort', () => {
    const rows = [
      { ...CATALOG[0], chart_slug: 'b', chain_link: 'macro' as const, chart_sort: 1 },
      { ...CATALOG[0], chart_slug: 'a', chain_link: 'policy' as const, chart_sort: 2, series_id: null },
      { ...CATALOG[0], chart_slug: 'c', chain_link: 'policy' as const, chart_sort: 1 },
    ];
    const charts = chartsFromCatalog(rows);
    expect(charts.map((c) => c.slug)).toEqual(['c', 'a', 'b']);
    expect(charts[1].seriesIds).toEqual([]);
    expect(charts[0].unit).toBe('gCO2e/kWh');
  });

  it('keeps a mix in the chart’s member order, so a colour follows its member', () => {
    const rows = ['Solar', 'Coal', 'Gas'].map((m) => obs('2024-01-01', 1, '2026-10-17', { member: m, series_id: 'ember.idn.generation' }));
    const lines = linesFor(rows, { 'ember.idn.generation': ['Coal', 'Gas', 'Solar'] });
    expect(lines.map((l) => l.member)).toEqual(['Coal', 'Gas', 'Solar']);
    expect(lines.map((l) => l.name)).toEqual(['Coal', 'Gas', 'Solar']);
  });

  it('reads a series as of a vintage, and lists the vintages newest first', () => {
    expect(asOfVintage(HISTORY, '2026-10-12').map((r) => r.value)).toEqual([640]);
    expect(asOfVintage(HISTORY, null).map((r) => `${r.period_start}:${r.value}`).sort()).toEqual(['2020-01-01:650', '2021-01-01:660']);
    expect(revisions(HISTORY).map((v) => `${v.vintage}:${v.rows}`)).toEqual(['2026-10-17:2', '2026-10-10:1']);
  });

  it('marks only verified, published entries of the chart’s sectors, at the end of their quarter', () => {
    expect(quarterEnd('2025Q2')).toBe('2025-06-30');
    expect(quarterEnd('2025Q4')).toBe('2025-12-31');
    expect(quarterEnd('Q2 2025')).toBeNull();
    const draft = { ...ENTRY, id: 'x', published: false };
    const other = { ...ENTRY, id: 'y', sector: 'solar' as const };
    expect(annotationsFor([ENTRY, draft, other], ['pln_procurement']).map((a) => `${a.id}@${a.x}`)).toEqual([
      'pln_procurement-2025q2@2025-06-30',
    ]);
  });

  it('writes a CSV with the trail of every value, quoting what needs it', () => {
    const chart = withData(chartsFromCatalog(CATALOG)[0], [
      ...DATA.slice(0, 1),
      obs('2021-01-01', 660, '2026-10-17', { source_locator: 'Table 3, "row 2", p. 4' }),
    ]);
    const csv = toCsv(chart.lines).trim().split('\n');
    expect(csv[0]).toBe('series_id,member,period_start,period_label,value,unit,is_projection,vintage,retrieved_at,source_url,source_code,source_locator');
    expect(csv[1]).toBe('ember.idn.co2_intensity,,2020-01-01,2020,650,gCO2e/kWh,false,2026-10-17,2026-10-17T19:13:00Z,https://ember-energy.org/data/yearly-electricity-data/,carbon-intensity/yearly,');
    expect(csv[2].endsWith(',"Table 3, ""row 2"", p. 4"')).toBe(true);
  });

  it('cuts a range from the last period, and formats values by unit', () => {
    const lines = linesFor(DATA);
    expect(rangeStart('5y', lines)).toBe('2017-01-01');
    expect(rangeStart('all', lines)).toBeNull();
    expect(formatValue(60.5, '%')).toBe('60.5%');
    expect(formatValue(5.75, '% per annum')).toBe('5.75%');
    expect(formatValue(17849.3, 'IDR per USD')).toBe('17,849 IDR per USD');
  });

  it('calls an API series stale after 14 days without a good run, a manual one after its review date', () => {
    const now = new Date('2026-10-24T00:00:00Z');
    expect(isStale({ ingest: 'api', last_check_at: '2026-10-17T19:13:00Z', review_due: null }, now)).toBe(false);
    expect(isStale({ ingest: 'api', last_check_at: '2026-09-30T19:13:00Z', review_due: null }, now)).toBe(true);
    expect(isStale({ ingest: 'api', last_check_at: null, review_due: null }, now)).toBe(true);
    expect(isStale({ ingest: 'manual', last_check_at: null, review_due: '2026-10-23' }, now)).toBe(true);
    expect(isStale({ ingest: 'manual', last_check_at: null, review_due: '2027-01-31' }, now)).toBe(false);
  });

  it('draws nice ticks and year ticks', () => {
    expect(niceTicks(612, 668, 5)).toEqual([600, 620, 640, 660, 680]);
    expect(niceTicks(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(yearTicks('2000-01-01', '2026-08-01', 6)).toEqual([2000, 2005, 2010, 2015, 2020, 2025]);
  });
});

// --- Manual entry -------------------------------------------------------------

describe('manual entry', () => {
  const quarterly = { id: 'bei.idxcarbon.volume', unit: 'tCO2e', frequency: 'Q' as const };

  it('accepts a sourced, located value on the grid', () => {
    const { row, errors } = checkRow(
      { period_start: '2025-01-01', value: '690,675', vintage: '2025-04-17', source_url: 'https://www.idx.co.id/x', source_locator: 'p. 2, para 3' },
      quarterly,
    );
    expect(errors).toEqual([]);
    expect(row?.value).toBe(690675);
    expect(row?.unit).toBe('tCO2e');
  });

  it('names each rule a row breaks', () => {
    const { row, errors } = checkRow(
      { period_start: '2025-02-01', value: '1.234,5', vintage: '17/04/2025', source_url: 'http://bisnis.com/x', source_locator: ' ', unit: 'tonnes' },
      quarterly,
    );
    expect(row).toBeNull();
    expect(errors.join(' | ')).toMatch(/Q grid \(R3\).*not a number.*vintage.*https.*\(R1\).*\(R2\).*\(R5\)/);
  });

  it('parses a pasted CSV with tabs and quotes, and flags duplicates', () => {
    const text = [
      'period_start\tvalue\tvintage\tsource_url\tsource_locator',
      '2025-01-01\t690675\t2025-04-17\thttps://www.idx.co.id/a\t"Table 1, row ""total"""',
      '2025-01-01\t690675\t2025-04-17\thttps://www.idx.co.id/a\tTable 1',
      '2025-04-01\tabc\t2025-07-17\thttps://www.idx.co.id/b\tTable 1',
    ].join('\n');
    const { rows, headerErrors } = parseManualCsv(text, quarterly);
    expect(headerErrors).toEqual([]);
    expect(rows[0].row?.source_locator).toBe('Table 1, row "total"');
    expect(rows[1].errors).toContain('the same member, period and vintage appear twice (R4)');
    expect(rows[2].errors).toContain('value is not a number');
    expect(parseManualCsv('period,value\n2025-01-01,1', quarterly).headerErrors[0]).toMatch(/lacks period_start, vintage, source_url, source_locator/);
    expect(parseManualCsv('period_start,value', quarterly).headerErrors).toEqual(['the header lacks vintage, source_url, source_locator']);
  });

  it('reads numbers the way they are typed, and refuses the ambiguous ones', () => {
    expect(parseNumber('4 000')).toBe(4000);
    expect(parseNumber('3,558')).toBe(3558);
    expect(parseNumber('-1.25')).toBe(-1.25);
    expect(parseNumber('3.558')).toBe(3.558);
    expect(parseNumber('1,23')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });
});

// --- The chart ---------------------------------------------------------------

describe('TransitionChart', () => {
  const one = linesFor(DATA);
  const two: Line[] = [
    ...one,
    { ...one[0], key: 'x::', seriesId: 'x', name: 'CPI inflation', points: one[0].points.map((p) => ({ ...p, value: p.value / 100, isProjection: p.x > '2021' })) },
  ];

  it('names one line by its title and draws no legend; two lines get a legend', () => {
    const { container, rerender } = render(<TransitionChart chartType="line" lines={one} unit="gCO2e/kWh" title="T" />);
    expect(screen.queryByRole('list', { name: 'Legend' })).toBeNull();
    expect(screen.getByRole('img', { name: 'T' })).toBeTruthy();
    rerender(<TransitionChart chartType="line" lines={two} unit="%" title="T" />);
    expect(within(screen.getByRole('list', { name: 'Legend' })).getAllByRole('listitem')).toHaveLength(2);
    // Projections are dashed, actuals solid.
    expect(container.querySelectorAll('path[stroke-dasharray]').length).toBe(1);
  });

  it('reads each period from the keyboard and shows every value as a table', async () => {
    render(<TransitionChart chartType="line" lines={one} unit="gCO2e/kWh" title="T" />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(screen.getByRole('status').textContent).toContain('2020');
    expect(screen.getByRole('status').textContent).toContain('650 gCO2e/kWh');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toContain('2021');
    await userEvent.click(screen.getByRole('button', { name: 'Show the values as a table' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByText('655 gCO2e/kWh')).toBeTruthy();
  });

  it('says so when there is nothing to draw', () => {
    render(<TransitionChart chartType="bar" lines={[]} unit={null} title="T" />);
    expect(screen.getByText('No published value yet.')).toBeTruthy();
  });

  it('numbers the policy markers and lists their findings', () => {
    render(
      <TransitionChart chartType="line" lines={one} unit="gCO2e/kWh" title="T" annotations={annotationsFor([{ ...ENTRY, quarter: '2021Q2' }], ['pln_procurement'])} />,
    );
    const markers = screen.getByRole('list', { name: 'Policy markers' });
    expect(within(markers).getByText('ESDM ratified RUPTL 2025–2034.')).toBeTruthy();
  });
});

// --- Pages -------------------------------------------------------------------

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

/** The two pages on a fresh cache each time (App's QueryClient lives for the file). */
function renderPage(path: string) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AuthProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route path="/green-transition/tracker" element={<GreenTransitionTracker />} />
                <Route path="/green-transition/tracker/chart/:slug" element={<TransitionChartDetail />} />
              </Routes>
            </MemoryRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe('tracker page and chart page', () => {
  it('shows the register alone while no chart is published', async () => {
    views(false);
    renderPage('/green-transition/tracker');
    expect(await screen.findByRole('heading', { level: 2, name: 'Sector register' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Where the chain is stuck' })).toBeNull();
  });

  it('forwards the PRD’s short address to the tracker', async () => {
    views(false);
    renderAt('/transition/tracker');
    expect(await screen.findByRole('heading', { level: 1, name: 'Indonesia Green Transition Tracker' })).toBeTruthy();
    expect(window.location.pathname).toBe('/green-transition/tracker');
  });
  it('shows the chain once a chart is published, with the trail under the chart', async () => {
    views(true);
    renderPage('/green-transition/tracker');
    expect(await screen.findByRole('heading', { level: 2, name: 'Where the chain is stuck' })).toBeTruthy();
    expect(await screen.findByRole('heading', { level: 3, name: 'Grid carbon intensity has not fallen since 2020.' })).toBeTruthy();
    expect(screen.getByText('Stalled since 2020.')).toBeTruthy();
    expect(screen.getAllByText('No chart published yet.')).toHaveLength(4);
    const card = screen.getByRole('article', { name: 'Grid carbon intensity has not fallen since 2020.' });
    expect(within(card).getByText('carbon-intensity/yearly')).toBeTruthy();
    expect(within(card).getByRole('button', { name: 'Download CSV' })).toBeTruthy();
    expect(within(card).getByRole('link', { name: /Sources, checks and revisions/ }).getAttribute('href')).toBe(
      '/green-transition/tracker/chart/grid-carbon-intensity',
    );
    // The register is still on the page below it.
    expect(await screen.findByRole('heading', { level: 2, name: 'Sector register' })).toBeTruthy();
  });

  it('gives a chart its own page with sources, revisions and the essays that use it', async () => {
    views(true);
    renderPage('/green-transition/tracker/chart/grid-carbon-intensity');
    expect(await screen.findByRole('heading', { level: 1, name: 'Grid carbon intensity has not fallen since 2020.' })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Revision history' })).toBeTruthy();
    const history = screen.getByRole('region', { name: 'Revision history' });
    expect(within(history).getByText('2026-10-10')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'The pilot essay' }).getAttribute('href')).toBe('/essays/pilot');
    expect(screen.getByRole('combobox')).toBeTruthy(); // the vintage picker
    expect(screen.getByText('CC BY 4.0')).toBeTruthy();
  });

});

// --- chartEmbed through the content contract ----------------------------------

describe('chartEmbed', () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Before.' }] }, { type: 'chartEmbed', attrs: { slug: 'grid-carbon-intensity' } }] };

  it('serializes to a figure the sanitizer keeps, and the editor parses back', () => {
    const html = tiptapJsonToHtml(doc);
    expect(html).toContain('<figure data-type="chart-embed" data-chart-slug="grid-carbon-intensity" class="chart-embed">');
    expect(sanitizeHtml(html)).toBe(html);
    const editor = new Editor({ extensions: getSchemaExtensions(), content: html });
    const node = editor.getJSON().content?.find((n) => n.type === 'chartEmbed');
    const once = editor.getHTML();
    editor.destroy();
    expect(node?.attrs?.slug).toBe('grid-carbon-intensity');
    const again = new Editor({ extensions: getSchemaExtensions(), content: once });
    expect(again.getHTML()).toBe(once);
    again.destroy();
    expect(tiptapJsonToMarkdown(doc)).toContain('[Chart: grid-carbon-intensity](/green-transition/tracker/chart/grid-carbon-intensity)');
  });

  it('drops a slug that is not one', () => {
    expect(tiptapJsonToHtml({ type: 'doc', content: [{ type: 'chartEmbed', attrs: { slug: '"><script>' } }] })).toBe('');
  });

  it('is in the insert menu when the editor offers the picker', () => {
    expect(buildInsertItems({}).some((i) => i.id === 'chart')).toBe(false);
    expect(buildInsertItems({ onInsertChart: () => {} }).some((i) => i.id === 'chart')).toBe(true);
  });

  const renderBody = (content: string) =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ArticleBody content={content} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('renders the live chart inside an essay', async () => {
    views(true);
    renderBody(JSON.stringify(doc));
    expect(await screen.findByText('Grid carbon intensity has not fallen since 2020.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open in the Transition Tracker/ })).toBeTruthy();
  });

  it('renders an unpublished chart as nothing for a reader', async () => {
    views(false);
    renderBody(JSON.stringify(doc));
    expect(await screen.findByText('Before.')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Grid carbon intensity has not fallen since 2020.')).toBeNull();
    expect(screen.queryByText(/Open in the Transition Tracker/)).toBeNull();
  });
});

// --- The migration and the fetcher agree with the client ----------------------

describe('migration contract', () => {
  const sql = readFileSync('supabase/migrations/20261024120000_transition_data_layer.sql', 'utf8');
  const seed = readFileSync('supabase/migrations/20261024120100_transition_data_layer_seed.sql', 'utf8');

  it('gives anon the views only, and the service role no write on published values', () => {
    expect(sql).toMatch(/REVOKE ALL ON public\.ds_source,[\s\S]*FROM PUBLIC, anon, authenticated, service_role;/);
    expect(sql).not.toMatch(/GRANT [^;]*ON public\.ds_[a-z_]+[^;]*TO [^;]*anon/);
    expect(sql).toMatch(/GRANT SELECT, INSERT, DELETE ON public\.ds_observation_stage TO service_role;/);
    expect(sql).not.toMatch(/GRANT [^;]*(INSERT|UPDATE|DELETE)[^;]*ON public\.ds_observation TO service_role/);
  });

  it('seeds every chart unpublished with a bracketed title for the author to write', () => {
    const charts = [...seed.matchAll(/\('([a-z0-9-]+)', '(\[[^']*(?:''[^']*)*\])',/g)];
    expect(charts.length).toBe(13);
    for (const [, , title] of charts) expect(title.startsWith('[Finding:')).toBe(true);
    expect(seed).not.toMatch(/published\s*=\s*true/);
  });

  it('keeps the categorical palette to eight members per mix', () => {
    for (const m of seed.matchAll(/'\{(Coal[^}]*)\}'/g)) expect(m[1].split(',').length).toBeLessThanOrEqual(8);
  });
});
