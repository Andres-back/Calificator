import { test, expect } from '@playwright/test';

/**
 * Placeholder visual regression test.
 * Replace with Percy snapshots or Playwright screenshot assertions:
 *   await expect(page).toHaveScreenshot('homepage.png');
 */
test.describe('Visual regression — placeholder', () => {
  test('placeholder: visual diff test', async ({ page }) => {
    await page.goto('/');
    // TODO: add screenshot comparison
    expect(true).toBe(true);
  });
});
