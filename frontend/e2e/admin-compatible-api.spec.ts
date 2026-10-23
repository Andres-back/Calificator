import { expect, test, type Page, type Route } from '@playwright/test';

const actor = { id: 'synthetic-admin', nombre: 'Admin de prueba', email: 'admin@example.test', rol: 'admin', estado: 'activo', is_primary_admin: true, permissions: ['admin_ai.manage', 'admin_settings.manage'] };
const original = { id: 'open_code', name: 'open_code', label: 'OpenCode', tipo: 'texto', base_url: 'https://example.test/v1', active: true, model: 'old-model', priority: 1, timeout_seconds: 60, max_retries: 1, auth_configured: true };
const connection = { ...original, id: 'api_synthetic', name: 'api_synthetic', label: 'API independiente', credential_revision: '00000000-0000-4000-8000-000000000001', allow_teacher_credentials: false };
const originalModel = { provider_id: 'open_code', model_id: 'old-model', label: 'Modelo anterior', capabilities: ['text'], active: true, recommended: true };
const originalFeature = { feature: 'calificacion.valoracion', label: 'Evaluador principal', capability: 'text', primary_provider: 'open_code', primary_model: 'old-model', fallback_provider: null, fallback_model: null, active: true, rollout_enabled: false, config_version: 1 };
const stage = { function_id: 'calificacion', function_label: 'Calificación', stage_id: 'grading_primary', label: 'Evaluador principal', runtime_feature: 'calificacion.valoracion', capability: 'text', consumer: 'grading.primary_evaluator', condition: 'Siempre', editable: true, inherits_from: null, supported_providers: ['open_code'] };

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mocks(page: Page, forbidden = false) {
  let version = 1;
  let providers = [original];
  let models: Array<Record<string, unknown>> = [originalModel];
  let features: Array<Record<string, unknown>> = [originalFeature];
  let probes = 0;
  let publications = 0;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/me') return json(route, { user: actor });
    if (path === '/auth/refresh') return json(route, {}, 401);
    if (path === '/users/me/authorization') return json(route, { profile: 'admin', is_primary_admin: true, permissions: actor.permissions, auth_version: 1 });
    if (forbidden && path.startsWith('/admin/')) return json(route, { detail: 'No tienes permiso para administrar IA.' }, 403);
    if (path === '/admin/ai-settings') return json(route, { version, providers, models, features, global_config: { has_open_code_key: true }, usage: { total_calls: 0, total_tokens_input: 0, total_tokens_output: 0, by_provider: [] } });
    if (path === '/admin/ai-control-center') {
      const saved = features[0];
      const selection = { provider: saved.primary_provider, model: saved.primary_model, config_version: version, teacher_override_allowed: false, fallback_provider: null, fallback_model: null };
      return json(route, { version, functions: [{ function_id: 'calificacion', label: 'Calificación', stages: [{ ...stage, configured: selection, effective: { ...selection, origin: 'institutional' }, observed: null }] }], providers, models, tools: [], deployment: { editable: false } });
    }
    if (path === '/admin/ai-config-hash') return json(route, { consistent: true, backend_hash: 'synthetic', worker_hash: 'synthetic' });
    if (path === '/admin/ai-audit') return json(route, { logs: [], total: 0 });
    if (path === '/admin/ai-api/connections') return json(route, connection);
    if (path === '/admin/ai-api/models/discover') return json(route, [{ ...originalModel, provider_id: connection.id, model_id: 'future-model', label: 'Modelo futuro', recommended: false }]);
    if (path === '/admin/ai-api/models/probe') {
      probes++;
      if (probes === 1) return json(route, { status: 'error', latency_ms: 20, detail: 'La API no respondió. Se conserva el borrador.' });
      const payload = route.request().postDataJSON();
      return json(route, { status: 'ok', latency_ms: 30, detail: 'Prueba técnica completada.', provider: connection, model: { ...payload.model, verification_id: '00000000-0000-4000-8000-000000000002' } });
    }
    if (path === '/admin/ai-control-center/validate') return json(route, { valid: true, errors: [], warnings: [] });
    if (path === '/admin/ai-control-center/publish') {
      const payload = route.request().postDataJSON();
      expect(payload.expected_version).toBe(version);
      expect(JSON.stringify(payload)).not.toContain('synthetic-write-only-key');
      providers = payload.providers; models = payload.models; features = payload.features;
      version++; publications++;
      return json(route, { status: 'ok', version });
    }
    return json(route, []);
  });
  return { probes: () => probes, publications: () => publications };
}

for (const width of [360, 1366]) {
  test(`116 API configurable: preparar, recuperar error, publicar y reabrir a ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    page.setDefaultTimeout(15_000);
    await page.setViewportSize({ width, height: 900 });
    const counters = await mocks(page);
    await page.goto('/app/admin/configuracion-ia');
    await page.getByRole('button', { name: 'Proveedores y claves', exact: true }).click();
    await page.getByText('Añadir una API o actualizar su clave', { exact: true }).click();
    await page.getByLabel('Nombre de la conexión', { exact: true }).fill('API independiente');
    await page.getByLabel('URL HTTPS de la API', { exact: true }).fill('https://example.test/v1');
    await page.getByLabel('Clave de esta API', { exact: true }).fill('synthetic-write-only-key');
    await page.getByRole('button', { name: 'Preparar conexión', exact: true }).click();
    await expect(page.getByLabel('Clave de esta API', { exact: true })).toHaveValue('');
    await page.getByRole('button', { name: 'Consultar modelos disponibles', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'modelos consultados' })).toBeVisible();
    await page.getByLabel('Modelo (identificador exacto)', { exact: true }).fill('future-model');
    await page.getByRole('combobox', { name: 'Formato de la API', exact: true }).selectOption('responses');
    await page.getByRole('checkbox', { name: /El modelo recibe imágenes/ }).check();
    await page.getByRole('button', { name: 'Probar y preparar modelo', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Se conserva el borrador' })).toBeVisible();
    await expect(page.getByLabel('Modelo (identificador exacto)', { exact: true })).toHaveValue('future-model');
    await page.getByRole('button', { name: 'Probar y preparar modelo', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Prueba técnica completada' })).toBeVisible();
    expect(counters.probes()).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.getByRole('button', { name: 'Funciones', exact: true }).click();
    await page.getByRole('combobox', { name: 'Proveedor', exact: true }).selectOption(connection.id);
    await expect(page.getByRole('combobox', { name: 'Modelo', exact: true })).toHaveValue('future-model');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar configuración', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(counters.publications).toBe(1);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Proveedor', exact: true })).toHaveValue(connection.id);
    await expect(page.getByRole('combobox', { name: 'Modelo', exact: true })).toHaveValue('future-model');
    await expect(page.getByText('No registrado', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `../output/playwright/spec116-admin-${width}.png`, fullPage: true });
  });
}

test('116 acceso denegado no permite preparar conexiones ni publicar', async ({ page }) => {
  const counters = await mocks(page, true);
  await page.goto('/app/admin/configuracion-ia');
  await expect(page.getByRole('button', { name: 'Preparar conexión' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Guardar cambios', exact: true })).toHaveCount(0);
  expect(counters.probes()).toBe(0);
  expect(counters.publications()).toBe(0);
});
