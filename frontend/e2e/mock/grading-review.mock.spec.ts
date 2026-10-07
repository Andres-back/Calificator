import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { login } from '../fixtures/explainableGrading';

const base = {
  clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta 1',
  respuesta_estudiante: '24', respuesta_referencia: '24', puntos_obtenidos: 1, puntos_maximos: 1,
  estado: 'correcta', explicacion: 'Explicación verificable.', origen: 'objetivo', requiere_revision: false,
  evidencia_paginas: [1], valoraciones: [],
};

test('088 contexto y menú permanecen alcanzables en vista estrecha y escritorio', async ({ page }) => {
  await login(page, 'profesor', { rosterSize: 30 });
  await page.goto('/app/calificaciones?evaluacion=e1');
  for (const width of [360, 1279, 1366]) {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole('button', { name: /Estás revisando/ }).click();
    await expect(page.getByRole('combobox', { name: 'Evaluación', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Estás revisando/ }).click();
    await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Libro de notas', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Establecer nota', exact: true })).toBeInViewport();
    await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  }
});

test('088 lote largo y temporizador opcional conservan controles alcanzables', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const job = { jobId: 'batch1', evaluacionId: 'e1', materiaId: 'm1', estudianteId: '', estudianteNombre: 'Lote sintético',
    createdAt: new Date().toISOString(), kind: 'batch', completed: true,
    summary: { total: 30, queued: 0, running: 0, retrying: 0, success: 0, requires_review: 30, failed_permanent: 0, cancelled: 0 } };
  await page.addInitScript((stored) => localStorage.setItem('xcalificator.pending-gradings.v1', JSON.stringify([stored])), job);
  await login(page, 'profesor', { rosterSize: 30 });
  await page.route('**/api/jobs/batch1/items*', (route) => route.fulfill({ json: { items: Array.from({ length: 30 }, (_, index) => ({
    job_id: `item${index}`, estudiante_nombre: `Alumno ${index + 1}`, estado: 'requires_review', progreso: 100,
  })) } }));
  await page.route('**/api/analytics/sesiones-trabajo*', (route) => route.fulfill({ json: { items: [], total: 0, limit: 30, offset: 0 } }));
  const writes: string[] = [];
  page.on('request', (request) => { if (request.method() !== 'GET' && /\/api\/(calificaciones|jobs)\//.test(request.url())) writes.push(request.url()); });
  await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1&estudiante=s1');
  const workspace = page.locator('[data-grading-layout]');
  const monitor = workspace.getByLabel('Calificaciones en cola');
  await monitor.getByRole('button', { name: 'Ver casos', exact: true }).click();
  const lastCase = monitor.getByText('Caso 30 · Alumno 30', { exact: true });
  await lastCase.scrollIntoViewIfNeeded();
  await expect(lastCase).toBeInViewport();
  for (const control of [monitor.getByRole('button', { name: 'Reintentar', exact: true }).last(), monitor.getByRole('button', { name: 'Cerrar resumen del lote' })]) {
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await monitor.getByRole('button', { name: 'Ocultar casos', exact: true }).click();
  if (process.env.VITE_TEACHER_WORK_TIMING_ENABLED === 'true') {
    await expect(workspace).toHaveAttribute('data-grading-layout', 'flow');
    const start = workspace.getByRole('button', { name: 'Iniciar voluntariamente', exact: true });
    await start.scrollIntoViewIfNeeded();
    await expect(start).toBeInViewport();
  }
  await workspace.getByRole('button', { name: '3. Respuestas y puntajes', exact: true }).click();
  await expect(workspace.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeVisible();
  expect(writes).toEqual([]);
});

const breakdown = {
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'completa',
  requiere_revision: true, created_at: '2026-09-19T00:00:00Z', claves_liberadas: true,
  formula: { puntos_obtenidos: 2, puntos_posibles: 3, nota_maxima: 5, nota_base: 3.33, ajuste_global: 0, nota_antes_redondeo: 3.33, regla_redondeo: 'half_up', decimales: 2, nota_final: 3.33 },
  componentes: [
    { ...base, id: 'safe', clave: 'pregunta:1' },
    { ...base, id: 'attention', clave: 'pregunta:2', orden: 1, numero: '2', titulo: 'Pregunta 2', origen: 'consenso_ia', explicacion: '', valoraciones: [] },
    { ...base, id: 'blocked', clave: 'pregunta:3', orden: 2, numero: '3', titulo: 'Pregunta 3', estado: 'ilegible', puntos_obtenidos: null, requiere_revision: true },
  ],
};

test('prioriza excepciones en móvil sin confirmar ni publicar automáticamente', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const mutations: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET' && /confirmar|ajustar|publicar/.test(request.url())) mutations.push(request.url());
  });
  await login(page, 'profesor', { breakdown });
  await page.goto('/app/calificaciones/workspace/e1');
  await page.getByText('Estudiante Prueba', { exact: true }).click();

  await page.locator('summary', { hasText: 'Ver revisión del análisis original' }).click();
  await expect(page.getByRole('heading', { name: 'Avisos del análisis original' })).toBeVisible();
  await expect(page.getByText('1 por revisar')).toBeVisible();
  await expect(page.getByText('1 bloqueada')).toBeVisible();
  await page.getByRole('button', { name: /Revisar primera excepción/ }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A3/);
  await page.getByRole('button', { name: /Siguiente excepción/ }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A2/);
  expect(mutations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});

const teacherPermissions = ['subjects.read', 'evaluations.read', 'evaluations.create', 'grading.read', 'grading.grade', 'grading.publish', 'gradebook.read', 'attendance.read', 'attendance.manage'];

test('asistencia recupera errores y protege observación pendiente en celular', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, 'profesor', { permissions: teacherPermissions });
  await installGroupViews(page);
  let fail = true;
  await page.route('**/api/materias/m1/asistencia', async (route) => {
    if (route.request().method() === 'PATCH' && fail) {
      fail = false;
      await route.fulfill({ status: 500, json: { detail: 'No se pudo guardar. Reintenta.' } });
    } else await route.fallback();
  });
  await page.goto('/app/materias/m1/asistencia');
  const search = page.getByRole('searchbox', { name: 'Buscar estudiante' });
  await search.fill('alumno99@');
  await page.getByRole('button', { name: 'Ausente para Alumno 99', exact: true }).click();
  await expect(page.getByText('No guardado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ausente para Alumno 99', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Reintentar asistencia para Alumno 99', exact: true }).click();
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible();
  await search.fill('alumno98@');
  const observation = page.getByRole('textbox', { name: 'Observación para Alumno 98' });
  await observation.fill('Falta escoger estado');
  await expect(observation).toBeFocused();
  const date = page.getByLabel(/Fecha de la asistencia/);
  const originalDate = await date.inputValue();
  page.once('dialog', (dialog) => dialog.dismiss());
  await date.fill('2026-10-01');
  await expect(date).toHaveValue(originalDate);
  await page.getByRole('combobox', { name: 'Sección de la materia', exact: true }).selectOption({ label: 'Evaluaciones' });
  await expect(page.getByRole('dialog', { name: 'Hay cambios sin guardar' })).toBeVisible();
  await page.getByRole('button', { name: 'Seguir registrando', exact: true }).click();
  await expect(observation).toHaveValue('Falta escoger estado');
  await page.getByRole('button', { name: 'Con excusa para Alumno 98', exact: true }).click();
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible();
  await page.reload();
  await search.fill('alumno98@');
  await expect(observation).toHaveValue('Falta escoger estado');
  await expect(page.getByRole('button', { name: 'Con excusa para Alumno 98', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

async function installGroupViews(page: Page) {
  const roster = Array.from({ length: 100 }, (_, index) => ({ id: index === 0 ? 's1' : `s${index + 1}`, nombre: index === 0 ? 'Estudiante Prueba' : `Alumno ${index + 1}`, email: `alumno${index + 1}@example.test`, rol: 'estudiante', estado: 'activo' }));
  const subject = { id: 'm1', profesor_id: 'p1', nombre: 'Matemáticas', area: 'Matemáticas', grado: '4', estado: 'activa', estudiantes: roster.slice(0, 30) };
  const evaluation = { id: 'e1', materia_id: 'm1', profesor_id: 'p1', nombre: 'Multiplicación', nota_maxima: 5, estado: 'publicada', modalidad: 'online', preguntas: [], criterios: [], dba_ids: [], dba_personalizado_ids: [] };
  await page.route('**/api/materias/m1/estudiantes', (route) => route.fulfill({ json: subject }));
  await page.route('**/api/materias/m1/evaluaciones', (route) => route.fulfill({ json: [evaluation, { ...evaluation, id: 'e2', nombre: 'Otra evaluación', estado: 'cerrada' }, { ...evaluation, id: 'e3', nombre: 'Borrador', estado: 'borrador' }] }));
  await page.route('**/api/evaluaciones/e1/calificaciones', (route) => route.fulfill({ json: [
    { id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', nota_confirmada: 5, nota_sugerida: 5, estado: 'publicada', revisado_por_docente: true },
    { id: 'c2', evaluacion_id: 'e1', estudiante_id: 's2', nota_confirmada: null, nota_sugerida: 0, estado: 'procesando' },
    { id: 'c3', evaluacion_id: 'e1', estudiante_id: 's3', nota_confirmada: 0, nota_sugerida: 0, estado: 'publicada', revisado_por_docente: true },
    { id: 'c4', evaluacion_id: 'e1', estudiante_id: 's4', nota_confirmada: null, nota_sugerida: 2.5, estado: 'pendiente' },
  ] }));
  await page.route('**/api/evaluaciones/e2/calificaciones', (route) => route.fulfill({ json: [{ id: 'other-grade', evaluacion_id: 'e2', estudiante_id: 's1', nota_confirmada: 1.5, estado: 'publicada', revisado_por_docente: true }] }));
  const days = new Map<string, Map<string, { estado: string; observacion: string | null }>>();
  await page.route('**/api/materias/m1/asistencia**', async (route) => {
    const request = route.request();
    const saved = request.method() === 'PATCH' ? request.postDataJSON() : null;
    const fecha = saved?.fecha ?? new URL(request.url()).searchParams.get('fecha');
    const records = days.get(fecha) ?? new Map();
    if (saved) {
      expect(request.method()).toBe('PATCH');
      for (const record of saved.registros) records.set(record.estudiante_id, record);
      days.set(fecha, records);
    }
    const count = (estado: string) => [...records.values()].filter((row) => row.estado === estado).length;
    await route.fulfill({ json: { materia_id: 'm1', fecha, registros: roster.map((item) => ({
      estudiante_id: item.id, estudiante_nombre: item.nombre, estudiante_email: item.email,
      estado: records.get(item.id)?.estado ?? null, observacion: records.get(item.id)?.observacion ?? null,
    })), resumen: { total: 100, pendientes: 100 - records.size, presentes: count('presente'), tarde: count('tarde'), ausentes: count('ausente'), excusas: count('excusa') } } });
  });
  await page.route('**/api/materias/m1/asistencia/reporte?**', (route) => {
    const records = [...days.values()].flatMap((rows) => [...rows.values()]);
    const count = (estado: string) => records.filter((row) => row.estado === estado).length;
    const url = new URL(route.request().url());
    return route.fulfill({ json: { materia_id: 'm1', fecha_desde: url.searchParams.get('fecha_desde'), fecha_hasta: url.searchParams.get('fecha_hasta'), jornadas_registradas: days.size, estudiantes: [], jornadas: [], resumen: { total_registros: records.length, presentes: count('presente'), tarde: count('tarde'), ausentes: count('ausente'), excusas: count('excusa'), porcentaje_asistencia: 100 } } });
  });
}

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1366, height: 768 }]) {
  for (const mode of ['light', 'dark']) {
    test(`flujo docente progresivo ${viewport.width}px ${mode}`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      await page.addInitScript((theme) => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: theme }, version: 0 })), mode);
      await login(page, 'profesor', { permissions: teacherPermissions });
      await installGroupViews(page);
      const writes: string[] = [];
      page.on('request', (request) => { if (request.method() !== 'GET' && !request.url().includes('/analytics/')) writes.push(request.url()); });

      await page.goto('/app/materias/m1/boletin?evaluacion=e1');
      const roster = page.getByRole('list', { name: 'Notas de Multiplicación' });
      await expect(roster.getByRole('listitem')).toHaveCount(30);
      await expect(roster.getByRole('listitem').filter({ hasText: 'Alumno 2' }).first()).toContainText('Calificando');
      await expect(page.getByRole('link', { name: 'Ver nota de Alumno 3', exact: true })).toHaveText('0.0 / 5.0');
      const firstFive = await roster.getByRole('listitem').evaluateAll((rows) => rows[4].getBoundingClientRect().bottom - rows[0].getBoundingClientRect().top);
      expect(firstFive).toBeLessThanOrEqual(500);
      await page.getByRole('searchbox', { name: 'Buscar estudiante' }).fill('prueba');
      await expect(roster.getByRole('listitem')).toHaveCount(1);
      await page.getByRole('link', { name: 'Ver nota de Estudiante Prueba', exact: true }).click();
      await expect(page.getByRole('heading', { name: '1. Nota y explicación' })).toBeVisible();
      const evidence = page.getByRole('button', { name: '2. Evidencia', exact: true });
      const answers = page.getByRole('button', { name: '3. Respuestas y puntajes', exact: true });
      await expect(evidence).toHaveAttribute('aria-expanded', 'false');
      await expect(answers).toHaveAttribute('aria-expanded', 'false');
      const feedback = page.locator('details').filter({ has: page.locator('summary', { hasText: '4. Retroalimentación' }) });
      await expect(feedback).not.toHaveAttribute('open');
      await page.screenshot({ path: `../output/playwright/teacher-flow/grade-${viewport.width}-${mode}.png`, fullPage: true });
      await evidence.click();
      await expect(page.locator('#grade-evidence-panel')).toBeVisible();
      await answers.click();
      await expect(page.locator('#grade-review-panel')).toBeVisible();
      await expect(page.locator('#grade-evidence-panel')).toBeHidden();
      const comparison = page.getByTestId('grade-answer-comparison').first();
      await expect(comparison).toContainText('Respuesta de referencia');
      expect((await comparison.boundingBox())!.height).toBeLessThan(180);
      await feedback.locator('summary').click();
      await expect(page.getByLabel(/Retroalimentación/).last()).toBeVisible();
      await page.getByRole('link', { name: 'Volver al libro de notas' }).click();
      await expect(page.getByRole('searchbox', { name: 'Buscar estudiante' })).toHaveValue('prueba');
      await expect(page.getByRole('combobox', { name: 'Filtrar por evaluación' })).toHaveValue('e1');

      await page.goto('/app/materias/m1/asistencia');
      const search = page.getByRole('searchbox', { name: 'Buscar estudiante' });
      await search.fill('alumno99@');
      await expect(page.getByText('1 de 100 estudiantes', { exact: true })).toBeVisible({ timeout: 1_000 });
      const firstPatch = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().endsWith('/materias/m1/asistencia'));
      await page.getByRole('button', { name: 'Llegó tarde para Alumno 99', exact: true }).click();
      expect((await firstPatch).postDataJSON().registros).toEqual([{ estudiante_id: 's99', estado: 'tarde', observacion: null }]);
      await page.getByRole('textbox', { name: 'Observación para Alumno 99' }).fill('Con autorización');
      await search.fill('sin coincidencia');
      await expect(page.getByText('No hay estudiantes con esa búsqueda.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Completa la lista' })).toHaveCount(0);
      const attendanceSummary = page.getByLabel('Resumen y guardado de asistencia');
      await attendanceSummary.locator('summary').click();
      await expect(attendanceSummary.getByText('Pendientes', { exact: true })).toBeVisible();
      await attendanceSummary.locator('summary').click();
      await page.getByRole('button', { name: /Marcar pendientes como presentes/ }).click();
      await search.fill('alumno99@');
      await expect(page.getByRole('button', { name: 'Llegó tarde para Alumno 99', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('textbox', { name: 'Observación para Alumno 99' })).toHaveValue('Con autorización');
      await expect(page.getByRole('button', { name: 'Guardar asistencia' })).toHaveCount(0);
      await expect(attendanceSummary.getByRole('status')).toHaveText('No hay cambios sin guardar');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
      const searchBounds = await search.boundingBox();
      expect(searchBounds!.height).toBeGreaterThanOrEqual(44);
      expect(await page.getByRole('button', { name: 'Limpiar búsqueda', exact: true }).evaluate((button) => getComputedStyle(button).whiteSpace)).toBe('nowrap');
      await page.screenshot({ path: `../output/playwright/teacher-flow/attendance-${viewport.width}-${mode}.png`, fullPage: true });
      expect(writes.length).toBeGreaterThan(0);
      expect(writes.every((url) => url.endsWith('/materias/m1/asistencia'))).toBe(true);
      await page.reload();
      await search.fill('alumno99@');
      await expect(page.getByRole('button', { name: 'Llegó tarde para Alumno 99', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('textbox', { name: 'Observación para Alumno 99' })).toHaveValue('Con autorización');
      await attendanceSummary.locator('summary').click();
      await expect(attendanceSummary.getByText('99', { exact: true })).toBeVisible();
    });
  }
}

test('abre enlaces a pregunta y hoja y protege el ajuste sin guardar', async ({ page }) => {
  await login(page, 'profesor');
  await page.goto('/app/calificaciones/workspace/e1?calificacion=c1&pregunta=pregunta%3A1');
  await expect(page.getByRole('button', { name: '3. Respuestas y puntajes' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Ajustar puntaje y explicación' }).click();
  await page.getByLabel(/Puntos \(máximo/).fill('0.7');
  await page.getByLabel(/Motivo interno del cambio/).fill('Revisión parcial');
  await page.getByRole('button', { name: '2. Evidencia', exact: true }).click();
  await expect(page.getByLabel(/Puntos \(máximo/)).toHaveValue('0.7');
  await page.getByRole('button', { name: 'Volver a notas del grupo', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeVisible();
  await page.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await expect(page.getByLabel(/Puntos \(máximo/)).toHaveValue('0.7');
  await page.getByRole('button', { name: 'Volver a notas del grupo', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar y continuar', exact: true }).click();
  await page.goto('/app/calificaciones/workspace/e1?calificacion=c1&hoja=1');
  await expect(page.getByRole('button', { name: '2. Evidencia', exact: true })).toHaveAttribute('aria-expanded', 'true');
});

test('crea desde una materia sin repetir el contexto y permite abrir opciones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'profesor', { permissions: teacherPermissions });
  await installGroupViews(page);
  await page.goto('/app/materias/m1/evaluaciones');
  await page.getByRole('button', { name: 'Crear paso a paso', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Generar evaluación con IA' });
  await expect(dialog.getByText('Grado 4 · Área: Matemáticas')).toBeVisible();
  await expect(dialog.getByRole('combobox')).toHaveCount(0);
  await dialog.getByLabel(/Nombre de la evaluación/).fill('Unidad del aula');
  await dialog.locator('summary', { hasText: 'Opciones complementarias' }).click();
  await dialog.getByLabel(/Descripción breve/).fill('Multiplicación');
  await dialog.getByRole('button', { name: 'Siguiente' }).click();
  await expect(dialog.getByText('Elige cómo orientar la evaluación')).toBeVisible();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
});

test('busca y selecciona estudiantes con fluidez en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, 'profesor');
  const roster = Array.from({ length: 24 }, (_, index) => ({
    id: `student-${index + 1}`,
    nombre: index === 19 ? 'Ángela Zambrano' : `Estudiante ${index + 1}`,
    email: `estudiante-${index + 1}@example.test`,
    rol: 'estudiante',
    estado: 'activo',
  }));
  const searchedTerms: string[] = [];
  await page.route('**/api/materias/m1/estudiantes', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 'm1', nombre: 'Matemáticas', estudiantes: roster }),
  }));
  await page.route('**/api/evaluaciones/e1/revision**', (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get('q') ?? '';
    if (query) searchedTerms.push(query);
    const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const filtered = roster.filter((item) => item.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalized));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        evaluacion_id: 'e1', materia_id: 'm1', total_alumnos: roster.length, siguiente_cursor: null,
        contadores: { todas: roster.length, pendientes: roster.length, alertas: 0, procesando: 0, publicadas: 0 },
        alumnos: filtered.map((item) => ({
          estudiante_id: item.id, nombre: item.nombre, calificacion_id: null, entrega_id: null, job_id: null,
          estado: 'sin_entrega', nota: null,
          resumen_revision: { version: null, cobertura: null, bloqueos: [], componentes_pendientes: 0, componentes_ilegibles: 0, pqrs_abiertas: null, tiene_alertas: false },
        })),
      }),
    });
  });

  await page.goto('/app/calificaciones/workspace/e1');
  const reviewSearch = page.getByRole('searchbox', { name: 'Buscar estudiante' });
  await reviewSearch.pressSequentially('angela', { delay: 25 });
  await expect.poll(() => searchedTerms).toEqual(['angela']);
  await expect(page.getByText('Ángela Zambrano')).toBeVisible();

  await page.getByRole('button', { name: 'Añadir entregas' }).click();
  const picker = page.getByRole('combobox', { name: /Buscar estudiante para esta entrega/i });
  await picker.fill('angela');
  await page.getByRole('option', { name: 'Ángela Zambrano' }).click();
  await expect(page.getByText('Seleccionado: Ángela Zambrano')).toBeVisible();
  await expect(page.getByRole('button', { name: /Elegir fotos o PDF/i })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.screenshot({ path: '../output/playwright/mobile-grading/student-search-360x800.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.screenshot({ path: '../output/playwright/mobile-grading/student-search-390x844.png', fullPage: true });
});

test('captura contextual en cuatro acciones, conserva paquete al refrescar y no publica', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'profesor', { permissions: teacherPermissions });
  await installGroupViews(page);
  const evaluation = { id: 'e1', materia_id: 'm1', profesor_id: 'p1', nombre: 'Multiplicación', nota_maxima: 5, estado: 'publicada', modalidad: 'fisica', preguntas: [], criterios: [], dba_ids: [], dba_personalizado_ids: [] };
  await page.route('**/api/materias/m1/evaluaciones', (route) => route.fulfill({ json: [evaluation] }));
  await page.route('**/api/evaluaciones/e1', (route) => route.fulfill({ json: evaluation }));
  let release!: () => void;
  let failRefresh = false;
  let refreshing = false;
  let queries = 0;
  await page.route('**/api/evaluaciones/e1/calificaciones', async (route) => {
    queries++;
    if (refreshing) await new Promise<void>((resolve) => { release = resolve; });
    await route.fulfill(failRefresh ? { status: 503, json: { detail: 'Refresco no disponible' } } : { json: [] });
  });
  let uploads = 0;
  const writes: string[] = [];
  const file = { name: 'evidencia.png', mimeType: 'image/png', buffer: readFileSync(new URL('../../public/branding/feature-grade.png', import.meta.url)) };
  page.on('request', (request) => { if (request.method() !== 'GET' && /confirmar|ajustar|publicar/.test(request.url())) writes.push(request.url()); });
  await page.route('**/api/calificaciones/foto', async (route) => {
    uploads++;
    const raw = route.request().postDataBuffer()!;
    expect(raw.includes(file.buffer)).toBe(true);
    expect(raw.toString()).toContain('\r\n\r\ns1\r\n');
    expect(raw.toString()).toContain('\r\n\r\ne1\r\n');
    await route.fulfill({ json: { id: 'new-grade', evaluacion_id: 'e1', materia_id: 'm1', estudiante_id: 's1', estado: 'procesando', nota_sugerida: null, nota_confirmada: null, resultado_json: { job_id: 'new-job' } } });
  });
  await page.goto('/app/materias/m1/evaluaciones');
  // 1: abrir captura; 2: elegir identidad; 3: abrir cámara/selector; 4: enviar.
  await page.getByRole('link', { name: 'Calificar por foto' }).click();
  await expect(page).toHaveURL(/evaluacion=e1.*materia=m1.*modo=carga/);
  const candidate = page.getByRole('option', { name: 'Estudiante Prueba', exact: true });
  expect((await candidate.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await candidate.press('Enter');
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Elegir fotos o PDF/ }).click();
  await (await picker).setFiles(file);
  const send = page.getByRole('button', { name: 'Enviar a calificar', exact: true });
  await expect(send).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Volver a revisión', exact: true }).last()).toBeDisabled();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeVisible();
  await page.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await expect(page.getByText('evidencia.png', { exact: true })).toBeVisible();

  // Una actualización no puede desmontar ni vaciar el paquete preparado.
  refreshing = true;
  await page.evaluate(async (modulePath) => {
    const { queryClient } = await import(/* @vite-ignore */ modulePath);
    void queryClient.invalidateQueries({ queryKey: ['calificaciones', 'e1'] });
  }, '/src/lib/queryClient.ts');
  await expect.poll(() => queries).toBeGreaterThan(1);
  await expect(send).toBeDisabled();
  await expect(page.getByText('evidencia.png', { exact: true })).toBeVisible();
  failRefresh = true;
  refreshing = false;
  release();
  await expect(page.getByRole('button', { name: 'Reintentar consulta' })).toBeVisible();
  await expect(page.getByText('evidencia.png', { exact: true })).toBeVisible();
  await expect(send).toBeDisabled();
  failRefresh = false;
  await page.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect(send).toBeEnabled();

  await send.click();
  await expect(page.getByRole('status').filter({ hasText: 'Entrega de Estudiante Prueba guardada' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: /Buscar estudiante para esta entrega/ })).toHaveValue('');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(uploads).toBe(1);
  expect(writes).toEqual([]);
  await page.getByRole('option', { name: 'Alumno 2', exact: true }).click();
  await expect(page.getByText('evidencia.png', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Entrega de Estudiante Prueba guardada' })).toBeVisible();
});
