import { expect, test } from '@playwright/test';
import { login } from '../fixtures/explainableGrading';

for (const theme of ['light', 'dark'] as const) {
  test('revisión de calificación ' + theme + ' en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, 'profesor');
    await page.goto('/app/calificaciones/workspace/e1');
    await page.getByText('Estudiante Prueba', { exact: true }).click();
    await page.evaluate((activeTheme) => {
      document.documentElement.classList.toggle('dark', activeTheme === 'dark');
    }, theme);
    await expect(page.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    await expect(page).toHaveScreenshot('grading-review-' + theme + '.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
}
