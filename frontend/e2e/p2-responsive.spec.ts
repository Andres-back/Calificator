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
  admin: { id: 'admin-e2e', nombre: 'Administradora Prueba', email: 'admin@example.test', rol: 'admin', estado: 'activo' },
  profesor: { id: 'profesor-e2e', nombre: 'Profesor Prueba', email: 'profesor@example.test', rol: 'profesor', estado: 'activo' },
  estudiante: { id: 'estudiante-e2e', nombre: 'Estudiante Prueba', email: 'estudiante@example.test', rol: 'estudiante', estado: 'activo' },
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
    if (path === '/materias/m1/dba' || path === '/materias/m1/dba-personalizados') return fulfillJson(route, []);
    if (path === '/evaluaciones/e1' && method === 'GET') return fulfillJson(route, evaluacion);
    if (path === '/evaluaciones/e1/calificaciones') return fulfillJson(route, []);
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
    if (path === '/xali/history' || path === '/xali/evaluaciones-entregadas') return fulfillJson(route, []);
    if (path === '/admin/ai-settings') return fulfillJson(route, aiSettings);
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
    '/app/materias/m1/calificar', '/app/materias/m1/asistencia', '/app/materias/m1/boletin', '/app/materias/m1/dba',
    '/app/herramientas', '/app/herramientas/nuevo', '/app/herramientas/h1', '/app/calificaciones/workspace',
    '/app/analytics', '/app/presentaciones', '/app/reportes', '/app/xali',
  ],
  estudiante: ['/app', '/app/materias', '/app/evaluaciones', '/app/calificaciones/boletin', '/app/materias/m1', '/app/xali'],
  admin: ['/app', '/app/admin/configuracion-ia', '/app/presentaciones', '/app/reportes', '/app/xali'],
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
      await page.goto('/app');
      await expect(page.locator('main#main-content')).toBeVisible();
      const atmosphere = page.locator('.app-atmosphere');
      await expect(atmosphere).toHaveAttribute('aria-hidden', 'true');
      await expect(atmosphere.locator('img')).toHaveAttribute('src', '/branding/learning-atmosphere-v2.webp');
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

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
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main#main-content')).toBeVisible();
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
for (const viewport of [viewports[1], viewports[4]]) {
  test(`profesor mantiene modo oscuro y responsive en todas sus vistas en ${viewport.name}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installApiMocks(page, 'profesor');

    await page.goto('/login');
    await page.getByLabel(/Correo/i).fill(users.profesor.email);
    await page.locator('input[type="password"]').fill('password-for-test');
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await page.getByRole('button', { name: 'Cambiar tema' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    for (const route of routesByRole.profesor) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expect.poll(
        () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        { message: `profesor oscuro ${viewport.name} presenta overflow horizontal en ${route}` },
      ).toBe(true);
    }
  });
}
