import { expect, test } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

const contextual = '/app/materias/m1/evaluaciones/e1/revision';

for (const width of [384, 1440]) for (const theme of ['light', 'dark']) {
  test(`138 revisión contextual conserva ubicación y selección ${width}px ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    await login(page, 'profesor', { questionCount: 8 });
    const writes: string[] = [];
    page.on('request', request => { if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones)\//.test(request.url())) writes.push(request.url()); });
    await page.goto(`${contextual}?calificacion=c1&estudiante=s1&pregunta=pregunta%3A2&hoja=1&filtro=publicadas`);
    await expect(page.getByTestId('grade-review-scroll')).toBeVisible();
    const location = page.getByRole('navigation', { name: 'Ubicación de la revisión' }).filter({ visible: true });
    await expect(location).toContainText('Matemáticas');
    await expect(location).toContainText('Multiplicación');
    await expect(location).toContainText('Estudiante Prueba');
    const tabs = page.getByRole('navigation', { name: 'Secciones de la calificación' });
    // The deep link already opens Respuestas; clicking its toggle would close it.
    await expect(tabs.getByRole('button', { name: 'Respuestas y puntajes', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: 'Preguntas y criterios' }).getByRole('button').nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('#grade-review-panel').getByText('Proceso: evidencia extraída', { exact: false })).toHaveCount(0);
    await expect(page.getByText('Cada puntaje muestra la evidencia y la razón que lo respalda.')).toHaveCount(0);
    await page.screenshot({ path: `../output/playwright/spec138/revision-${width}-${theme}-${info.project.name}.png`, fullPage: false });
    await page.getByRole('button', { name: 'Volver a lista', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(new RegExp(`${contextual}\\?`));
    await expect.poll(() => new URL(page.url()).searchParams.get('calificacion')).toBeNull();
    expect(new URL(page.url()).searchParams.get('filtro')).toBe('publicadas');
    expect(writes).toEqual([]);
  });
}

test('138 un contexto contradictorio no consulta alumnos ni calificaciones', async ({ page }) => {
  await login(page, 'profesor');
  const reads: string[] = [];
  page.on('request', request => { if (/\/api\/(?:calificaciones\/c1|evaluaciones\/e1\/revision|materias\/m2\/estudiantes)/.test(request.url())) reads.push(request.url()); });
  await page.goto('/app/materias/m2/evaluaciones/e1/revision?calificacion=c1');
  await expect(page.getByRole('alert')).toContainText('no corresponde');
  expect(reads).toEqual([]);
  await expect(page.getByRole('button', { name: 'Confirmar nota', exact: true })).toHaveCount(0);
});

test('138 Pendientes distingue muestra y total y no consulta cada evaluación', async ({ page }) => {
  await login(page, 'profesor', { permissions: ['subjects.read', 'evaluations.read', 'grading.read', 'grading.grade', 'submissions.review'] });
  await page.route('**/api/calificaciones/bandeja-docente', route => route.fulfill({ json: { reclamos_abiertos: 0, pendientes_revision: 100, reclamos: [], pendientes: [{ id: 'c1', tipo: 'calificacion_pendiente', calificacion_id: 'c1', evaluacion_id: 'e1', evaluacion_nombre: 'Multiplicación', materia_id: 'm1', materia_nombre: 'Matemáticas', estudiante_id: 's1', estudiante_nombre: 'Estudiante Prueba', estado: 'requiere_revision', motivo: null, descripcion: null, created_at: '2026-10-30T00:00:00Z' }] } }));
  const evaluationReads: string[] = [];
  page.on('request', request => { if (/\/api\/evaluaciones\//.test(request.url())) evaluationReads.push(request.url()); });
  await page.goto('/app/calificaciones');
  await expect(page.getByRole('heading', { name: 'Pendientes', exact: true })).toBeVisible();
  await expect(page.getByText('Mostrando 1 de 100 casos')).toBeVisible();
  expect(evaluationReads).toEqual([]);
  await expect(page.getByRole('link', { name: 'Revisar Estudiante Prueba en Multiplicación' })).toHaveAttribute('href', new RegExp(contextual));
});

test('138 perfil sin bandeja conserva selección sin petición prohibida', async ({ page }) => {
  await login(page, 'profesor', { permissions: ['grading.read', 'grading.grade'] });
  const forbidden: string[] = [];
  page.on('request', request => { if (request.url().includes('/calificaciones/bandeja-docente')) forbidden.push(request.url()); });
  await page.goto('/app/calificaciones');
  await expect(page.getByRole('heading', { name: 'Pendientes', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Elegir evaluación', exact: true })).toBeVisible();
  expect(forbidden).toEqual([]);
});

test('138 estudiante no abre revisión contextual y conserva Mis resultados', async ({ page }) => {
  await login(page, 'estudiante');
  await page.goto(`${contextual}?calificacion=c1`);
  await expect(page).toHaveURL(/\/app\/403/);
  await expect(page.getByRole('link', { name: 'Mis resultados', exact: true })).toHaveAttribute('href', '/app/calificaciones/boletin');
});

for (const width of [360, 390, 768]) test(`138 contexto con texto 200% y altura de teclado ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 550 });
  await login(page, 'profesor', { questionCount: 17 });
  await page.goto(`${contextual}?calificacion=c1&estudiante=s1&pregunta=pregunta%3A17`);
  await expect(page.getByTestId('grade-review-scroll')).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect.poll(() => page.getByTestId('grade-review-scroll').evaluate(element => element.clientHeight)).toBeGreaterThan(100);
  const questions = page.getByRole('navigation', { name: 'Preguntas y criterios' });
  await expect(questions.getByRole('button').last()).toHaveAttribute('aria-current', 'step');
  await questions.getByRole('button').first().click();
  await expect(questions.getByRole('button').first()).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'Ajustar puntaje y explicación', exact: true }).click();
  const points = page.getByRole('spinbutton', { name: /Puntos \(máximo/ });
  await points.fill('0.5');
  await page.getByRole('button', { name: 'Volver a lista', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cambios sin guardar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await expect(points).toHaveValue('0.5');
  await points.scrollIntoViewIfNeeded();
  await points.focus();
  await expect(points).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `../output/playwright/spec138/texto200-${width}-${info.project.name}.png` });
});

test('138 revisión heredada sigue accesible sin permiso de materias', async ({ page }) => {
  await login(page, 'profesor', { permissions: ['grading.read', 'grading.grade'] });
  await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1');
  await expect(page.getByTestId('grade-review-identity')).toContainText('Estudiante Prueba');
  await expect(page.getByRole('navigation', { name: 'Ubicación de la revisión' }).filter({ visible: true })).toContainText('Multiplicación');
  await page.getByRole('button', { name: 'Volver a lista', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/app\/calificaciones\?/);
  await expect(page.getByRole('searchbox', { name: 'Buscar estudiante', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Libro de notas', exact: true })).toHaveCount(0);
});

test('138 retorno al libro conserva filtros solo de la misma materia', async ({ page }) => {
  await login(page, 'profesor', { permissions: ['subjects.read', 'evaluations.read', 'gradebook.read', 'grading.read', 'grading.grade'] });
  const book = '/app/materias/m1/boletin?evaluacion=e1&q=Mar%C3%ADa';
  await page.goto(`${contextual}?calificacion=c1&volver=${encodeURIComponent(book)}`);
  await expect(page.getByRole('navigation', { name: 'Ubicación de la revisión' }).filter({ visible: true }).getByRole('link', { name: 'Libro de notas', exact: true })).toHaveAttribute('href', book);
});
