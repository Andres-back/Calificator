import { expect, test, type Page, type Route } from '@playwright/test';

const profesor = { id: 'teacher-a11y', nombre: 'Profesora IA', email: 'teacher@example.test', rol: 'profesor', estado: 'activo' };
const config = {
  mode: 'institutional', allow_institutional_fallback: true, active: true, version: 2,
  providers: [{ id: 'open_code', name: 'open_code', tipo: 'texto', label: 'OpenCode', base_url: null, model: 'qwen3.7-plus', active: true, priority: 1, timeout_seconds: 60, max_retries: 2 }],
  models: [{ provider_id: 'open_code', model_id: 'qwen3.7-plus', label: 'Qwen 3.7 Plus', capabilities: ['text', 'vision'], recommended: true, active: true }],
  features: [{ feature: 'calificacion_foto', label: 'Calificación por foto', capability: 'vision', primary_provider: 'open_code', primary_model: 'qwen3.7-plus', fallback_provider: null, rollout_enabled: true, active: true }],
  credentials: [{ provider_id: 'open_code', configured: true, last_four: '1234' }], preferences: [],
};
async function json(route: Route, body: unknown, status = 200) { await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }); }
async function prepare(page: Page) {
  let loggedIn = false;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/login') { loggedIn = true; return json(route, {}); }
    if (path === '/auth/me') return loggedIn ? json(route, { user: profesor }) : json(route, {}, 401);
    if (path === '/auth/refresh') return json(route, {}, 401);
    if (path === '/profesor/ai-config') return json(route, config);
    return json(route, []);
  });
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(profesor.email);
  await page.locator('input[type="password"]').fill('e2e-password');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await page.goto('/app/configuracion-ia');
}

test('configuración docente es navegable por teclado y conserva objetivos táctiles', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await prepare(page);

  const modes = page.locator('button[aria-pressed]');
  await expect(modes).toHaveCount(3);
  for (let index = 0; index < await modes.count(); index += 1) {
    const mode = modes.nth(index);
    const box = await mode.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(await mode.innerText()).not.toBe('');
  }

  await modes.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(modes.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Sustituir clave')).toHaveAttribute('type', 'password');
  await expect(page.getByRole('checkbox')).toHaveAccessibleName(/Usar IA institucional/i);
});