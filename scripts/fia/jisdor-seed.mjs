/**
 * The fia.fx_rates seed (docs/prd/2026-10-fia-fixes item 7), worked from Bank
 * Indonesia's daily JISDOR USD/IDR fixings in data/fx/jisdor-usd-2024-07-to-2026-06.csv,
 * as BI's web service returned them (getSubKursJisdor3, one call per quarter,
 * read on 2026-10-25). `average` is the mean of the period's daily fixings,
 * `closing` the period's last fixing; 26Q3E and 26Q4E carry the 26Q2 average
 * (owner's decision, 2026-10-24).
 *
 *   node scripts/fia/jisdor-seed.mjs        prints the INSERT's VALUES rows
 */
import fs from 'node:fs';

const CSV = new URL('../../data/fx/jisdor-usd-2024-07-to-2026-06.csv', import.meta.url);
const SERVICE = 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD';
const DECIMALS = 2;

const rows = fs
  .readFileSync(CSV, 'utf8')
  .trim()
  .split('\n')
  .slice(1)
  .map((l) => {
    const [, date, rate] = l.split(',');
    return { date, rate: Number(rate) };
  });

const quarterOf = (d) => `${d.slice(2, 4)}Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}`;
const QUARTER_DATES = { 1: ['01-01', '03-31'], 2: ['04-01', '06-30'], 3: ['07-01', '09-30'], 4: ['10-01', '12-31'] };

const periods = [];
for (const id of ['24Q3', '24Q4', '25Q1', '25Q2', '25Q3', '25Q4', 'FY25', '26Q1', '26Q2']) {
  const pick = id === 'FY25' ? rows.filter((r) => r.date.startsWith('2025-')) : rows.filter((r) => quarterOf(r.date) === id);
  const year = id === 'FY25' ? '2025' : `20${id.slice(0, 2)}`;
  const [from, to] = id === 'FY25' ? ['01-01', '12-31'] : QUARTER_DATES[id.slice(3)];
  const url = `${SERVICE}&startDate=${year}-${from}&endDate=${year}-${to}`;
  const average = pick.reduce((s, r) => s + r.rate, 0) / pick.length;
  const last = pick[pick.length - 1];
  periods.push({ id, average, closing: last.rate, n: pick.length, first: pick[0].date, last: last.date, url });
}

const sql = (s) => `'${s.replace(/'/g, "''")}'`;
const lines = [];
for (const p of periods) {
  lines.push(`(${sql(p.id)}, 'USD', 'IDR', ${p.average.toFixed(DECIMALS)}, 'average', ${sql(`BI JISDOR, mean of ${p.n} daily fixings, ${p.first} to ${p.last}`)}, ${sql(p.url)})`);
  lines.push(`(${sql(p.id)}, 'USD', 'IDR', ${p.closing.toFixed(DECIMALS)}, 'closing', ${sql(`BI JISDOR, last fixing of the period, ${p.last}`)}, ${sql(p.url)})`);
}
const q2 = periods.find((p) => p.id === '26Q2');
for (const f of ['26Q3E', '26Q4E']) {
  lines.push(`(${sql(f)}, 'USD', 'IDR', ${q2.average.toFixed(DECIMALS)}, 'average', ${sql('Forecast period: the BI JISDOR 26Q2 average carried forward')}, ${sql(q2.url)})`);
}
console.log(lines.map((l) => `  ${l}`).join(',\n') + ';');
