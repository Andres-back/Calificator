import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { qaHandler, permittedHost } from './serve-phone-qa.mjs';

test('static QA rejects uploads, traversal, unknown files and global host; worker CSP alone allows WASM', async () => {
  assert.equal(permittedHost('0.0.0.0', true), false);
  assert.equal(permittedHost('192.168.1.5', false), false);
  assert.equal(permittedHost('192.168.1.5', true), true);
  assert.equal(permittedHost('8.8.8.8', true), false);
  const directory = mkdtempSync(join(tmpdir(), 'spec131-static-test-'));
  mkdirSync(join(directory, 'assets'));
  writeFileSync(join(directory, 'qa-only.json'), JSON.stringify({ purpose: 'spec131-phone-qa', noApi: true }));
  writeFileSync(join(directory, 'index.html'), '<title>Synthetic test</title>');
  writeFileSync(join(directory, 'assets/evidenceScan.worker-test.js'), 'postMessage(1)');
  writeFileSync(join(directory, '.env'), 'synthetic-forbidden-test');
  const server = createServer(qaHandler(directory));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await fetch(base);
    assert.equal(home.status, 200);
    assert.doesNotMatch(home.headers.get('content-security-policy'), /wasm-unsafe-eval|unsafe-eval/);
    assert.match(home.headers.get('content-security-policy'), /connect-src 'self'/);
    const worker = await fetch(`${base}/assets/evidenceScan.worker-test.js`);
    assert.equal(worker.status, 200);
    assert.match(worker.headers.get('content-security-policy'), /'wasm-unsafe-eval'/);
    for (const path of ['/api/test', '/.env', '/%2e%2e/.env', '/assets/missing.js', '/qa-only.json']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
    assert.equal((await fetch(base, { method: 'POST', body: 'must not be saved' })).status, 405);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
