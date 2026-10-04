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
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.cwd(), 'dist');
const MARK = 'SYNTHETIC';

function flagFromEnv() {
  if (process.env.VITE_FIA_PREVIEW !== undefined) return process.env.VITE_FIA_PREVIEW === 'true';
  for (const name of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    const file = path.join(process.cwd(), name);
    if (!fs.existsSync(file)) continue;
    const m = fs.readFileSync(file, 'utf8').match(/^VITE_FIA_PREVIEW\s*=\s*"?([^"\n]*)"?/m);
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

const preview = flagFromEnv();

if (preview && process.env.VERCEL_ENV === 'production') {
  console.error('assert-no-synthetic: VITE_FIA_PREVIEW=true on a Vercel production build. The preview carries SYNTHETIC fixtures; unset the flag.');
  process.exit(1);
}

if (preview) {
  console.log('assert-no-synthetic: preview build (VITE_FIA_PREVIEW=true); SYNTHETIC fixtures are expected and allowed.');
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
