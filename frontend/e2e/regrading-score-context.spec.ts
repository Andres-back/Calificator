import { expect, test, type Page, type Route } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

const json = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
const source = 'c88fc544-32a4-40c1-b2d5-d5de4ab283b6';
const target = 'f3881164-6201-4a53-b737-0b921c6cac25';
const fingerprint = 'a'.repeat(64);
const changed = {
  estado: 'puntajes_actualizados', version_entrega_id: source, version_objetivo_id: target, fingerprint, requiere_confirmacion: true,
  cambios: Array.from({ length: 9 }, (_, index) => ({ numero: String(index + 1), puntaje_anterior: index === 8 ? '0.52' : '0.56', puntaje_actual: index >= 7 ? '1.25' : index < 3 ? '0.3572' : '0.3571' })),
  mensaje: 'Las preguntas son las mismas. Confirma el nuevo reparto antes de enviar.',
};

async function setup(page: Page, options: { contextError?: boolean; conflict?: boolean; networkError?: boolean; state?: 'contenido_modificado' | 'version_no_disponible' } = {}) {
  await login(page, 'profesor');
  const grade = { id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1', nota_sugerida: 3.2, nota_confirmada: 3.2,
    confianza: 0.9, feedback: 'Explica una razón del texto.', estado: 'publicada', revisado_por_docente: true, resultado_json: {},
    created_at: '2026-11-02T12:00:00', updated_at: '2026-11-02T12:00:00' };
  const detail = { ...grade, estudiante_nombre: 'Estudiante de ejemplo', evaluacion_nombre: 'Actividad sintética', materia_nombre: 'Materia de práctica', nota_maxima: 5,
    entrega_tipo: 'foto', entrega_respuesta_texto: null, entrega_archivo_url: '/api/calificaciones/c1/evidencia', entrega_evidencia_paginas: 1, entrega_evidencia_tipo: 'foto',
    timeline: [], guia_revision: [], desglose_heredado: false, respuestas_liberadas: true,
    desglose: { id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'completa', requiere_revision: false,
      formula: { puntos_obtenidos: 3.2, puntos_posibles: 5, nota_maxima: 5, nota_base: 3.2, ajuste_global: 0, nota_antes_redondeo: 3.2, nota_final: 3.2, regla_redondeo: 'half_up', decimales: 2 },
      componentes: [], created_at: grade.updated_at } };
  const writes: { request: string; current: string; target: string; fingerprint: string; reason: string; hasFile: boolean }[] = [];
  let contextCalls = 0;
  await page.route('**/api/calificaciones/c1/detalle', (route) => json(route, detail));
  await page.route('**/api/calificaciones/c1/recalificacion-contexto', (route) => {
    contextCalls += 1;
    if (options.contextError && contextCalls === 1) return json(route, { detail: 'Temporalmente no disponible.' }, 503);
    if (options.state) return json(route, { ...changed, estado: options.state, requiere_confirmacion: false, cambios: [], fingerprint: null,
      mensaje: options.state === 'contenido_modificado' ? 'El contenido cambió. Se usará la versión original de esta entrega.' : 'No pudimos comprobar la versión de esta entrega.' });
    return json(route, { ...changed, ...(contextCalls > 1 ? { fingerprint: 'b'.repeat(64) } : {}) });
  });
  await page.route('**/api/calificaciones/c1/recalificar', async (route) => {
    const contentType = route.request().headers()['content-type'];
    const body = route.request().postDataBuffer();
    const form = await new Response(body ? new Uint8Array(body) : null, { headers: { 'content-type': contentType } }).formData();
    writes.push({ request: String(form.get('solicitud_id')), current: String(form.get('usar_puntajes_actuales')), target: String(form.get('version_puntajes_objetivo')),
      fingerprint: String(form.get('contexto_puntajes_fingerprint')), reason: String(form.get('motivo') ?? ''), hasFile: form.has('foto') });
    if (options.networkError && writes.length === 1) return route.abort('failed');
    if (options.conflict && writes.length === 1) return json(route, { detail: 'El reparto cambió. Consulta los puntos de nuevo.' }, 409);
    return json(route, { ...grade, estado: 'procesando', nota_confirmada: null }, 202);
  });
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1&calificacion=c1&estudiante=s1');
  await page.getByText('Recalificar y cambiar evidencia', { exact: true }).click();
  return { writes, contextCalls: () => contextCalls };
}

for (const width of [384, 1440]) for (const theme of ['light', 'dark']) {
  test(`140 recalificar con puntos aceptados ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const sample = await setup(page);
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
    await page.getByRole('button', { name: 'Volver a calificar', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Volver a calificar' });
    await expect(dialog.getByRole('heading', { name: 'El reparto de puntos cambió' })).toBeVisible();
    await expect(dialog).toHaveCSS('opacity', '1');
    await expect(dialog.locator('..')).toHaveCSS('opacity', '1');
    await expect(dialog.getByTestId('regrading-context-ready').locator('dt')).toHaveCount(9);
    await page.screenshot({ path: `output/playwright/spec140-context-${width}-${theme}-${test.info().project.name}.png` });
    const reopen = dialog.getByRole('checkbox', { name: /Confirmo reabrir/ });
    await reopen.check();
    const send = dialog.getByRole('button', { name: 'Enviar a calificar', exact: true });
    await expect(send).toBeDisabled();
    const accept = dialog.getByRole('checkbox', { name: /Usar los puntos actuales/ });
    await accept.focus();
    await page.keyboard.press('Space');
    await expect(accept).toBeChecked();
    await expect(send).toBeEnabled();
    expect((await accept.locator('..').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await send.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await send.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/spec140-confirm-${width}-${theme}-${test.info().project.name}.png` });
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await send.click();
    await expect(dialog).toHaveCount(0);
    expect(sample.writes).toHaveLength(1);
    expect(sample.writes[0]).toMatchObject({ current: 'true', target, fingerprint, reason: '', hasFile: false });
  });
}

test('140 consulta fallida no envía y permite consultar sin aceptar automáticamente', async ({ page }) => {
  await page.setViewportSize({ width: 384, height: 900 });
  const sample = await setup(page, { contextError: true });
  await page.getByRole('button', { name: 'Volver a calificar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Volver a calificar' });
  await expect(dialog.getByText('No pudimos comprobar los puntos de esta entrega.')).toBeVisible();
  await expect(dialog).toHaveCSS('opacity', '1');
  await expect(dialog.locator('..')).toHaveCSS('opacity', '1');
  await expect(dialog.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
  await page.screenshot({ path: `output/playwright/spec140-query-error-${test.info().project.name}.png` });
  await dialog.getByRole('button', { name: 'Consultar puntos de nuevo' }).click();
  await expect(dialog.getByRole('heading', { name: 'El reparto de puntos cambió' })).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: /Usar los puntos actuales/ })).not.toBeChecked();
  expect(sample.contextCalls()).toBe(2);
  expect(sample.writes).toEqual([]);
});

test('140 conflicto conserva motivo y exige volver a aceptar los puntos consultados', async ({ page }) => {
  const sample = await setup(page, { conflict: true });
  await page.getByRole('button', { name: 'Volver a calificar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Volver a calificar' });
  await expect(dialog.getByRole('heading', { name: 'El reparto de puntos cambió' })).toBeVisible();
  await dialog.getByText('Añadir motivo (opcional)', { exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Motivo (opcional)', exact: true }).fill('Usar reparto corregido');
  await dialog.getByRole('checkbox', { name: /Confirmo reabrir/ }).check();
  await dialog.getByRole('checkbox', { name: /Usar los puntos actuales/ }).check();
  await dialog.getByRole('button', { name: 'Enviar a calificar', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('El reparto cambió');
  await expect(dialog.getByRole('checkbox', { name: /Usar los puntos actuales/ })).not.toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Enviar a calificar', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Actualizar puntos' }).click();
  await expect(dialog.getByRole('heading', { name: 'El reparto de puntos cambió' })).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Motivo (opcional)', exact: true })).toHaveValue('Usar reparto corregido');
  await dialog.getByRole('checkbox', { name: /Usar los puntos actuales/ }).check();
  await dialog.getByRole('button', { name: 'Enviar a calificar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(sample.writes).toHaveLength(2);
  expect(sample.writes[1]).toMatchObject({ fingerprint: 'b'.repeat(64), reason: 'Usar reparto corregido' });
  expect(sample.writes[1].request).not.toBe(sample.writes[0].request);
});

test('140 un fallo de red reintenta la misma intención y referencia, sin reconsultar', async ({ page }) => {
  const sample = await setup(page, { networkError: true });
  await page.getByRole('button', { name: 'Volver a calificar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Volver a calificar' });
  await expect(dialog.getByRole('heading', { name: 'El reparto de puntos cambió' })).toBeVisible();
  await dialog.getByRole('checkbox', { name: /Confirmo reabrir/ }).check();
  await dialog.getByRole('checkbox', { name: /Usar los puntos actuales/ }).check();
  await dialog.getByRole('button', { name: 'Enviar a calificar', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'Enviar a calificar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(sample.writes).toHaveLength(2);
  expect(sample.writes[1]).toEqual(sample.writes[0]);
  expect(sample.contextCalls()).toBe(1);
});

for (const state of ['contenido_modificado', 'version_no_disponible'] as const) {
  test(`140 no adopta otro contenido: ${state}`, async ({ page }) => {
    const sample = await setup(page, { state });
    await page.getByRole('button', { name: 'Volver a calificar', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Volver a calificar' });
    await expect(dialog.getByTestId('regrading-context-ready')).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: /Usar los puntos actuales/ })).toHaveCount(0);
    await dialog.getByRole('checkbox', { name: /Confirmo reabrir/ }).check();
    if (state === 'version_no_disponible') await expect(dialog.getByRole('button', { name: 'Enviar a calificar', exact: true })).toBeDisabled();
    else {
      await dialog.getByRole('button', { name: 'Enviar a calificar', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      expect(sample.writes[0].current).toBe('null');
      expect(sample.writes[0].target).toBe('null');
    }
  });
}
