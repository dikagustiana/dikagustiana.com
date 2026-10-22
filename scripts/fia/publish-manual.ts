/**
 * The manual channel for Finance in Action models (docs/company-models/two-gates,
 * PRD R4): check a package the way the site checks it, then stage, publish or
 * withdraw it in fia.manual_release. The owner's runbook, with every command:
 * docs/company-models/two-gates/RUNBOOK.md.
 *
 *   npx vite-node scripts/fia/publish-manual.ts --check   <file.json>
 *   npx vite-node scripts/fia/publish-manual.ts --stage   <file.json> [--note "…"]
 *   npx vite-node scripts/fia/publish-manual.ts --publish <file.json> --by "Dika Gustiana Irawan" [--note "…"]
 *   npx vite-node scripts/fia/publish-manual.ts --withdraw <TICKER> <VERSION>
 *   npx vite-node scripts/fia/publish-manual.ts --list
 *
 * --check never connects. The others read the connection from .env.local
 * (scripts/fia/db.ts) and connect only once the check is clean. Exit 0 done,
 * 1 refused, 2 not understood.
 */
import fs from 'node:fs';
import { connect, SetupError } from './db';
import { run, type Db } from './manual-release';

let secrets: string[] = [];
try {
  const code = await run(process.argv.slice(2), {
    connect: async (): Promise<Db> => {
      const c = await connect();
      secrets = c.secrets;
      return c.client;
    },
    readFile: (file) => fs.readFileSync(file, 'utf8'),
    out: (line) => console.log(line),
  });
  process.exit(code);
} catch (e) {
  let message = e instanceof SetupError ? e.message : e instanceof Error ? e.message : String(e);
  for (const s of secrets) message = message.split(s).join('***');
  console.log(`publish-manual: ${message}`);
  process.exit(1);
}
