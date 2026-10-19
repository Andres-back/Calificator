import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
const corpus = JSON.parse(readFileSync(resolve(process.cwd(), '../specs/104-xali-docente-visual/fixtures/visuales.json'), 'utf8')) as { validos: Array<{ titulo: string }> };
const wire = (visuals: unknown[]) => `Ejemplos para preparar la clase.\n\n\`\`\`xcalificator-visual-v1\n${JSON.stringify({ version: 1, visuales: visuals })}\n\`\`\``;
const teacher = { id: 't1', nombre: 'Docente sintético', rol: 'profesor', estado: 'activo', email: 'teacher@example.test', permissions: ['xali.use', 'subjects.read'] };
const subjects = [{ id: 'm1', profesor_id: 't1', nombre: 'Matemáticas', area: 'Matemáticas', grado: '6', estado: 'activa' }, { id: 'm2', profesor_id: 't1', nombre: 'Lenguaje', area: 'Lenguaje', grado: '4', estado: 'activa' }];
const message = (id: string, mensaje: string) => ({ id, role: 'assistant', mensaje, created_at: '2026-10-17T12:00:00Z' });

async function expectTouchTarget(button: Locator, timeout = 10_000) {
  // Keep the CSS minimum strict. Transformed DOMRects can lose a fraction of a
  // pixel (CI observed 43.999969 for a 44px button); do not round smaller targets up.
  await expect.poll(() => button.evaluate((element) => Number.parseFloat(getComputedStyle(element).height)), { timeout })
    .toBeGreaterThanOrEqual(44);
  await expect.poll(async () => (await button.boundingBox())?.height ?? 0, { timeout })
    .toBeGreaterThanOrEqual(44 - 0.001);
}

test('104 tamaño táctil conserva 44px y solo tolera precisión subpíxel', async ({ page }) => {
  await page.setContent('<button style="box-sizing:border-box;height:44px;transform:scaleY(0.9999993)">Control sintético</button>');
  const button = page.getByRole('button', { name: 'Control sintético' });
  await expectTouchTarget(button);
  await button.evaluate((element) => { element.style.height = '43px'; });
  await expect(expectTouchTarget(button, 200)).rejects.toThrow();
  await button.evaluate((element) => { element.style.height = '44px'; element.style.transform = 'scaleY(0.98)'; });
  await expect(expectTouchTarget(button, 200)).rejects.toThrow();
});

async function prepare(page: Page) {
  const writes: string[] = [];
  await page.route('**/api/**', (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname.replace(/^\/api/, '');
    if (request.method() !== 'GET' && path !== '/analytics/evento') writes.push(path);
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === '/auth/me') return json({ user: teacher });
    if (path === '/users/me/authorization') return json({ profile: teacher.rol, permissions: teacher.permissions });
    if (path === '/materias') return json(subjects);
    if (path === '/xali/history') return json(url.searchParams.get('materia_id') === 'm1'
      ? [message('legacy', 'Mensaje anterior conservado.'), message('a1', wire(corpus.validos.slice(0, 4))), message('a2', wire(corpus.validos.slice(4)))] : []);
    if (path === '/xali/chat') return json({ respuesta: 'Una respuesta nueva.' });
    return json([]);
  });
  await page.goto('/app/xali');
  await page.getByLabel('Contexto de materia').selectOption('m1');
  await expect(page.getByText(/Hablando sobre:/)).toContainText('Grado 6');
  await expect(page.getByText('Mensaje anterior conservado.')).toHaveCount(1);
  return writes;
}

for (const width of [360, 390, 1440]) for (const mode of ['light', 'dark']) {
  test(`104 cinco apoyos ampliables en ${width}px ${mode}`, async ({ page, browserName }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript((theme) => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: theme }, version: 0 })), mode);
    const writes = await prepare(page);
    for (const visual of corpus.validos) {
      const button = page.getByRole('button', { name: `Ampliar ${visual.titulo}`, exact: true });
      await expect(button).toBeVisible();
      await expectTouchTarget(button);
      // Pointer stability on Windows WebKit can stall at desktop retina sizes.
      if (browserName === 'webkit') { await button.focus(); await button.press('Enter'); } else await button.click();
      const dialog = page.getByRole('dialog', { name: visual.titulo, exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Cerrar diálogo' })).toBeFocused();
      if (visual.titulo === 'Puntos') {
        await expect(dialog.getByRole('row', { name: 'A -2 3', exact: true })).toBeVisible();
        await expect(dialog.getByRole('row', { name: 'B 3 -1', exact: true })).toBeVisible();
      } else if (['Resultados de ejemplo', 'Cambio'].includes(visual.titulo)) {
        await expect(dialog.getByRole('img', { name: new RegExp(`^${visual.titulo}:`) })).toBeVisible();
        await dialog.getByText('Ver tabla de datos', { exact: true }).click();
        await expect(dialog.getByRole('row', { name: 'B 4', exact: true })).toBeVisible();
      } else {
        await expect(dialog.getByRole('img')).toBeVisible();
        await dialog.getByText('Ver datos y medidas', { exact: true }).click();
        if (visual.titulo === 'Medidas') {
          await expect(dialog.getByText(/ancho 4, alto 2/)).toBeVisible();
          const radius = Number(await dialog.locator('svg circle').getAttribute('r'));
          expect(Number(await dialog.locator('svg rect').getAttribute('width'))).toBeCloseTo(radius * 2);
          expect(Number(await dialog.locator('svg rect').getAttribute('height'))).toBeCloseTo(radius);
        }
        else {
          await expect(dialog.getByRole('row', { name: 'A -2 3', exact: true })).toBeVisible();
          const points = await dialog.locator('svg g[data-x]').evaluateAll((els) => els.map((el) => [el.getAttribute('data-x'), el.getAttribute('data-y')]));
          expect(points).toEqual([['-2', '3'], ['0', '0'], ['3', '-1']]);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (visual.titulo === 'Plano cartesiano') await page.screenshot({ path: testInfo.outputPath('plano-ampliado.png') });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(button).toBeFocused();
    }
    expect(writes).toEqual([]);
    await page.getByLabel('Contexto de materia').selectOption('m2');
    await expect(page.getByText(/Hablando sobre:/)).toContainText('Grado 4');
    await expect(page.getByText('Mensaje anterior conservado.')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ir al mensaje más reciente' })).toHaveCount(0);
    await page.setViewportSize({ width, height: 480 }); // Reduced viewport, not a physical keyboard test.
    const input = page.getByLabel('Mensaje para Xali'); await input.fill('Necesito una explicación');
    await expect(input).toHaveValue('Necesito una explicación');
    await expect(page.getByRole('button', { name: 'Enviar mensaje a Xali' })).toBeInViewport();
    expect(writes).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('escritura.png') });
  });
}

test('104 error incierto no reenvía automáticamente; historial y materia separados', async ({ page }) => {
  const writes = await prepare(page);
  await page.route('**/api/xali/chat', (route) => { writes.push('/xali/chat'); return route.abort('failed'); });
  await page.getByLabel('Mensaje para Xali').fill('Prueba de conexión');
  await page.getByRole('button', { name: 'Enviar mensaje a Xali' }).click();
  await expect(page.getByRole('button', { name: 'Revisar historial' })).toBeVisible();
  expect(writes).toEqual(['/xali/chat']);
  await page.getByRole('button', { name: 'Revisar historial' }).click();
  await expect(page.getByRole('button', { name: 'Enviar de nuevo' })).toBeVisible();
  expect(writes).toEqual(['/xali/chat']);
  await page.getByLabel('Contexto de materia').selectOption('m2');
  await expect(page.getByRole('button', { name: 'Enviar de nuevo' })).toHaveCount(0);
});
