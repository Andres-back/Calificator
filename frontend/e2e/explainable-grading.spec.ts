import { expect, test, type Page, type Route } from '@playwright/test';

const teacher = { id: 'p1', nombre: 'Profesora Prueba', email: 'profesora@example.test', rol: 'profesor', estado: 'activo', permissions: ['subjects.read', 'evaluations.read', 'grading.read', 'grading.grade', 'grading.publish'] };
const student = { id: 's1', nombre: 'Estudiante Prueba', email: 'estudiante@example.test', rol: 'estudiante', estado: 'activo', permissions: ['subjects.read', 'evaluations.read', 'evaluations.submit', 'grading.read', 'gradebook.read'] };
const materia = { id: 'm1', profesor_id: 'p1', nombre: 'Matemáticas', area: 'Matemáticas', grado: '4', codigo_matricula: 'MATE4', estado: 'activa' };
const evaluation = {
  id: 'e1', materia_id: 'm1', profesor_id: 'p1', nombre: 'Multiplicación', descripcion: '', tipo_origen: 'nativa',
  modalidad: 'online', nota_maxima: 5, estado: 'en_calificacion', recepcion_habilitada: false,
  preguntas: [{ numero: 1, enunciado: '¿Cuánto es 6 × 4?', puntaje: 1 }], respuestas_esperadas: [{ numero: 1, respuesta: '24' }],
  criterios: [], dba_ids: [], dba_personalizado_ids: [], metas_profesor: [], mi_nota_confirmada: 5,
  politica_intento: 'un_intento', created_at: '2026-08-21T00:00:00Z', updated_at: '2026-08-21T00:00:00Z',
};
const breakdown = {
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'completa',
  requiere_revision: false, created_at: '2026-08-21T00:00:00Z', claves_liberadas: true, nota_publicada: 5,
  formula: { puntos_obtenidos: 1, puntos_posibles: 1, nota_maxima: 5, nota_base: 5, ajuste_global: 0, nota_antes_redondeo: 5, regla_redondeo: 'half_up', decimales: 2, nota_final: 5 },
  componentes: [{ id: 'q1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: '¿Cuánto es 6 × 4?', respuesta_estudiante: '24', respuesta_referencia: '24', referencia_oculta: false, puntos_obtenidos: 1, puntos_maximos: 1, estado: 'correcta', explicacion: 'Coincide con la clave oficial.', origen: 'objetivo', requiere_revision: false, evidencia_paginas: [1], valoraciones: [] }],
};
const grade = { id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1', nota_sugerida: 5, nota_confirmada: 5, confianza: 0.98, feedback: 'Muy bien.', estado: 'publicada', revisado_por_docente: true, resultado_json: {}, created_at: '2026-08-21T00:00:00Z', updated_at: '2026-08-21T00:00:00Z' };

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installMocks(page: Page, role: 'profesor' | 'estudiante', permissions?: string[]) {
  const activeUser = { ...(role === 'profesor' ? teacher : student), ...(permissions ? { permissions } : {}) };
  let authenticated = false;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/login') { authenticated = true; return json(route, {}); }
    if (path === '/auth/refresh') return json(route, { detail: 'Sin sesión' }, 401);
    if (path === '/auth/me') return authenticated ? json(route, { user: activeUser }) : json(route, { detail: 'Sin sesión' }, 401);
    if (path === '/users/me/authorization') {
      return json(route, { profile: activeUser.rol, is_primary_admin: false, custom_role_id: null, custom_role_name: null, role_version: null, auth_version: 1, permissions: activeUser.permissions });
    }
    if (path === '/materias') return json(route, [materia]);
    if (path === '/materias/m1/evaluaciones') return json(route, [evaluation]);
    if (path === '/materias/m1/estudiantes') return json(route, { ...materia, estudiantes: [student] });
    if (path === '/evaluaciones/e1') return json(route, evaluation);
    if (path === '/evaluaciones/e1/calificaciones') return json(route, [grade]);
    if (path === '/evaluaciones/e1/revision') return json(route, {
      evaluacion_id: 'e1', materia_id: 'm1', total_alumnos: 1, siguiente_cursor: null,
      contadores: { todas: 1, pendientes: 0, alertas: 0, procesando: 0, publicadas: 1 },
      alumnos: [{ estudiante_id: 's1', nombre: student.nombre, calificacion_id: 'c1', entrega_id: 't1', job_id: null, estado: 'publicada', nota: 5,
        resumen_revision: { version: 1, cobertura: 'completa', bloqueos: [], componentes_pendientes: 0, componentes_ilegibles: 0, pqrs_abiertas: null, tiene_alertas: false } }],
    });
    if (path === '/calificaciones/bandeja-docente') return json(route, { items: [], total: 0, solicitudes_revision: 0, pendientes_calificacion: 0 });
    if (path === '/calificaciones/c1/detalle') return json(route, { ...grade, evaluacion_nombre: evaluation.nombre, materia_nombre: materia.nombre, estudiante_nombre: student.nombre, estudiante_email: student.email, nota_maxima: 5, entrega_tipo: 'online', entrega_archivo_url: null, entrega_evidencia_paginas: 0, entrega_evidencia_tipo: null, entrega_respuesta_texto: 'P1: 24', entrega_created_at: grade.created_at, timeline: [], guia_revision: [], desglose: breakdown, desglose_heredado: false, respuestas_liberadas: true });
    if (path === '/calificaciones/c1/incidencias') return json(route, []);
    if (path === '/calificaciones/c1/desglose/historial') return json(route, [{ id: 'd1', version: 1, origen: 'automatico', nota_final: 5, activo: true, actor_nombre: null, created_at: grade.created_at }]);
    if (path === '/evaluaciones/e1/mi-entrega') return json(route, { id: 't1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1', tipo: 'online', estado: 'revisada', respuesta_texto: 'P1: 24', archivo_url: null, evidencia_paginas: 0, evidencia_tipo: null, reemplazo_solicitado: false, motivo_reemplazo: null, created_at: grade.created_at });
    if (path === '/evaluaciones/e1/actividad') return json(route, null);
    if (path === '/evaluaciones/e1/mi-solicitud-revision') return json(route, null);
    if (path === '/evaluaciones/e1/mi-desglose') return json(route, breakdown);
    if (path === '/analytics/evento') return json(route, {}, 201);
    return json(route, {});
  });
}

async function login(page: Page, role: 'profesor' | 'estudiante', permissions?: string[]) {
  await installMocks(page, role, permissions);
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(role === 'profesor' ? teacher.email : student.email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await expect(page).toHaveURL(/\/app/);
}

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`docente comprende fórmula y pregunta en ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page, 'profesor');
    await page.goto('/app/calificaciones/workspace/e1');
    await page.getByText('Estudiante Prueba', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeVisible();
    await expect(page.getByText('Coincide con la clave oficial.', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    await page.screenshot({ path: `output/playwright/centro-${viewport.width}-claro.png`, fullPage: true });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(page.getByRole('button', { name: 'Ajustar puntaje y explicación' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    await page.screenshot({ path: `output/playwright/centro-${viewport.width}-oscuro.png`, fullPage: true });
  });
}

test('la rueda sobre el panel derecho desplaza la revisión en escritorio', async ({ page }) => {
  const longBreakdown = {
    ...breakdown,
    componentes: Array.from({ length: 16 }, (_, index) => ({
      ...breakdown.componentes[0],
      id: `wheel-q${index + 1}`,
      clave: `pregunta:${index + 1}`,
      orden: index,
      numero: String(index + 1),
      titulo: `Pregunta extensa ${index + 1}`,
      explicacion: `Explicación verificable para comprobar desplazamiento ${index + 1}.`,
    })),
  };
  await page.setViewportSize({ width: 1366, height: 768 });
  await installMocks(page, 'profesor');
  await page.route('**/api/calificaciones/c1/detalle', (route) => json(route, {
    ...grade,
    evaluacion_nombre: evaluation.nombre,
    materia_nombre: materia.nombre,
    estudiante_nombre: student.nombre,
    estudiante_email: student.email,
    nota_maxima: 5,
    entrega_tipo: 'online',
    entrega_archivo_url: null,
    entrega_evidencia_paginas: 0,
    entrega_evidencia_tipo: null,
    entrega_respuesta_texto: 'Respuestas extensas para validar la rueda',
    entrega_created_at: grade.created_at,
    timeline: [],
    guia_revision: [],
    desglose: longBreakdown,
    desglose_heredado: false,
    respuestas_liberadas: true,
  }));
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(teacher.email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await page.goto('/app/calificaciones/workspace/e1');
  await page.getByText('Estudiante Prueba', { exact: true }).click();

  const main = page.locator('main#main-content');
  const reviewHeading = page.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' });
  await expect(reviewHeading).toBeVisible();
  await reviewHeading.hover();
  const before = await main.evaluate((element) => element.scrollTop);
  await page.mouse.wheel(0, 900);
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(before + 40);
});

test('estudiante ve el desglose publicado y selecciona una pregunta para reclamar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'estudiante');
  await page.goto('/app/evaluaciones/e1/resolver');
  await expect(page.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeVisible();
  await page.getByRole('button', { name: /Solicitar revisi.n/ }).click();
  await page.getByLabel(/Qué deseas que revisen/).selectOption('respuesta');
  await expect(page.getByLabel(/Pregunta o criterio/)).toBeVisible();
});


test('docente llega a la respuesta 20, edita y recupera el scroll móvil', async ({ page }) => {
  const manyComponents = {
    ...breakdown,
    formula: { ...breakdown.formula, puntos_obtenidos: 4, puntos_posibles: 5, nota_base: 4, nota_antes_redondeo: 4, nota_final: 4 },
    componentes: Array.from({ length: 20 }, (_, index) => ({
      ...breakdown.componentes[0],
      id: 'q' + String(index + 1),
      clave: 'pregunta:' + String(index + 1),
      orden: index,
      numero: String(index + 1),
      titulo: 'Pregunta ' + String(index + 1),
      puntos_obtenidos: 0.2,
      puntos_maximos: 0.25,
      explicacion: 'Explicación verificable para la pregunta ' + String(index + 1) + '.',
    })),
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(page, 'profesor');
  await page.route('**/api/calificaciones/c1/detalle', (route) => json(route, {
    ...grade,
    evaluacion_nombre: evaluation.nombre,
    materia_nombre: materia.nombre,
    estudiante_nombre: student.nombre,
    estudiante_email: student.email,
    nota_maxima: 5,
    entrega_tipo: 'online',
    entrega_archivo_url: null,
    entrega_evidencia_paginas: 0,
    entrega_evidencia_tipo: null,
    entrega_respuesta_texto: 'Respuestas 1 a 20',
    entrega_created_at: grade.created_at,
    timeline: [],
    guia_revision: [],
    desglose: manyComponents,
    desglose_heredado: false,
    respuestas_liberadas: true,
  }));
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(teacher.email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await page.goto('/app/calificaciones/workspace/e1');
  await page.getByText('Estudiante Prueba', { exact: true }).click();

  await page.getByRole('button', { name: 'Pregunta 20', exact: true }).click();
  const lastCard = page.locator('article').filter({ has: page.getByText('Pregunta 20', { exact: true }) }).last();
  await lastCard.scrollIntoViewIfNeeded();
  await expect(lastCard).toBeVisible();
  await lastCard.getByRole('button', { name: 'Ajustar puntaje y explicación' }).click();
  await page.getByLabel(/Puntos/).fill('0.25');
  await page.getByLabel('Motivo interno del cambio').fill('Corrección docente verificada');
  await page.getByLabel('Explicación para el estudiante').fill('La respuesta está completa y coincide con el procedimiento esperado.');
  await page.setViewportSize({ width: 390, height: 500 });
  await expect(page.getByRole('button', { name: 'Guardar y recalcular' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: 'Descartar y continuar' }).click();
  await page.getByRole('button', { name: 'Volver a lista' }).click();
  await expect(page.getByText('Estudiante Prueba', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});


test('un conflicto 409 no sobrescribe la revisión vigente', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(page, 'profesor');
  await page.route('**/api/calificaciones/c1/desglose', (route) => json(route, {
    detail: 'La calificación cambió en otra sesión.',
  }, 409));
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(teacher.email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await page.goto('/app/calificaciones/workspace/e1');
  await page.getByText('Estudiante Prueba', { exact: true }).click();
  await page.getByRole('button', { name: 'Ajustar puntaje y explicación' }).click();
  await page.getByLabel(/Puntos/).fill('0.75');
  await page.getByLabel('Motivo interno del cambio').fill('Revisión concurrente');
  await page.getByLabel('Explicación para el estudiante').fill('La respuesta conserva el procedimiento revisado.');
  await page.getByRole('button', { name: 'Guardar y recalcular' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /cambió en otra revisión/i })).toBeVisible();
  await expect(page.getByLabel(/Puntos/)).toHaveValue('0.75');
  await expect(page.getByLabel('Motivo interno del cambio')).toHaveValue('Revisión concurrente');
  await expect(page.getByRole('button', { name: 'Recargar versión vigente' })).toBeVisible();
});


test('guardar el último ajuste termina la lista sin confirmar ni publicar', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await installMocks(page, 'profesor');
  let savedPayload: Record<string, unknown> | null = null;
  await page.route('**/api/calificaciones/c1/desglose', async (route) => {
    savedPayload = route.request().postDataJSON() as Record<string, unknown>;
    return json(route, { ...breakdown, version: 2 });
  });
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(teacher.email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await page.goto('/app/calificaciones/workspace/e1');
  await page.getByText('Estudiante Prueba', { exact: true }).click();
  await page.getByRole('button', { name: 'Ajustar puntaje y explicación' }).click();
  await page.getByLabel('Motivo interno del cambio').fill('Validación final docente');
  await page.getByLabel('Explicación para el estudiante').fill('La respuesta fue verificada con la evidencia entregada.');
  await page.getByRole('button', { name: 'Guardar y siguiente alumno' }).click();

  await expect(page.getByText('Revisión completada')).toBeVisible();
  await expect(page.getByText(/1 alumnos con ajustes guardados/)).toBeVisible();
  expect(savedPayload).toMatchObject({ version_esperada: 1 });
  await expect(page.getByText(/no se publicaron automáticamente/i)).toBeVisible();
});

test('conserva borrador al cambiar pregunta, query y atrás; hoja y vista sobreviven', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'profesor');
  await page.route('**/api/calificaciones/c1/detalle', (route) => json(route, {
    ...grade, evaluacion_nombre: evaluation.nombre, materia_nombre: materia.nombre, estudiante_nombre: student.nombre,
    entrega_tipo: 'pdf', entrega_archivo_url: '/api/entregas/t1/archivo', entrega_evidencia_paginas: 2, entrega_evidencia_tipo: 'pdf',
    timeline: [], guia_revision: [], desglose: { ...breakdown, componentes: [breakdown.componentes[0], { ...breakdown.componentes[0], id: 'q2', clave: 'pregunta:2', numero: '2', titulo: 'Segunda pregunta', evidencia_paginas: [2] }] },
  }));
  await page.route('**/api/entregas/t1/archivo/paginas/*', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/><text x="40" y="80" fill="black">Evidencia sintética · 6 × 4 = 24</text></svg>' }));
  await page.goto('/app/calificaciones/workspace/e1?calificacion=c1');
  await expect(page).toHaveURL(/\/app\/calificaciones\?evaluacion=e1|\/app\/calificaciones\?calificacion=c1/);
  await page.getByRole('button', { name: 'Pregunta 2', exact: true }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A2/);
  await page.getByRole('button', { name: 'Ajustar puntaje y explicación' }).click();
  await page.getByLabel('Motivo interno del cambio').fill('No perder este borrador');
  await page.getByRole('button', { name: 'Evidencia', exact: true }).click();
  await expect(page.getByAltText('Hoja 2 de la evidencia del estudiante')).toBeVisible();
  await page.getByRole('button', { name: 'Revisar respuestas' }).click();
  await expect(page.getByLabel('Motivo interno del cambio')).toHaveValue('No perder este borrador');
  await page.getByRole('button', { name: 'Pregunta 1', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeVisible();
  await page.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A2/);
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeVisible();
  await page.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await expect(page.getByLabel('Motivo interno del cambio')).toHaveValue('No perder este borrador');
  await page.getByRole('button', { name: 'Pregunta 1', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar y continuar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pregunta 1', exact: true })).toHaveAttribute('aria-current', 'step');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pregunta 1', exact: true })).toHaveAttribute('aria-current', 'step');
});

test('30 matriculados, ocho reclamos y alumno sin entrega sin nota ficticia', async ({ page }) => {
  await login(page, 'profesor');
  const rows = Array.from({ length: 30 }, (_, index) => ({
    estudiante_id: `s${index + 1}`, nombre: `Alumno ${String(index + 1).padStart(2, '0')}`, calificacion_id: index === 29 ? null : `c${index + 1}`, entrega_id: null, job_id: null,
    estado: index === 29 ? 'sin_entrega' : index === 28 ? 'procesando' : 'sugerida', nota: index >= 28 ? null : index === 27 ? 0 : 4,
    resumen_revision: { version: index === 26 ? null : 1, cobertura: index === 26 ? null : 'completa', bloqueos: [], componentes_pendientes: null, componentes_ilegibles: null, pqrs_abiertas: index < 8 ? 1 : 0, tiene_alertas: index < 8 },
  }));
  await page.route('**/api/evaluaciones/e1/revision**', (route) => {
    const params = new URL(route.request().url()).searchParams;
    const filtered = params.get('estudiante_id') ? rows.filter((row) => row.estudiante_id === params.get('estudiante_id')) : params.get('filtro') === 'alertas' ? rows.slice(0, 8) : rows;
    return json(route, { evaluacion_id: 'e1', materia_id: 'm1', total_alumnos: 30, siguiente_cursor: null, contadores: { todas: 30, pendientes: 29, alertas: 8, procesando: 1, publicadas: 0 }, alumnos: filtered });
  });
  await page.goto('/app/calificaciones?evaluacion=e1');
  await page.getByRole('button', { name: 'alertas (8)' }).click();
  await expect(page.getByRole('button', { name: /Alumno 08/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Alumno 09/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'todas (30)' }).click();
  await expect(page.getByRole('button', { name: /Alumno 29/ })).not.toContainText('0.0');
  await expect(page.getByRole('button', { name: /Alumno 28/ })).toContainText('0.0');
  await page.getByRole('button', { name: /Alumno 30/ }).click();
  await expect(page.getByText(/Aún no tiene una calificación/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir su entrega' })).toBeVisible();
});

test('estudiante no accede al centro docente ni consulta su proyección', async ({ page }) => {
  await login(page, 'estudiante');
  let called = false;
  page.on('request', (request) => { if (request.url().includes('/revision?')) called = true; });
  await page.goto('/app/calificaciones?evaluacion=e1');
  await expect(page).toHaveURL(/\/app\/403/);
  expect(called).toBe(false);
});

test('dos paquetes quedan en cola, un fallo conserva hojas para reintentar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'profesor');
  await page.route('**/api/materias/m1/estudiantes', (route) => json(route, { ...materia, estudiantes: [student, { ...student, id: 's2', nombre: 'Segundo estudiante' }] }));
  let uploads = 0;
  const owners: string[] = [];
  await page.route('**/api/calificaciones/foto', (route) => {
    uploads++;
    const raw = route.request().postDataBuffer()?.toString() ?? '';
    const id = raw.includes('\r\n\r\ns2\r\n') ? 's2' : 's1';
    owners.push(id);
    if (uploads === 2) return json(route, { detail: 'Fallo controlado de subida' }, 503);
    return json(route, { ...grade, id: `queued-${id}`, estudiante_id: id, estado: 'procesando', nota_sugerida: null, nota_confirmada: null, resultado_json: { job_id: `job-${id}`, pipeline_status: 'queued' } });
  });
  await page.goto('/app/calificaciones?evaluacion=e1&modo=carga&estudiante=s1');
  const file = { name: 'hoja.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6N0AAAAASUVORK5CYII=', 'base64') };
  await page.locator('input[type=file]').first().setInputFiles([file, { ...file, name: 'hoja2.png' }]);
  await page.getByRole('button', { name: 'Enviar a calificar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Vas a entregar 2 hojas' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar y enviar' }).click();
  await expect(page.getByText(/Entrega de Estudiante Prueba guardada/)).toBeVisible();
  await page.getByLabel('Estudiante de esta entrega').selectOption('s2');
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.getByRole('button', { name: 'Enviar a calificar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar y enviar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Fallo controlado de subida' })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar a calificar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar y enviar' }).click();
  await expect(page.getByText(/Entrega de Segundo estudiante guardada/)).toBeVisible();
  expect(owners).toEqual(['s1', 's2', 's2']);
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('xcalificator.pending-gradings.v1') ?? '[]').length)).toBe(2);
});

test('lectura docente y enlaces antiguos conservan contexto sin habilitar escritura', async ({ page }) => {
  await login(page, 'profesor', ['subjects.read', 'evaluations.read', 'grading.read']);
  await page.goto('/app/materias/m1/calificar?evaluacion=e1&estudiante=s1&pregunta=pregunta%3A1&hoja=1');
  await expect(page).toHaveURL(/\/app\/calificaciones\?/);
  await expect(page.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pregunta 1', exact: true })).toHaveAttribute('aria-current', 'step');
  for (const name of ['Añadir entregas', 'Establecer nota', 'Ajustar puntaje y explicación', 'Publicar al estudiante', 'Resumen y publicación']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  await expect(page.getByText('Incidencias y solicitudes', { exact: false })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pregunta 1', exact: true })).toHaveAttribute('aria-current', 'step');
});

test('añadir otra entrega permite volver al alumno y pregunta anteriores', async ({ page }) => {
  await login(page, 'profesor');
  await page.route('**/api/materias/m1/estudiantes', (route) => json(route, { ...materia, estudiantes: [student, { ...student, id: 's2', nombre: 'Segundo estudiante' }] }));
  await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1&estudiante=s1&pregunta=pregunta%3A1&hoja=1');
  await expect(page.getByRole('button', { name: 'Pregunta 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir entregas', exact: true }).click();
  await page.getByLabel('Estudiante de esta entrega').selectOption('s2');
  await expect(page).toHaveURL(/estudiante=s2/);
  await page.getByRole('button', { name: 'Volver a revisión', exact: true }).last().click();
  await expect(page).toHaveURL(/estudiante=s1/);
  await expect(page.getByRole('button', { name: 'Pregunta 1', exact: true })).toHaveAttribute('aria-current', 'step');
});

test('PQRS versionada abre su pregunta; error de consulta no se muestra como lista vacía', async ({ page }) => {
  await login(page, 'profesor', [...teacher.permissions, 'submissions.review']);
  let available = false;
  await page.route('**/api/calificaciones/c1/incidencias', (route) => available ? json(route, [{
    id: 'claim-1', tipo: 'solicitud_revision', estado: 'abierta', descripcion: 'Revisar el procedimiento de la primera respuesta.',
    componente_id: 'old-q1', componente_clave: 'pregunta:1', desglose_version: 1, metadata_json: { motivo: 'respuesta' },
  }]) : json(route, { detail: 'No disponible' }, 503));
  await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1');
  await expect(page.getByText('No se pudieron consultar las incidencias.')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Sin incidencias registradas.')).toHaveCount(0);
  available = true;
  await page.getByRole('button', { name: 'Reintentar consulta', exact: true }).click();
  await page.getByRole('button', { name: 'Ver pregunta vinculada · versión 1' }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A1/);
  await expect(page.getByRole('button', { name: 'Pregunta 1', exact: true })).toHaveAttribute('aria-current', 'step');
});

test('publicación parcial conserva solo el fallo y no repite notas exitosas', async ({ page }) => {
  await login(page, 'profesor');
  const rows = ['s1', 's2'].map((id, index) => ({ estudiante_id: id, nombre: `Alumno ${index + 1}`, calificacion_id: `c${index + 1}`, entrega_id: null, job_id: null, estado: 'confirmada', nota: 4,
    resumen_revision: { version: 1, cobertura: 'completa', bloqueos: [], componentes_pendientes: 0, componentes_ilegibles: 0, pqrs_abiertas: 0, tiene_alertas: false } }));
  await page.route('**/api/evaluaciones/e1/revision**', (route) => json(route, { evaluacion_id: 'e1', materia_id: 'm1', total_alumnos: 2, siguiente_cursor: null, contadores: { todas: 2, pendientes: 0, alertas: 0, procesando: 0, publicadas: 0 }, alumnos: rows }));
  const calls: string[][] = [];
  await page.route('**/api/calificaciones/lote/publicar', (route) => {
    calls.push(route.request().postDataJSON());
    return json(route, { exitosos: calls.length === 1 ? 1 : 0, fallidos: 1, results: [
      ...(calls.length === 1 ? [{ calificacion_id: 'c1', success: true }] : []),
      { calificacion_id: 'c2', success: false, error: 'Requiere revisión humana.' },
    ] });
  });
  await page.goto('/app/calificaciones?evaluacion=e1');
  await page.getByRole('button', { name: 'Resumen y publicación' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen de notas del examen' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Seleccionar nota de Alumno 1' }).click();
  await page.getByRole('checkbox', { name: 'Seleccionar nota de Alumno 2' }).click();
  expect(calls).toHaveLength(0);
  await page.getByRole('button', { name: 'Publicar seleccionados' }).click();
  await expect(page.getByText('1 operaciones completadas · 1 pendientes')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Seleccionar nota de Alumno 1' })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Seleccionar nota de Alumno 2' })).toBeChecked();
  await page.getByRole('button', { name: 'Publicar seleccionados' }).click();
  await expect.poll(() => calls.length).toBe(2);
  expect(calls).toEqual([['c1', 'c2'], ['c2']]);
});
