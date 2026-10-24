import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const cli = require.resolve('@playwright/test/cli');
const shardCount = Number(process.argv[2] ?? 4);
if (!Number.isInteger(shardCount) || shardCount < 2 || shardCount > 8) {
  throw new Error('Indica entre dos y ocho particiones E2E.');
}

function listIds(shard) {
  const args = [cli, 'test', '--list', '--reporter=json'];
  if (shard !== undefined) args.push(`--shard=${shard}/${shardCount}`);
  const result = spawnSync(process.execPath, args, {
    cwd: frontend,
    env: { ...process.env, CI: '1' },
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`No se pudo enumerar E2E ${shard ?? 'completo'}: ${result.error?.message ?? result.stderr}`);
  }
  const report = JSON.parse(result.stdout);
  if (report.errors?.length) throw new Error('Playwright no pudo enumerar todas las pruebas.');
  const ids = [];
  function visit(suites) {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) ids.push(`${test.projectId}:${spec.id}`);
      }
      visit(suite.suites);
    }
  }
  visit(report.suites);
  if (!ids.length || new Set(ids).size !== ids.length) {
    throw new Error('La enumeración contiene pruebas vacías o duplicadas.');
  }
  return ids;
}

const expected = new Set(listIds());
const actual = new Set();
const counts = [];
for (let shard = 1; shard <= shardCount; shard += 1) {
  const ids = listIds(shard);
  counts.push(ids.length);
  for (const id of ids) {
    if (!expected.has(id) || actual.has(id)) {
      throw new Error(`La partición ${shard} introduce una prueba ajena o repetida.`);
    }
    actual.add(id);
  }
}
if (actual.size !== expected.size) throw new Error('Las particiones omiten pruebas de la suite completa.');
process.stdout.write(`${JSON.stringify({ total: expected.size, shards: counts, missing: 0, duplicates: 0 })}\n`);

