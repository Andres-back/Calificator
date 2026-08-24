import { expect, test, type Page, type Route } from '@playwright/test';

const teacher = { id: 'p1', nombre: 'Profesora Prueba', email: 'profesora@example.test', rol: 'profesor', estado: 'activo' };
const student = { id: 's1', nombre: 'Estudiante Prueba', email: 'estudiante@example.test', rol: 'estudiante', estado: 'activo' };
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

async function installMocks(page: Page, role: 'profesor' | 'estudiante') {
  let authenticated = false;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/login') { authenticated = true; return json(route, {}); }
    if (path === '/auth/refresh') return json(route, { detail: 'Sin sesión' }, 401);
    if (path === '/auth/me') return authenticated ? json(route, { user: role === 'profesor' ? teacher : student }) : json(route, { detail: 'Sin sesión' }, 401);
    if (path === '/materias') return json(route, [materia]);
    if (path === '/materias/m1/evaluaciones') return json(route, [evaluation]);
    if (path === '/materias/m1/estudiantes') return json(route, { ...materia, estudiantes: [student] });
    if (path === '/evaluaciones/e1') return json(route, evaluation);
    if (path === '/evaluaciones/e1/calificaciones') return json(route, [grade]);
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

async function login(page: Page, role: 'profesor' | 'estudiante') {
  await installMocks(page, role);
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(role === 'profesor' ? teacher.email : student.email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await expect(page).toHaveURL(/\/app/);
}

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1366, height: 768 }]) {
  test(`docente comprende fórmula y pregunta en ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page, 'profesor');
    await page.goto('/app/calificaciones/workspace/e1');
    await page.getByText('Estudiante Prueba', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeVisible();
    await expect(page.getByText('Coincide con la clave oficial.', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  });
}

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
  await expect(page.getByText(/cambió en otra revisión/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajustar puntaje y explicación' })).toBeVisible();
});
