import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('..', import.meta.url));
const allowed = ['README.md', 'DESIGN.md', 'web', 'dist', 'scripts', 'docs', 'artifacts'];
const files = [];
function walk(path) {
  const entry = statSync(path);
  if (entry.isDirectory()) {
    for (const name of readdirSync(path)) {
      assert.ok(!['node_modules', '.git', '.github', '.cache', 'npm-cache'].includes(name), `Unexpected generated/protected directory: ${path}/${name}`);
      walk(resolve(path, name));
    }
  } else {
    const name = relative(root, path);
    assert.ok(!/\.env(?:\.|$)|\.(?:tgz|zip|map)$/.test(name), `Unexpected packaging artifact: ${name}`);
    if (name !== 'artifacts/delivery.json') files.push({ path: name, bytes: entry.size });
  }
}
for (const path of allowed) walk(resolve(root, path));
const exportFiles = files.filter(file => file.path.startsWith('dist/')).map(file => ({ ...file, sha256: createHash('sha256').update(readFileSync(resolve(root, file.path))).digest('hex') }));
const html = readFileSync(resolve(root, 'dist/index.html'), 'utf8');
const assetPaths = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1]);
assert.ok(assetPaths.length >= 3);
for (const asset of assetPaths) {
  assert.ok(asset.startsWith('./'), `Nonrelative asset: ${asset}`);
  assert.ok(statSync(resolve(root, 'dist', asset)).isFile(), `Missing asset: ${asset}`);
}
const total = files.reduce((sum, file) => sum + file.bytes, 0);
// A conservative raw-tree budget leaves substantial room for Git metadata and the report.
assert.ok(total < 4 * 1024 * 1024, `Deliverable tree exceeds conservative 4 MiB budget: ${total}`);
const report = {
  checkedAt: new Date().toISOString(),
  submissionLimitBytes: 8388608,
  conservativeTreeLimitBytes: 4194304,
  measuredPaths: allowed,
  fileCountExcludingThisReport: files.length,
  rawFileBytesExcludingThisReport: total,
  distributionBytes: exportFiles.reduce((sum, file) => sum + file.bytes, 0),
  assetPaths,
  exportFiles,
  notes: 'Measured complete declared deliverable paths, excluding only this report. Dependencies/caches live in disposable test/scratch and are not submitted. No Git metadata was accessed or modified; the network worker creates the final Git submission bundle.',
};
writeFileSync(resolve(root, 'artifacts/delivery.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
