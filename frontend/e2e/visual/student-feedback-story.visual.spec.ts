import { expect, test } from '@playwright/test';
import { login } from '../fixtures/explainableGrading';

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1366, height: 768 },
  ]) {
    test(`historia Xali ${theme} en ${viewport.width}px`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize(viewport);
      await login(page, 'estudiante');
      await page.goto('/app/evaluaciones/e1/resolver');
      await page.evaluate((activeTheme) => {
        document.documentElement.classList.toggle('dark', activeTheme === 'dark');
      }, theme);

      const story = page.getByRole('region', { name: 'Tu retroalimentación, paso a paso' });
      await expect(story).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
      await expect(story).toHaveScreenshot(`student-feedback-${theme}-${viewport.width}.png`, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
      });
    });
  }
}
