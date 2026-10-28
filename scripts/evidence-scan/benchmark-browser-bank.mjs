// Synthetic-only benchmark. Requires the local Vite server and frozen exported fixtures.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium, webkit } = require('@playwright/test');
const base = new URL(process.argv[2]);
if (!['127.0.0.1', 'localhost'].includes(base.hostname) || base.protocol !== 'http:') throw new Error('Local synthetic server required.');
const fixtureDirectory = resolve(process.argv[3]);
const cases = JSON.parse(readFileSync(new URL('../../backend/tests/fixtures/evidence_scan/cases.json', import.meta.url), 'utf8')).cases;
const results = [];
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin) return route.abort();
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 401, json: { detail: 'Synthetic only' } });
      return route.continue();
    });
    await page.goto(new URL('/login', base).href);
    for (const item of cases) {
      const image = readFileSync(resolve(fixtureDirectory, `${item.id}.png`)).toString('base64');
      const started = performance.now();
      try {
        const result = await page.evaluate(async (base64) => {
          const path = '/e2e/fixtures/scanHarness.tsx';
          return await (await import(path)).probe(base64);
        }, image);
        results.push({ case: item.id, browser: name, version: browser.version(), automaticSubset: item.automatic_subset, ...result, totalMs: Math.round(performance.now() - started) });
      } catch (error) {
        results.push({ case: item.id, browser: name, automaticSubset: item.automatic_subset, error: String(error.message).split('\n')[0] });
      }
    }
    await page.close();
  } finally { await browser.close(); }
}
writeFileSync(resolve(process.argv[4]), JSON.stringify({ syntheticOnly: true, measuredAt: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify(['chromium', 'webkit'].map((browser) => {
  const items = results.filter((item) => item.browser === browser);
  return { browser, cases: items.length, failures: items.filter((item) => item.error).length, proposals: items.filter((item) => item.quad).length, automaticSubsetProposals: items.filter((item) => item.automaticSubset && item.quad).length };
})));
