/**
 * The world stays out of a build without its flag (mega prompt rule 5).
 *
 * Runs after `vite build`. With VITE_WORLD_KAWASAN unset, the chain wrappers
 * render the schematic exactly as before and nothing imports the world, so
 * neither its marker text nor the poster's path may appear in dist/. With
 * the flag on, both must.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.cwd(), 'dist');
const MARKERS = ['Illustrative traffic; see the model for figures', 'poster-far.svg'];

function flagFromEnv() {
  if (process.env.VITE_WORLD_KAWASAN !== undefined) return process.env.VITE_WORLD_KAWASAN === 'true';
  for (const name of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    const file = path.join(process.cwd(), name);
    if (!fs.existsSync(file)) continue;
    const m = fs.readFileSync(file, 'utf8').match(/^VITE_WORLD_KAWASAN\s*=\s*"?([^"\n]*)"?/m);
    if (m) return m[1].trim() === 'true';
  }
  return false;
}
function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'world') yield* files(p); }
    else if (/\.(js|mjs|css|html)$/.test(entry.name)) yield p;
  }
}
if (!fs.existsSync(DIST)) { console.error('assert-world-flag: no dist/ — run vite build first.'); process.exit(1); }
const on = flagFromEnv();
const hits = [];
for (const f of files(path.join(DIST, 'assets'))) { const s = fs.readFileSync(f, 'utf8'); for (const m of MARKERS) if (s.includes(m)) hits.push(`${path.relative(process.cwd(), f)}: ${m}`); }
if (!on && hits.length) { console.error(`assert-world-flag: the world is in a build without VITE_WORLD_KAWASAN:\n  ${hits.join('\n  ')}`); process.exit(1); }
if (on && !hits.length) { console.error('assert-world-flag: VITE_WORLD_KAWASAN=true but no world chunk was emitted.'); process.exit(1); }
console.log(on ? `assert-world-flag: world build (VITE_WORLD_KAWASAN=true), ${hits.length} marker(s) found.` : 'assert-world-flag: no world code in dist/ (flag off).');
