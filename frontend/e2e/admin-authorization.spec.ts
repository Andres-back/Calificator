import { expect, test, type Page, type Route } from '@playwright/test';

const role = {
  id: 'role-e2e', name: 'Auxiliar académico', description: 'Apoya recursos y presentaciones',
  active: true, is_system: false, version: 1,
  permission_keys: ['resources.read', 'presentations.read'], assigned_users: 1,
  created_at: '2026-08-30T12:00:00Z', updated_at: '2026-08-30T12:00:00Z',
};

const modules = [{
  module: 'resources', label: 'Recursos', permissions: [
    { key: 'resources.read', module: 'resources', action: 'read', label: 'Ver recursos', description: 'Consultar materiales.', risk: 'normal', sort_order: 1, dependencies: [] },
    { key: 'resources.create', module: 'resources', action: 'create', label: 'Crear recursos', description: 'Generar materiales.', risk: 'normal', sort_order: 2, dependencies: ['resources.read'] },
  ],
}];

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installMocks(page: Page, permissions: string[]) {
  const user = {
    id: 'admin-e2e', nombre: 'Administrador E2E', email: 'admin@example.test',
    rol: 'admin', estado: 'activo', is_primary_admin: true, permissions,
  };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/me') return json(route, { user });
    if (path === '/auth/refresh') return json(route, { detail: 'Sin sesión previa' }, 401);
    if (path === '/users/me/authorization') return json(route, {
      profile: 'admin', is_primary_admin: true, custom_role_id: null,
      custom_role_name: null, role_version: null, auth_version: 1, permissions,
    });
    if (path === '/admin/roles') return json(route, [role]);
    if (path === '/admin/authorization/modules') return json(route, modules);
    if (path === '/admin/authorization/audit') return json(route, []);
    if (path === '/admin/users') return json(route, []);
    return json(route, []);
  });
}

test('roles funciona sin desbordamiento en móvil, tableta y escritorio', async ({ page }) => {
  await installMocks(page, ['roles.read', 'roles.manage', 'users.read', 'users.create', 'users.update', 'users.delete']);
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/app/admin/roles');
    await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear rol' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    if (viewport.width === 360) {
      await page.getByRole('button', { name: 'Cambiar tema' }).click();
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  }

  await page.getByRole('button', { name: 'Crear rol' }).click();
  await expect(page.getByRole('dialog', { name: 'Crear rol' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Crear recursos/ })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/admin/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuarios y roles' })).toBeVisible();
  await page.getByRole('button', { name: 'Crear usuario' }).click();
  await expect(page.getByRole('dialog', { name: 'Crear usuario' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('una ruta administrativa directa explica el acceso retirado', async ({ page }) => {
  await installMocks(page, ['users.read']);
  await page.goto('/app/admin/roles');
  await expect(page).toHaveURL(/\/app\/403/);
  await expect(page.getByText(/permiso|acceso/i).first()).toBeVisible();
});
