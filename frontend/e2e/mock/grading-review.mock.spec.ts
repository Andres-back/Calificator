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

  await page.locator('summary', { hasText: 'Historial de revisión de IA' }).click();
  await expect(page.getByText(/La nota actual ya tiene una decisión del docente/)).toBeVisible();
  await expect(page.getByText('1 con observaciones iniciales')).toBeVisible();
  await expect(page.getByText('1 sin revisión completa al inicio')).toBeVisible();
  await page.getByRole('button', { name: /Ver primera respuesta con aviso/ }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A3/);
  await page.getByRole('button', { name: /Ver siguiente respuesta con aviso/ }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A2/);
  expect(mutations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});

for (const state of ['sugerida', 'procesando']) {
  test(`094 estado ${state} no oculta avisos ni publica una nota`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, 'profesor', { breakdown });
    const raw = 'feedback_quality:nota_global_no_coincide_con_suma';
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones)\//.test(request.url())) writes.push(request.url());
    });
    await page.route('**/api/calificaciones/c1/detalle', (route) => route.fulfill({ json: {
      id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1',
      estudiante_nombre: 'Estudiante Prueba', evaluacion_nombre: 'Multiplicación', materia_nombre: 'Matemáticas',
      nota_sugerida: state === 'procesando' ? null : 5, nota_confirmada: null, nota_maxima: 5,
      confianza: 0.98, feedback: '', estado: state, revisado_por_docente: false,
      resultado_json: state === 'procesando' ? { pipeline_status: 'running' } : {},
      timeline: [], guia_revision: [], entrega_tipo: 'online', entrega_archivo_url: null,
      entrega_respuesta_texto: 'P1: 24', entrega_evidencia_paginas: 0,
      desglose: { ...breakdown, bloqueos: [raw] },
      created_at: '2026-09-19T00:00:00Z', updated_at: '2026-09-19T00:00:00Z',
    } }));
    await page.goto('/app/calificaciones/workspace/e1?calificacion=c1');
    const detail = page.getByTestId('grade-review-scroll');
    if (state === 'procesando') {
      await expect(detail.getByText('Analizando evidencia…', { exact: true })).toBeVisible();
      await expect(detail.getByText('Calificando en segundo plano', { exact: true })).toBeVisible();
      await expect(detail.getByText('0.0', { exact: true })).toHaveCount(0);
      await detail.locator('summary', { hasText: 'Avisos del análisis en curso' }).click();
      await expect(detail.getByText(/La entrega sigue en análisis/)).toBeVisible();
      await expect(detail.getByText(/ya tiene una decisión del docente/)).toHaveCount(0);
    } else {
      await expect(detail.getByText('Nota sugerida por la IA', { exact: true })).toBeVisible();
      await expect(detail.getByText('Por revisar', { exact: true })).toBeVisible();
      await expect(detail.getByRole('alert')).toContainText('La nota propuesta por la IA no coincide con la suma de los puntos por pregunta.');
      await detail.getByRole('button', { name: 'Revisar puntajes por pregunta', exact: true }).click();
      await expect(detail.locator('#grade-review-panel')).toBeVisible();
      await expect(detail.locator('summary', { hasText: 'Historial de revisión de IA' })).toHaveCount(0);
    }
    await expect(detail.getByText(raw, { exact: true })).toHaveCount(0);
    expect(writes).toEqual([]);
  });
}

for (const width of [360, 390, 768, 1280, 1440]) {
  for (const mode of ['light', 'dark']) {
    test(`094 revisión clara y evidencia conservada ${width}px ${mode}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript((theme) => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: theme }, version: 0 })), mode);
      const raw = 'feedback_quality:nota_global_no_coincide_con_suma';
      const initialBreakdown = { ...breakdown, requiere_revision: false, bloqueos: [raw, 'provider_error:HTTP_503_trace_ab12'],
        formula: { ...breakdown.formula, puntos_obtenidos: 2, puntos_posibles: 4, nota_base: 2.5, nota_final: 2.5 },
        componentes: [{ ...base, id: 'safe', evidencia_paginas: [2], puntos_obtenidos: 2, puntos_maximos: 4 }],
      };
      await login(page, 'profesor', { rosterSize: 30, breakdown: initialBreakdown });
      const longName = 'María Alejandra NombreExtenso ApellidoExtenso SegundoApellidoExtenso';
      await page.route('**/api/calificaciones/*/detalle', async (route) => {
        const id = new URL(route.request().url()).pathname.split('/').at(-2)!;
        await route.fulfill({ json: { id, evaluacion_id: 'e1', estudiante_id: id.replace('c', 's'), materia_id: 'm1',
          estudiante_nombre: longName, evaluacion_nombre: 'Multiplicación', materia_nombre: 'Matemáticas',
          nota_sugerida: 5, nota_confirmada: 5, nota_maxima: 5, confianza: 0.98, feedback: 'Explica el procedimiento.',
          estado: 'publicada', revisado_por_docente: true, resultado_json: {}, timeline: [], guia_revision: [],
          desglose: initialBreakdown, entrega_tipo: 'imagen', entrega_respuesta_texto: null,
          entrega_archivo_url: '/api/evidencia-sintetica', entrega_evidencia_paginas: 2,
          created_at: '2026-09-19T00:00:00Z', updated_at: '2026-09-19T00:00:00Z' } });
      });
      // A synthetic image never leaves this mocked browser session.
      await page.route('**/api/evidencia-sintetica**', (route) => route.fulfill({ contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9l8AAAAASUVORK5CYII=', 'base64') }));
      const writes: string[] = [];
      page.on('request', (request) => {
        if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones)\//.test(request.url())) writes.push(request.url());
      });
      await page.goto('/app/calificaciones?evaluacion=e1');
      const roster = page.getByTestId('grade-review-roster');
      const search = roster.getByRole('searchbox', { name: 'Buscar estudiante' });
      await search.fill('Alumno 030');
      await expect(roster.locator('[data-review-grade]')).toHaveCount(1);
      await search.fill('');
      await expect(roster.locator('[data-review-grade]')).toHaveCount(30);
      await roster.locator('[data-review-grade="c1"]').click();
      await expect(page.getByTestId('grade-review-identity')).toContainText(longName);
      const history = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Historial de revisión de IA' }) });
      await expect(history).not.toHaveAttribute('open');
      await expect(page.getByText('Nota del estudiante', { exact: true })).toBeVisible();
      await page.getByText('Ver cálculo de la nota', { exact: true }).click();
      await expect(page.getByText(/Equivale a 2.50/)).toBeVisible();
      await page.getByRole('button', { name: '2. Evidencia', exact: true }).click();
      await expect(page.getByRole('img', { name: 'Hoja 1 de la evidencia del estudiante' })).toBeVisible();
      await page.getByLabel('Páginas de evidencia').getByRole('button', { name: '2', exact: true }).click();
      await expect(page.getByRole('img', { name: 'Hoja 2 de la evidencia del estudiante' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Abrir en grande' })).toHaveAttribute('href', '/api/evidencia-sintetica/paginas/2');
      await page.getByRole('button', { name: '3. Respuestas y puntajes', exact: true }).click();
      await page.getByRole('button', { name: 'Ver hoja 2 de la evidencia', exact: true }).click();
      await expect(page.getByRole('img', { name: 'Hoja 2 de la evidencia del estudiante' })).toBeVisible();
      await history.locator('summary').click();
      await expect(history).toContainText('En el análisis inicial, la IA propuso una nota distinta a la suma por preguntas.');
      await expect(page.getByText(raw, { exact: true })).toHaveCount(0);
      await expect(page.getByText('provider_error:HTTP_503_trace_ab12', { exact: true })).toHaveCount(0);
      await history.getByRole('button', { name: 'Ver puntajes por pregunta' }).first().click();
      await expect(page.locator('#grade-review-panel')).toBeVisible();
      await history.locator('summary').click();
      const scroller = page.getByTestId('grade-review-scroll');
      await scroller.evaluate((element) => { element.scrollTop = element.scrollHeight; });
      const options = page.locator('summary', { hasText: 'Historial y opciones de la nota' });
      await options.scrollIntoViewIfNeeded();
      await expect(options).toBeInViewport();
      const bounds = await options.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      if (width < 1280) {
        const bar = page.getByLabel('Acciones de la calificación');
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual((await bar.boundingBox())!.y);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
      await scroller.evaluate((element) => { element.scrollTop = 0; });
      await page.screenshot({ path: `../output/playwright/teacher-flow/review094-${width}-${mode}.png`, fullPage: true });
      if (width < 1280) await page.getByRole('button', { name: 'Volver a lista', exact: true }).click();
      await roster.locator('[data-review-grade="c2"]').click();
      await expect(page.getByTestId('grade-review-identity')).toContainText(longName);
      await expect(history).not.toHaveAttribute('open');
      expect(writes).toEqual([]);
    });
  }
}

const teacherPermissions = ['subjects.read', 'evaluations.read', 'evaluations.create', 'grading.read', 'grading.grade', 'grading.publish', 'gradebook.read', 'attendance.read', 'attendance.manage'];

for (const width of [360, 390, 768, 1280, 1440]) {
  for (const mode of ['light', 'dark']) {
    test(`095 interfaz docente ligera ${width}px ${mode}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(theme => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: theme }, version: 0 })), mode);
      await login(page, 'profesor', { permissions: [...teacherPermissions, 'evaluations.update', 'evaluations.publish', 'evaluations.delete'] });
      await installGroupViews(page);
      const evaluation = { id: 'e1', materia_id: 'm1', profesor_id: 'p1', nombre: 'Multiplicación', nota_maxima: 5, estado: 'publicada', modalidad: 'fisica', preguntas: [], criterios: [], dba_ids: [], dba_personalizado_ids: [] };
      await page.route('**/api/materias/m1/evaluaciones', route => route.fulfill({ json: [evaluation] }));
      const writes: string[] = [];
      page.on('request', request => { if (request.method() !== 'GET' && /\/api\/(evaluaciones|calificaciones)\//.test(request.url())) writes.push(request.url()); });
      await page.goto('/app/materias/m1/evaluaciones');
      await expect(page.getByText('Grado 4', { exact: true })).toBeVisible();
      const primary = page.getByRole('group', { name: 'Acciones principales de Multiplicación', exact: true });
      await expect(primary.getByRole('button')).toHaveCount(1);
      await expect(primary.getByRole('link')).toHaveCount(2);
      await expect(page.getByRole('button', { name: 'Editar preguntas' })).toBeHidden();
      const options = page.locator('summary', { hasText: 'Más opciones' });
      await options.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: 'Criterios y rúbrica' })).toBeVisible();
      await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: 'Conservar', exact: true }).click();
      for (const control of await primary.locator('button,a').all()) {
        const box = (await control.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
      await page.goto('/app/materias/m1/boletin');
      const roster = page.getByRole('list', { name: 'Estudiantes del boletín' });
      await expect(roster.getByRole('listitem')).toHaveCount(30);
      const filters = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Filtros' }) });
      await expect(filters).not.toHaveAttribute('open');
      if (width === 390) {
        const first = (await roster.getByRole('listitem').first().boundingBox())!;
        expect(first.y).toBeGreaterThanOrEqual(0);
        expect(first.y + first.height).toBeLessThanOrEqual(844);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
      await page.screenshot({ path: `../output/playwright/teacher-flow/boletin095-${width}-${mode}.png`, fullPage: false });
      await filters.locator('summary').click();
      await page.getByLabel('Filtrar por evaluación').selectOption('e1');
      await filters.locator('summary').click();
      await expect(page.getByRole('status', { name: 'Filtros aplicados' })).toContainText('Multiplicación');
      await page.getByRole('searchbox', { name: 'Buscar estudiante' }).fill('prueba');
      await roster.getByRole('button', { name: 'Ver boletín de Estudiante Prueba', exact: true }).click();
      await page.getByRole('dialog').getByRole('link', { name: 'Ver explicación de Multiplicación', exact: true }).click();
      await expect(page.getByRole('heading', { name: '1. Nota y explicación' })).toBeVisible();
      await expect.poll(() => page.evaluate(() => localStorage.getItem('xcalificator.teacher-review.v1.p1'))).not.toBeNull();
      await page.goto('/app');
      const resume = page.getByRole('link', { name: 'Continuar revisión', exact: true });
      await expect(resume).toHaveAttribute('href', /evaluacion=e1.*estudiante=s1.*calificacion=c1/);
      await resume.click();
      await expect(page.getByTestId('grade-review-identity')).toContainText('Estudiante Prueba');
      await expect(page.getByRole('button', { name: '2. Evidencia', exact: true })).toBeVisible();
      expect(writes).toEqual([]);
    });
  }
}

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
  await page.getByLabel('Abrir observación para Alumno 98', { exact: true }).click();
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
  await page.getByLabel('Abrir observación para Alumno 98', { exact: true }).click();
  await expect(observation).toHaveValue('Falta escoger estado');
  await expect(page.getByRole('button', { name: 'Con excusa para Alumno 98', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

async function installGroupViews(page: Page, longNames = false) {
  const roster = Array.from({ length: 100 }, (_, index) => ({ id: index === 0 ? 's1' : `s${index + 1}`, nombre: index === 0 ? 'Estudiante Prueba' : `Alumno ${index + 1}`, email: `alumno${index + 1}@example.test`, rol: 'estudiante', estado: 'activo' }));
  if (longNames) {
    for (const student of roster.slice(0, 2)) student.nombre = 'María Alejandra NombreExtenso ApellidoExtenso SegundoApellidoExtenso';
  }
  const subject = { id: 'm1', profesor_id: 'p1', nombre: 'Matemáticas', area: 'Matemáticas', grado: '4', estado: 'activa', estudiantes: roster.slice(0, 30) };
  const evaluation = { id: 'e1', materia_id: 'm1', profesor_id: 'p1', nombre: 'Multiplicación', nota_maxima: 5, estado: 'publicada', modalidad: 'online', preguntas: [], criterios: [], dba_ids: [], dba_personalizado_ids: [] };
  await page.route('**/api/materias/m1/estudiantes', (route) => route.fulfill({ json: subject }));
  await page.route('**/api/materias/m1/evaluaciones', (route) => route.fulfill({ json: [evaluation, { ...evaluation, id: 'e2', nombre: 'Otra evaluación', estado: 'cerrada' }, { ...evaluation, id: 'e3', nombre: 'Borrador', estado: 'borrador' }] }));
  await page.route(/\/api\/evaluaciones\/e1\/calificaciones(?:\?.*)?$/, (route) => route.fulfill({ json: [
    { id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', nota_confirmada: 5, nota_sugerida: 5, estado: 'publicada', revisado_por_docente: true },
    { id: 'c2', evaluacion_id: 'e1', estudiante_id: 's2', nota_confirmada: null, nota_sugerida: 0, estado: 'procesando' },
    { id: 'c3', evaluacion_id: 'e1', estudiante_id: 's3', nota_confirmada: 0, nota_sugerida: 0, estado: 'publicada', revisado_por_docente: true },
    { id: 'c4', evaluacion_id: 'e1', estudiante_id: 's4', nota_confirmada: null, nota_sugerida: 2.5, estado: 'pendiente' },
  ] }));
  await page.route(/\/api\/evaluaciones\/e2\/calificaciones(?:\?.*)?$/, (route) => route.fulfill({ json: [{ id: 'other-grade', evaluacion_id: 'e2', estudiante_id: 's1', nota_confirmada: 1.5, estado: 'publicada', revisado_por_docente: true }] }));
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

for (const width of [360, 1280]) {
  test(`asistencia identifica homónimos y nombres largos ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await login(page, 'profesor', { permissions: teacherPermissions });
    await installGroupViews(page, true);
    await page.goto('/app/materias/m1/asistencia');
    const search = page.getByRole('searchbox', { name: 'Buscar estudiante' });
    await search.fill('NombreExtenso');
    const list = page.getByLabel('Lista de asistencia');
    const rows = list.locator(':scope > *');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('SegundoApellidoExtenso');
    await expect(rows.first()).toContainText('alumno1@example.test');
    await expect(rows.nth(1)).toContainText('alumno2@example.test');
    for (const control of await rows.first().getByRole('button').all()) {
      const box = (await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const summary = rows.first().locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    const observation = rows.first().getByRole('textbox');
    await expect(observation).toBeVisible();
    await observation.fill('Borrador sin marcar');
    await summary.click();
    await summary.click();
    await expect(observation).toHaveValue('Borrador sin marcar');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    await page.screenshot({ path: `../output/playwright/teacher-flow/attendance-long-names-${width}.png`, fullPage: true });
    await search.fill('alumno100@');
    await expect(page.getByText('Alumno 100', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Presente para Alumno 100', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Presente para Alumno 100', exact: true })).toBeInViewport();
  });
}

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 800 }, { width: 1280, height: 800 }]) {
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
      const roster = page.getByRole('list', { name: 'Estudiantes del boletín' });
      await expect(roster.getByRole('listitem')).toHaveCount(30);
      await expect(roster.getByRole('button', { name: 'Ver boletín de Alumno 2', exact: true })).toContainText('Calificando');
      await expect(roster.getByRole('button', { name: 'Ver boletín de Alumno 3', exact: true })).toContainText('0.0 / 5.0');
      const columns = await roster.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(viewport.width < 640 ? 2 : viewport.width < 1280 ? 3 : 4);
      const firstFour = await roster.getByRole('listitem').evaluateAll((rows) => rows[3].getBoundingClientRect().bottom - rows[0].getBoundingClientRect().top);
      expect(firstFour).toBeLessThanOrEqual(500);
      await page.getByRole('searchbox', { name: 'Buscar estudiante' }).fill('prueba');
      await expect(roster.getByRole('listitem')).toHaveCount(1);
      await page.getByRole('button', { name: 'Ver boletín de Estudiante Prueba', exact: true }).click();
      const preview = page.getByRole('dialog', { name: 'Boletín de Estudiante Prueba', exact: true });
      await expect(preview.getByRole('listitem')).toHaveCount(2);
      await expect(preview.getByText('5.0 / 5.0', { exact: true })).toBeVisible();
      await expect(preview.getByText('1.5 / 5.0', { exact: true })).toBeVisible();
      await preview.getByRole('link', { name: 'Ver explicación de Multiplicación', exact: true }).click();
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
      if (viewport.width === 1280) {
        const rows = page.getByLabel('Lista de asistencia').locator(':scope > *');
        await expect(rows).toHaveCount(100);
        const first = await rows.first().boundingBox();
        const eighth = await rows.nth(7).boundingBox();
        expect(eighth!.y + eighth!.height - first!.y).toBeLessThanOrEqual(600);
        for (const control of await rows.first().getByRole('button').all()) {
          const bounds = await control.boundingBox();
          expect(bounds!.height).toBeGreaterThanOrEqual(44);
          expect(bounds!.width).toBeGreaterThanOrEqual(44);
        }
      }
      await search.fill('alumno99@');
      await expect(page.getByText('1 de 100 estudiantes', { exact: true })).toBeVisible({ timeout: 1_000 });
      const firstPatch = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().endsWith('/materias/m1/asistencia'));
      await page.getByRole('button', { name: 'Llegó tarde para Alumno 99', exact: true }).click();
      expect((await firstPatch).postDataJSON().registros).toEqual([{ estudiante_id: 's99', estado: 'tarde', observacion: null }]);
      await page.getByLabel('Abrir observación para Alumno 99', { exact: true }).click();
      await page.getByRole('textbox', { name: 'Observación para Alumno 99' }).fill('Con autorización');
      await page.getByLabel('Abrir observación para Alumno 99', { exact: true }).click();
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
      await page.getByLabel('Abrir observación para Alumno 99', { exact: true }).click();
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
      await page.getByLabel('Abrir observación para Alumno 99', { exact: true }).click();
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
  await expect(page.getByText('1 de 30 registrados', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Elegir a Alumno 2', exact: true }).click();
  await expect(page.getByText('evidencia.png', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Entrega de Estudiante Prueba guardada' })).toBeVisible();
});
