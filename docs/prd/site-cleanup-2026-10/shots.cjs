// usage: node shots.cjs <baseURL> <outDir> <label>
const { chromium } = require('playwright');
const [base, out, label] = process.argv.slice(2);
const fs = require('fs'); fs.mkdirSync(out, { recursive: true });
const pages = process.env.MORE ? [
  ['finance', '/finance'],
  ['finance-in-motion', '/finance/capital-allocation'],
  ['finance-in-action', '/finance/finance-in-action'],
  ['development-finance', '/development-finance'],
  ['green-transition', '/green-transition'],
  ['next-big-thing', '/the-next-big-thing'],
  ['consolidation-topic', '/accounting/consolidation/psak-principles'],
] : [
  ['consolidated', '/accounting/consolidated-reporting'],
  ['books', '/books-academia'],
  ['critical-thinking', '/critical-thinking-research'],
  ['accounting', '/accounting'],
  ['statutory', '/accounting/statutory-reporting'],
  ['ct-phase', '/critical-thinking-research/clarify'],
];
const widths = [1440, 1920, 2560, 390];
(async () => {
  const b = await chromium.launch();
  const report = [];
  for (const w of widths) {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
    const p = await ctx.newPage();
    if (label === 'after') {
      const shelves = [{ id: 's1', slug: 'corporate-finance', name: 'Corporate Finance', sort_order: 0 }, { id: 's2', slug: 'accounting', name: 'Accounting', sort_order: 1 }, { id: 's3', slug: 'green-transition', name: 'Green Transition', sort_order: 2 }];
      const b = (o) => ({ author: null, year: null, purchase_url: null, license_note: null, filepath: null, filename: null, mime_type: null, size_bytes: null, cover_path: null, synopsis_json: null, synopsis_html: null, synopsis_excerpt: null, published: true, deleted_at: null, sort_order: 0, ...o });
      const books = [
        b({ id: 'b1', slug: 'open-corporate-finance', title: 'Open Corporate Finance', author: 'Sample Author', year: 2023, shelf_id: 's1', access: 'free', license_note: 'CC BY 4.0', filepath: 'files/x/1.pdf', synopsis_excerpt: 'Sample synopsis: an open textbook on valuation, capital structure and payout, used for the worked examples on this site.', synopsis_html: '<p>Sample synopsis.</p>' }),
        b({ id: 'b2', slug: 'valuation', title: 'Valuation: Measuring and Managing the Value of Companies', author: 'Sample Author', year: 2020, shelf_id: 's1', access: 'paid', purchase_url: 'https://example.com', sort_order: 1, synopsis_excerpt: 'Sample synopsis for a paid book.' }),
        b({ id: 'b3', slug: 'corp-fin-3', title: 'Sample Book Three', shelf_id: 's1', access: 'paid', purchase_url: 'https://example.com', sort_order: 2 }),
        b({ id: 'b4', slug: 'corp-fin-4', title: 'Sample Book Four', shelf_id: 's1', access: 'free', license_note: 'CC BY 4.0', filepath: 'files/y/1.pdf', sort_order: 3 }),
        b({ id: 'b5', slug: 'adv-acc', title: 'Advanced Accounting', shelf_id: 's2', access: 'paid', purchase_url: 'https://example.com' }),
        b({ id: 'b6', slug: 'gt-1', title: 'Energy Transition Sample', shelf_id: 's3', access: 'free', license_note: 'CC BY 4.0', filepath: 'files/z/1.pdf' }),
      ];
      await p.route('**/rest/v1/book_shelves*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(shelves) }));
      await p.route('**/rest/v1/books_uploads*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(books) }));
    }
    for (const [name, path] of pages) {
      await p.goto(base + path, { waitUntil: 'networkidle' });
      await p.waitForTimeout(800);
      const m = await p.evaluate(() => {
        const h1 = document.querySelector('main h1');
        const vw = document.documentElement.clientWidth;
        let col = h1; while (col && col.parentElement && col.parentElement.tagName !== 'MAIN' && col.getBoundingClientRect().width < vw * 0.98 && !/max-w|container/.test(col.className)) col = col.parentElement;
        const r = col ? col.getBoundingClientRect() : null;
        const crumb = document.querySelector('div.border-b.py-3 nav');
        const h = h1 ? h1.getBoundingClientRect() : null;
        const cs = col ? getComputedStyle(col) : null;
        const textLeft = r ? r.left + parseFloat(cs.paddingLeft) : null;
        const textRight = r ? r.right - parseFloat(cs.paddingRight) : null;
        return { vw, colLeft: r && Math.round(textLeft), colRight: r && Math.round(textRight), centreOff: r && Math.round(((textLeft + textRight) / 2 - vw / 2) * 10) / 10, h1Left: h && Math.round(h.left), crumbLeft: crumb && Math.round(crumb.getBoundingClientRect().left) };
      });
      report.push({ label, name, w, ...m });
      await p.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: false });
      if (name === 'books' && label === 'after') {
        const card = p.locator('[data-book]').first();
        if (await card.count()) { await card.click(); await p.waitForTimeout(600); await p.screenshot({ path: `${out}/books-dialog-${w}.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
      }
      if (name === 'consolidated') {
        await p.locator('[data-workbook-viewer]').scrollIntoViewIfNeeded();
        await p.waitForTimeout(1500);
        await p.screenshot({ path: `${out}/consolidated-viewer-${w}.png` });
        const btn = p.getByRole('button', { name: /full screen/i }).first();
        if (await btn.count()) {
          await btn.click(); await p.waitForTimeout(800);
          await p.screenshot({ path: `${out}/consolidated-fullscreen-${w}.png` });
          await p.keyboard.press('Escape'); await p.waitForTimeout(300);
          if (await p.evaluate(() => !!document.fullscreenElement)) await p.evaluate(() => document.exitFullscreen());
        }
      }
    }
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(`${out}/measure-${label}${process.env.MORE ? '-more' : ''}.json`, JSON.stringify(report, null, 1));
  for (const r of report) console.log(r.name.padEnd(18), String(r.w).padEnd(5), 'col', r.colLeft, r.colRight, 'off', r.centreOff, 'h1', r.h1Left, 'crumb', r.crumbLeft);
})();
