import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const bytes = readFileSync(new URL('./fixtures/scan-evidence.png', import.meta.url));
const capability = { schema_version: 1, enabled: true, algorithm: 'opencv-4.13.0-scan2', max_pages: 10,
  max_file_bytes: 10485760, max_total_bytes: 41943040, max_scan_pixels: 16000000, corner_assistance_enabled: false };
test.use({ reducedMotion: 'reduce' });

test('157 digitalizar a 360 px prepara la hoja con el Worker real y envía su receta junto al original', async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(request.url());
  });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, json: { detail: 'Prueba sintética sin sesión' } }));
  await page.route('**/api/evaluaciones/externa/capacidad-escaneo', (route) => route.fulfill({ status: 200, json: capability }));
  let body = '';
  await page.route('**/api/evaluaciones/externa/digitalizar-con-archivo', async (route) => {
    body = route.request().postDataBuffer()?.toString('latin1') ?? '';
    await route.fulfill({ status: 202, json: { job_id: 'job-157', estado: 'queued', materia_id: '00000000-0000-4000-8000-000000000157',
      nombre: 'Hoja sintética', avisos: [] } });
  });
  await page.goto('/login');
  await page.evaluate(async () => { const path = '/e2e/fixtures/digitalizationScanHarness.tsx'; (await import(/* @vite-ignore */ path)).mount(); });

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /^Subir fotos/ }).click();
  await (await chooser).setFiles({ name: 'hoja-sintetica.png', mimeType: 'image/png', buffer: bytes });
  const editor = page.getByRole('dialog', { name: 'Preparar hoja 1' });
  await expect(editor).toBeVisible();
  await editor.getByRole('button', { name: 'Ver preparada' }).click();
  await editor.getByRole('combobox', { name: 'Aspecto de la hoja preparada' }).selectOption('lectura_suave');
  await expect(editor.getByRole('img', { name: 'Vista previa de la hoja preparada' })).toBeVisible();
  await editor.getByRole('button', { name: 'Usar esta preparación' }).click();
  await expect(editor).not.toBeVisible();
  await expect(page.getByText('Preparada y revisada')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('digitalizar-preparada-360.png'), fullPage: true });

  await page.getByRole('button', { name: 'Digitalizar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Estamos trabajando en tu documento' })).toBeVisible();
  const field = (name: string) => body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r\\n]+)`))?.[1];
  const recipes = JSON.parse(field('recetas') ?? 'null');
  expect(recipes).toHaveLength(1);
  expect(recipes[0]).toMatchObject({ width: 800, height: 1100, rotation: 0, profile: 'lectura_suave', coordinate_frame: 'exif_oriented_source' });
  expect(recipes[0].corners).toHaveLength(4);
  expect(JSON.parse(field('rotaciones') ?? 'null')).toEqual([0]);
  // The original photo travels unchanged; the server applies the recipe.
  expect(body).toContain('filename="hoja-sintetica.png"');
  expect(body).toContain('\x89PNG');
  expect(external).toEqual([]);
});
