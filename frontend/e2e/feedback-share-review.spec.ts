import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

test.use({ reducedMotion: 'reduce' });
const message = 'Identificaste la idea principal. Explica qué frase del relato justifica la decisión del personaje.';
const link = 'https://example.test/devolucion#' + 'a'.repeat(43);

async function install(page: Page, initiallyApproved = false) {
  await login(page, 'profesor', { rosterSize: 1 });
  let approved = initiallyApproved;
  let approvedMessage = message;
  let issued = false;
  const operations: string[] = [];
  const grade = { id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1', nota_sugerida: 3.5, nota_confirmada: 3.5,
    estado: 'publicada', revisado_por_docente: true, feedback: message, resultado_json: {}, created_at: '2026-10-29T12:00:00Z', updated_at: '2026-10-29T12:00:00Z' };
  await page.route('https://**/*', route => route.abort());
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = (data: unknown) => route.fulfill({ json: data });
    const preview = () => ({ calificacion_id: 'c1', elegible: approved, seleccionable: true, preparacion: approved ? 'ready' : 'needs_review',
      motivo: approved ? undefined : 'Revisa los puntajes por pregunta antes de compartir esta devolución.', fingerprint: approved ? 'f'.repeat(64) : undefined,
      borrador_docente: { estado: 'publicada', nota: '3.5', nota_maxima: '5', retroalimentacion: message },
      revision_docente: { source_fingerprint: 'b'.repeat(64), feedback_text: message, detail_available: false },
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

async function openWorkspace(page: Page, entry: string, theme: string) {
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1' + (entry === 'integrado' ? '&calificacion=c1&estudiante=s1' : ''));
  await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
  if (entry === 'grupo') {
    await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
    await page.getByRole('button', { name: 'Retroalimentación del grupo', exact: true }).click();
  } else await page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Retroalimentación', exact: true }).click();
  const workspace = entry === 'grupo' ? page.getByRole('dialog', { name: 'Retroalimentación del grupo', exact: true }) : page.getByRole('region', { name: 'Retroalimentación del estudiante', exact: true });
  if (entry === 'grupo') await workspace.getByRole('checkbox', { name: 'Seleccionar Estudiante Prueba', exact: true }).check();
  await workspace.getByRole('button', { name: 'Compartir', exact: true }).click();
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
