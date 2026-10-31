import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

const message = 'Aciertos: reconociste el tema.\nQué mejorar: ' + Array.from({ length: 28 }, (_, index) => `En la respuesta ${index + 1}, añade una razón apoyada en el texto y comprueba la evidencia. `).join('\n') + '\nSiguiente paso: escribe tu explicación y compárala con el material.';
const result = { estudiante: 'Estudiante Prueba', evaluacion: 'Lectura sintética', materia: 'Lenguaje', nota: '5', nota_maxima: '5', retroalimentacion: message, explicacion: 'Nota revisada.', respuestas: [], claves_liberadas: false, alcance: 'summary' };

async function openReview(page: Page, questionCount = 8) {
  await login(page, 'profesor', { questionCount });
  const writes: string[] = [];
  page.on('request', request => {
    if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones|jobs)\//.test(request.url()) && !/\/devoluciones\/(previsualizar|fichas)$/.test(new URL(request.url()).pathname)) writes.push(request.url());
  });
  await page.route('**/api/devoluciones/disponibilidad', route => route.fulfill({ json: { enabled: true } }));
  await page.route('**/api/evaluaciones/e1/devoluciones/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/previsualizar')) return route.fulfill({ json: { resultados: [{ calificacion_id: 'c1', elegible: true, seleccionable: true, fingerprint: 'f'.repeat(64), resultado: result, mensaje_editable: { source_fingerprint: 'f'.repeat(64), feedback_text: message, detail_available: false } }] } });
    if (path.endsWith('/accesos') && route.request().method() === 'GET') return route.fulfill({ json: { resultados: [], next_cursor: null } });
    if (path.endsWith('/fichas')) return route.fulfill({ json: { resultados: [{ calificacion_id: 'c1', resultado: result }] } });
    return route.fallback();
  });
  await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1');
  const tabs = page.getByRole('navigation', { name: 'Secciones de la calificación' });
  return { tabs, writes };
}

for (const width of [360, 384, 390, 412, 768, 1440]) for (const theme of ['light', 'dark']) test(`136 ocho preguntas compactas ${width}px ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
  const { tabs, writes } = await openReview(page);
  await tabs.getByRole('button', { name: 'Respuestas y puntajes', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Preguntas y criterios' });
  await expect(nav.getByRole('button')).toHaveCount(8);
  if (width < 640) {
    const geometry = await nav.evaluate(element => ({ height: element.getBoundingClientRect().height, rows: new Set(Array.from(element.children).map(child => child.getBoundingClientRect().top)).size }));
    expect(geometry.rows).toBe(2);
    expect(geometry.height).toBeLessThanOrEqual(112);
  }
  await expect(page.getByRole('button', { name: 'Pregunta anterior', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Pregunta siguiente', exact: true }).click();
  await expect(nav.getByRole('button').nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#grade-component-q2')).toContainText('Pregunta 2:');
  await nav.getByRole('button').nth(7).click();
  await expect(page.getByRole('button', { name: 'Pregunta siguiente', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(writes).toEqual([]);
});

for (const questionCount of [17, 30]) test(`136 ${questionCount} preguntas y ampliación sin pérdida`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  const { tabs, writes } = await openReview(page, questionCount);
  await tabs.getByRole('button', { name: 'Respuestas y puntajes', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Preguntas y criterios' });
  await expect(nav.getByRole('button')).toHaveCount(questionCount);
  for (const size of [150, 200]) {
    await page.evaluate(value => { document.documentElement.style.fontSize = `${value}%`; }, size);
    await nav.getByRole('button').last().click();
    await expect(nav.getByRole('button').last()).toHaveAttribute('aria-current', 'step');
    expect(await nav.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
  await page.setViewportSize({ width: 850, height: 390 });
  await expect(nav.getByRole('button').last()).toBeVisible();
  expect(writes).toEqual([]);
});

for (const width of [390, 1440]) test(`136 scroll desde texto y márgenes ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  const { tabs, writes } = await openReview(page);
  await tabs.getByRole('button', { name: 'Retroalimentación', exact: true }).click();
  const feedback = page.getByRole('region', { name: 'Retroalimentación del estudiante', exact: true });
  await expect(feedback.getByText(/En la respuesta 28,/)).toBeAttached();
  const scroll = page.getByTestId('grade-review-scroll');
  await expect(scroll).toHaveAttribute('data-mobile-scroll');
  await expect(feedback.locator('[data-mobile-scroll]')).toHaveCount(0);
  const box = await feedback.boundingBox();
  expect(box).not.toBeNull();
  for (const x of [box!.x + box!.width / 2, box!.x + 20, box!.x + box!.width - 20]) {
    await scroll.evaluate(element => { element.scrollTop = 480; });
    await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBe(480);
    const downTarget = await scroll.evaluate(element => Math.min(720, element.scrollHeight - element.clientHeight));
    expect(downTarget).toBeGreaterThan(600);
    await page.mouse.move(x, 620);
    await page.mouse.wheel(0, 240);
    // A wheel call returns before native scrolling ends; do not reverse from an intermediate frame.
    await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBe(downTarget);
    await page.mouse.wheel(0, -160);
    await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBe(downTarget - 160);
  }
  await feedback.getByRole('button', { name: 'Revisar retroalimentación de Estudiante Prueba', exact: true }).click();
  const input = feedback.getByRole('textbox', { name: 'Mensaje para el estudiante' });
  await input.fill('Un borrador que se debe conservar.');
  await tabs.getByRole('button', { name: 'Historial', exact: true }).click();
  await expect(input).toHaveValue('Un borrador que se debe conservar.');
  expect(writes).toEqual([]);
});

test('136 cambiar de pregunta no pierde el puntaje en edición ni escribe', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  const { tabs, writes } = await openReview(page);
  await tabs.getByRole('button', { name: 'Respuestas y puntajes', exact: true }).click();
  await page.getByRole('button', { name: 'Ajustar puntaje y explicación', exact: true }).click();
  const input = page.getByRole('spinbutton', { name: /Puntos \(máximo/ });
  await input.fill('0.5');
  await page.getByRole('button', { name: 'Pregunta siguiente', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cambios sin guardar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await expect(input).toHaveValue('0.5');
  await expect(page.getByRole('navigation', { name: 'Preguntas y criterios' }).getByRole('button').first()).toHaveAttribute('aria-current', 'step');
  expect(writes).toEqual([]);
});

for (const width of [390, 1440]) test(`136 ventana del grupo desplaza su mensaje y no el fondo ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  const { writes } = await openReview(page);
  if (width < 1280) await page.getByRole('button', { name: 'Volver a lista', exact: true }).click();
  await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
  await page.getByRole('button', { name: 'Retroalimentación del grupo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Retroalimentación del grupo', exact: true });
  await dialog.getByRole('button', { name: 'Ver retroalimentación de Estudiante Prueba', exact: true }).click();
  const detail = dialog.getByRole('region', { name: 'Retroalimentación de Estudiante Prueba', exact: true });
  const scroll = detail.locator('..');
  await expect(scroll).toHaveAttribute('data-mobile-scroll');
  const background = await page.evaluate(() => ({ window: window.scrollY, grade: document.querySelector('[data-testid="grade-review-scroll"]')?.scrollTop ?? null }));
  await scroll.evaluate(element => { element.scrollTop = 300; });
  const box = await scroll.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(400);
  expect(await page.evaluate(() => ({ window: window.scrollY, grade: document.querySelector('[data-testid="grade-review-scroll"]')?.scrollTop ?? null }))).toEqual(background);
  expect(writes).toEqual([]);
});
