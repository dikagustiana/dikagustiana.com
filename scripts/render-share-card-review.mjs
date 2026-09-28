/**
 * The share-card review set, for the design gate: one card per published
 * essay, read live through the build's own select, plus two stress cases.
 * Written to docs/review/share-cards/ with a manifest of what each picture
 * is. Not part of the build; run it again whenever the card's design changes.
 *
 * Usage: VITE_SUPABASE_PUBLISHABLE_KEY=… node scripts/render-share-card-review.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fetchPublishedEssays } from './lib/publishedEssays.mjs';
import { fitTitle, renderShareCard, shareCardLabel } from './lib/shareCard.mjs';

const OUT = path.resolve('docs/review/share-cards');
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!key) {
  console.error('render-share-card-review: set VITE_SUPABASE_PUBLISHABLE_KEY (the public key the site ships)');
  process.exit(1);
}

const STRESS = [
  {
    file: 'stress-hostile.png',
    what: 'every character the brief names as hostile: ’ “ ” — … & < >',
    title: 'The “Idea Guy” Is Back — He’s Brought Friends… & <Receipts>',
    label: 'Finance · Planning & Forecasting',
  },
  {
    file: 'stress-overlong.png',
    what: 'longer than three lines at every size: the 48 px step, cut at a word, closed with an ellipsis',
    title:
      'Why Every Finance Function Will Eventually Need a Driver Tree, a Scenario Engine, a Forecasting Discipline, and the Humility to Admit That the Model Is Not the Business It Describes',
    label: 'The Next Big Thing · Technology',
  },
];

const essays = await fetchPublishedEssays({ supabaseUrl: 'https://asypkbkiebjvvpimewfp.supabase.co', key });
const cards = [
  ...essays
    .map(e => ({ file: `${e.slug}.png`, what: 'published essay', slug: e.slug, updatedAt: e.updated_at, title: e.title, label: shareCardLabel(e) }))
    .sort((a, b) => a.file.localeCompare(b.file)),
  ...STRESS,
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const manifest = [];
for (const card of cards) {
  const png = await renderShareCard(card);
  const fitted = await fitTitle(card.title.replace(/\s+/g, ' ').trim());
  fs.writeFileSync(path.join(OUT, card.file), png);
  manifest.push({
    ...card,
    size: fitted.size,
    lines: fitted.lines,
    truncated: fitted.truncated,
    bytes: png.length,
    sha256: crypto.createHash('sha256').update(png).digest('hex'),
  });
  console.log(`${card.file}: ${fitted.size}px, ${fitted.lines} line(s)${fitted.truncated ? ', cut' : ''}, ${png.length} B`);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`render-share-card-review: ${manifest.length} card(s) in ${path.relative(process.cwd(), OUT)}`);
