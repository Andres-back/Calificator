import { expect, test } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

// Spec 156, PR 4: el docente marca una pregunta abierta como respuesta libre a 360 px.
const question = (numero: number, puntaje: string) => ({
  numero, tipo: 'abierta', enunciado: `Pregunta sintética ${numero}`, opciones: [], puntaje, dba_ids: [], modalidad_respuesta: 'fisica',
});
const evaluation = {
  id: 'e1', materia_id: 'm1', profesor_id: 'p1', nombre: 'Evaluación sintética', descripcion: '', tipo_origen: 'externa_digitalizada',
  modalidad: 'fisica', nota_maxima: 5, estado: 'borrador', recepcion_habilitada: false, tiempo_limite_minutos: null,
  fecha_publicacion: null, fecha_limite_entrega: null, politica_intento: 'un_intento', intentos_permitidos: 1,
  preguntas: [question(1, '2'), question(2, '2'), question(3, '1')],
  respuestas_esperadas: [
    { numero: 1, respuesta: 'Respuesta 1', dba_ids: [] },
    { numero: 2, respuesta: '', origen: 'pendiente', dba_ids: [] },
    { numero: 3, respuesta: 'Respuesta 3', dba_ids: [] },
  ],
  criterios: [], dba_ids: [], dba_personalizado_ids: [], metas_profesor: [], created_at: '2026-11-06T00:00:00Z', updated_at: '2026-11-06T00:00:00Z',
};

test('156 marcar una pregunta abierta como respuesta libre y guardar a 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, 'profesor', { permissions: ['subjects.read', 'evaluations.read', 'evaluations.create', 'evaluations.update'] });
  const saved: Record<string, unknown>[] = [];
  await page.route('**/api/evaluaciones/contenido-visual/capacidades', route => route.fulfill({ json: { documento: false, editor: false, generacion: false, importacion: false, max_bytes: 20971520 } }));
  await page.route('**/api/materias/m1/evaluaciones', route => route.fulfill({ json: [evaluation] }));
  await page.route('**/api/evaluaciones/e1/reparto', route => route.fulfill({ json: { tiene_entregas: false } }));
  await page.route('**/api/evaluaciones/e1', route => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ json: evaluation });
    saved.push(route.request().postDataJSON());
    return route.fulfill({ json: { ...evaluation, ...saved[saved.length - 1] } });
  });
  await page.goto('/app/materias/m1/evaluaciones');
  await page.getByText('Más opciones', { exact: true }).click();
  await page.getByRole('button', { name: 'Editar preguntas', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar contenido de la evaluación' });

  await dialog.getByRole('combobox', { name: 'Ir a la pregunta' }).selectOption('1');
  await expect(dialog.getByText('¿Tiene una respuesta esperada o es de respuesta libre?')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Respuesta libre', exact: true }).click();
  await expect(dialog.getByText('Cualquier respuesta válida', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Quitar respuesta libre' })).toBeVisible();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

  // At 360px a focused field may switch to writing mode and hide the footer actions.
  const finishWriting = dialog.getByRole('button', { name: 'Listo', exact: true });
  if (await finishWriting.isVisible()) await finishWriting.click();
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect.poll(() => saved.length).toBe(1);
  const answers = saved[0].respuestas_esperadas as Record<string, unknown>[];
  expect(answers[1]).toMatchObject({ numero: 2, respuesta: 'Cualquier respuesta válida', respuesta_libre: true, origen: 'confirmacion_docente' });
  expect(answers[0]).not.toHaveProperty('respuesta_libre');
  expect(answers[2]).not.toHaveProperty('respuesta_libre');
});
