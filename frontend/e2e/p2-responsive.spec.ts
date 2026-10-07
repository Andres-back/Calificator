import { expect, test, type Page, type Route } from '@playwright/test';

type Role = 'admin' | 'profesor' | 'estudiante';

const viewports = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
] as const;

const users = {
  admin: { id: 'admin-e2e', nombre: 'Administradora Prueba', email: 'admin@example.test', rol: 'admin', estado: 'activo', permissions: ['admin_ai.manage', 'admin_settings.manage', 'presentations.read', 'reports.read', 'xali.use'] },
  profesor: {
    id: 'profesor-e2e', nombre: 'Profesor Prueba', email: 'profesor@example.test', rol: 'profesor', estado: 'activo',
    permissions: [
      'subjects.read', 'subjects.create', 'subjects.update',
      'dba.read', 'dba.manage', 'attendance.read', 'attendance.manage',
      'evaluations.read', 'evaluations.create', 'evaluations.update', 'evaluations.delete', 'evaluations.publish',
      'resources.read', 'resources.create', 'resources.update', 'resources.delete', 'resources.assign',
      'presentations.read', 'presentations.create', 'presentations.update', 'presentations.delete',
      'submissions.read', 'submissions.review', 'grading.read', 'grading.grade', 'grading.publish',
      'gradebook.read', 'reports.read', 'xali.use', 'ai_settings.personal',
    ],
  },
  estudiante: {
    id: 'estudiante-e2e', nombre: 'Estudiante Prueba', email: 'estudiante@example.test', rol: 'estudiante', estado: 'activo',
    permissions: ['subjects.read', 'subjects.enroll', 'dba.read', 'evaluations.read', 'evaluations.submit', 'resources.read', 'presentations.read', 'grading.read', 'gradebook.read', 'xali.use'],
  },
} as const;

const materia = {
  id: 'm1', profesor_id: users.profesor.id, nombre: 'Matemáticas 8°', area: 'Matemáticas', grado: '8°',
  descripcion: 'Curso de prueba para validación responsive.', codigo_matricula: 'MATE-8', codigo_activo: true,
  requiere_aprobacion: false, estado: 'activa', created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
};

const evaluacion = {
  id: 'e1', materia_id: 'm1', profesor_id: users.profesor.id, nombre: 'Fracciones', descripcion: 'Evaluación de fracciones',
  tipo_origen: 'manual', modalidad: 'online', nota_maxima: 5, estado: 'publicada', tiempo_limite_minutos: 45,
  fecha_publicacion: '2026-07-20T00:00:00Z', dba_ids: [], dba_personalizado_ids: [], metas_profesor: [],
  criterios: [], preguntas: [], respuestas_esperadas: [], created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-20T00:00:00Z',
};

const material = {
  id: 'h1', tipo: 'guia', titulo: 'Guía de fracciones', materia_id: 'm1', materia_nombre: materia.nombre,
  evaluacion_id: null, evaluacion_estado: null, evaluacion_modalidad: null, archivo_url: null,
  contenido_json: { titulo: 'Guía de fracciones', instrucciones: 'Resuelve paso a paso.', secciones: [] },
  created_at: '2026-07-20T00:00:00Z',
};

const analyticsOverview = {
  periodo: { desde: '2026-07-01', hasta: '2026-07-31' }, evaluaciones_activas: 1,
  entregas: { total: 2, pendientes_revision: 1, confirmadas: 1, publicadas: 1 },
  ia: { coincidencia_exacta: 0.85, tasa_ajustes: 0.1, confianza_promedio: 0.88, incidencias_abiertas: 0 },
  productividad: { tiempo_revision_segundos: 180, tiempo_promedio_por_entrega: 90, tiempo_estimado_ahorrado_segundos: 180, entregas_con_tiempo: 2 },
};
const aiSettings = {
  providers: [{
    id: 'openai', name: 'openai', tipo: 'texto', label: 'OpenAI', base_url: null, model: 'gpt-4.1-mini', active: true,
    priority: 1, timeout_seconds: 30, max_retries: 2, auth_configured: true, last_test_status: 'ok',
    last_test_latency_ms: 180, last_test_http_code: 200, last_test_error: null, last_test_at: '2026-07-25T00:00:00Z',
  }],
  features: [{ feature: 'xali', label: 'Xali', primary_provider: 'openai', fallback_provider: null, active: true }],
  global_config: { modelo_llm_default: 'gpt-4.1-mini', has_openai_key: true, has_cloudflare: false, has_groq_key: false, has_open_code_key: false, credential_sources: { openai: 'database' } },
  usage: { total_calls: 42, total_tokens_input: 1200, total_tokens_output: 800, total_cost: 0.12, by_provider: [{ provider: 'openai', calls: 42, cost: 0.12 }] },
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installApiMocks(page: Page, targetRole: Role) {
  let currentUser: (typeof users)[Role] | null = null;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();

    if (path === '/auth/login' && method === 'POST') {
      currentUser = users[targetRole];
      return fulfillJson(route, {});
    }
    if (path === '/auth/me') return currentUser ? fulfillJson(route, { user: currentUser }) : fulfillJson(route, { detail: 'Sin sesión' }, 401);
    if (path === '/users/me/authorization' && currentUser) return fulfillJson(route, {
      profile: currentUser.rol, is_primary_admin: currentUser.rol === 'admin',
      custom_role_id: null, custom_role_name: null, role_version: null,
      auth_version: 1, permissions: currentUser.permissions,
    });
    if (path === '/auth/refresh') return fulfillJson(route, { detail: 'Sin sesión' }, 401);
    if (path === '/auth/logout') { currentUser = null; return fulfillJson(route, {}); }

    if (path === '/materias') return fulfillJson(route, [materia]);
    if (path === '/materias/m1') return fulfillJson(route, materia);
    if (path === '/materias/m1/estudiantes') return fulfillJson(route, { ...materia, estudiantes: [users.estudiante] });
    if (path === '/materias/m1/evaluaciones') return fulfillJson(route, [evaluacion]);
    if (path === '/materias/m1/asistencia') return fulfillJson(route, {
      materia_id: 'm1', fecha: url.searchParams.get('fecha') ?? '2026-08-09', registros: [],
      resumen: { total: 0, presentes: 0, tarde: 0, ausentes: 0, excusas: 0, pendientes: 0 },
    });
    if (path === '/materias/m1/asistencia/reporte') return fulfillJson(route, {
      materia_id: 'm1', fecha_desde: url.searchParams.get('fecha_desde') ?? '2026-08-01',
      fecha_hasta: url.searchParams.get('fecha_hasta') ?? '2026-08-09', jornadas_registradas: 0,
      resumen: { total_registros: 0, presentes: 0, tarde: 0, ausentes: 0, excusas: 0, porcentaje_asistencia: 0 },
      estudiantes: [], jornadas: [],
    });
    if (path === '/materias/m1/dba-personalizados' && method === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, 75));
      return fulfillJson(route, {
        id: 'dba-e2e', materia_id: 'm1', enunciado: 'Comprende y compara fracciones equivalentes.',
        evidencias_aprendizaje: 'Explica el procedimiento con un ejemplo.',
        ejemplo: 'Representa un medio y dos cuartos.', activo: true, created_at: '2026-08-24T00:00:00Z',
      }, 201);
    }
    if (path === '/materias/m1/dba' || path === '/materias/m1/dba-personalizados') return fulfillJson(route, []);
    if (path === '/evaluaciones/e1' && method === 'GET') return fulfillJson(route, evaluacion);
    if (path === '/evaluaciones/e1/calificaciones') return fulfillJson(route, []);
    if (path === '/evaluaciones/e1/revision') return fulfillJson(route, { evaluacion_id: 'e1', materia_id: 'm1', total_alumnos: 0, siguiente_cursor: null, alumnos: [], contadores: { todas: 0, pendientes: 0, alertas: 0, procesando: 0, publicadas: 0 } });
    if (path === '/calificaciones/bandeja-docente') return fulfillJson(route, {
      reclamos_abiertos: 0, pendientes_revision: 0, reclamos: [], pendientes: [],
    });
    if (path.startsWith('/estudiantes/') && path.endsWith('/resumen-academico')) return fulfillJson(route, { mejor: { materia_id: 'm1', materia_nombre: materia.nombre, promedio: 4.4, total_notas: 2 }, por_mejorar: null, promedio_general: 4.4, total_materias: 1, total_notas: 2 });
    if (path.startsWith('/estudiantes/') && path.endsWith('/boletin')) return fulfillJson(route, []);
    if (path === '/herramientas') return fulfillJson(route, [material]);
    if (path === '/herramientas/h1') return fulfillJson(route, material);
    if (path === '/herramientas/h1/evaluaciones') return fulfillJson(route, []);
    if (path === '/presentaciones') return fulfillJson(route, []);
    if (path === '/reportes/profesor/resumen') return fulfillJson(route, { profesor_id: users.profesor.id, materias: [{ nombre: materia.nombre, total_calificaciones: 2, promedio: 4.4 }] });
    if (path === '/analytics/overview') return fulfillJson(route, analyticsOverview);
    if (path === '/analytics/evaluaciones') return fulfillJson(route, [{ id: 'e1', nombre: evaluacion.nombre, estado: 'publicada', total_entregas: 2, pendientes: 1, confirmadas: 1, publicadas: 1, promedio: 4.2, tasa_aprobacion: 0.8 }]);
    if (path === '/impacto/estudios/disponibilidad') return fulfillJson(route, { enabled: true });
    if (path === '/impacto/estudios') return fulfillJson(route, [{ id: 'study-1', nombre: 'Piloto sintético', estado: 'draft', synthetic_only: true, version: 1, participant_count: 0, created_at: '2026-09-09T00:00:00Z' }]);
    if (path === '/impacto/estudios/study-1') return fulfillJson(route, { id: 'study-1', nombre: 'Piloto sintético', estado: 'draft', synthetic_only: true, version: 1, participant_count: 0, created_at: '2026-09-09T00:00:00Z', protocol: {} });
    if (path === '/impacto/estudios/study-1/indicadores') return fulfillJson(route, { observations_current: 4, missing_count: 1, time_savings: { available: true, paired_units: 2, mean_percent: -8.5, reason: null }, kappa_independent: { available: false, value: null, reason: 'insufficient_sample', n: 1 }, exposed_grade_pairs: 3, feedback_quality: { available: true, n: 2, mean: 4.2 } });
    if (path === '/impacto/estudios/study-1/observaciones') return fulfillJson(route, { items: [{ external_id: 'obs-1', revision: 1, teacher_pseudonym: 'doc-a1', condition: 'asistida', observed_at: '2026-09-09T00:00:00Z', payload: { type: 'timing' }, missing_reason: null, exclusion_reason: null }], page: 1, page_size: 20, total: 1 });
    if (path === '/impacto/estudios/study-1/activar' && method === 'POST') return fulfillJson(route, { id: 'study-1', nombre: 'Piloto sintético', estado: 'active', synthetic_only: true, version: 2, participant_count: 0, created_at: '2026-09-09T00:00:00Z' });
    if (path === '/xali/history' || path === '/xali/evaluaciones-entregadas') return fulfillJson(route, []);
    if (path === '/admin/ai-settings') return fulfillJson(route, aiSettings);
    if (path === '/admin/ai-control-center') return fulfillJson(route, {
      version: 1, functions: [], tools: [], providers: aiSettings.providers, models: [],
      deployment: { provider_max_concurrency: 3, slow_warning_seconds: 120, managed_by: 'deployment', editable: false },
    });
    if (path === '/admin/ai-control-center/usage') return fulfillJson(route, { period_days: 30, from: '2026-07-01', to: '2026-07-31', sample_size: 0, rows: [] });
    if (path === '/admin/ai-config-hash') return fulfillJson(route, { backend_hash: 'abc', worker_hash: 'abc', consistent: true, backend_source: 'database', worker_source: 'database', worker_error: null });
    if (path === '/admin/ai-audit') return fulfillJson(route, { total: 0, limit: 8, offset: 0, logs: [] });
    if (path === '/admin/ai-usage') return fulfillJson(route, aiSettings.usage);
    if (path === '/dba') return fulfillJson(route, []);

    return fulfillJson(route, method === 'GET' ? [] : { status: 'ok' });
  });
}

const routesByRole: Record<Role, string[]> = {
  profesor: [
    '/app', '/app/materias', '/app/evaluaciones', '/app/materias/m1', '/app/materias/m1/evaluaciones',
    '/app/materias/m1/recursos', '/app/materias/m1/calificar', '/app/materias/m1/asistencia', '/app/materias/m1/boletin', '/app/materias/m1/dba',
    '/app/herramientas', '/app/herramientas/nuevo', '/app/herramientas/h1', '/app/calificaciones/workspace',
    '/app/analytics', '/app/presentaciones', '/app/reportes', '/app/xali',
  ],
  estudiante: ['/app', '/app/materias', '/app/evaluaciones', '/app/calificaciones/boletin', '/app/materias/m1', '/app/xali'],
  admin: ['/app', '/app/admin/configuracion-ia', '/app/analytics', '/app/presentaciones', '/app/reportes', '/app/xali'],
};

for (const role of ['profesor', 'estudiante', 'admin'] as const) {
  for (const viewport of viewports) {
    test(`${role} es usable en ${viewport.name} sin overflow general`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installApiMocks(page, role);
      const errors: string[] = [];

      await page.goto('/login');
      await expect(page.getByRole('button', { name: /Iniciar sesión/i })).toBeVisible();
      await page.getByLabel(/Correo/i).fill(users[role].email);
      await page.locator('input[type="password"]').fill('password-for-test');
      await page.getByRole('button', { name: /Iniciar sesión/i }).click();
      await expect(page).toHaveURL(/\/app$/);
      await expect(page.locator('main#main-content')).toBeVisible();
      await page.waitForLoadState('networkidle');
      const atmosphere = page.locator('.app-atmosphere');
      await expect(atmosphere).toHaveAttribute('aria-hidden', 'true');
      await expect(atmosphere.locator('img')).toHaveAttribute('src', '/branding/learning-atmosphere-v2.webp');
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('requestfailed', (request) => errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));

      if (viewport.width < 1024) {
        const menuButton = page.getByRole('button', { name: 'Abrir menú principal' });
        await menuButton.click();
        await expect(page.getByRole('button', { name: 'Cerrar menú principal' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Cerrar menú principal' })).toBeHidden();
        await expect(menuButton).toBeFocused();
      }

      await page.screenshot({ path: `../output/playwright/p2/${role}-dashboard-${viewport.name}.png`, fullPage: true });

      for (const route of routesByRole[role]) {
        // Login already navigated to /app. Reloading it here cancels lazy
        // dashboard images/queries; normal in-app navigation does not reload it.
        if (new URL(page.url()).pathname !== route) await page.goto(route);
        await expect(page.locator('main#main-content')).toBeVisible();
        // The shell is visible before its lazy page and queries finish. Navigate
        // only after the page settles, otherwise WebKit aborts pending modules.
        await expect(page.locator('main#main-content').getByText('Cargando…', { exact: true })).toHaveCount(0);
        await page.waitForLoadState('networkidle');
        if (role === 'profesor' && viewport.width <= 390 && new URL(page.url()).pathname.startsWith('/app/materias/m1')) {
          for (const element of [page.getByRole('heading', { name: materia.nombre, exact: true }), page.getByRole('combobox', { name: 'Sección de la materia' })]) {
            const bounds = (await element.boundingBox())!;
            expect(bounds.y).toBeGreaterThanOrEqual(0);
            expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
          }
        }
        await expect.poll(
          () => page.evaluate(() => {
            const documentWidth = document.documentElement.scrollWidth;
            if (documentWidth <= window.innerWidth + 1) return 'ok';
            const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                  tag: element.tagName.toLowerCase(),
                  id: element.id,
                  className: element.className.toString().slice(0, 120),
                  left: Math.round(rect.left),
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                };
              })
              .filter(({ left, right }) => left < -1 || right > window.innerWidth + 1)
              .slice(0, 10);
            return JSON.stringify({ viewport: window.innerWidth, documentWidth, offenders });
          }),
          { message: `${role} ${viewport.name} presenta overflow horizontal en ${route}` },
        ).toBe('ok');
      }

      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
}
for (const viewport of viewports.filter((item) => item.width !== 1024)) {
test(`criterios guardan y reabren sin escribir preguntas ni notas en ${viewport.name}`, async ({ page }) => {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  if (viewport.width === 390) await page.addInitScript(() => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: 'dark' }, version: 0 })));
  await installApiMocks(page, 'profesor');
  let saved = { ...evaluacion };
  const writes: Record<string, unknown>[] = [];
  const item = { id: 'criterion-084', materia_id: 'm1', enunciado: 'Reconoce fracciones equivalentes', activo: true, created_at: '2026-10-05T10:00:00Z' };
  let created = false;
  await page.route('**/api/materias/m1/dba-personalizados', async (route) => {
    if (route.request().method() === 'POST') { created = true; return fulfillJson(route, item, 201); }
    return fulfillJson(route, created ? [item] : []);
  });
  await page.route('**/api/materias/m1/dba', (route) => fulfillJson(route, created ? [{ ...item, fuente: 'personalizado', codigo: null, descripcion: item.enunciado }] : []));
  await page.route('**/api/materias/m1/evaluaciones', (route) => fulfillJson(route, [saved]));
  await page.route('**/api/evaluaciones/e1', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      writes.push(body); saved = { ...saved, ...body, updated_at: '2026-10-05T15:00:00Z' };
    }
    return fulfillJson(route, saved);
  });
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(users.profesor.email);
  await page.locator('input[type="password"]').fill('password-for-test');
  await page.getByRole('button', { name: /Iniciar sesión/i }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.waitForLoadState('networkidle');
  await page.goto('/app/materias/m1/evaluaciones');
  await page.getByRole('button', { name: 'Criterios y rúbrica' }).click();
  await page.getByText('Crear criterio de aprendizaje', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Qué aprenderá el estudiante' }).fill(item.enunciado);
  await page.getByRole('button', { name: 'Crear y seleccionar' }).click();
  await expect(page.getByRole('button', { name: /Reconoce fracciones equivalentes/ })).toHaveAttribute('aria-pressed', 'true');
  if (viewport.width <= 390) {
    await page.setViewportSize({ width: viewport.width, height: 420 });
    const saveButton = page.getByRole('button', { name: 'Guardar criterios' });
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.focus();
    await expect(saveButton).toBeFocused();
    const rect = (await saveButton.boundingBox())!;
    expect(rect.y + rect.height).toBeLessThanOrEqual(420);
  }
  await page.getByRole('button', { name: 'Guardar criterios' }).click();
  await expect(page.getByRole('button', { name: 'Guardar criterios' })).toHaveCount(0);
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  expect(writes).toEqual([{ expected_updated_at: evaluacion.updated_at, dba_personalizado_ids: [item.id] }]);
  await page.getByRole('button', { name: 'Criterios y rúbrica' }).click();
  await expect(page.getByRole('button', { name: /Reconoce fracciones equivalentes/ })).toHaveAttribute('aria-pressed', 'true');
  expect(saved.preguntas).toEqual(evaluacion.preguntas);
  expect(saved.respuestas_esperadas).toEqual(evaluacion.respuestas_esperadas);
});
}

test('profesor recorre la materia, califica desde su evaluación y escribe un DBA sin perder la página', async ({ page, browserName }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiMocks(page, 'profesor');
  const errors: string[] = [];

  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(users.profesor.email);
  await page.locator('input[type="password"]').fill('password-for-test');
  await page.getByRole('button', { name: /Iniciar sesión/i }).click();
  await page.goto('/app/materias/m1');
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await expect(page.getByRole('combobox', { name: 'Sección de la materia' }).locator('option', { hasText: /^Calificar$/ })).toHaveCount(0);
  await expect(page.getByText('Información de la materia').locator('..')).not.toHaveAttribute('open');
  await expect(page.getByText('Guía opcional de la materia').locator('..')).not.toHaveAttribute('open');
  await expect(page.getByRole('button', { name: 'Importar foto' })).toBeVisible();
  for (const tab of ['Vista general', 'Evaluaciones', 'Recursos', 'Asistencia', 'Boletín', 'Criterios de aprendizaje']) {
    await page.getByRole('combobox', { name: 'Sección de la materia' }).selectOption({ label: tab });
    await expect(page.locator('main#main-content')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    if (tab === 'Evaluaciones') {
      await page.getByRole('button', { name: 'Notas y entregas', exact: true }).click();
      await expect(page).toHaveURL(/\/app\/calificaciones\?/);
      const context = new URL(page.url()).searchParams;
      expect(context.get('materia')).toBe('m1');
      expect(context.get('evaluacion')).toBe('e1');
      await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
      await page.getByRole('link', { name: 'Volver a evaluaciones', exact: true }).click();
      await expect(page).toHaveURL(/\/app\/materias\/m1\/evaluaciones$/);
    }
  }

  await page.getByRole('button', { name: 'Nuevo criterio', exact: true }).first().click();
  await page.getByPlaceholder(/Comprende la relación/i).pressSequentially('Comprende y compara fracciones equivalentes.');
  await page.getByPlaceholder(/Identifica factores/i).fill('Explica el procedimiento con un ejemplo.');
  await page.getByPlaceholder(/Al visitar un humedal/i).fill('Representa un medio y dos cuartos.');
  await expect(page.getByRole('button', { name: 'Crear criterio', exact: true })).toBeEnabled();
  const createButton = page.getByRole('button', { name: 'Crear criterio', exact: true });
  if (browserName === 'webkit') {
    // WebKit observa el cierre inmediato del modal como un detach durante click();
    // dispatchEvent valida el mismo manejador sin el falso requisito de estabilidad visual.
    await createButton.dispatchEvent('click');
  } else {
    await createButton.click();
  }
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(errors, errors.join('\n')).toEqual([]);
});

for (const viewport of viewports.filter((item) => item.width !== 1024)) {
for (const theme of ['light', 'dark']) {
test(`asistencia sin superposición ${viewport.name} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.addInitScript((mode) => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
  await installApiMocks(page, 'profesor');
  await page.route('**/api/materias/m1/asistencia?**', (route) => fulfillJson(route, {
    materia_id: 'm1', fecha: new URL(route.request().url()).searchParams.get('fecha'),
    registros: Array.from({ length: 30 }, (_, index) => ({
      estudiante_id: `student-${index}`,
      estudiante_nombre: `Estudiante ${index + 1}`,
      estudiante_email: `student${index}@example.test`,
      estado: null,
      observacion: null,
    })),
    resumen: { total: 30, presentes: 0, tarde: 0, ausentes: 0, excusas: 0, pendientes: 30 },
  }));

  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(users.profesor.email);
  await page.locator('input[type="password"]').fill('password-for-test');
  await page.getByRole('button', { name: /Iniciar sesión/i }).click();
  await page.goto('/app/materias/m1/asistencia');

  const summaryCard = page.getByLabel('Resumen y guardado de asistencia');
  await expect(summaryCard).toBeVisible();
  expect(await summaryCard.evaluate((element) => getComputedStyle(element).position)).toBe('relative');
  const detail = summaryCard.locator('details');
  await expect(detail).not.toHaveAttribute('open');
  if (viewport.width === 390) expect((await summaryCard.boundingBox())!.height).toBeLessThanOrEqual(160);
  if (viewport.width === 390 && theme === 'dark') {
    console.log(`ASISTENCIA_079_RESUMEN_390_ALTURA=${(await summaryCard.boundingBox())!.height}`);
    await summaryCard.screenshot({ path: '../output/playwright/teacher-flow/attendance-079-390-dark.png' });
  }
  await summaryCard.scrollIntoViewIfNeeded();
  const before = (await summaryCard.boundingBox())!.y;
  await summaryCard.hover();
  await page.mouse.wheel(0, 900);
  await expect.poll(async () => (await summaryCard.boundingBox())!.y).toBeLessThan(before - 20);
  await expect(page.getByRole('heading', { name: /Reporte de asistencia/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await detail.locator('summary').focus();
  await detail.locator('summary').press('Enter');
  await expect(detail).toHaveAttribute('open');
  await expect(summaryCard.getByText('Presentes', { exact: true })).toBeVisible();
  await detail.locator('summary').press('Enter');
  // Zoom del contenido real (CSS zoom), no deviceScaleFactor: exige reflujo y acceso.
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await summaryCard.scrollIntoViewIfNeeded();
  expect(await summaryCard.evaluate((element) => getComputedStyle(element).position)).toBe('relative');
  await expect(summaryCard.getByRole('status')).toBeInViewport();
  expect(await summaryCard.getByRole('status').evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  const zoomLayout = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, inner: window.innerWidth,
    boxes: ['html', 'body', '#root', 'header', 'main'].map((selector) => {
      const element = document.querySelector<HTMLElement>(selector)!;
      const bounds = element.getBoundingClientRect();
      return { selector, width: bounds.width, right: bounds.right, scroll: element.scrollWidth, client: element.clientWidth, zoom: getComputedStyle(element).zoom };
    }),
    overflowing: Array.from(document.querySelectorAll<HTMLElement>('main *')).filter((element) => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1 && !element.closest('details:not([open])')).slice(0, 20).map((element) => ({ tag: element.tagName, text: element.textContent?.slice(0, 35), className: element.className, client: element.clientWidth, scroll: element.scrollWidth })),
    offenders: Array.from(document.querySelectorAll('main *')).filter((element) => !element.closest('details:not([open])') && element.getBoundingClientRect().right > window.innerWidth + 1 && element.getBoundingClientRect().width > 0).sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right).slice(0, 12).map((element) => ({ tag: element.tagName, text: element.textContent?.slice(0, 70), className: element.className, right: element.getBoundingClientRect().right })),
  }));
  if (viewport.width === 360 && theme === 'light') await page.screenshot({ path: '../output/playwright/teacher-flow/attendance-079-zoom.png', fullPage: false });
  expect(zoomLayout.scroll <= zoomLayout.client + 1, JSON.stringify(zoomLayout)).toBe(true);
});
}
}

test('el estudio solo aparece al administrador autorizado y diferencia sus métricas', async ({ page }) => {
  await installApiMocks(page, 'admin');
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(users.admin.email);
  await page.locator('input[type="password"]').fill('password-for-test');
  await page.getByRole('button', { name: /Iniciar sesión/i }).click();
  await page.goto('/app/analytics');
  await page.getByRole('button', { name: 'Estudio de impacto' }).click();

  await expect(page.getByRole('heading', { name: 'Medición separada de las notas' })).toBeVisible();
  await expect(page.getByText('-8.5%')).toBeVisible();
  await expect(page.getByText('Kappa independiente · n=1')).toBeVisible();
  await expect(page.getByText(/Los pares expuestos a la sugerencia \(3\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Activar sintético' }).click();
  await expect(page.getByText('Piloto sintético activado.')).toBeVisible();
});

test('el docente con reportes no ve controles de estudio', async ({ page }) => {
  await installApiMocks(page, 'profesor');
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(users.profesor.email);
  await page.locator('input[type="password"]').fill('password-for-test');
  await page.getByRole('button', { name: /Iniciar sesión/i }).click();
  await page.goto('/app/analytics');
  await expect(page.getByRole('button', { name: 'Estudio de impacto' })).toHaveCount(0);
});
for (const viewport of [viewports[1], viewports[4]]) {
  test(`profesor mantiene modo oscuro y responsive en todas sus vistas en ${viewport.name}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installApiMocks(page, 'profesor');

    await page.goto('/login');
    await page.getByLabel(/Correo/i).fill(users.profesor.email);
    await page.locator('input[type="password"]').fill('password-for-test');
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.locator('main#main-content')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Cambiar tema' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

    for (const route of routesByRole.profesor) {
      if (new URL(page.url()).pathname !== route) await page.goto(route);
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('main#main-content').getByText('Cargando…', { exact: true })).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expect.poll(
        () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        { message: `profesor oscuro ${viewport.name} presenta overflow horizontal en ${route}` },
      ).toBe(true);
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
}
