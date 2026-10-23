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

async function mocks(page: Page, forbidden = false, legacyFallback = false) {
  let version = 1;
  let providers = legacyFallback ? [original, { ...original, id: 'ollama', name: 'ollama', label: 'Ollama', model: 'native' }] : [original];
  let models: Array<Record<string, unknown>> = legacyFallback ? [
    { ...originalModel, capabilities: ['text', 'vision'] },
    { ...originalModel, model_id: 'ready-primary', label: 'Principal comprobado', capabilities: ['text', 'vision'], runtime_profile: { protocol: 'responses' }, verification_id: 'proof1' },
    { ...originalModel, model_id: 'ready-backup', label: 'Respaldo comprobado', capabilities: ['text', 'vision'], runtime_profile: { protocol: 'chat_completions' }, verification_id: 'proof2' },
    { ...originalModel, model_id: 'new-unprepared', label: 'Modelo nuevo pendiente', capabilities: ['text', 'vision'] },
    { ...originalModel, provider_id: 'ollama', model_id: 'native', label: 'Respaldo anterior', capabilities: ['text', 'vision'] },
  ] : [originalModel];
  let features: Array<Record<string, unknown>> = [legacyFallback ? { ...originalFeature, capability: 'vision', fallback_provider: 'ollama', fallback_model: 'native' } : originalFeature];
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
      const selection = { provider: saved.primary_provider, model: saved.primary_model, config_version: version, teacher_override_allowed: false, fallback_provider: saved.fallback_provider, fallback_model: saved.fallback_model };
      return json(route, { version, functions: [{ function_id: 'calificacion', label: 'Calificación', stages: [{ ...stage, capability: saved.capability, configured: selection, effective: { ...selection, origin: 'institutional' }, observed: null }] }], providers, models, tools: [], deployment: { editable: false } });
    }
    if (path === '/admin/ai-config-hash') return json(route, { consistent: true, backend_hash: 'synthetic', worker_hash: 'synthetic' });
    if (path === '/admin/ai-audit') return json(route, { logs: [], total: 0 });
    if (path === '/admin/ai-api/connections') return json(route, connection);
    if (path === '/admin/ai-api/models/discover') return json(route, [{ ...originalModel, provider_id: connection.id, model_id: 'future-model', label: 'Modelo futuro', recommended: false }]);
    if (path === '/admin/ai-api/models/probe') {
      probes++;
      if (probes === 1) return json(route, { status: 'error', latency_ms: 20, detail: 'La API no respondió. Se conserva el borrador.' });
      const payload = route.request().postDataJSON();
      return json(route, { status: 'ok', latency_ms: 30, detail: 'Prueba técnica completada.', provider: payload.provider, model: { ...payload.model, verification_id: '00000000-0000-4000-8000-000000000002' } });
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
  test(`116 cambio autónomo con respaldo heredado a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const counters = await mocks(page, false, true);
    await page.goto('/app/admin/configuracion-ia');
    await page.getByRole('combobox', { name: 'Modelo', exact: true }).selectOption('ready-primary');
    const guidance = page.getByRole('alert').filter({ hasText: 'Falta preparar esta selección' });
    await expect(guidance).toContainText('Respaldo: Respaldo anterior');
    await expect(page.getByRole('combobox', { name: 'Proveedor de respaldo', exact: true })).toHaveValue('ollama');
    expect(counters.publications()).toBe(0);
    await page.screenshot({ path: `../output/playwright/spec116-reparacion-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await guidance.getByRole('combobox', { name: 'Elegir respaldo comprobado' }).selectOption(JSON.stringify(['open_code', 'ready-backup']));
    await expect(guidance).toHaveCount(0);
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar configuración', exact: true }).click();
    await expect.poll(counters.publications).toBe(1);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Modelo', exact: true })).toHaveValue('ready-primary');
    await expect(page.getByRole('combobox', { name: 'Modelo de respaldo', exact: true })).toHaveValue('ready-backup');
    expect(counters.probes()).toBe(0);
  });
}

test('116 comprobar un modelo desde la función conserva el borrador ante un fallo', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  const counters = await mocks(page, false, true);
  await page.goto('/app/admin/configuracion-ia');
  await page.getByRole('combobox', { name: 'Modelo', exact: true }).selectOption('new-unprepared');
  await page.getByRole('button', { name: 'Comprobar modelo principal' }).click();
  const dialog = page.getByRole('dialog', { name: 'Comprobar el modelo seleccionado' });
  await expect(dialog.getByLabel('Modelo (identificador exacto)')).toHaveValue('new-unprepared');
  await expect(dialog.getByLabel('API para el modelo')).toHaveValue('open_code');
  await expect(dialog.getByRole('checkbox', { name: /El modelo recibe imágenes/ })).toBeChecked();
  await dialog.getByLabel('Formato de la API').selectOption('responses');
  await dialog.getByRole('button', { name: 'Probar y preparar modelo' }).click();
  await expect(dialog.getByRole('status')).toContainText('Se conserva el borrador');
  await expect(dialog.getByLabel('Modelo (identificador exacto)')).toHaveValue('new-unprepared');
  expect(counters.publications()).toBe(0);
  await page.screenshot({ path: '../output/playwright/spec116-prueba-desde-funcion-360.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Probar y preparar modelo' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Modelo', exact: true })).toHaveValue('new-unprepared');
  await page.getByRole('combobox', { name: 'Elegir respaldo comprobado' }).selectOption(JSON.stringify(['open_code', 'ready-backup']));
  await expect(page.getByRole('combobox', { name: 'Modelo de respaldo', exact: true })).toHaveValue('ready-backup');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar configuración', exact: true }).click();
  await expect.poll(counters.publications).toBe(1);
  expect(counters.probes()).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

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
