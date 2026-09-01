import { expect, test, type Page, type Route } from '@playwright/test';

const profesor = { id: 'teacher-ai-e2e', nombre: 'Profesora IA', email: 'teacher@example.test', rol: 'profesor', estado: 'activo', permissions: ['ai_settings.personal'] };
const config = {
  mode: 'institutional', allow_institutional_fallback: true, active: true, version: 2,
  providers: [{ id: 'open_code', name: 'open_code', tipo: 'texto', label: 'OpenCode', base_url: null, model: 'qwen3.7-plus', active: true, priority: 1, timeout_seconds: 60, max_retries: 2 }],
  models: [{ provider_id: 'open_code', model_id: 'qwen3.7-plus', label: 'Qwen 3.7 Plus', capabilities: ['text', 'vision'], recommended: true, active: true }],
  features: [{ feature: 'calificacion_foto', label: 'Calificación por foto', capability: 'vision', primary_provider: 'open_code', primary_model: 'qwen3.7-plus', fallback_provider: null, rollout_enabled: true, active: true }],
  credentials: [{ provider_id: 'open_code', configured: true, last_four: '1234', last_test_status: 'ok', last_test_latency_ms: 120 }],
  preferences: [],
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export async function installTeacherAIMocks(page: Page) {
  let loggedIn = false;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/login') { loggedIn = true; return json(route, {}); }
    if (path === '/auth/me') return loggedIn ? json(route, { user: profesor }) : json(route, { detail: 'Sin sesión' }, 401);
    if (path === '/users/me/authorization') return json(route, { profile: profesor.rol, is_primary_admin: false, custom_role_id: null, custom_role_name: null, role_version: null, auth_version: 1, permissions: profesor.permissions });
    if (path === '/auth/refresh') return json(route, { detail: 'Sin sesión' }, 401);
    if (path === '/profesor/ai-config') return json(route, config);
    if (path.startsWith('/profesor/ai-providers/')) return json(route, { status: 'ok', detail: 'Conexión exitosa', latency_ms: 120, http_code: 200, error: null });
    return json(route, []);
  });
}

export async function loginTeacher(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(profesor.email);
  await page.locator('input[type="password"]').fill('e2e-password');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await page.goto('/app/configuracion-ia');
}

test('docente configura su IA en 360x800 sin secretos ni desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await installTeacherAIMocks(page);
  await loginTeacher(page);

  await expect(page.getByRole('heading', { name: 'Mi configuración de IA' })).toBeVisible();
  await page.getByRole('button', { name: /Usar mi API automáticamente/ }).click();
  await expect(page.getByText('Configurada ····1234')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Probar' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect((await page.locator('body').innerText()).toLowerCase()).not.toContain('api_key');
});

test('docente ve opciones avanzadas compatibles y consentimiento explícito', async ({ page }) => {
  await installTeacherAIMocks(page);
  await loginTeacher(page);
  await page.getByRole('button', { name: /Personalizar por función/ }).click();
  await expect(page.getByText('Configuración avanzada por función')).toBeVisible();
  await expect(page.getByText('Calificación por foto')).toBeVisible();
  const consent = page.getByRole('checkbox');
  await expect(consent).toBeChecked();
  await consent.uncheck();
  await expect(consent).not.toBeChecked();
});
