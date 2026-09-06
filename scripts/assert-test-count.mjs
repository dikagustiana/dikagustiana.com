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

const MIN_TESTS = 367; // 370 after the two-control rework (two readings on every joint, six layers, the shifts); slack of 3, not 30.

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
