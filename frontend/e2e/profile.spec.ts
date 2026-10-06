import { expect, test, type Page } from '@playwright/test';

async function fixture(page: Page) {
  let loggedIn = false;
  let password = 'Original-Ficticia!';
  const user = { id: 'profile-teacher', nombre: 'Docente sintética', email: 'docente@example.com', rol: 'profesor', estado: 'activo', permissions: ['subjects.read'] };
  const writes: Record<string, string>[] = [];
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (path === '/auth/login') {
      const body = route.request().postDataJSON();
      loggedIn = body.email === user.email && body.password === password;
      return json(loggedIn ? {} : { detail: 'Credenciales incorrectas' }, loggedIn ? 200 : 401);
    }
    if (path === '/auth/me') return json(loggedIn ? { user } : { detail: 'Sin sesión' }, loggedIn ? 200 : 401);
    if (path === '/users/me/authorization') return json({ profile: 'profesor', is_primary_admin: false, role_version: null, auth_version: 1, permissions: user.permissions });
    if (path === '/users/me' && route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      if ((body.email || body.password) && body.current_password !== password) return json({ detail: 'La contraseña actual no es correcta' }, 422);
      writes.push(body);
      if (body.nombre) user.nombre = body.nombre;
      if (body.email) user.email = body.email;
      if (body.password) { password = body.password; loggedIn = false; }
      return json(user);
    }
    if (path === '/auth/logout') { loggedIn = false; return json({}); }
    if (path === '/auth/refresh') return json({}, 401);
    return json([]);
  });
  return { writes, user };
}
async function login(page: Page, password: string) {
  if (new URL(page.url()).pathname !== '/login') await page.goto('/login');
  await page.getByLabel(/Correo/i).fill('docente@example.com');
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.waitForLoadState('networkidle');
}
for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`perfil propio desde menú de cuenta en ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    if (viewport.width === 390) await page.addInitScript(() => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: 'dark' }, version: 0 })));
    const state = await fixture(page);
    await login(page, 'Original-Ficticia!');
    await page.getByRole('button', { name: /Abrir menú de cuenta/ }).click();
    await page.getByRole('menuitem', { name: 'Mi perfil' }).click();
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole('textbox', { name: 'Nombre completo' }).fill('Docente actualizada');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('textbox', { name: 'Nombre completo' })).toHaveValue('Docente actualizada');
    expect(state.writes).toEqual([{ nombre: 'Docente actualizada' }]);
    await page.getByRole('textbox', { name: 'Correo de acceso' }).fill('nuevo@example.com');
    await page.getByLabel('Contraseña actual', { exact: true }).fill('Incorrecta');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('alert')).toContainText('La contraseña actual no es correcta');
    await expect(page.getByRole('textbox', { name: 'Correo de acceso' })).toHaveValue('nuevo@example.com');
    if (viewport.width <= 390) {
      await page.setViewportSize({ width: viewport.width, height: 420 });
      const emailField = page.getByRole('textbox', { name: 'Correo de acceso' });
      await emailField.scrollIntoViewIfNeeded();
      await emailField.focus();
      await expect(emailField).toBeFocused();
      expect((await emailField.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    }
    await page.getByRole('textbox', { name: 'Correo de acceso' }).fill(state.user.email);
    await page.getByText('Cambiar contraseña', { exact: true }).click();
    await page.getByLabel('Contraseña actual', { exact: true }).fill('Original-Ficticia!');
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva-Ficticia!');
    await page.getByLabel('Confirmar nueva contraseña', { exact: true }).fill('Nueva-Ficticia!');
    const save = page.getByRole('button', { name: 'Guardar cambios' });
    await save.scrollIntoViewIfNeeded();
    expect((await save.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await save.click();
    await expect(page).toHaveURL(/\/login$/);
    await page.setViewportSize(viewport);
    await login(page, 'Nueva-Ficticia!');
    expect(state.writes).toHaveLength(2);
    expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain('Nueva-Ficticia!');
  });
}
