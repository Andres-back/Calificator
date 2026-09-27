import { expect, test } from '@playwright/test';
import { login } from '../fixtures/explainableGrading';

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
]) {
  test(`la historia conserva controles accesibles y no desborda en ${viewport.width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(viewport);
    await login(page, 'estudiante');
    await page.goto('/app/evaluaciones/e1/resolver');

    const story = page.getByRole('region', { name: 'Tu retroalimentación, paso a paso' });
    await expect(story).toBeVisible();
    await expect(story.getByRole('heading', { name: 'Tu retroalimentación, paso a paso' })).toBeVisible();
    await expect(story.getByRole('button', { name: 'Pausar movimiento' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

    for (const control of await story.locator('button:visible').all()) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(40);
    }
    const staticModeLabel = story.getByText('Vista sin movimiento', { exact: true }).locator('..');
    expect((await staticModeLabel.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(40);

    await story.getByRole('button', { name: /Ver por qué/ }).click();
    await expect(page.locator('#grade-component-q1')).toBeInViewport();
  });
}
