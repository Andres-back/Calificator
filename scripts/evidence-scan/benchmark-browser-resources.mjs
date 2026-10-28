// Synthetic-only 16MP cold/warm probe. Never visits production or uploads a photo.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium, webkit } = require('@playwright/test');
const base = new URL(process.argv[2]);
if (!['127.0.0.1', 'localhost'].includes(base.hostname) || base.protocol !== 'http:') throw new Error('Local synthetic server required.');

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
    const metrics = await page.evaluate(async () => {
      const modulePath = '/src/components/evidence/evidenceScan.ts';
      const { EvidenceScanner } = await import(modulePath);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 4000;
      const context = canvas.getContext('2d');
      context.fillStyle = 'white'; context.fillRect(0, 0, 4000, 4000);
      context.fillStyle = '#464646'; context.font = '48px sans-serif';
      for (let row = 80; row < 3900; row += 90) context.fillText('SYNTHETIC -0.5 + 1.25 = 0.75 | A B (X) D', 80, row);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      canvas.width = canvas.height = 1;
      if (!blob) throw new Error('Synthetic source encoding failed');
      const file = new File([blob], 'synthetic-only.jpg', { type: 'image/jpeg' });
      const scanner = new EvidenceScanner();
      const result = { pixels: 16_000_000, sourceBytes: file.size, coldDetectMs: null, profiles: [], failures: [] };
      try {
        const started = performance.now();
        await scanner.run(file, { mode: 'detect' });
        result.coldDetectMs = Math.round(performance.now() - started);
        for (const profile of ['natural', 'lectura_suave']) {
          const times = [];
          for (let iteration = 0; iteration < 20; iteration++) {
            const before = performance.now();
            const preview = await scanner.run(file, { mode: 'preview', recipe: {
              width: 4000, height: 4000, corners: [[0, 0], [1, 0], [1, 1], [0, 1]], rotation: 0,
              profile, coordinate_frame: 'exif_oriented_source',
            } });
            if (!preview.preview?.size) throw new Error('Missing prepared preview');
            times.push(Math.round(performance.now() - before));
          }
          const sorted = [...times].sort((a, b) => a - b);
          result.profiles.push({ profile, runs: times.length, timesMs: times, p50Ms: sorted[9], p95Ms: sorted[18], maxMs: sorted[19] });
        }
      } catch (error) { result.failures.push(String(error.message).split('\n')[0]); }
      finally { scanner.dispose(); }
      return result;
    });
    results.push({ browser: name, version: browser.version(), ...metrics });
    await page.close();
  } finally { await browser.close(); }
}
console.log(JSON.stringify({ syntheticOnly: true, realAiCalls: 0, platform: process.platform,
  physicalPhoneTest: false, nativeBrowserMemoryMeasured: false, results }));
if (results.some((result) => result.failures.length)) process.exitCode = 1;
