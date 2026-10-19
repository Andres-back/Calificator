import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
const permissions = ['users.read', 'roles.read', 'admin_settings.manage'];
const user = { id: 'admin-synthetic', nombre: 'Administradora prueba', email: 'admin@example.test', rol: 'admin', estado: 'activo', permissions };

for (const width of [360, 390, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`103 administración ilustrada ${width}px ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript((mode) => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
      const writes: string[] = [];
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/api/**', (route) => {
        const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
        if (route.request().method() !== 'GET' && path !== '/analytics/evento') writes.push(path);
        if (path === '/auth/me') return route.fulfill({ json: { user } });
        if (path === '/users/me/authorization') return route.fulfill({ json: { profile: 'admin', permissions } });
        if (path === '/admin/mail/config') return route.fulfill({ json: {
          host: 'smtp.example.test', port: 587, use_starttls: true, username: '', from_email: '',
          configured: false, has_password: false, source: 'database', last_test_status: null,
          last_test_latency_ms: null, last_test_error_code: null, last_test_at: null,
        } });
        if (path === '/admin/mail/recovery-status') return route.fulfill({ json: { pending: 0, sent_last_24h: 0, failed_last_24h: 0 } });
        return route.fulfill({ json: [] });
      });
      for (const [path, heading, icon] of [
        ['usuarios', 'Usuarios y roles', 'admin-users'],
        ['roles', 'Roles y permisos', 'admin-roles'],
        ['correo', 'Correo y recuperación', 'admin-mail'],
      ]) {
        await page.goto(`/app/admin/${path}`);
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
        const headerIcon = page.locator(`main [data-educational-icon="${icon}"] img`).first();
        await expect(headerIcon).toBeVisible();
        await expect.poll(() => headerIcon.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(256);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (width >= 1024) {
          await expect(page.locator(`header [data-educational-icon="${icon}"]`)).toBeVisible();
          await expect(page.locator(`#main-navigation-desktop [data-educational-icon="${icon}"]`)).toBeVisible();
        }
        await page.screenshot({ path: testInfo.outputPath(`${path}.png`) });
      }
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
