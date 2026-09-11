import { expect, test, type Page, type Route } from '@playwright/test';

const admin = {
  id: 'admin-ai-e2e', nombre: 'Administradora IA', email: 'admin@example.test',
  rol: 'admin', estado: 'activo', is_primary_admin: true,
  permissions: ['admin_ai.manage', 'admin_settings.manage'],
};

const provider = {
  id: 'open_code', name: 'open_code', tipo: 'texto', label: 'OpenCode', base_url: null,
  model: 'qwen3.7-plus', active: true, priority: 1, timeout_seconds: 60, max_retries: 2,
  allow_teacher_credentials: true, allow_institutional_fallback: true, config_version: 4,
  auth_configured: true,
};

const model = {
  provider_id: 'open_code', model_id: 'qwen3.7-plus', label: 'Qwen 3.7 Plus',
  capabilities: ['text', 'vision'], recommended: true, active: true,
};

const feature = {
  feature: 'calificacion.valoracion', label: 'Valoración principal', capability: 'text',
  primary_provider: 'open_code', primary_model: 'qwen3.7-plus', fallback_provider: null,
  fallback_model: null, rollout_enabled: true, config_version: 4, active: true,
};

const tool = {
  tool_id: 'taller', label: 'Taller', category: 'Práctica', description: 'Actividad guiada para el aula.',
  aliases: [], uses_ai: true, uses_image_ai: false, generation_enabled: true,
  unavailable_reason: null, pause_reason: null, config_version: 4,
  route_override: null, inherits_from: 'herramientas_educativas',
};

const controlCenter = {
  version: 4,
  functions: [{
    function_id: 'calificacion', label: 'Calificación', stages: [{
      function_id: 'calificacion', function_label: 'Calificación', stage_id: 'grading_primary',
      label: 'Valoración principal', runtime_feature: 'calificacion.valoracion', capability: 'text',
      consumer: 'grading.primary_evaluator', condition: 'Siempre', editable: true,
      inherits_from: null, supported_providers: ['open_code'],
      configured: { provider: 'open_code', model: 'qwen3.7-plus', fallback_provider: null, fallback_model: null, teacher_override_allowed: true, config_version: 4 },
      effective: { provider: 'open_code', model: 'qwen3.7-plus', fallback_provider: null, fallback_model: null, teacher_override_allowed: true, config_version: 4, origin: 'institutional' },
      observed: { provider: 'open_code', model: 'qwen3.7-plus', status: 'completed', at: '2026-09-10T12:00:00Z', origin: 'institutional', config_version: 4, fallback_used: false },
    }, {
      function_id: 'calificacion', function_label: 'Calificación', stage_id: 'normalization',
      label: 'Normalización de nota', runtime_feature: null, capability: 'deterministic',
      consumer: 'grading.normalizer', condition: 'Siempre', editable: false,
      inherits_from: null, supported_providers: [], configured: null, effective: null, observed: null,
    }],
  }],
  tools: [tool], providers: [provider], models: [model],
  deployment: { provider_max_concurrency: 30, slow_warning_seconds: 120, managed_by: 'deployment', editable: false },
};

const settings = {
  version: 4, providers: [provider], models: [model], features: [feature],
  global_config: {
    modelo_llm_default: 'qwen3.7-plus', has_openai_key: false, has_cloudflare: false,
    has_groq_key: false, has_open_code_key: true, has_ollama_key: false,
    credential_sources: { open_code: 'environment' },
  },
  usage: { total_calls: 12, total_tokens_input: 1200, total_tokens_output: 600, total_cost: 0, by_provider: [{ provider: 'open_code', calls: 12, cost: 0 }] },
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installMocks(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/me') return json(route, { user: admin });
    if (path === '/auth/refresh') return json(route, {}, 401);
    if (path === '/users/me/authorization') return json(route, {
      profile: 'admin', is_primary_admin: true, custom_role_id: null, custom_role_name: null,
      role_version: null, auth_version: 1, permissions: admin.permissions,
    });
    if (path === '/admin/ai-settings') return json(route, settings);
    if (path === '/admin/ai-control-center') return json(route, controlCenter);
    if (path === '/admin/ai-control-center/usage') return json(route, {
      period_days: 30, from: '2026-08-12', to: '2026-09-10', sample_size: 12,
      rows: [{ feature: 'grading', stage: 'grading_primary', provider: 'open_code', model: 'qwen3.7-plus', sample_size: 12, successes: 11, failures: 1, p50_ms: 18000, p95_ms: 43000, last_observed_at: '2026-09-10T12:00:00Z', fallback_calls: 0, queue_ms: null, human_review_ms: null }],
    });
    if (path === '/admin/ai-config-hash') return json(route, { backend_hash: 'same', worker_hash: 'same', consistent: true, backend_source: 'database', worker_source: 'database', worker_error: null });
    if (path === '/admin/ai-audit') return json(route, { total: 0, limit: 6, offset: 0, logs: [] });
    if (path === '/admin/ai-control-center/validate') return json(route, { valid: true, errors: [], warnings: [] });
    if (path === '/admin/ai-control-center/publish') return json(route, { status: 'ok', version: 5 });
    return json(route, []);
  });
}

const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

test('centro de control mantiene funciones, herramientas y uso accesibles en ambos temas', async ({ page }) => {
  test.setTimeout(90_000);
  await installMocks(page);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/app/admin/configuracion-ia');
    await expect(page.getByRole('heading', { name: 'Configuración de IA' })).toBeVisible();
    for (const theme of ['light', 'dark'] as const) {
      const isDark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));
      if ((theme === 'dark') !== isDark) await page.getByRole('button', { name: 'Cambiar tema' }).click();
      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      for (const name of ['Funciones', 'Herramientas', 'Proveedores y claves', 'Uso y auditoría']) {
        const button = page.getByRole('button', { name, exact: true });
        const box = await button.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    }
  }

  await page.getByRole('button', { name: 'Herramientas', exact: true }).click();
  await expect(page.getByText('Actividad guiada para el aula.')).toBeVisible();
  await page.getByRole('button', { name: 'Uso y auditoría', exact: true }).click();
  await expect(page.getByText('18.0 s')).toBeVisible();
  await expect(page.getByText('Sin medición')).toHaveCount(2);
});
