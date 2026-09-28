import { expect, test, type Page, type Route } from '@playwright/test';
import type { LearningCriteriaSet, LearningCriterion } from '../src/types/api';

const teacher = {
  id: 'teacher-criteria',
  nombre: 'Profesora de prueba',
  email: 'criterios@example.test',
  rol: 'profesor',
  estado: 'activo',
  permissions: ['subjects.read', 'dba.manage'],
};

const materia = {
  id: 'm1',
  profesor_id: teacher.id,
  nombre: 'Lengua castellana',
  area: 'Lengua castellana',
  grado: '5',
  codigo_matricula: 'LENG5',
  estado: 'activa',
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installMocks(page: Page, role: 'profesor' | 'estudiante' = 'profesor', mode: 'light' | 'dark' = 'light') {
  let authenticated = false;
  const actor = role === 'profesor' ? teacher : { ...teacher, rol: role, permissions: ['subjects.read', 'evaluations.read'] };
  const items: LearningCriteriaSet[] = [];
  const calls: string[] = [];
  const timings: number[] = [];

  await page.addInitScript((theme) => {
    localStorage.setItem('xcalificator:tour:profesor:criterios-aprendizaje:v1', 'completed');
    localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: theme }, version: 0 }));
  }, mode);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    calls.push(path);

    if (path === '/auth/login') {
      authenticated = true;
      return json(route, {});
    }
    if (path === '/auth/refresh') return json(route, { detail: 'Sin sesión' }, 401);
    if (path === '/auth/me') {
      return authenticated
        ? json(route, { user: actor })
        : json(route, { detail: 'Sin sesión' }, 401);
    }
    if (path === '/users/me/authorization') {
      return json(route, {
        profile: actor.rol,
        is_primary_admin: false,
        custom_role_id: null,
        custom_role_name: null,
        role_version: null,
        auth_version: 1,
        permissions: actor.permissions,
      });
    }
    if (path === '/materias') return json(route, [materia]);
    if (path === '/herramientas' || path === '/herramientas/materias/m1/recursos' || path === '/dba') return json(route, []);
    if (path === '/materias/m1') return json(route, materia);
    if (path === '/materias/m1/estudiantes') return json(route, { ...materia, estudiantes: [] });
    if (path === '/criterios-aprendizaje/capacidades') {
      return json(route, { ui: true, write: true, generation: true });
    }
    if (path === '/materias/m1/criterios-aprendizaje') {
      if (request.method() === 'POST') {
        const payload = request.postDataJSON();
        const id = `set-${items.length + 1}`;
        const version = {
          id: `version-${items.length + 1}`, set_id: id, version_number: 1, revision: 1, estado: 'borrador' as const,
          intencion_docente: payload.intencion_docente, cobertura: {}, criterios: [], fuentes: [],
          created_at: '2026-09-27T00:00:00Z', updated_at: '2026-09-27T00:00:00Z',
        };
        const value: LearningCriteriaSet = { id, materia_id: 'm1', profesor_id: teacher.id, titulo: payload.titulo,
          estado: 'activo', version_trabajo: version, version_aprobada: null, created_at: version.created_at, updated_at: version.updated_at };
        items.push(value);
        return json(route, value, 201);
      }
      return json(route, { items, total: items.length, limit: 25, offset: 0 });
    }
    const set = items.find((item) => path === `/criterios-aprendizaje/${item.id}`);
    if (set) return json(route, set);
    const working = items.find((item) => path.startsWith(`/criterios-aprendizaje/versiones/${item.version_trabajo?.id}`));
    if (working?.version_trabajo) {
      const version = working.version_trabajo;
      if (path.endsWith('/fuentes/texto')) {
        version.fuentes.push({ id: 'source-1', tipo: 'texto', display_name: 'Apuntes privados',
          orden: 1, visible_to_student: false, page_count: 1, extraction_status: 'pendiente' });
        return json(route, version.fuentes[0], 201);
      }
      if (path.endsWith('/proponer')) {
        const started = performance.now();
        version.estado = 'procesando';
        await json(route, { job_id: 'job-1', estado: 'queued' }, 202);
        timings.push(performance.now() - started);
        return;
      }
      if (path.endsWith('/aprobar')) {
        version.estado = 'aprobada';
        working.version_aprobada = structuredClone(version);
        working.version_trabajo = null;
        return json(route, working);
      }
      if (request.method() === 'PATCH') {
        const payload = request.postDataJSON();
        Object.assign(version, { criterios: payload.criterios, intencion_docente: payload.intencion_docente, revision: version.revision + 1 });
        return json(route, working);
      }
    }
    if (path === '/materias/m1/dba' || path === '/materias/m1/dba-personalizados') {
      return json(route, []);
    }
    if (path === '/calificaciones/bandeja-docente') {
      return json(route, { items: [], total: 0, solicitudes_revision: 0, pendientes_calificacion: 0 });
    }
    if (path === '/analytics/evento') return json(route, {}, 201);

    return json(route, {});
  });
  return {
    calls, timings,
    completeProposal() {
      const version = items.at(-1)?.version_trabajo;
      if (!version) throw new Error('Sin propuesta pendiente');
      version.estado = 'requiere_revision';
      version.asistida_ia = true;
      version.criterios = [{ stable_key: 'comprension', orden: 1, nombre: 'Comprensión literal',
        descripcion: 'Reconoce información explícita del texto.', evidencia_esperada: 'Respuesta sustentada en el texto.',
        peso_porcentaje: 100, niveles: [], source_refs: [{ source_id: 'source-1', pagina: 1 }], official_standard_refs: [] } satisfies LearningCriterion];
    },
  };
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(teacher.email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await expect(page).toHaveURL(/\/app/);
}

async function assertLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  const dialog = page.getByRole('dialog');
  if (await dialog.count()) {
    const box = await dialog.boundingBox();
    const size = page.viewportSize()!;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 1);
  }
}

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  for (const mode of ['light', 'dark'] as const) {
    test(`manual y asistido, ${viewport.width}px, ${mode}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const fixture = await installMocks(page, 'profesor', mode);
      const failures: string[] = [];
      page.on('pageerror', (error) => failures.push(error.message));
      await login(page);
      await page.goto('/app/materias/m1/criterios');
      await page.getByRole('button', { name: 'Definir qué voy a evaluar' }).first().click();
      await page.getByRole('button', { name: /Escribir lo que enseñé/ }).click();
      await page.getByLabel('Nombre del conjunto').fill('Lectura manual');
      await page.getByLabel('¿Qué quieres evaluar?').fill('Comprender la información explícita del texto');
      await page.getByRole('button', { name: 'Crear manualmente' }).click();
      await page.getByLabel('Nombre del criterio').fill('Identifica información');
      await page.getByLabel('¿Qué aprendizaje observable esperas?').fill('Reconoce los personajes y acciones narradas.');
      await page.getByLabel('¿Qué evidencia debe mostrar el estudiante?').fill('Respuestas relacionadas con el texto leído.');
      await assertLayout(page);
      await page.getByRole('button', { name: 'Revisar', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Qué vas a aprobar' })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('revision.png'), fullPage: true });
      await page.getByRole('button', { name: 'Aprobar criterios' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'Ver aprobada' }).click();
      await expect(page.getByLabel('Nombre del criterio')).toBeDisabled();
      await page.getByRole('button', { name: 'Revisar', exact: true }).click();
      await page.getByRole('button', { name: 'Cerrar versión aprobada' }).click();
      await page.getByRole('button', { name: 'Definir qué voy a evaluar' }).first().click();
      await page.getByRole('button', { name: /Usar foto, PDF o material/ }).click();
      await page.getByLabel('Nombre de la referencia').fill('Texto de clase');
      await page.getByPlaceholder('Pega un fragmento del libro, tus apuntes o una explicación trabajada en clase…').fill('Nico observa las nubes y las casas desde el avión.');
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByLabel('Nombre del conjunto').fill('Lectura asistida');
      await page.getByLabel('¿Qué quieres evaluar?').fill('Comprender personajes y emociones del relato');
      await page.getByRole('button', { name: 'Proponer con IA' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByText('Estamos leyendo el material. Puedes seguir navegando.')).toBeVisible();
      fixture.completeProposal();
      await page.reload();
      await page.getByRole('button', { name: 'Revisar y editar' }).click();
      await page.getByLabel('Nombre del criterio').fill('Comprensión revisada por el docente');
      await page.getByRole('button', { name: 'Revisar', exact: true }).click();
      await assertLayout(page);
      await page.getByRole('button', { name: 'Aprobar criterios' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(fixture.timings).toHaveLength(1);
      expect(fixture.timings[0]).toBeLessThan(2000); // Contract mock latency, not provider performance.
      expect(failures).toEqual([]);
    });
  }
}

test('alias preserva query/hash y estudiante no solicita fuentes ni administración', async ({ page }) => {
  await installMocks(page);
  await login(page);
  await page.goto('/app/materias/m1/dba?origen=historico#seccion');
  await expect(page).toHaveURL(/\/criterios\?origen=historico#seccion$/);
  await page.unroute('**/api/**');
  const student = await installMocks(page, 'estudiante');
  await login(page);
  await page.goto('/app/materias/m1/criterios');
  await expect(page).toHaveURL(/\/app\/403$/);
  expect(student.calls.some((path) => path.includes('criterios-aprendizaje') || path.includes('/estudiantes'))).toBeFalsy();
});

test('docente inicia criterios de aprendizaje con tres opciones claras en celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(page);

  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(teacher.email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await expect(page).toHaveURL(/\/app/);

  await page.goto('/app/materias/m1/criterios');
  await expect(page.getByRole('heading', { name: 'Criterios de aprendizaje', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Definir qué voy a evaluar' }).first().click();

  await expect(page.getByRole('heading', { name: '¿Cómo quieres empezar?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Usar foto, PDF o material/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Escribir lo que enseñé/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Usar criterios que ya tengo/ })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});
