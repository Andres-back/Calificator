import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

const question = (numero: number, puntaje: string) => ({
  numero, tipo: 'abierta', enunciado: `Pregunta sintética ${numero}`, opciones: [], puntaje, dba_ids: [], modalidad_respuesta: 'online',
});
const evaluation = {
  id: 'e1', materia_id: 'm1', profesor_id: 'p1', nombre: 'Evaluación sintética', descripcion: '', tipo_origen: 'externa_digitalizada',
  modalidad: 'online', nota_maxima: 5, estado: 'borrador', recepcion_habilitada: false, tiempo_limite_minutos: null,
  fecha_publicacion: null, fecha_limite_entrega: null, politica_intento: 'un_intento', intentos_permitidos: 1,
  preguntas: [question(1, '2'), question(2, '2'), question(3, '1')],
  respuestas_esperadas: [1, 2, 3].map(numero => ({ numero, respuesta: `Respuesta ${numero}`, dba_ids: [] })),
  criterios: [], dba_ids: [], dba_personalizado_ids: [], metas_profesor: [], created_at: '2026-11-06T00:00:00Z', updated_at: '2026-11-06T00:00:00Z',
};

async function openEditor(page: Page, hasDeliveries: boolean) {
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, 'profesor', { permissions: ['subjects.read', 'evaluations.read', 'evaluations.create', 'evaluations.update'] });
  const saved: Record<string, unknown>[] = [];
  await page.route('**/api/evaluaciones/contenido-visual/capacidades', route => route.fulfill({ json: { documento: false, editor: false, generacion: false, importacion: false, max_bytes: 20971520 } }));
  await page.route('**/api/materias/m1/evaluaciones', route => route.fulfill({ json: [evaluation] }));
  await page.route('**/api/evaluaciones/e1/reparto', route => route.fulfill({ json: { tiene_entregas: hasDeliveries } }));
  await page.route('**/api/evaluaciones/e1', route => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ json: evaluation });
    saved.push(route.request().postDataJSON());
    return route.fulfill({ json: { ...evaluation, ...saved[saved.length - 1] } });
  });
  await page.goto('/app/materias/m1/evaluaciones');
  await page.getByText('Más opciones', { exact: true }).click();
  await page.getByRole('button', { name: 'Editar preguntas', exact: true }).click();
  return { dialog: page.getByRole('dialog', { name: 'Editar contenido de la evaluación' }), saved };
}

test('155 pregunta nueva: escribir 0,5, ajustar y guardar a 360px', async ({ page }) => {
  const { dialog, saved } = await openEditor(page, false);
  await expect(dialog.getByLabel('Puntaje de la pregunta 1')).toBeEditable();
  await dialog.getByRole('button', { name: 'Agregar pregunta' }).click();
  await dialog.getByLabel('Enunciado', { exact: false }).fill('Pregunta nueva sintética');
  const score = dialog.getByLabel('Puntaje de la pregunta 4');
  await expect(score).toHaveAttribute('inputmode', 'decimal');
  await score.fill('0,5');
  await expect(dialog.getByText(/Suma de puntos: 5,5 de 5/)).toBeVisible();
  await expect(dialog.getByText(/Sobran 0,5/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Ajustar las demás' }).click();
  await expect(dialog.getByText(/Suma de puntos: 5 de 5/)).toBeVisible();
  await expect(score).toHaveValue('0,5');
  expect(saved).toHaveLength(0);
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await dialog.getByLabel('Respuesta esperada', { exact: false }).fill('Respuesta sintética');
  // At 360px the writing mode starts one frame after focus and hides the footer actions.
  const finishWriting = dialog.getByRole('button', { name: 'Listo', exact: true });
  await expect(finishWriting).toBeVisible();
  await finishWriting.click();
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect.poll(() => saved.length).toBe(1);
  const scores = (saved[0].preguntas as { puntaje: number | string }[]).map(item => Number(item.puntaje));
  expect(scores[3]).toBe(0.5);
  expect(Math.round(scores.reduce((sum, value) => sum + value, 0) * 10000)).toBe(50000);
});

test('155 con entregas el puntaje sigue protegido a 360px', async ({ page }) => {
  const { dialog, saved } = await openEditor(page, true);
  await expect(dialog.getByText(/Ya tiene entregas/)).toBeVisible();
  await expect(dialog.getByLabel('Puntaje de la pregunta 1')).not.toBeEditable();
  await expect(dialog.getByRole('button', { name: 'Ajustar las demás' })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Repartir puntos', exact: true })).toBeVisible();
  expect(saved).toHaveLength(0);
});
