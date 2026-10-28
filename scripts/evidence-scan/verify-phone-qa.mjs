// Compiled QA smoke only, not a claim of physical-camera verification.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { qaHandler } from './serve-phone-qa.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(resolve(root, 'frontend/package.json'));
const { chromium, webkit } = require('@playwright/test');
const directory = resolve(root, 'output/playwright/spec131-phone-qa');
const server = createServer(qaHandler(directory));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const results = [];
try {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const violations = [], externalOrWrite = [], errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.exposeFunction('reportViolation', (directive) => violations.push(directive));
      await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (event) => window.reportViolation({ directive: event.effectiveDirective, blocked: event.blockedURI.split(':')[0] })));
      await page.route('**/*', (route) => {
        const request = route.request();
        if (new URL(request.url()).origin !== base || request.method() !== 'GET' || new URL(request.url()).pathname.startsWith('/api/')) {
          externalOrWrite.push('unexpected-network'); return route.abort();
        }
        return route.continue();
      });
      await page.goto(base);
      await page.getByRole('heading', { name: 'Prueba privada del escáner' }).waitFor();
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: /^Subir fotos/ }).click();
      await (await chooser).setFiles({ name: 'sintetica.png', mimeType: 'image/png', buffer: readFileSync(resolve(root, 'frontend/e2e/fixtures/scan-evidence.png')) });
      const editor = page.getByRole('dialog', { name: 'Preparar hoja 1' });
      await editor.getByRole('button', { name: 'Usar esta preparación' }).click();
      await page.getByRole('button', { name: 'Ampliar evidencia' }).click();
      const viewer = page.getByRole('dialog', { name: 'Hoja de prueba local' });
      await viewer.getByRole('button', { name: 'Volver a la respuesta', exact: true }).click();
      assert.equal(await page.getByRole('textbox', { name: /Puntaje de prueba/ }).inputValue(), '0.25');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      mkdirSync(resolve(root, 'output/playwright/spec131-phone-qa-smoke'), { recursive: true });
      await page.screenshot({ path: resolve(root, `output/playwright/spec131-phone-qa-smoke/${name}.png`), fullPage: true });
      assert.deepEqual(externalOrWrite, []); assert.deepEqual(violations, []); assert.deepEqual(errors, []);
      results.push({ browser: name, secureLocalhost: await page.evaluate(() => isSecureContext), noNetworkOrWrites: true, physicalPhone: false });
    } finally { await browser.close(); }
  }
  console.log(JSON.stringify(results));
} finally { await new Promise((resolve) => server.close(resolve)); }
