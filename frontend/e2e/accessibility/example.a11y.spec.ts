import { test, expect } from '@playwright/test';

/**
 * Placeholder accessibility test.
 * Replace with @axe-core/playwright integration:
 *   const results = await new AxeBuilder({ page }).analyze();
 *   expect(results.violations).toEqual([]);
 */
test.describe('Accessibility — placeholder', () => {
  test('placeholder: axe-core a11y scan', async ({ page }) => {
    await page.goto('/');
    // TODO: integrate @axe-core/playwright
    expect(true).toBe(true);
  });
});
