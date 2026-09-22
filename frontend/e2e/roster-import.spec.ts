import { expect, test, type Page, type Route } from '@playwright/test';

const teacher = {
  id: 'teacher-roster-e2e', nombre: 'Docente de prueba', email: 'docente@example.test',
  rol: 'profesor', estado: 'activo', permissions: ['subjects.read', 'subjects.update', 'attendance.read'],
};
const materia = {
  id: 'm1', profesor_id: teacher.id, nombre: 'Ciencias', area: 'Ciencias', grado: '7',
  descripcion: '', codigo_matricula: 'ABC123', codigo_activo: true,
  requiere_aprobacion: false, estado: 'activa', estudiantes: [],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};
const candidate = {
  id: '11111111-1111-4111-8111-111111111111', orden: 1, nombre_detectado: 'Ana Perez',
  nombre_revisado: 'Ana Perez', confianza: 0.95, requiere_revision: false,
  duplicado_confirmado: false, decision: 'crear', estudiante_existente_id: null, advertencias: [],
};

async function json(route: Route, value: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
}

async function installMocks(page: Page) {
  let loggedIn = false;
  let batchCreated = false;
  let confirmed = false;
  let enrolled = false;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const method = route.request().method();
    if (path === '/auth/login') { loggedIn = true; return json(route, {}); }
    if (path === '/auth/me') return loggedIn ? json(route, { user: teacher }) : json(route, { detail: 'Sin sesión' }, 401);
    if (path === '/users/me/authorization') return json(route, { profile: teacher.rol, is_primary_admin: false, custom_role_id: null, custom_role_name: null, role_version: null, auth_version: 1, permissions: teacher.permissions });
    if (path === '/auth/refresh') return json(route, { detail: 'Sin sesión' }, 401);
    if (path === '/materias/m1/estudiantes') return json(route, materia);
    if (path === '/materias/m1') return json(route, materia);
    if (path === '/materias/m1/evaluaciones') return json(route, []);
    if (path === '/materias/m1/estudiantes-existentes') return json(route, [{ id: '22222222-2222-4222-8222-222222222222', nombre: 'Luis Paz', email: 'luis@alumnos.example.test', materias: ['Historia'] }]);
    if (path === '/materias/m1/estudiantes-existentes/matricular' && method === 'POST') { enrolled = true; return json(route, { matriculados: 1, ya_matriculados: 0 }); }
    if (path === '/materias/m1/importaciones-estudiantes' && method === 'GET') return json(route, []);
    if (path === '/materias/m1/importaciones-estudiantes' && method === 'POST') { batchCreated = true; return json(route, { id: 'batch-1', job_id: 'job-1', estado: 'procesando' }, 202); }
    if (path === '/materias/m1/importaciones-estudiantes/batch-1' && method === 'GET') return json(route, { id: 'batch-1', materia_id: 'm1', job_id: 'job-1', archivo_nombre: 'lista.png', estado: 'revision', resultado_json: {}, filas: [candidate], created_at: '2026-01-01T00:00:00Z' });
    if (path === '/materias/m1/importaciones-estudiantes/batch-1' && method === 'PUT') return json(route, { id: 'batch-1', materia_id: 'm1', job_id: 'job-1', archivo_nombre: 'lista.png', estado: 'revision', resultado_json: {}, filas: [candidate], created_at: '2026-01-01T00:00:00Z' });
    if (path === '/materias/m1/importaciones-estudiantes/batch-1/confirmar' && method === 'POST') { confirmed = true; return json(route, { creados: 1, matriculados_existentes: 0, ya_matriculados: 0, omitidos: 0, credenciales: [{ estudiante_id: 'student-1', nombre: 'Ana Perez', email: 'ana@alumnos.xcalificator.daimuz.com', password_temporal: 'ClaveTemporal123!' }], credenciales_mostradas_una_vez: true }); }
    return json(route, []);
  });
  return { created: () => batchCreated, confirmed: () => confirmed, enrolled: () => enrolled };
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(teacher.email);
  await page.locator('input[type="password"]').fill('e2e-password');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await page.goto('/app/materias/m1');
}

for (const viewport of [{ width: 360, height: 800 }, { width: 1366, height: 768 }]) {
  test(`importación revisada funciona en ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const state = await installMocks(page);
    await login(page);
    await page.getByRole('button', { name: 'Importar foto' }).click();
    await expect(page.getByText('Importar estudiantes desde una foto')).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({ name: 'lista.png', mimeType: 'image/png', buffer: Buffer.from('foto-simulada') });
    await expect(page.getByLabel('Nombre del estudiante 1')).toBeVisible();
    await page.getByRole('button', { name: /Confirmar 1 estudiantes/ }).click();
    await expect(page.getByText('ana@alumnos.xcalificator.daimuz.com')).toBeVisible();
    expect(state.created()).toBe(true);
    expect(state.confirmed()).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('reutiliza una cuenta verificada en otra materia', async ({ page }) => {
  const state = await installMocks(page);
  await login(page);
  await page.getByRole('button', { name: 'Ya registrados' }).click();
  await expect(page.getByText('Luis Paz')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Matricular 1/ }).click();
  expect(state.enrolled()).toBe(true);
});
