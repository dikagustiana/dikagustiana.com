/**
 * Synthetic data never reaches production (Finance in Action brief v3.1,
 * constraint 3).
 *
 * Runs after `vite build`. With VITE_FIA_PREVIEW unset, the preview viewer and
 * its SYNTHETIC fixtures are compiled out (vite.config.ts defines
 * __FIA_PREVIEW__ as false), so the marker must not appear anywhere in dist/.
 * If it does, something imported a fixture outside the flag, and the build
 * fails here rather than shipping it.
 *
 * With the flag on, the marker is expected (it is how the preview labels its
 * figures), but a Vercel production build must never carry the flag: that
 * fails too.
 *
 * VITE_FIA_LIVE=true (PRD "FSRE publish path" §6.3 A) is the production path:
 * the viewer over the published packages only, with no fixture in the
 * bundle. The viewer itself carries the word SYNTHETIC as a label (the
 * badge, the provenance note, the contract rule that a synthetic package
 * says so), so the bare marker cannot prove a live build clean. A live build
 * is checked for the FIXTURES THEMSELVES: every value that only a fixture
 * file holds (each package's version and content hash, the synthetic
 * sub-industry codes and link ids, read from the fixture files at check
 * time) must be absent from dist/, and so must a chunk of the preview page
 * modules. The two flags together are refused outright, on every
 * environment: a live build that carries fixtures is not a build anyone meant.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.cwd(), 'dist');
const MARK = 'SYNTHETIC';
const FIXTURES = path.resolve(process.cwd(), 'src/data/finance-in-action/fixtures');
/** The preview page modules, whose chunks a live build must not emit. */
const PREVIEW_CHUNKS = /^(FiaIndexPage|FiaModelRoute)-/;

/** Every value only a fixture file holds: a build that carries one carries the fixture. */
function fixtureMarkers() {
  const markers = [];
  for (const name of fs.readdirSync(FIXTURES)) {
    if (!name.endsWith('.SYNTHETIC.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));
    if (data?.meta?.version) markers.push(`${name}: version ${data.meta.version}`, data.meta.version);
    if (data?.meta?.contentHash) markers.push(`${name}: content hash`, data.meta.contentHash);
    if (Array.isArray(data)) for (const entry of data) {
      if (entry?.code) markers.push(`${name}: sub-industry ${entry.code}`, entry.code);
      if (entry?.id) markers.push(`${name}: link ${entry.id}`, entry.id);
    }
  }
  const out = [];
  for (let i = 0; i < markers.length; i += 2) out.push({ label: markers[i], value: markers[i + 1] });
  if (!out.length) throw new Error(`assert-no-synthetic: no fixture marker found under ${FIXTURES}; the check would be inert.`);
  return out;
}

function flagFromEnv(name) {
  if (process.env[name] !== undefined) return process.env[name] === 'true';
  for (const file of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    const m = fs.readFileSync(full, 'utf8').match(new RegExp(`^${name}\\s*=\\s*"?([^"\\n]*)"?`, 'm'));
    if (m) return m[1].trim() === 'true';
  }
  return false;
}

function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(p);
    else if (/\.(js|mjs|css|html|json|map)$/.test(entry.name)) yield p;
  }
}

if (!fs.existsSync(DIST)) {
  console.error('assert-no-synthetic: no dist/ — run vite build first.');
  process.exit(1);
}

const preview = flagFromEnv('VITE_FIA_PREVIEW');
const live = flagFromEnv('VITE_FIA_LIVE');

if (preview && live) {
  console.error('assert-no-synthetic: VITE_FIA_LIVE=true together with VITE_FIA_PREVIEW=true. The live section carries no fixture; unset one of them.');
  process.exit(1);
}

if (preview && process.env.VERCEL_ENV === 'production') {
  console.error('assert-no-synthetic: VITE_FIA_PREVIEW=true on a Vercel production build. The preview carries SYNTHETIC fixtures; unset the flag.');
  process.exit(1);
}

if (preview) {
  console.log('assert-no-synthetic: preview build (VITE_FIA_PREVIEW=true); SYNTHETIC fixtures are expected and allowed.');
  process.exit(0);
}

if (live) {
  const markers = fixtureMarkers();
  const carried = [];
  const chunks = [];
  for (const file of files(DIST)) {
    if (PREVIEW_CHUNKS.test(path.basename(file))) chunks.push(path.relative(process.cwd(), file));
    const text = fs.readFileSync(file, 'utf8');
    for (const marker of markers) if (text.includes(marker.value)) carried.push(`${path.relative(process.cwd(), file)} carries ${marker.label}`);
  }
  if (chunks.length || carried.length) {
    console.error(`assert-no-synthetic: a live build (VITE_FIA_LIVE=true) carries a fixture:\n  ${[...chunks.map((c) => `${c} is a preview page chunk`), ...carried].join('\n  ')}`);
    process.exit(1);
  }
  console.log(`assert-no-synthetic: live build; none of ${markers.length} fixture values and no preview page chunk in dist/.`);
  process.exit(0);
}

const hits = [];
for (const file of files(DIST)) {
  if (fs.readFileSync(file, 'utf8').includes(MARK)) hits.push(path.relative(process.cwd(), file));
}
if (hits.length) {
  console.error(`assert-no-synthetic: "${MARK}" found in a build without the preview flag:\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log(`assert-no-synthetic: no "${MARK}" in dist/ (preview flag off).`);
