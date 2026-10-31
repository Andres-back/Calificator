import { expect, test, type Page, type Route } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

const json = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

async function setup(page: Page, options: { state?: string; failure?: number; permissions?: string[] } = {}) {
  await login(page, 'profesor', { permissions: options.permissions });
  const components = [0.95, 0.8, 0.4].map((confidence, i) => ({ id: `q${i + 1}`, clave: `pregunta:${i + 1}`, orden: i,
    numero: String(i + 1), tipo: 'pregunta', titulo: `Explica con tus palabras la idea ${i + 1} de la lectura.`,
    respuesta_estudiante: 'El personaje cambió de opinión al escuchar a su amiga.', respuesta_referencia: 'Relacionar la decisión con el diálogo del relato.',
    puntos_obtenidos: [1.5, 1.2, 1.4][i], puntos_maximos: [2, 1.5, 1.5][i], estado: 'parcial',
    explicacion: 'Identificó el cambio, pero falta explicar una razón del relato.', origen: 'consenso_ia', requiere_revision: false, evidencia_paginas: [],
    valoraciones: ['A', 'B'].map((evaluador) => ({ evaluador, puntaje: [1.5, 1.2, 1.4][i], estado: 'parcial', confianza: confidence })),
  }));
  let grade = { id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1', nota_sugerida: 4.1, nota_confirmada: 4.1,
    confianza: 0.9, feedback: 'Explica qué palabras de su amiga hicieron cambiar al personaje.', estado: options.state ?? 'confirmada', revisado_por_docente: true,
    resultado_json: {}, created_at: '2026-10-28T12:00:00', updated_at: '2026-10-28T12:00:00' };
  let version = 1;
  const writes: Record<string, unknown>[] = [];
  const detail = () => ({ ...grade, estudiante_nombre: 'Estudiante Prueba', evaluacion_nombre: 'Multiplicación', materia_nombre: 'Matemáticas', nota_maxima: 5,
    entrega_tipo: 'online', entrega_respuesta_texto: 'Respuesta sintética', entrega_archivo_url: null, entrega_evidencia_paginas: 0,
    timeline: [], guia_revision: [], desglose_heredado: false, respuestas_liberadas: true,
    desglose: { id: `d${version}`, calificacion_id: 'c1', version, origen: version === 1 ? 'automatico' : 'docente', cobertura_estado: 'completa', requiere_revision: false,
      formula: { puntos_obtenidos: 4.1, puntos_posibles: 5, nota_maxima: 5, nota_base: 4.1, ajuste_global: grade.nota_confirmada - 4.1,
        nota_antes_redondeo: grade.nota_confirmada, nota_final: grade.nota_confirmada, regla_redondeo: 'half_up', decimales: 2 }, componentes: components, created_at: grade.updated_at } });
  await page.route('**/api/calificaciones/c1/detalle', (route) => json(route, detail()));
  await page.route('**/api/evaluaciones/e1/calificaciones*', (route) => json(route, [grade]));
  await page.route('**/api/evaluaciones/e1/revision**', (route) => json(route, {
    evaluacion_id: 'e1', materia_id: 'm1', total_alumnos: 1, siguiente_cursor: null,
    contadores: { todas: 1, pendientes: 0, alertas: 0, procesando: 0, publicadas: grade.estado === 'publicada' ? 1 : 0 },
    alumnos: [{ estudiante_id: 's1', nombre: 'Estudiante Prueba', calificacion_id: 'c1', entrega_id: 't1', job_id: null,
      estado: grade.estado, nota: grade.nota_confirmada,
      resumen_revision: { version, cobertura: 'completa', bloqueos: [], componentes_pendientes: 0, componentes_ilegibles: 0, pqrs_abiertas: 0, tiene_alertas: false } }],
  }));
  await page.route('**/api/calificaciones/c1/ajustar', async (route) => {
    writes.push(route.request().postDataJSON());
    if (options.failure) return json(route, { detail: options.failure === 409 ? 'La nota cambió en otra sesión.' : 'El servicio no está disponible.' }, options.failure);
    grade = { ...grade, nota_confirmada: Number(writes.at(-1)!.nota_confirmada), estado: 'ajustada', updated_at: '2026-10-28T12:01:00' };
    version += 1;
    return json(route, grade);
  });
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1&calificacion=c1&estudiante=s1');
  return { writes, detail };
}

for (const width of [360, 390, 1440]) for (const theme of ['light', 'dark']) {
  test(`134 nota directa ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const sample = await setup(page);
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
    const edit = page.getByRole('button', { name: 'Editar nota', exact: true });
    await edit.click();
    const input = page.getByLabel('Nota final', { exact: true });
    await expect(input).toBeFocused();
    await input.fill('4,5');
    const save = page.getByRole('button', { name: 'Guardar nota', exact: true });
    await expect(save).toBeEnabled();
    expect((await save.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `output/playwright/spec134-note-${width}-${theme}-${test.info().project.name}.png` });
    await save.click();
    await expect(page.getByTestId('grade-final-editor')).toHaveCount(0);
    await expect(page.getByTestId('grade-review-scroll')).toContainText('Nota final');
    await expect(page.getByTestId('grade-review-students').locator('[data-review-student]').first()).toContainText('4.5');
    await expect(page.getByRole('button', { name: 'Terminar de escribir', exact: true })).toHaveCount(0);
    if (width < 1280) await expect(page.locator('[aria-label="Acciones de la calificación"]')).toBeVisible();
    expect(sample.writes).toHaveLength(1);
    expect(sample.writes[0]).toMatchObject({ nota_confirmada: 4.5, version_desglose_esperada: 1, actualizado_en_esperado: '2026-10-28T12:00:00', observacion: '' });
    expect(sample.writes[0]).not.toHaveProperty('feedback');
    expect(sample.detail().desglose.componentes.map((component) => component.puntos_obtenidos)).toEqual([1.5, 1.2, 1.4]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test(`134 colores de revisión ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const sample = await setup(page);
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
    await page.getByRole('button', { name: 'Respuestas y puntajes', exact: true }).click();
    for (const [index, label, priority] of [[1, 'Sin avisos de revisión', 'safe'], [2, 'Conviene comprobar', 'attention'], [3, 'Revisión prioritaria', 'blocked']] as const) {
      const button = page.getByRole('button', { name: `Pregunta ${index}, ${label}`, exact: true });
      // The first question is initially selected; assert it before navigating
      // to each remaining priority. All selection and color checks still apply.
      if (index !== 1) await button.click();
      await expect(button).toHaveAttribute('aria-current', 'step');
      await expect(button).toHaveAttribute('data-review-priority', priority);
      await expect(page.locator(`#grade-component-q${index}`)).toHaveAttribute('data-review-priority', priority);
      await expect(button).toHaveClass(/ring-2/);
    }
    await page.screenshot({ path: `output/playwright/spec134-priority-${width}-${theme}-${test.info().project.name}.png` });
    expect(sample.detail().desglose.componentes.map((component) => component.puntos_obtenidos)).toEqual([1.5, 1.2, 1.4]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

for (const failure of [409, 503]) test(`134 conserva borrador con ${failure} sin reintento automático`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const sample = await setup(page, { failure });
  await page.getByRole('button', { name: 'Editar nota', exact: true }).click();
  await page.getByLabel('Nota final', { exact: true }).fill('4,5');
  await page.getByRole('button', { name: 'Guardar nota', exact: true }).click();
  await expect(page.getByTestId('grade-final-editor').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Nota final', { exact: true })).toHaveValue('4,5');
  expect(sample.writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar nota', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Terminar de escribir', exact: true })).toHaveCount(0);
  await expect(page.locator('[aria-label="Acciones de la calificación"]')).toBeVisible();
});

test('134 publicada requiere advertencia y permiso de docente', async ({ page }) => {
  const sample = await setup(page, { state: 'publicada' });
  await page.getByRole('button', { name: 'Editar nota', exact: true }).click();
  await page.getByLabel('Nota final', { exact: true }).fill('4.5');
  await expect(page.getByRole('button', { name: 'Guardar nota', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: /Entiendo y deseo/ }).check();
  await page.getByRole('button', { name: 'Guardar nota', exact: true }).click();
  await expect(page.getByTestId('grade-final-editor')).toHaveCount(0);
  expect(sample.writes).toHaveLength(1);
  expect(sample.detail().estado).toBe('ajustada');
});

test('134 sin permiso de calificar no ofrece editar nota', async ({ page }) => {
  const sample = await setup(page, { permissions: ['subjects.read', 'evaluations.read', 'grading.read'] });
  await expect(page.getByTestId('grade-review-scroll')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar nota', exact: true })).toHaveCount(0);
  expect(sample.writes).toEqual([]);
});
