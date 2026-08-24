import { expect, test } from '@playwright/test';
import { login } from '../fixtures/explainableGrading';

test('revisión móvil conserva nombres, foco y objetivos táctiles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'profesor');
  await page.goto('/app/calificaciones/workspace/e1');
  await page.getByText('Estudiante Prueba', { exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeVisible();
  const controls = page.locator('button:visible, a:visible, input:visible, textarea:visible, select:visible');
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
    expect(result.height, result.label + ' no alcanza el alto táctil').toBeGreaterThanOrEqual(40);
    expect(result.width, result.label + ' no alcanza el ancho táctil').toBeGreaterThanOrEqual(40);
  }

  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBeTruthy();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});
