import { expect, test } from '@playwright/test';

const profesor = {
  id: 'profesor-e2e',
  nombre: 'Profesor de prueba',
  email: 'profesor@example.test',
  rol: 'profesor',
  estado: 'activo',
};

test('login mocks a professor session and protects the admin navigation', async ({ page }) => {
  let authenticated = false;

  await page.route('**/api/auth/refresh', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ detail: 'No session' }),
  }));
  await page.route('**/api/auth/login', (route) => {
    authenticated = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/api/auth/me', (route) => route.fulfill(
    authenticated
      ? { status: 200, contentType: 'application/json', body: JSON.stringify({ user: profesor }) }
      : { status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'No session' }) },
  ));

  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Iniciar sesi.n/i })).toBeVisible();
  await page.getByLabel(/Correo/i).fill('profesor@example.test');
  await page.locator('input[type="password"]').fill('password-for-test');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('link', { name: /Materias/i })).toBeVisible();

  await page.goto('/app/admin/configuracion-ia');
  await expect(page).toHaveURL(/\/app$/);
});