import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

test.describe.configure({ mode: 'parallel' });
test.use({ reducedMotion: 'reduce', deviceScaleFactor: 1 });

const message = 'Aciertos: identificaste el personaje principal.\nQué mejorar: explica por qué tomó esa decisión.\nSiguiente paso: relee el segundo párrafo y escribe una razón del texto.';
const publicResult = (index: number) => ({ estudiante: index === 1 ? 'Estudiante Prueba' : `Alumno ${String(index).padStart(3, '0')} María Fernanda López`, evaluacion: 'Lectura sintética', materia: 'Lenguaje', nota: index === 1 ? '0' : '3.5', nota_maxima: '5', retroalimentacion: index === 2 ? (message + '\n').repeat(25) : message, respuestas: [], claves_liberadas: false, alcance: 'summary' });

async function setup(page: Page, ready = false) {
  await login(page, 'profesor', { rosterSize: 30 });
  let published = ready;
  const calls: string[] = [];
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const general = ['libro', 'lapices', 'idea', 'cohete', 'planeta', 'microscopio', 'atomo', 'calculadora', 'geometria', 'globo', 'brote', 'origami', 'montana', 'olas', 'brujula', 'cometa', 'musica', 'piezas', 'telescopio', 'arte'];
    if (path === '/api/biblioteca-motivos/colecciones') return route.fulfill({ json: { catalog_version: 'fixture', collections: [{ id: 'general', label: 'Generales', total: 20 }] } });
    if (path === '/api/biblioteca-motivos') {
      const offset = Number(new URL(route.request().url()).searchParams.get('offset') || 0);
      return route.fulfill({ json: { catalog_version: 'fixture', collection: 'general', total: 20, offset, limit: 12, items: general.slice(offset, offset + 12).map(id => ({ id, collection_id: 'general', label: id[0].toUpperCase() + id.slice(1), description: 'Motivo general', thumbnail_url: `/assets/feedback-motifs/${id}.png`, full_url: `/api/biblioteca-motivos/archivos/${id}/full/${'a'.repeat(64)}`, width: 320, height: 320 })) } });
    }
    if (path === '/api/devoluciones/disponibilidad') return route.fulfill({ json: { enabled: true } });
    if (path === '/api/evaluaciones/e1/devoluciones/previsualizar') return route.fulfill({ json: { resultados: Array.from({ length: 30 }, (_, index) => ({ calificacion_id: `c${index + 1}`, elegible: published, seleccionable: true, fingerprint: published ? 'f'.repeat(64) : undefined, resultado: published ? publicResult(index + 1) : undefined, borrador_docente: { estado: 'requiere_revision', ...publicResult(index + 1) }, batch_candidate: { source_fingerprint: 'b'.repeat(64), nota: publicResult(index + 1).nota, feedback_text: publicResult(index + 1).retroalimentacion, scope: 'summary', avisos: ['Solo nota y retroalimentación, sin soluciones.'] } })).filter(item => (route.request().postDataJSON().calificacion_ids as string[]).includes(item.calificacion_id)) } });
    if (path === '/api/evaluaciones/e1/devoluciones/aceptar-publicar') {
      const body = route.request().postDataJSON(); calls.push('publish'); published = true;
      expect(body.selecciones.length).toBeLessThanOrEqual(25);
      return route.fulfill({ json: { id: body.request_id, request_id: body.request_id, total: body.selecciones.length, exitosos: body.selecciones.length, fallidos: 0, resultados: body.selecciones.map((item: { calificacion_id: string }) => ({ calificacion_id: item.calificacion_id, estado: 'published', estado_academico: 'publicada', fingerprint: 'f'.repeat(64) })) } });
    }
    if (path === '/api/evaluaciones/e1/devoluciones/accesos' && route.request().method() === 'GET') return route.fulfill({ json: { resultados: published ? [{ id: 'access1', calificacion_id: 'c1', estudiante: 'Estudiante Prueba', estado: 'active', version: 1, expires_at: '2099-01-01T00:00:00Z', copy_available: true }] : [], next_cursor: null } });
    if (path === '/api/evaluaciones/e1/devoluciones/accesos/copiar') {
      calls.push('copy');
      return route.fulfill({ json: { resultados: [{ id: 'access1', calificacion_id: 'c1', estudiante: 'Estudiante Prueba', url: 'https://example.test/devolucion#' + 'a'.repeat(43) }] } });
    }
    if (path === '/api/evaluaciones/e1/devoluciones/fichas') return route.fulfill({ json: { resultados: route.request().postDataJSON().selecciones.map((item: { calificacion_id: string }) => ({ calificacion_id: item.calificacion_id, resultado: publicResult(Number(item.calificacion_id.slice(1))) })) } });
    return route.fallback();
  });
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
  await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
  await page.getByRole('button', { name: 'Retroalimentación del grupo', exact: true }).click();
  return { dialog: page.getByRole('dialog', { name: 'Retroalimentación del grupo', exact: true }), calls };
}

for (const width of [360, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`122 aceptar lote y copiar ${width}px ${theme}`, async ({ page, browserName }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 850 });
    const { dialog, calls } = await setup(page);
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    await dialog.getByRole('button', { name: 'Revisar y publicar notas', exact: true }).click();
    await dialog.getByRole('button', { name: 'Aceptar todas y publicar', exact: true }).click();
    await expect(dialog.getByRole('region', { name: 'Resumen antes de publicar' })).toContainText('30 notas para aceptar');
    expect(calls).toEqual([]);
    await page.screenshot({ path: `../output/playwright/spec122-batch-${width}-${theme}-${browserName}.png` });
    await dialog.getByRole('button', { name: 'Confirmar y publicar 30', exact: true }).click();
    await expect(dialog.getByText('30 estudiantes · 30 listos para entregar')).toBeVisible();
    await expect(dialog.getByText('30 seleccionados', { exact: true })).toBeVisible();
    expect(calls).toEqual(['publish', 'publish']);
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('blocked for synthetic test'); } } }); });
    await dialog.getByRole('button', { name: 'Compartir', exact: true }).click();
    await dialog.getByRole('button', { name: 'Copiar 1 disponible', exact: true }).click();
    const manual = dialog.getByRole('textbox', { name: 'Enlaces para copiar manualmente' });
    await expect(manual).toHaveValue('Estudiante Prueba\nhttps://example.test/devolucion#' + 'a'.repeat(43));
    await expect(manual).toHaveCSS('font-size', '16px');
    await manual.focus();
    await page.setViewportSize({ width, height: 450 });
    await expect(manual).toBeVisible();
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(calls).toEqual(['publish', 'publish', 'copy']);
  });

  test(`122 fichas y veinte motivos ${width}px ${theme}`, async ({ page, browserName }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 850 });
    const { dialog } = await setup(page, true);
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    await dialog.getByRole('button', { name: 'Listos del filtro', exact: true }).click();
    await dialog.getByRole('button', { name: 'Preparar impresión', exact: true }).click();
    const decoration = dialog.getByRole('combobox', { name: 'Decoración de las fichas' });
    await expect(decoration.locator('option')).toHaveCount(22);
    await decoration.selectOption('mixed');
    await dialog.getByText('Ver motivos por área', { exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Libro', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Siguiente página de motivos' }).click();
    await expect(dialog.getByRole('button', { name: 'Telescopio', exact: true })).toBeVisible();
    if (width === 1440) await dialog.getByText('Ver motivos por área', { exact: true }).locator('..').locator('.grid').screenshot({ path: `../output/playwright/spec122-motifs-${theme}-${browserName}.png` });
    const printed = await dialog.locator('.feedback-slip').evaluateAll(elements => elements.map(el => ({ name: el.querySelector('h2')!.textContent!.replace(/^Continuación de /, ''), text: el.querySelector('.feedback-slip-text')!.textContent!, src: el.querySelector('img')?.getAttribute('src') })));
    for (let index = 1; index <= 30; index++) {
      const fragments = printed.filter(fragment => fragment.name === publicResult(index).estudiante);
      expect(fragments.map(item => item.text).join('').replace(/\s+/g, ' ').trim()).toBe(publicResult(index).retroalimentacion.replace(/\s+/g, ' ').trim());
      expect(new Set(fragments.map(item => item.src)).size).toBe(1);
    }
    expect(await dialog.locator('.feedback-preview').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `../output/playwright/spec122-print-${width}-${theme}-${browserName}.png` });
    if (process.env.SPEC122_CAPTURE_PDF === '1' && browserName === 'chromium' && width === 1440 && theme === 'light') {
      await page.evaluate(() => { window.print = () => {}; });
      for (const format of ['A4', 'Letter'] as const) {
        await dialog.getByRole('button', { name: 'Imprimir fichas', exact: true }).click();
        await expect(page.locator('#feedback-private-print')).toHaveAttribute('data-ready', 'true');
        await page.pdf({ path: `../output/pdf/spec122-${format}.pdf`, format, printBackground: false });
      }
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    }
    await decoration.selectOption('none');
    await page.evaluate(() => { window.print = () => {}; });
    await dialog.getByRole('button', { name: 'Imprimir fichas', exact: true }).click();
    await expect(page.locator('#feedback-private-print')).toHaveAttribute('data-ready', 'true');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#feedback-private-print h2').first()).toBeVisible();
    if (process.env.SPEC122_CAPTURE_PDF === '1' && browserName === 'chromium' && width === 1440 && theme === 'light') {
      await page.pdf({ path: '../output/pdf/spec122-sin-decoracion.pdf', format: 'Letter', printBackground: false });
    }
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await dialog.getByRole('button', { name: 'Volver a la lista', exact: true }).click();
    await expect(dialog.getByText('30 seleccionados', { exact: true })).toBeVisible();
    await expect(dialog.locator('input[aria-label^="Seleccionar "]:checked')).toHaveCount(30);
  });
}
