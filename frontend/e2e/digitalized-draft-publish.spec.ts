import { expect, test } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

// Spec 156, Historia 3: from a finished digitalization to a published evaluation, at 360 px, with synthetic data.
const question = (numero: number, puntaje: string) => ({
  numero, tipo: 'abierta', enunciado: `Pregunta sintética ${numero}`, opciones: [], puntaje, dba_ids: [], modalidad_respuesta: 'fisica',
});
const draft = {
  id: 'd1', materia_id: 'm1', profesor_id: 'p1', nombre: 'Taller digitalizado sintético', descripcion: '', tipo_origen: 'externa_digitalizada',
  modalidad: 'fisica', nota_maxima: 5, estado: 'borrador', recepcion_habilitada: false, tiempo_limite_minutos: null,
  fecha_publicacion: null, fecha_limite_entrega: null, politica_intento: 'un_intento', intentos_permitidos: 1,
  preguntas: [question(1, '2'), question(2, '2'), question(3, '1')],
  respuestas_esperadas: [1, 2, 3].map(numero => ({ numero, respuesta: numero === 2 ? '' : `Respuesta ${numero}`, dba_ids: [] })),
  criterios: [{ nombre: 'Comprensión', descripcion: 'Responde con sentido.', peso_porcentaje: 100, puntaje_maximo: 5, dba_ids: [] }],
  blueprint: { reglas_feedback: { advertencias: ['No pudimos leer la hoja 2. Digitaliza de nuevo esa hoja o escribe sus preguntas en el borrador.'] } },
  dba_ids: [], dba_personalizado_ids: [], metas_profesor: [], created_at: '2026-11-07T00:00:00Z', updated_at: '2026-11-07T00:00:00Z',
};

test('156 de "Revisar borrador" a publicar y calificar a 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, 'profesor', { permissions: ['subjects.read', 'evaluations.read', 'evaluations.create', 'evaluations.update', 'evaluations.publish', 'grading.read', 'grading.grade'] });
  const calls: string[] = [];
  let current: Record<string, unknown> = { ...draft };
  await page.route('**/api/evaluaciones/contenido-visual/capacidades', route => route.fulfill({ json: { documento: false, editor: false, generacion: false, importacion: false, max_bytes: 20971520 } }));
  await page.route('**/api/jobs/job-1', route => route.fulfill({ json: { id: 'job-1', estado: 'success', progreso: 100,
    resultado_json: { evaluacion_id: 'd1', materia_id: 'm1', preguntas_count: 3, clave_completa: false, claves_pendientes: [2] }, error: null } }));
  await page.route('**/api/materias/m1/evaluaciones', route => route.fulfill({ json: [current] }));
  await page.route('**/api/evaluaciones/d1/reparto', route => route.fulfill({ json: { tiene_entregas: false } }));
  await page.route('**/api/evaluaciones/d1/publicar', route => {
    calls.push('publicar');
    current = { ...current, estado: 'publicada', recepcion_habilitada: true };
    return route.fulfill({ json: current });
  });
  await page.route('**/api/evaluaciones/d1', route => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ json: current });
    calls.push('guardar');
    current = { ...current, ...route.request().postDataJSON(), updated_at: '2026-11-07T01:00:00Z' };
    return route.fulfill({ json: current });
  });

  await page.evaluate(() => window.localStorage.setItem('xcalificator.pending-digitalizations.v1', JSON.stringify([{
    jobId: 'job-1', materiaId: 'm1', nombre: 'Taller digitalizado sintético', createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), status: 'running', progress: 40,
  }])));
  await page.reload();
  const monitor = page.getByRole('complementary', { name: 'Estado de digitalización' });
  await monitor.getByRole('button', { name: 'Revisar borrador' }).click();

  const dialog = page.getByRole('dialog', { name: 'Editar contenido de la evaluación' });
  const checklist = dialog.getByRole('region', { name: 'Para publicar' });
  await expect(checklist).toContainText('No pudimos leer la hoja 2');
  await expect(checklist).toContainText('Falta completar 1 pregunta');
  await expect(checklist.getByRole('button', { name: 'Publicar y empezar a calificar' })).toHaveCount(0);
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

  await checklist.getByRole('button', { name: 'Ir a la pregunta 2' }).click();
  await expect(dialog.getByRole('heading', { name: 'Pregunta 2 de 3' })).toBeVisible();
  await dialog.getByLabel('Respuesta esperada', { exact: false }).fill('Respuesta sintética 2');
  // At 360px the writing mode starts one frame after focus and hides the checklist and footer actions.
  const finishWriting = dialog.getByRole('button', { name: 'Listo', exact: true });
  await expect(finishWriting).toBeVisible();
  await finishWriting.click();

  await expect(checklist).toContainText('Todo listo para publicar');
  await checklist.getByRole('button', { name: 'Publicar y empezar a calificar' }).click();
  await page.getByRole('dialog', { name: 'Publicar evaluación' }).getByRole('button', { name: 'Publicar', exact: true }).click();

  await expect(page).toHaveURL(/evaluacion=d1/);
  await expect(page).toHaveURL(/modo=carga/);
  expect(calls).toEqual(['guardar', 'publicar']);
  const saved = current.respuestas_esperadas as { numero: number; respuesta: string }[];
  expect(saved.find(answer => answer.numero === 2)?.respuesta).toBe('Respuesta sintética 2');
});
