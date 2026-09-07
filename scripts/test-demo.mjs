// munote-landing/scripts/test-demo.mjs
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['--test', 'demo/tests/**/*.test.mjs'], { stdio: 'inherit', cwd: new URL('..', import.meta.url).pathname });
process.exit(r.status ?? 1);
