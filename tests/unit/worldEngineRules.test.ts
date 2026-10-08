/**
 * Two rules of the engine's code, checked on the files themselves
 * (mega prompt §4.5 and §14):
 *
 *   - no colour is written in scene code: a hex literal may appear only in
 *     the one mapping file, src/world/engine/theme.ts, where the night
 *     palette lives; everything else reads the site's tokens through it;
 *   - nothing in the engine calls Math.random(): every draw goes through the
 *     instance's seeded generator, so a seed replays the same world.
 *
 * Files still carrying Factory Yard's `// @ts-nocheck` are vendored and not
 * yet wired (the check script lists them); the rules apply to them too, so
 * a pending file that breaks one is named here before it is adapted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = ['src/world/engine', 'src/world/interiors', 'src/world/world'].map((d) => path.resolve(__dirname, '../..', d));
const MAPPING_FILE = path.resolve(__dirname, '../../src/world/engine/theme.ts');

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) yield* walk(p);
    else if (p.endsWith('.ts')) yield p;
  }
}
const files = ROOTS.flatMap((r) => [...walk(r)]);
// comment lines may name the rule they describe; code lines may not break it
const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);
const hits = (re: RegExp, skip: (f: string) => boolean = () => false) =>
  files.filter((f) => !skip(f)).flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (!isComment(line) && re.test(line) ? [`${path.relative(process.cwd(), f)}:${i + 1}`] : [])));

describe('engine code rules', () => {
  it('reads every colour through the mapping file: no hex outside theme.ts', () => {
    // a hex colour: # then 3, 4, 6 or 8 hex digits, not inside a word (a CSS id or an anchor would not appear in scene code anyway)
    expect(hits(/(^|[^\w&])#[0-9a-fA-F]{3,8}\b/, (f) => f === MAPPING_FILE)).toEqual([]);
  });

  it('never calls Math.random()', () => {
    expect(hits(/Math\.random\s*\(/)).toEqual([]);
  });

  it('never finds DOM elements by id (the shell passes the container)', () => {
    expect(hits(/getElementById|querySelector\s*\(\s*['"]#/)).toEqual([]);
  });
});
