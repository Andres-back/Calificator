import { test, expect } from '@playwright/test';

test.describe('Accesibilidad básica de controles', () => {
  test('los botones visibles de acceso tienen nombre y tamaño táctil comprensible', async ({ page }) => {
    await page.goto('/login');
    const buttons = page.locator('button:visible');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);
      const description = await button.evaluate((element) => ({
        name: element.getAttribute('aria-label')
          ?? element.getAttribute('title')
          ?? element.textContent?.trim()
          ?? '',
        rect: element.getBoundingClientRect().toJSON(),
      }));
      expect(description.name, `Botón ${index + 1} sin nombre accesible`).not.toBe('');
      expect(description.rect.height, `${description.name} es demasiado bajo para tocar`).toBeGreaterThanOrEqual(40);
      expect(description.rect.width, `${description.name} es demasiado angosto para tocar`).toBeGreaterThanOrEqual(40);
    }
  });
});
