import { expect, test } from '@playwright/test';
import { login } from '../fixtures/explainableGrading';

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) test(`revisión ${theme} en ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page, 'profesor', { rosterSize: 30 });
    await page.goto('/app/calificaciones/workspace/e1');
    await page.getByText('Estudiante Prueba', { exact: true }).click();
    await page.evaluate((activeTheme) => {
      document.documentElement.classList.toggle('dark', activeTheme === 'dark');
    }, theme);
    await expect(page.getByRole('heading', { name: '1. Nota y explicación' })).toBeVisible();
    await expect(page.getByRole('button', { name: '3. Respuestas y puntajes', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    await page.screenshot({ path: `output/playwright/088-review-${theme}-${viewport.width}.png`, fullPage: true, animations: 'disabled' });
    await expect(page).toHaveScreenshot(`grading-review-${theme}-${viewport.width}.png`, {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
}
