import { expect, test, type Page } from '@playwright/test';

const teacher = {
  id: 'profesor-e2e',
  nombre: 'Profesora E2E',
  email: 'profesora@example.test',
  rol: 'profesor',
  estado: 'activo',
  permissions: [
    'subjects.read', 'dba.read', 'evaluations.read', 'evaluations.create',
    'evaluations.update', 'evaluations.publish', 'xali.use',
  ],
};

const student = {
  ...teacher,
  id: 'estudiante-e2e',
  nombre: 'Estudiante E2E',
  email: 'estudiante@example.test',
  rol: 'estudiante',
  permissions: ['subjects.read', 'evaluations.read', 'evaluations.submit'],
};

const materia = {
  id: 'materia-1',
  profesor_id: teacher.id,
  nombre: 'Matemáticas 7',
  area: 'Matemáticas',
  grado: '7',
  descripcion: 'Curso de prueba',
  codigo_matricula: 'MATE01',
  codigo_activo: true,
  requiere_aprobacion: false,
  estado: 'activa',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const dba = {
  id: 'dba-1',
  fuente: 'oficial',
  codigo: 'DBA-1',
  area: 'Matemáticas',
  grado: '7',
  descripcion: 'Resuelve problemas con números racionales.',
};

function generatedEvaluation(name = 'Evaluación IA E2E') {
  return {
    id: 'evaluacion-ia-1',
    materia_id: materia.id,
    profesor_id: teacher.id,
    nombre: name,
    descripcion: null,
    tipo_origen: 'nativa',
    modalidad: 'online',
    nota_maxima: 5,
    estado: 'borrador',
    politica_intento: null,
    intentos_permitidos: null,
    tiempo_limite_minutos: null,
    fecha_publicacion: null,
    dba_ids: [dba.id],
    dba_personalizado_ids: [],
    metas_profesor: [],
    criterios: [],
    preguntas: [
      { numero: 1, tipo: 'opcion_multiple', enunciado: 'Pregunta original uno', opciones: ['A', 'B', 'C'], puntaje: '2', dba_ids: [dba.id] },
      { numero: 2, tipo: 'abierta', enunciado: 'Pregunta original dos', opciones: [], puntaje: '2', dba_ids: [dba.id] },
      { numero: 3, tipo: 'completar', enunciado: 'Pregunta original tres', opciones: [], puntaje: '1', dba_ids: [dba.id] },
    ],
    respuestas_esperadas: [
      { numero: 1, respuesta: 'A', dba_ids: [dba.id] },
      { numero: 2, respuesta: 'Respuesta dos', dba_ids: [dba.id] },
      { numero: 3, respuesta: 'Respuesta tres', dba_ids: [dba.id] },
    ],
    blueprint: { reglas_feedback: { trazabilidad: { generada_por_ia: true, requiere_validacion_docente: true } } },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

async function mockApplication(page: Page, role: 'profesor' | 'estudiante' = 'profesor') {
  let authenticated = false;
  const evaluations: ReturnType<typeof generatedEvaluation>[] = [];
  const activeUser = role === 'profesor' ? teacher : student;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();
    const json = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

    if (path === '/auth/refresh') return json({ detail: 'No session' }, 401);
    if (path === '/auth/login' && method === 'POST') {
      authenticated = true;
      return json({});
    }
    if (path === '/auth/me') {
      return authenticated
        ? json({ user: activeUser })
        : json({ detail: 'No session' }, 401);
    }
    if (path === '/users/me/authorization') return json({
      profile: activeUser.rol, is_primary_admin: false, custom_role_id: null,
      custom_role_name: null, role_version: null, auth_version: 1,
      permissions: activeUser.permissions,
    });
    if (path === '/materias' && method === 'GET') return json([materia]);
    if (path === `/materias/${materia.id}/dba`) return json([dba]);
    if (path === `/materias/${materia.id}/evaluaciones` && method === 'GET') return json(evaluations);
    if (path === '/evaluaciones/generar-borrador' && method === 'POST') return json(generatedEvaluation(), 201);
    if (path === '/evaluaciones/evaluacion-ia-1' && method === 'PATCH') {
      const payload = request.postDataJSON();
      const created = { ...generatedEvaluation(), ...payload };
      evaluations.splice(0, evaluations.length, created);
      return json(created);
    }
    if (path === '/evaluaciones' && method === 'POST') {
      const payload = request.postDataJSON();
      const created = { ...generatedEvaluation('Evaluación manual E2E'), id: 'evaluacion-manual-1', ...payload };
      evaluations.push(created);
      return json(created, 201);
    }
    if (path === '/xali/chat' && method === 'POST') return json({ respuesta: 'Aclara el enunciado.', materia_id: materia.id });
    return json([]);
  });

  return { evaluations };
}

async function loginAndOpenEvaluations(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(teacher.email);
  await page.locator('input[type="password"]').fill('password-for-test');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await expect(page).toHaveURL(/\/app(?:\/materias)?$/);
  await page.goto('/app/evaluaciones');
  await expect(page).toHaveURL(/\/app\/evaluaciones/);
}

async function reachReviewStep(page: Page) {
  await page.getByRole('button', { name: 'Generar con IA' }).first().click();
  await page.getByLabel(/Nombre de la evaluación/i).fill('Evaluación IA E2E');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('checkbox', { name: /Alinear con DBA/i }).check();
  await page.getByRole('button', { name: /DBA-1/i }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByLabel(/Texto de referencia/i).fill('Texto de referencia para las preguntas.');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Generar borrador' }).click();
  await expect(page.getByText('Revisa y edita la evaluación')).toBeVisible();
}

test('profesor completes the six-step AI flow and sees the normal evaluation in the desktop list', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockApplication(page);
  await loginAndOpenEvaluations(page);
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await reachReviewStep(page);

  await page.getByLabel(/Enunciado/i).fill('Pregunta editada por la profesora');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByText('Confirma la evaluación')).toBeVisible();
  await page.getByRole('button', { name: 'Crear evaluación' }).click();

  await expect(page.getByRole('dialog', { name: /Generar evaluación/i })).not.toBeVisible();
  await expect(page.getByText('Evaluación IA E2E').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Editar/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Publicar/i })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('recovers and discards a user-scoped draft after reload', async ({ page }) => {
  await mockApplication(page);
  await loginAndOpenEvaluations(page);
  await page.getByRole('button', { name: 'Generar con IA' }).first().click();
  await page.getByLabel(/Nombre de la evaluación/i).fill('Borrador recuperable');
  await page.getByRole('button', { name: 'Cerrar wizard' }).click();

  await page.reload();
  await page.getByRole('button', { name: 'Generar con IA' }).first().click();
  await expect(page.getByText('Encontramos una evaluación sin terminar.')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByLabel(/Nombre de la evaluación/i)).toHaveValue('Borrador recuperable');
  await page.getByRole('button', { name: 'Cerrar wizard' }).click();

  await page.getByRole('button', { name: 'Generar con IA' }).first().click();
  await page.getByRole('button', { name: 'Descartar' }).click();
  await expect(page.getByRole('dialog', { name: /Generar evaluación/i })).not.toBeVisible();
});

test('student cannot access AI or manual creation controls', async ({ page }) => {
  await mockApplication(page, 'estudiante');
  await loginAndOpenEvaluations(page);
  await expect(page.getByRole('button', { name: 'Generar con IA' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Crear manualmente' })).toHaveCount(0);
});

test('manual creation remains available and the wizard fits a 390x844 viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApplication(page);
  await loginAndOpenEvaluations(page);

  await page.getByRole('button', { name: 'Crear manualmente' }).first().click();
  await page.getByLabel(/^Nombre/i).fill('Evaluación manual E2E');
  await page.getByRole('button', { name: 'Crear manualmente' }).last().click();
  await expect(page.getByText('Evaluación manual E2E')).toBeVisible();

  await page.getByRole('button', { name: 'Generar con IA' }).first().click();
  await expect(page.getByRole('progressbar')).toBeVisible();
  const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noHorizontalOverflow).toBe(true);
});
