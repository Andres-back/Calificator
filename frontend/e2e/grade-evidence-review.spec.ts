import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { login } from './fixtures/explainableGrading';

const base = {
  clave: 'seccion-a:pregunta-1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Explica tu procedimiento',
  respuesta_estudiante: 'Seis grupos de cuatro son veinticuatro.', respuesta_referencia: '24',
  puntos_obtenidos: 1, puntos_maximos: 1, estado: 'correcta', explicacion: 'Coincide con la referencia.',
  origen: 'objetivo', requiere_revision: false, evidencia_paginas: [1], valoraciones: [],
};
const components = [
  { ...base, id: 'q1' },
  { ...base, id: 'q2', clave: 'seccion-b:pregunta-1', numero: '1-B', orden: 1, estado: 'incorrecta', puntos_obtenidos: 0, evidencia_paginas: [2] },
  { ...base, id: 'q3', clave: 'pregunta-3', numero: '3', orden: 2, estado: 'correcta', requiere_revision: true, evidencia_paginas: [1, 2] },
  { ...base, id: 'q4', clave: 'pregunta-4', numero: '4', orden: 3, estado: 'parcial', puntos_obtenidos: 0.5, evidencia_paginas: [] },
];
const breakdown = {
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'completa', requiere_revision: true,
  created_at: '2026-10-27T12:00:00Z', bloqueos: [], componentes: components,
  formula: { puntos_obtenidos: 2.5, puntos_posibles: 4, nota_maxima: 5, nota_base: 3.125, ajuste_global: 0, nota_antes_redondeo: 3.125, regla_redondeo: 'half_up', decimales: 2, nota_final: 3.13 },
};

for (const width of [360, 390, 768, 1440]) for (const mode of ['light', 'dark']) test.describe(`131 evidencia ${width}px ${mode}`, () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((theme) => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: theme }, version: 0 })), mode);
    await login(page, 'profesor', { breakdown });
    await page.route('**/api/calificaciones/c1/detalle', (route) => route.fulfill({ json: {
      id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1', estudiante_nombre: 'Estudiante de prueba',
      evaluacion_nombre: 'Procedimientos', materia_nombre: 'Matemáticas', nota_sugerida: 3.13, nota_confirmada: null,
      nota_maxima: 5, confianza: 0.8, feedback: 'Explica los pasos de tu respuesta.', estado: 'requiere_revision',
      revisado_por_docente: false, resultado_json: {}, timeline: [], guia_revision: [], desglose: breakdown,
      entrega_tipo: 'pdf', entrega_evidencia_tipo: 'pdf', entrega_archivo_url: '/api/evidencia-131', entrega_evidencia_paginas: 2,
      entrega_original_disponible: true,
      created_at: '2026-10-27T12:00:00Z', updated_at: '2026-10-27T12:00:00Z',
    } }));
    await page.route('**/api/evidencia-131/paginas/*', (route) => {
      const number = new URL(route.request().url()).pathname.split('/').at(-1);
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="800" height="1200" fill="white"/><text x="80" y="160" font-size="36">Hoja sintética ${number}</text><path d="M80 200h600M80 500h600M80 800h600" stroke="black"/><text x="80" y="450" font-size="40">6 x 4 = 24</text></svg>` });
    });
    await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1');
    await page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Respuestas y puntajes', exact: true }).click();
    await expect(page.locator('#grade-review-panel')).toBeVisible();
  });

  test('colores y hojas de cada respuesta sin escrituras', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => { if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones|jobs)\//.test(request.url())) writes.push(request.url()); });
    const review = page.locator('#grade-review-panel');
    await expect(review.getByRole('button', { name: 'Pregunta 1, Correcta', exact: true })).toHaveAttribute('data-grade-tone', 'success');
    const incorrect = review.getByRole('button', { name: 'Pregunta 1-B, Incorrecta', exact: true });
    await expect(incorrect).toHaveAttribute('data-grade-tone', 'error');
    await expect(review.getByRole('button', { name: 'Pregunta 3, Por revisar', exact: true })).toHaveAttribute('data-grade-tone', 'warning');
    await expect(review.getByRole('button', { name: 'Pregunta 4, Parcial', exact: true })).toHaveAttribute('data-grade-tone', 'warning');
    const evidence = review.getByRole('region', { name: 'Evidencia de la respuesta seleccionada' });
    await expect(evidence.getByRole('img')).toHaveAttribute('src', '/api/evidencia-131/paginas/1');
    await incorrect.click();
    await expect(incorrect).toHaveAttribute('aria-current', 'step');
    await expect(evidence.getByRole('img')).toHaveAttribute('src', '/api/evidencia-131/paginas/2');
    await review.getByRole('button', { name: 'Pregunta 3, Por revisar', exact: true }).click();
    await evidence.getByRole('button', { name: 'Hoja 2', exact: true }).click();
    await expect(evidence.getByRole('img')).toHaveAttribute('src', '/api/evidencia-131/paginas/2');
    await review.getByRole('button', { name: 'Pregunta 4, Parcial', exact: true }).click();
    await expect(evidence.getByText(/No hay una zona localizada/)).toBeVisible();
    await expect(evidence.getByRole('button', { name: 'Hoja 1', exact: true })).toBeVisible();
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('original y preparada son vistas separadas sin trasladar regiones ni escribir', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => { if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones|jobs)\//.test(request.url())) writes.push(request.url()); });
    await page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Evidencia', exact: true }).click();
    const evidence = page.locator('#grade-evidence-panel');
    await expect(evidence.getByRole('button', { name: 'Foto preparada', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await evidence.getByRole('button', { name: 'Foto original', exact: true }).click();
    await expect(evidence.getByRole('img', { name: 'Hoja 1 de la evidencia del estudiante', exact: true })).toHaveAttribute('src', '/api/evidencia-131/paginas/1?version=original');
    await expect(evidence.getByText(/El original se consulta como hoja completa/)).toBeVisible();
    await evidence.locator('[aria-label="Páginas de evidencia"]').getByRole('button', { name: '2', exact: true }).click();
    await expect(evidence.getByRole('img', { name: 'Hoja 2 de la evidencia del estudiante', exact: true })).toHaveAttribute('src', '/api/evidencia-131/paginas/2?version=original');
    await evidence.getByRole('button', { name: 'Foto preparada', exact: true }).click();
    await expect(evidence.getByRole('button', { name: 'Foto preparada', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(evidence.getByRole('img', { name: 'Hoja 2 de la evidencia del estudiante', exact: true })).toHaveAttribute('src', '/api/evidencia-131/paginas/2');
    await evidence.locator('[aria-label="Páginas de evidencia"]').getByRole('button', { name: '1', exact: true }).click();
    await expect(evidence.getByRole('img', { name: 'Hoja 1 de la evidencia del estudiante', exact: true })).toHaveAttribute('src', '/api/evidencia-131/paginas/1');
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    if ((width === 390 && mode === 'dark') || (width === 1440 && mode === 'light')) {
      await page.screenshot({ path: `../output/playwright/spec131-variants-${width}-${mode}.png`, fullPage: true });
    }
  });

  test('zoom amplio conserva puntaje y vuelve a la respuesta', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => { if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones|jobs)\//.test(request.url())) writes.push(request.url()); });
    const review = page.locator('#grade-review-panel');
    const evidence = review.getByRole('region', { name: 'Evidencia de la respuesta seleccionada' });
    await review.getByRole('button', { name: 'Ajustar puntaje y explicación' }).click();
    const points = review.getByRole('spinbutton', { name: /Puntos/ });
    await points.fill('0.25');
    await evidence.getByRole('button', { name: 'Ampliar evidencia' }).click();
    const dialog = page.getByRole('dialog', { name: 'Hoja 1 de la evidencia' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Volver a la respuesta' }).click();
    await expect(points).toHaveValue('0.25');
    await expect(evidence.getByRole('img')).toHaveAttribute('src', '/api/evidencia-131/paginas/1');
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('cambiar original preparada conserva el ajuste sin guardar', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => { if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones|jobs)\//.test(request.url())) writes.push(request.url()); });
    const sections = page.getByRole('navigation', { name: 'Secciones de la calificación' });
    const review = page.locator('#grade-review-panel');
    await review.getByRole('button', { name: 'Ajustar puntaje y explicación' }).click();
    await review.getByRole('spinbutton', { name: /Puntos/ }).fill('0.25');
    await expect(review.getByRole('spinbutton', { name: /Puntos/ })).toHaveValue('0.25');
    await sections.getByRole('button', { name: 'Evidencia', exact: true }).click();
    const evidence = page.locator('#grade-evidence-panel');
    const image = evidence.getByRole('img', { name: 'Hoja 1 de la evidencia del estudiante', exact: true });
    await evidence.getByRole('button', { name: 'Foto original', exact: true }).click();
    await expect(image).toHaveAttribute('src', '/api/evidencia-131/paginas/1?version=original');
    await evidence.getByRole('button', { name: 'Foto preparada', exact: true }).click();
    await expect(image).toHaveAttribute('src', '/api/evidencia-131/paginas/1');
    await sections.getByRole('button', { name: 'Respuestas y puntajes', exact: true }).click();
    await expect(review.getByRole('spinbutton', { name: /Puntos/ })).toHaveValue('0.25');
    await expect(review.getByRole('button', { name: 'Pregunta 1, Correcta', exact: true })).toHaveAttribute('aria-current', 'step');
    await expect(review.getByRole('region', { name: 'Evidencia de la respuesta seleccionada' }).getByRole('img')).toHaveAttribute('src', '/api/evidencia-131/paginas/1');
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('cambiar hojas y volver conserva el ajuste sin guardar', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => { if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones|jobs)\//.test(request.url())) writes.push(request.url()); });
    const sections = page.getByRole('navigation', { name: 'Secciones de la calificación' });
    const review = page.locator('#grade-review-panel');
    await review.getByRole('button', { name: 'Ajustar puntaje y explicación' }).click();
    await review.getByRole('spinbutton', { name: /Puntos/ }).fill('0.25');
    await expect(review.getByRole('spinbutton', { name: /Puntos/ })).toHaveValue('0.25');
    await sections.getByRole('button', { name: 'Evidencia', exact: true }).click();
    const evidence = page.locator('#grade-evidence-panel');
    await evidence.locator('[aria-label="Páginas de evidencia"]').getByRole('button', { name: '2', exact: true }).click();
    await expect(evidence.getByRole('img', { name: 'Hoja 2 de la evidencia del estudiante', exact: true })).toHaveAttribute('src', '/api/evidencia-131/paginas/2');
    await evidence.locator('[aria-label="Páginas de evidencia"]').getByRole('button', { name: '1', exact: true }).click();
    await expect(evidence.getByRole('img', { name: 'Hoja 1 de la evidencia del estudiante', exact: true })).toHaveAttribute('src', '/api/evidencia-131/paginas/1');
    await sections.getByRole('button', { name: 'Respuestas y puntajes', exact: true }).click();
    await expect(review.getByRole('spinbutton', { name: /Puntos/ })).toHaveValue('0.25');
    await expect(review.getByRole('button', { name: 'Pregunta 1, Correcta', exact: true })).toHaveAttribute('aria-current', 'step');
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('zoom por botones y teclado restablece la hoja completa sin escrituras', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => { if (request.method() !== 'GET' && /\/api\/(calificaciones|evaluaciones|jobs)\//.test(request.url())) writes.push(request.url()); });
    const evidence = page.locator('#grade-review-panel').getByRole('region', { name: 'Evidencia de la respuesta seleccionada' });
    await evidence.getByRole('button', { name: 'Ampliar evidencia' }).click();
    const dialog = page.getByRole('dialog', { name: 'Hoja 1 de la evidencia' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Acercar imagen' }).click();
    await expect(dialog.getByLabel('Nivel de ampliación')).toHaveText('125 %');
    await dialog.getByRole('group', { name: 'Imagen ampliable de la evidencia' }).focus();
    await page.keyboard.press('ArrowDown');
    await dialog.getByRole('button', { name: 'Ver hoja completa' }).click();
    await expect(dialog.getByLabel('Nivel de ampliación')).toHaveText('100 %');
    await page.screenshot({ path: `../output/playwright/131-zoom-${mode}-${width}.png` });
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

for (const matchVersion of [true, false]) test(`131 ubicación ${matchVersion ? 'verificada con zoom y texto ampliado' : 'desactualizada sin señalamiento falso'}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const version = 'c'.repeat(32);
  const locatedBreakdown = { ...breakdown, componentes: [{ ...components[0], evidencia_regiones: [{ pagina: 1, bbox: [0.13, 0.13, 0.65, 0.08], marco: 'pagina_canonica_orientada', evidencia_version: version }] }] };
  await login(page, 'profesor', { breakdown: locatedBreakdown });
  await page.route('**/api/calificaciones/c1/detalle', (route) => route.fulfill({ json: {
    id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1', estudiante_nombre: 'Estudiante sintético', evaluacion_nombre: 'Prueba de ubicación', materia_nombre: 'Matemáticas',
    nota_sugerida: 5, nota_confirmada: null, nota_maxima: 5, confianza: 0.9, feedback: 'Explica tus pasos.', estado: 'sugerida', revisado_por_docente: false, resultado_json: {}, timeline: [], guia_revision: [],
    desglose: locatedBreakdown, entrega_tipo: 'foto', entrega_archivo_url: '/api/evidencia-version-131', entrega_evidencia_paginas: 1,
    created_at: '2026-10-27T12:00:00Z', updated_at: '2026-10-27T12:00:00Z',
  } }));
  let versionReads = 0;
  await page.route('**/api/evidencia-version-131/paginas/*', (route) => {
    const query = new URL(route.request().url()).searchParams;
    if (query.has('evidencia_version')) versionReads += 1;
    return route.fulfill({ contentType: 'image/png', headers: { 'X-Evidence-Version': matchVersion ? version : 'd'.repeat(32), 'X-Evidence-Page': '1' }, body: readFileSync(new URL('./fixtures/scan-evidence.png', import.meta.url)) });
  });
  await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1');
  await page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Respuestas y puntajes', exact: true }).click();
  const evidence = page.getByRole('region', { name: 'Evidencia de la respuesta seleccionada' });
  if (!matchVersion) {
    await expect(evidence.getByRole('alert')).toContainText('No pudimos comprobar');
    await expect(evidence.getByRole('img')).toHaveCount(0);
    await evidence.getByRole('button', { name: 'Abrir hoja sin señalamiento' }).click();
    await expect(evidence.getByRole('img')).toBeVisible();
    await expect(evidence.getByText(/Ubicación sugerida/)).toHaveCount(0);
  } else {
    await expect(evidence.getByRole('img')).toBeVisible();
    await expect(evidence.getByLabel('Nivel de ampliación')).not.toHaveText('100 %');
    await expect(evidence.getByText(/Ubicación sugerida/)).toBeVisible();
    // Dev StrictMode aborts its first mount request. Zoom must not add reads
    // after the verified page has loaded, regardless of that aborted request.
    const readsAfterLoad = versionReads;
    await page.addStyleTag({ content: 'html { font-size: 150%; }' });
    await evidence.getByRole('button', { name: 'Ampliar evidencia' }).click();
    const dialog = page.getByRole('dialog', { name: 'Hoja 1 de la evidencia' });
    await expect(dialog.getByRole('img')).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    await dialog.getByRole('button', { name: 'Ver hoja completa' }).click();
    await expect(dialog.getByLabel('Nivel de ampliación')).toHaveText('100 %');
    await dialog.getByRole('button', { name: 'Volver a la respuesta' }).click();
    await expect(evidence.getByRole('img')).toBeVisible();
    expect(readsAfterLoad).toBeGreaterThan(0);
    expect(versionReads).toBe(readsAfterLoad);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
