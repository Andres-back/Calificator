import { expect, test } from '@playwright/test';

const profesor = {
  id: 'profesor-e2e',
  nombre: 'Profesor de prueba',
  email: 'profesor@example.test',
  rol: 'profesor',
  estado: 'activo',
  permissions: ['subjects.read'],
};

test('public mobile entry keeps both actions visible and skips the desktop hero', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const requested = new Set<string>();
  page.on('request', (request) => requested.add(new URL(request.url()).pathname));

  await page.goto('/');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Ingresar' })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: /Crear cuenta/ })).toBeVisible();

  requested.clear();
  await page.goto('/login');
  await expect(page.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeVisible();
  await expect(page.getByRole('link', { name: /contraseña|acceso/i })).toHaveCount(1);
  expect(requested.has('/branding/hero-login.webp')).toBe(false);
});

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
  await page.route('**/api/users/me/authorization', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      profile: profesor.rol,
      is_primary_admin: false,
      custom_role_id: null,
      custom_role_name: null,
      role_version: null,
      auth_version: 1,
      permissions: profesor.permissions,
    }),
  }));

  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Iniciar sesi.n/i })).toBeVisible();
  await page.getByLabel(/Correo/i).fill('profesor@example.test');
  await page.locator('input[type="password"]').fill('password-for-test');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('link', { name: /Materias/i })).toBeVisible();

  await page.goto('/app/admin/configuracion-ia');
  await expect(page).toHaveURL(/\/app\/403/);
});

// Spec 216: en la pantalla de ingreso nada queda encima de la tarjeta, tampoco en un celular pequeño.
for (const [width, height] of [[320, 568], [375, 812], [1280, 600]] as const) test(`216 el pie legal y el botón de tema no tapan la tarjeta de ingreso ${width}x${height}`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  await page.goto('/login');
  const card = page.locator('.card').filter({ has: page.locator('form') });
  await expect(card.getByText('Tu contraseña nunca se guarda en este dispositivo.')).toBeVisible();

  // La tarjeta entra con una animación: se espera a que el pie quede debajo.
  await expect.poll(async () => {
    const cardBox = (await card.boundingBox())!;
    const footerBox = (await page.getByRole('contentinfo').boundingBox())!;
    return Math.round(footerBox.y - (cardBox.y + cardBox.height));
  }).toBeGreaterThanOrEqual(0);
  await expect.poll(async () => {
    const cardBox = (await card.boundingBox())!;
    const themeBox = (await page.getByRole('button', { name: /tema|modo/i }).first().boundingBox())!;
    const apart = themeBox.y + themeBox.height <= cardBox.y || themeBox.x >= cardBox.x + cardBox.width;
    return apart;
  }).toBe(true);
  await expect(page.getByRole('navigation', { name: 'Información legal' }).getByRole('link')).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
