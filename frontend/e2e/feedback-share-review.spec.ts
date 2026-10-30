import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

test.use({ reducedMotion: 'reduce' });
const message = 'Identificaste la idea principal. Explica qué frase del relato justifica la decisión del personaje.';
const link = 'https://example.test/devolucion#' + 'a'.repeat(43);

async function activate(control: Locator) {
  await expect(control).toBeEnabled();
  // Locator.press focuses the target in the same browser input operation.
  // Separate focus/assert/press calls can race the section-entry autofocus.
  // Keep all resulting state and return-focus assertions below.
  await control.press('Enter');
}

async function install(page: Page, initiallyApproved = false, composed = false, beforeApprove?: () => Promise<void>) {
  await login(page, 'profesor', { rosterSize: 1 });
  let approved = initiallyApproved;
  const sourceMessage = composed ? 'Aciertos: identificaste la idea principal. Pregunta 2: Falta explicar la decisión del personaje. Siguiente paso: Relee el párrafo inicial y escribe una frase que justifique tu respuesta.' : message;
  let approvedMessage = sourceMessage;
  let issued = false;
  const operations: string[] = [];
  const grade = { id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1', nota_sugerida: 3.5, nota_confirmada: 3.5,
    estado: 'publicada', revisado_por_docente: true, feedback: sourceMessage, resultado_json: {}, created_at: '2026-10-29T12:00:00Z', updated_at: '2026-10-29T12:00:00Z' };
  await page.route('https://**/*', route => route.abort());
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = (data: unknown) => route.fulfill({ json: data });
    const preview = () => ({ calificacion_id: 'c1', elegible: approved, seleccionable: true, preparacion: approved ? 'ready' : 'needs_review',
      motivo: approved ? undefined : 'Revisa los puntajes por pregunta antes de compartir esta devolución.', fingerprint: approved ? 'f'.repeat(64) : undefined,
      borrador_docente: { estado: 'publicada', nota: '3.5', nota_maxima: '5', retroalimentacion: sourceMessage },
      revision_docente: { source_fingerprint: 'b'.repeat(64), feedback_text: sourceMessage, detail_available: false },
      batch_candidate: composed && !approved ? { source_fingerprint: 'b'.repeat(64), nota: '3.5', feedback_text: sourceMessage, scope: 'summary', avisos: ['Se entregará un resumen; el detalle por pregunta sigue pendiente de revisión.'] } : undefined,
      resultado: approved ? { estudiante: 'Estudiante Prueba', evaluacion: 'Lectura sintética', materia: 'Lenguaje', nota: '3.5', nota_maxima: '5',
        retroalimentacion: approvedMessage, explicacion: 'Nota y mensaje revisados por el docente.', respuestas: [], claves_liberadas: false, alcance: 'summary' } : undefined });
    if (path === '/api/devoluciones/disponibilidad') return json({ enabled: true });
    if (path === '/api/calificaciones/c1/detalle') return json({ ...grade, estudiante_nombre: 'Estudiante Prueba', evaluacion_nombre: 'Lectura sintética', materia_nombre: 'Lenguaje', nota_maxima: 5,
      entrega_tipo: 'online', entrega_respuesta_texto: 'Respuesta sintética', timeline: [], guia_revision: [], entrega_evidencia_paginas: 0, desglose: null, respuestas_liberadas: false });
    if (path === '/api/evaluaciones/e1/calificaciones') return json([grade]);
    if (path === '/api/evaluaciones/e1/revision') return json({ evaluacion_id: 'e1', materia_id: 'm1', total_alumnos: 1, siguiente_cursor: null,
      contadores: { todas: 1, pendientes: 0, alertas: 1, procesando: 0, publicadas: 1 },
      alumnos: [{ estudiante_id: 's1', nombre: 'Estudiante Prueba', calificacion_id: 'c1', estado: 'publicada', nota: 3.5,
        resumen_revision: { version: 1, cobertura: 'incompleta', bloqueos: [], componentes_pendientes: 1, componentes_ilegibles: 0, pqrs_abiertas: 0, tiene_alertas: true } }] });
    if (path.endsWith('/devoluciones/previsualizar')) return json({ resultados: [preview()] });
    if (path.endsWith('/devoluciones/aceptar-publicar') && composed) {
      const body = route.request().postDataJSON();
      expect(body.selecciones).toEqual([{ calificacion_id: 'c1', source_fingerprint: 'b'.repeat(64), feedback_text: sourceMessage, scope: 'summary' }]);
      await beforeApprove?.();
      approved = true; operations.push('approve-batch');
      return json({ id: 'batch1', request_id: body.request_id, total: 1, exitosos: 1, fallidos: 0,
        resultados: [{ calificacion_id: 'c1', estado: 'already_published', fingerprint: 'f'.repeat(64) }] });
    }
    if (path.endsWith('/devoluciones/revisar')) {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({ calificacion_id: 'c1', scope: 'summary', source_fingerprint: 'b'.repeat(64) });
      approved = true; approvedMessage = body.feedback_text; operations.push('review');
      return json(preview());
    }
    if (path.endsWith('/devoluciones/accesos')) {
      if (route.request().method() === 'GET') return json({ resultados: issued ? [{ id: 'a1', calificacion_id: 'c1', estado: 'active', copy_available: true, version: 1 }] : [], next_cursor: null });
      expect(approved).toBe(true);
      expect(route.request().postDataJSON()).toMatchObject({ duracion_dias: 3, evidencia: false, selecciones: [{ calificacion_id: 'c1', fingerprint: 'f'.repeat(64) }] });
      issued = true; operations.push('issue');
      return json({ resultados: [{ calificacion_id: 'c1', id: 'a1', url: link, credential_available: true }] });
    }
    if (path === '/api/calificaciones/c1/confirmar' || path === '/api/calificaciones/c1/publicar' || path === '/api/calificaciones/c1/ajustar') throw new Error('Compartir no debe modificar ni publicar la nota.');
    return route.fallback();
  });
  return operations;
}

for (const width of [360, 390, 768, 1440]) for (const theme of ['light', 'dark']) for (const entry of ['grupo', 'integrado']) {
  test(`135 aprobación y enlaces en una confirmación ${entry} ${width}px ${theme}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    const operations = await install(page, false, true);
    const workspace = await openWorkspace(page, entry, theme);
    const panel = workspace.getByRole('region', { name: 'Compartir retroalimentaciones', exact: true });
    // Exercise the composed actions by keyboard, alongside the independent
    // native pointer review/copy scenarios below. Do not extend timeouts.
    await activate(panel.getByRole('button', { name: 'Aprobar y crear 1 enlace', exact: true }));
    const confirmation = panel.getByRole('region', { name: 'Confirmar entrega', exact: true });
    await expect(confirmation.getByRole('heading', { name: 'Pregunta 2', exact: true })).toBeVisible();
    await expect(confirmation.getByText('Relee el párrafo inicial y escribe una frase que justifique tu respuesta.', { exact: true })).toBeVisible();
    const practice = confirmation.getByText('Relee el párrafo inicial y escribe una frase que justifique tu respuesta.', { exact: true });
    await practice.scrollIntoViewIfNeeded();
    await expect(practice).toBeInViewport({ ratio: 0.999 });
    expect(operations).toEqual([]);
    expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `output/playwright/spec135-confirm-${entry}-${width}-${theme}-${browserName}.png` });
    await activate(panel.getByRole('button', { name: 'Confirmar y preparar 1 enlace', exact: true }));
    await expect(panel.getByRole('button', { name: 'Copiar 1 enlace', exact: true })).toBeInViewport({ ratio: 0.999 });
    expect(operations).toEqual(['approve-batch', 'issue']);
    await expect(page.getByText('Sin guardar', { exact: true })).toHaveCount(0);
    if (entry === 'integrado') {
      const inner = await workspace.evaluate(element => ({ height: element.getBoundingClientRect().height, client: element.clientHeight }));
      expect(inner.height).toBeGreaterThan(0);
    }
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Synthetic denial'); } } }));
    // This combined flow also exercises keyboard access. Native pointer copy
    // remains covered separately below; keep the same 30s budget and assertions.
    await activate(panel.getByRole('button', { name: 'Copiar 1 enlace', exact: true }));
    await expect(panel.getByRole('textbox', { name: 'Enlaces para copiar manualmente', exact: true })).toHaveValue('Estudiante Prueba\n' + link);
    expect(operations).toEqual(['approve-batch', 'issue']);
  });
}

async function openWorkspace(page: Page, entry: string, theme: string) {
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1' + (entry === 'integrado' ? '&calificacion=c1&estudiante=s1' : ''));
  await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
  if (entry === 'grupo') {
    // These menu actions are also covered with native clicks by the responsive
    // workspace suite. Exercise keyboard navigation here, leaving the manual
    // review, approval, creation and legacy copy pointer checks intact.
    await activate(page.getByRole('button', { name: 'Más acciones', exact: true }));
    await activate(page.getByRole('button', { name: 'Retroalimentación del grupo', exact: true }));
  } else await page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Retroalimentación', exact: true }).click();
  const workspace = entry === 'grupo' ? page.getByRole('dialog', { name: 'Retroalimentación del grupo', exact: true }) : page.getByRole('region', { name: 'Retroalimentación del estudiante', exact: true });
  if (entry === 'grupo') {
    const selection = workspace.getByRole('checkbox', { name: 'Seleccionar Estudiante Prueba', exact: true });
    await expect(selection).toBeEnabled();
    await selection.focus();
    await expect(selection).toBeFocused();
    await selection.press('Space');
    await expect(selection).toBeChecked();
  }
  await activate(workspace.getByRole('button', { name: 'Compartir', exact: true }));
  return workspace;
}

for (const width of [360, 390, 1440]) for (const theme of ['light', 'dark']) for (const entry of ['grupo', 'integrado']) {
  test(`129 aprobar una publicada pendiente sin emitir ${entry} ${width}px ${theme}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    const operations = await install(page);
    const workspace = await openWorkspace(page, entry, theme);
    const panel = workspace.getByRole('region', { name: 'Compartir retroalimentaciones', exact: true });
    await panel.getByRole('button', { name: 'Revisar y compartir devolución de Estudiante Prueba', exact: true }).click();
    await expect(panel.getByRole('region', { name: 'Revisar devolución de Estudiante Prueba', exact: true })).toBeFocused();
    await expect(panel.getByRole('combobox', { name: 'Contenido de la devolución' })).toHaveValue('summary');
    await expect(panel.getByRole('option', { name: 'Incluir detalle por pregunta revisado' })).toHaveCount(0);
    await panel.getByRole('textbox', { name: 'Mensaje para el estudiante' }).fill(message + ' Practica con un ejemplo del texto.');
    expect(operations).toEqual([]);
    await panel.getByRole('button', { name: 'Aprobar devolución', exact: true }).click();
    const create = panel.getByRole('button', { name: 'Crear 1 enlace faltante', exact: true });
    await expect(create).toBeVisible();
    await expect(create).toBeFocused();
    await expect(create).toBeInViewport({ ratio: 0.999 });
    if (entry === 'integrado') await expect(page.locator('[aria-label="Acciones de la calificación"]')).toBeHidden();
    expect(operations).toEqual(['review']);
    await expect(page.getByRole('button', { name: 'Terminar de escribir', exact: true })).toHaveCount(0);
    await expect(workspace.getByRole('button', { name: 'Listo', exact: true })).toHaveCount(0);
    expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    if (width !== 360) await page.screenshot({ path: `output/playwright/spec129-direct-approved-${entry}-${width}-${theme}-${browserName}.png` });
    if (entry === 'integrado' && width < 1280) {
      await page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Historial', exact: true }).click();
      await expect(page.locator('[aria-label="Acciones de la calificación"]')).toBeVisible();
    }
  });
}

// Keep the approval and copy scenarios separate: desktop WebKit has a slow
// native pointer sequence. All checks remain, without extending test timeouts.
for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const entry of ['grupo', 'integrado']) {
  test(`129 crear y copiar una devolución aprobada ${entry} ${width}px ${theme}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    const operations = await install(page, true);
    const workspace = await openWorkspace(page, entry, theme);
    const panel = workspace.getByRole('region', { name: 'Compartir retroalimentaciones', exact: true });
    const create = panel.getByRole('button', { name: 'Crear 1 enlace faltante', exact: true });
    await expect(create).toBeVisible();
    await expect(create).toBeInViewport({ ratio: 0.999 });
    if (entry === 'integrado') await expect(page.locator('[aria-label="Acciones de la calificación"]')).toBeHidden();
    expect(operations).toEqual([]);
    await create.click();
    await expect(panel.getByRole('button', { name: 'Copiar enlace de Estudiante Prueba', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Copiar 1 enlace', exact: true })).toBeInViewport({ ratio: 0.999 });
    expect(operations).toEqual(['issue']);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Synthetic denial'); } } }));
    await panel.getByRole('button', { name: 'Copiar 1 enlace', exact: true }).click();
    await expect(panel.getByRole('textbox', { name: 'Enlaces para copiar manualmente', exact: true })).toHaveValue('Estudiante Prueba\n' + link);
    expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    if (width !== 360) await page.screenshot({ path: `output/playwright/spec129-direct-share-${entry}-${width}-${theme}-${browserName}.png` });
  });
}

for (const width of [390, 1440]) test(`135 motivo ausente no bloquea lectura ni entrega ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.route('**/assets/feedback-motifs/**', route => route.abort());
  const operations = await install(page, false, true);
  const workspace = await openWorkspace(page, width === 390 ? 'grupo' : 'integrado', 'dark');
  const panel = workspace.getByRole('region', { name: 'Compartir retroalimentaciones', exact: true });
  await activate(panel.getByRole('button', { name: 'Aprobar y crear 1 enlace', exact: true }));
  const confirmation = panel.getByRole('region', { name: 'Confirmar entrega', exact: true });
  const practice = confirmation.getByText('Relee el párrafo inicial y escribe una frase que justifique tu respuesta.', { exact: true });
  await practice.scrollIntoViewIfNeeded();
  await expect(practice).toBeInViewport({ ratio: 0.999 });
  await expect(confirmation.locator('img')).toBeHidden();
  expect(operations).toEqual([]);
  await activate(panel.getByRole('button', { name: 'Confirmar y preparar 1 enlace', exact: true }));
  await expect(panel.getByRole('button', { name: 'Copiar 1 enlace', exact: true })).toBeEnabled();
  expect(operations).toEqual(['approve-batch', 'issue']);
});

for (const width of [390, 1440]) test(`135 conserva la entrega al cambiar de pestaña mientras prepara ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const operations = await install(page, false, true, () => waiting);
  try {
    const workspace = await openWorkspace(page, 'integrado', 'light');
    const panel = workspace.getByRole('region', { name: 'Compartir retroalimentaciones', exact: true });
    await activate(panel.getByRole('button', { name: 'Aprobar y crear 1 enlace', exact: true }));
    await activate(panel.getByRole('button', { name: 'Confirmar y preparar 1 enlace', exact: true }));
    await expect(page.getByText('Preparando entrega…', { exact: true })).toBeVisible();
    await activate(page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Historial', exact: true }));
    await expect(workspace).toBeVisible();
    await expect(page.getByText('Sin guardar', { exact: true })).toHaveCount(0);
    release();
    await expect(panel.getByRole('button', { name: 'Copiar 1 enlace', exact: true })).toBeEnabled();
    expect(operations).toEqual(['approve-batch', 'issue']);
    await activate(page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Historial', exact: true }));
    await expect(workspace).toBeHidden();
  } finally { release(); }
});
