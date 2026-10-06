import { expect, test } from '@playwright/test';
import { login } from '../fixtures/explainableGrading';

for (const theme of ['light', 'dark'] as const) for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) test(`revisión conserva foco, scroll y controles ${theme} en ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await login(page, 'profesor', { rosterSize: 30 });
  await page.goto('/app/calificaciones/workspace/e1');
  await page.getByText('Estudiante Prueba', { exact: true }).click();

  await page.evaluate((activeTheme) => document.documentElement.classList.toggle('dark', activeTheme === 'dark'), theme);
  await expect(page.getByRole('heading', { name: '1. Nota y explicación' })).toBeVisible();
  await page.getByRole('button', { name: '3. Respuestas y puntajes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeVisible();
  const panel = page.getByTestId('grade-review-panel');
  if (viewport.width >= 1280) {
    const roster = page.getByTestId('grade-review-roster');
    expect((await roster.boundingBox())!.width).toBeGreaterThanOrEqual(320);
    await expect(roster.getByRole('searchbox')).toBeInViewport();
    await roster.getByRole('combobox', { name: 'Filtrar estudiantes por estado' }).focus();
    await expect(roster.getByRole('combobox')).toBeFocused();
  }
  const controls = panel.locator('button:visible, a:visible, input:visible, textarea:visible, select:visible, summary:visible');
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    const result = await control.evaluate((element) => {
      const html = element as HTMLElement;
      const rect = html.getBoundingClientRect();
      const label = html.getAttribute('aria-label')
        ?? html.getAttribute('title')
        ?? html.textContent?.trim()
        ?? (html instanceof HTMLInputElement ? html.labels?.[0]?.textContent?.trim() : '')
        ?? '';
      return { label, width: rect.width, height: rect.height, html: html.outerHTML.slice(0, 240) };
    });
    expect(result.label, 'Control ' + String(index + 1) + ' sin nombre accesible: ' + result.html).not.toBe('');
    expect(result.height, result.label + ' no alcanza el alto táctil').toBeGreaterThanOrEqual(44);
    expect(result.width, result.label + ' no alcanza el ancho táctil').toBeGreaterThanOrEqual(44);
  }

  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBeTruthy();
  await panel.locator('summary', { hasText: '4. Retroalimentación' }).click();
  const feedback = panel.locator('textarea');
  await feedback.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await feedback.focus();
  await expect(feedback).toBeFocused();
  await expect.poll(async () => {
    const box = await feedback.boundingBox();
    const bar = await page.getByLabel('Acciones de la calificación').boundingBox();
    return box!.y >= 0 && box!.y + box!.height <= (bar?.y ?? viewport.height);
  }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.getByRole('button', { name: viewport.width >= 1280 ? 'Volver a notas del grupo' : 'Volver a lista', exact: true }).click();
  await expect(page.getByTestId('grade-review-roster').getByRole('button', { name: /Estudiante Prueba/ })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.position)).not.toBe('fixed');
});

test('088 reflow equivalente a zoom 200 % y altura reducida conserva edición y retorno', async ({ page }) => {
  // 1366×768 / 2: viewport CSS equivalente; no simula un teclado nativo ni el zoom del navegador.
  await page.setViewportSize({ width: 683, height: 384 });
  await login(page, 'profesor', { rosterSize: 30, questionCount: 20 });
  await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1&estudiante=s1');
  await page.getByRole('button', { name: '3. Respuestas y puntajes', exact: true }).click();
  await page.getByRole('button', { name: 'Pregunta 20', exact: true }).click();
  await page.getByRole('button', { name: 'Ajustar puntaje y explicación', exact: true }).click();
  const feedback = page.getByLabel('Explicación para el estudiante');
  await feedback.scrollIntoViewIfNeeded();
  await feedback.focus();
  await expect(feedback).toBeFocused();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Volver a lista', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Buscar estudiante' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});
