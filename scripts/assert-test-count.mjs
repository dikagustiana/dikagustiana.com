/**
 * Guard against the silent-shrink failure class: a test file that throws
 * during IMPORT contributes zero tests — the total falls and, if anything
 * swallows vitest's exit code (a pipe, a reporter quirk, a future config
 * change), nothing reports red. Same class as `tsc --noEmit` compiling zero
 * files. This script reads vitest's JSON report and fails the build when
 * the suite has shrunk below the known floor or any suite failed.
 *
 * Raise MIN_TESTS when tests are added; lower it ONLY in the same commit
 * that deliberately deletes tests, with the deletion named in the message.
 */
import fs from 'node:fs';

const MIN_TESTS = 921; // 925 after the October 2026 review (docs/review/claude-audit.md): +19 for the autosave write path, +1 for the manual-save race, +10 for canonicalPath parity, +2 for the auth failure path, and -24 removed with the dead code they tested (a38f0dd); floor is actual − 4. Before that, 917 with the Finance in Action v3.1 preview suites (190: the contract and fixture rules, the engine and graph, the index, the model page, unit economics, the lens and edits, links, the xlsx export and the section-wide checks); floor is actual − 4. Before that, 727 with the Capital in Motion route and gate suites (34: the real route table and its ranking, the legacy redirects, 21 condition pages with the case gate closed, and the gate opened); floor is actual − 4. Before that, 693 with WO-R05 merged over the auth tab-focus fix (the floor is actual − 4 for whichever merged second): WO-R05's share-card renderer (10: size, determinism, weight, glyph coverage, label, the title held inside the box on the pixels), one og:image formula for the raw and the hydrated page (8), and the sitemap and feed (7); the tab-focus regression suite (2), a same-user auth event keeps the admin page mounted and a sign-out still leaves it. 666 after the growth-and-link-preview pass (PR #35): the link-preview resolver's SSRF and resolution suite (76), the link card through publish and on the page, the link-card dialog and its client, Growth's nav route, and the markdown attribution; slack of 4, not 40.

const reportPath = process.argv[2] ?? 'vitest-report.json';
if (!fs.existsSync(reportPath)) {
  console.error(`assert-test-count: no report at ${reportPath} — did vitest run with --reporter=json?`);
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const total = report.numTotalTests ?? 0;
const failedSuites = report.numFailedTestSuites ?? 0;
const failedTests = report.numFailedTests ?? 0;

console.log(
  `assert-test-count: ${total} tests, ${failedTests} failed, ${failedSuites} failed suite(s) (floor ${MIN_TESTS})`,
);

if (failedSuites > 0 || failedTests > 0) {
  console.error('assert-test-count: failing tests or suites — red.');
  process.exit(1);
}
if (total < MIN_TESTS) {
  console.error(
    `assert-test-count: test count ${total} fell below the floor ${MIN_TESTS}. ` +
      'A suite that fails to IMPORT contributes zero tests without failing anything — find the missing file. ' +
      'If tests were deliberately deleted, lower MIN_TESTS in the same commit and name them.',
  );
  process.exit(1);
}
console.log('assert-test-count: ok');
