import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { login } from './fixtures/explainableGrading';

for (const width of [390, 1440]) test(`141 descarga el CSV final de la evaluación desde revisión a ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  await login(page, 'profesor', { permissions: ['subjects.read', 'evaluations.read', 'grading.read', 'gradebook.read'] });

  const subject = { id: 'm1', nombre: 'Matemáticas', estudiantes: [
    { id: 's1', nombre: 'Ángela; "Prueba"', email: 'angela@example.test' },
    { id: 's2', nombre: 'Estudiante ajustado', email: 'ajustado@example.test' },
    { id: 's3', nombre: 'Estudiante pendiente', email: 'pendiente@example.test' },
  ] };
  const evaluation = { id: 'e1', materia_id: 'm1', profesor_id: 'p1', nombre: 'Multiplicación', nota_maxima: 5, estado: 'en_calificacion', modalidad: 'fisica', preguntas: [] };
  await page.route('**/api/materias/m1/estudiantes', route => route.fulfill({ json: subject }));
  await page.route('**/api/materias/m1/evaluaciones', route => route.fulfill({ json: [
    evaluation, { ...evaluation, id: 'e2', nombre: 'Otra evaluación' },
  ] }));
  await page.route('**/api/evaluaciones/e1/calificaciones?solo_lectura=true', route => route.fulfill({ json: [
    { id: 'g1', evaluacion_id: 'e1', estudiante_id: 's1', estado: 'publicada', nota_confirmada: 0, nota_sugerida: 5 },
    { id: 'g2', evaluacion_id: 'e1', estudiante_id: 's2', estado: 'ajustada', nota_confirmada: 4.25, nota_sugerida: 3 },
    { id: 'g3', evaluacion_id: 'e1', estudiante_id: 's3', estado: 'requiere_revision', nota_sugerida: 3.5 },
  ] }));
  const writes: string[] = [];
  const otherEvaluationReads: string[] = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (/^\/api\/(materias|evaluaciones|calificaciones)\//.test(path) && request.method() !== 'GET') writes.push(path);
    if (path === '/api/evaluaciones/e2/calificaciones') otherEvaluationReads.push(path);
  });
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
  await page.getByRole('button', { name: 'Más acciones' }).click();
  await page.getByRole('button', { name: 'Exportar notas CSV', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Exportar notas' });
  await expect(dialog.getByRole('checkbox', { name: 'Multiplicación' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Otra evaluación' })).toHaveCount(0);
  await expect(dialog.getByText(/2 notas finales/)).toBeVisible();
  const reading = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Descargar notas CSV' }).click();
  const file = await reading;
  expect(file.suggestedFilename()).toMatch(/Notas-.*\.csv$/);
  const csv = await readFile((await file.path())!, 'utf8');
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  const [header, ...rows] = csv.slice(1).split('\r\n');
  expect(header).toBe('Nombre del estudiante;Multiplicación');
  expect(rows).toHaveLength(3);
  expect(rows).toEqual(expect.arrayContaining([
    '"Ángela; ""Prueba""";0', 'Estudiante ajustado;4,25', 'Estudiante pendiente;',
  ]));
  expect(csv).not.toContain('@example.test');
  expect(otherEvaluationReads).toEqual([]);
  expect(writes).toEqual([]);
});
