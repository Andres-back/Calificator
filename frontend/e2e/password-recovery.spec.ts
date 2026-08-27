import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test('password recovery fits 360px in ' + colorScheme + ' mode', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme });

    await page.route('**/api/auth/password-recovery/request', (route) =>
      route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Si existe una cuenta activa con ese correo, recibirás instrucciones.',
        }),
      }),
    );
    await page.route('**/api/auth/password-recovery/validate', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true, detail: 'Enlace válido.' }),
      }),
    );

    await page.goto('/recuperar-contrasena');
    await page.getByLabel('Correo electrónico').fill('persona@example.com');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText(/Si existe una cuenta activa/)).toBeVisible();

    await page.goto('/restablecer-contrasena?token=selector.signature-for-e2e');
    await expect(page.getByRole('heading', { name: 'Crea una contraseña nueva' })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
}