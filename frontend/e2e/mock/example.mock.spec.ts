import { test, expect } from '@playwright/test';

/**
 * Placeholder mock test — verifies the dev server renders without a real backend.
 * Mock API responses using route interception for fully isolated testing.
 */
test.describe('Mock API — placeholder', () => {
  test('dev server loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeAttached();
  });
});
