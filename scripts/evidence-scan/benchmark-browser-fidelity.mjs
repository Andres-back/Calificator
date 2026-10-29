// Frozen synthetic fixtures only. Writes a NEW local report directory; no APIs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium, webkit } = require('@playwright/test');
const base = new URL(process.argv[2]);
if (!['127.0.0.1', 'localhost'].includes(base.hostname) || base.protocol !== 'http:') throw new Error('Local synthetic server required.');
const fixtures = resolve(process.argv[3]);
const destination = resolve(process.argv[4]);
mkdirSync(destination); // Never overwrite an existing report or user images.
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
      const original = readFileSync(resolve(fixtures, `${item.id}.png`));
      const sourceSha256 = createHash('sha256').update(original).digest('hex');
      const image = original.toString('base64');
      try {
        const prepared = await page.evaluate(async (input) => {
          const path = '/e2e/fixtures/scanHarness.tsx';
          return await (await import(path)).fidelityPreviews(input);
        }, image);
        for (const result of prepared.results) {
          if (result.mime !== 'image/png') throw new Error('Lossless PNG preview required');
          const file = `${name}-${item.id}-${result.recipe.profile}.png`;
          writeFileSync(resolve(destination, file), Buffer.from(result.bytes), { flag: 'wx' });
          results.push({ case: item.id, browser: name, version: browser.version(), sourceSha256, proposal: prepared.proposal,
            quality: prepared.quality, recipe: result.recipe, preview: file, previewMime: result.mime });
        }
      } catch (error) {
        results.push({ case: item.id, browser: name, error: String(error.message).split('\n')[0] });
      }
    }
    await page.close();
  } finally { await browser.close(); }
}
writeFileSync(resolve(destination, 'report.json'), JSON.stringify({ syntheticOnly: true, measuredAt: new Date().toISOString(), results }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ cases: cases.length, profiles: 2, engines: 2, results: results.length,
  failures: results.filter((row) => row.error).length, destination }));
if (results.some((row) => row.error)) process.exitCode = 1;
