// Stage dependencies in disposable scratch space; only source, lockfile and dist ship.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const stage = resolve(root, 'test/scratch/build');
const offline = process.argv.includes('--offline');
mkdirSync(stage, { recursive: true });
for (const name of ['src', 'public', 'index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts']) {
  rmSync(resolve(stage, name), { recursive: true, force: true });
  cpSync(resolve(root, 'web', name), resolve(stage, name), { recursive: true });
}
for (const args of [['ci', ...(offline ? ['--offline'] : []), '--cache', resolve(root, 'test/scratch/npm-cache'), '--no-audit', '--no-fund'], ['run', 'typecheck'], ['run', 'build']]) {
  execFileSync('npm', args, { cwd: stage, stdio: 'inherit' });
}
rmSync(resolve(root, 'dist'), { recursive: true, force: true });
cpSync(resolve(root, 'test/scratch/dist'), resolve(root, 'dist'), { recursive: true });
console.log('Typecheck passed. Production export written to dist/.');
