import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const bytes = readFileSync(new URL('./fixtures/scan-evidence.png', import.meta.url));
test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page, context }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, json: { detail: 'Prueba sintética sin sesión' } }));
  await context.route('**/src/components/evidence/evidenceScan.worker.ts*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self';" } });
  });
  await page.goto('/login');
});

test('131 Worker real detecta y prepara sin red externa ni eval JS', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => { if (new URL(request.url()).origin !== new URL(page.url()).origin) external.push(request.url()); });
  const result = await page.evaluate(async (base64) => {
    const path = '/e2e/fixtures/scanHarness.tsx';
    const harness = await import(/* @vite-ignore */ path);
    return await harness.probe(base64);
  }, bytes.toString('base64'));
  expect(result.width).toBe(800); expect(result.height).toBe(1100);
  expect(result.quad).not.toBeNull();
  expect(result.quad[0][0]).toBeCloseTo(0.1, 1); expect(result.quad[0][1]).toBeCloseTo(0.09, 1);
  expect(result.dimensions[0]).toBeLessThanOrEqual(1600); expect(result.previewBytes).toBeGreaterThan(1000);
  expect(result.previewMime).toBe('image/png');
  expect(external).toEqual([]);
  console.log(JSON.stringify({ syntheticScan: result }));
});

for (const width of [360, 390, 768, 1440]) for (const theme of ['light', 'dark']) test(`131 escáner revisable ${width}px ${theme} conserva original y revisión explícita`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await page.evaluate((dark) => { document.documentElement.classList.toggle('dark', dark); }, theme === 'dark');
  const writes: string[] = [];
  page.on('request', (request) => { if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones|jobs)\//.test(request.url())) writes.push(request.url()); });
  await page.evaluate(async () => { const path = '/e2e/fixtures/scanHarness.tsx'; (await import(/* @vite-ignore */ path)).mount(); });
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /^Subir fotos/ }).click();
  await (await chooser).setFiles({ name: 'hoja.png', mimeType: 'image/png', buffer: bytes });
  const editor = page.getByRole('dialog', { name: 'Preparar hoja 1' });
  await expect(editor).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Usar esta preparación' })).toBeEnabled();
  // Framer can still be settling after the Worker preview is ready.
  await expect.poll(async () => {
    const box = await editor.boundingBox();
    return box ? Math.max(Math.abs(box.x), Math.abs(box.y), Math.abs(box.width-width), Math.abs(box.height-900)) : Infinity;
  }).toBeLessThan(.2);
  for (let corner = 1; corner <= 4; corner++) await expect(editor.getByRole('button', { name: new RegExp(`^Esquina ${corner},`) })).toBeInViewport();
  await expect(editor.getByRole('button', { name: 'Usar esta preparación' })).toHaveCSS('background-color', 'rgb(79, 70, 229)');
  if (width === 390) {
    await page.evaluate(() => { document.documentElement.style.fontSize = '150%'; });
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(editor.getByRole('button', { name: 'Usar esta preparación' })).toBeInViewport();
  }
  await expect(page.getByLabel('Decisiones del paquete')).toHaveText('pending');
  await editor.getByRole('button', { name: 'Esquina 1, superior izquierda' }).focus();
  await page.keyboard.press('ArrowRight');
  await editor.getByRole('button', { name: 'Girar', exact: true }).click();
  if (width < 1024) await editor.getByRole('button', { name: 'Ver preparada' }).click();
  await editor.getByRole('combobox', { name: 'Aspecto de la hoja preparada' }).selectOption('lectura_suave');
  await expect(editor.getByRole('img', { name: 'Vista previa de la hoja preparada' })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Usar esta preparación' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('scan-editor.png') });
  await editor.getByRole('button', { name: 'Usar esta preparación' }).click();
  await expect(editor).not.toBeVisible(); await expect(page.getByLabel('Decisiones del paquete')).toHaveText('prepared');
  await expect(page.getByText('hoja.png', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar hoja 1', exact: true }).click();
  await page.getByRole('button', { name: 'Usar foto original', exact: true }).click();
  await expect(page.getByLabel('Decisiones del paquete')).toHaveText('original');
  expect(writes).toEqual([]);
});

for (const width of [360, 1440]) for (const invalid of [false, true]) test(`131 ayuda simulada ${width}px ${invalid ? 'rechaza escala incorrecta' : 'propone sin enviar y reutiliza'}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const external: string[] = [], writes: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== new URL(page.url()).origin) external.push(request.url());
    if (request.method() !== 'GET' && request.url().includes('/api/')) writes.push(new URL(request.url()).pathname);
  });
  let requests = 0;
  await page.route('**/api/calificaciones/sugerir-bordes', async (route) => {
    requests += 1;
    const body = route.request().postData() ?? '';
    const field = (name: string) => body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r\\n]+)`))?.[1];
    const requestId = field('solicitud_id'), hash = field('image_sha256');
    expect(requestId).toMatch(/^[a-f0-9-]{36}$/); expect(hash).toMatch(/^[a-f0-9]{64}$/);
    await route.fulfill({ status: 200, json: { request_id: requestId, image_sha256: hash, state: 'proposed',
      corners: invalid ? [[100, 90], [900, 90], [900, 910], [100, 910]] : [[.1, .09], [.9, .09], [.9, .91], [.1, .91]] } });
  });
  await page.evaluate(async () => { const path = '/e2e/fixtures/scanHarness.tsx'; (await import(/* @vite-ignore */ path)).mountAssistedTest(); });
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /^Subir fotos/ }).click();
  await (await chooser).setFiles({ name: 'hoja-sintetica.png', mimeType: 'image/png', buffer: bytes });
  const editor = page.getByRole('dialog', { name: 'Preparar hoja 1' });
  await expect(editor.getByText(invalid ? /No pudimos proponer los bordes/ : /Bordes sugeridos con ayuda visual/)).toBeVisible();
  await expect(page.getByLabel('Decisiones del paquete')).toHaveText('pending');
  await expect(editor.getByRole('button', { name: 'Usar foto original' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (!invalid) {
    if (width < 1024) await editor.getByRole('button', { name: 'Ver preparada' }).click();
    await expect(editor.getByRole('img', { name: 'Vista previa de la hoja preparada' })).toBeVisible();
    await expect(editor.getByRole('button', { name: 'Usar esta preparación' })).toBeEnabled();
    await page.screenshot({ path: info.outputPath('corner-assistance-synthetic.png') });
  }
  await editor.getByRole('button', { name: 'Volver sin cambios' }).click();
  await page.getByRole('button', { name: 'Preparar hoja 1', exact: true }).click();
  await expect(editor.getByText(invalid ? /No pudimos proponer los bordes/ : /Bordes sugeridos con ayuda visual/)).toBeVisible();
  expect(requests).toBe(1);
  expect(external).toEqual([]);
  expect(writes).toEqual(['/api/calificaciones/sugerir-bordes']);
});
