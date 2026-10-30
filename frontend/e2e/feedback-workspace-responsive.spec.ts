import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

test.use({ reducedMotion: 'reduce' });
const name = (index: number) => index === 1 ? 'Estudiante Prueba' : `Alumno ${String(index).padStart(3, '0')} María Fernanda López`;
const url = (id: string) => `https://example.test/devolucion#${id.padEnd(43, 'a')}`;
async function install(page: Page, total = 40) {
  await login(page, 'profesor', { rosterSize: total });
  const calls: { ids: string[]; request: string }[] = [];
  const accesses = new Map([[`c${total}`, { id: `a${total}`, calificacion_id: `c${total}`, estudiante: name(total), estado: 'active', copy_available: true, version: 1, expires_at: '2099-01-01T00:00:00Z' }]]);
  await page.route('https://**/*', route => route.abort());
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/devoluciones/disponibilidad') return route.fulfill({ json: { enabled: true } });
    if (path.endsWith('/devoluciones/previsualizar')) return route.fulfill({ json: { resultados: route.request().postDataJSON().calificacion_ids.map((id: string) => ({ calificacion_id: id, elegible: true, seleccionable: true, fingerprint: 'f'.repeat(64), resultado: { estudiante: name(Number(id.slice(1))), evaluacion: 'Lectura sintética', materia: 'Lenguaje', nota: id === `c${total}` ? '0' : '3.5', nota_maxima: '5', retroalimentacion: 'Aciertos: identificaste la idea central.\nQué mejorar: justifica con una frase del texto.\nSiguiente paso: escribe una razón nueva.', respuestas: [], claves_liberadas: false, alcance: 'summary' } })) } });
    if (path.endsWith('/devoluciones/accesos/copiar')) return route.fulfill({ json: { resultados: route.request().postDataJSON().access_ids.map((id: string) => ({ id, calificacion_id: `c${id.slice(1)}`, estudiante: name(Number(id.slice(1))), url: url(id) })) } });
    if (path.endsWith('/devoluciones/accesos')) {
      if (route.request().method() === 'GET') return route.fulfill({ json: { resultados: [...accesses.values()], next_cursor: null } });
      const body = route.request().postDataJSON();
      calls.push({ ids: body.selecciones.map((item: { calificacion_id: string }) => item.calificacion_id), request: body.request_id });
      expect(body.duracion_dias).toBe(3); expect(body.evidencia).toBe(false); expect(body.selecciones.length).toBeLessThanOrEqual(100);
      const resultados = body.selecciones.map((item: { calificacion_id: string }) => {
        const index = Number(item.calificacion_id.slice(1));
        const access = { id: `a${index}`, calificacion_id: item.calificacion_id, estudiante: name(index), estado: 'active', copy_available: true, version: 1, expires_at: '2099-01-01T00:00:00Z' };
        accesses.set(item.calificacion_id, access);
        return { ...access, url: url(access.id), credential_available: true };
      });
      return route.fulfill({ json: { resultados } });
    }
    return route.fallback();
  });
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
  // Hybrid input: keyboard menu entry, native pointer selection/share/copy.
  // Windows WebKit spends several seconds per pointer action; keep the 60s
  // limit and every assertion, while explicitly covering keyboard navigation.
  for (const title of ['Más acciones', 'Retroalimentación del grupo']) {
    const action = page.getByRole('button', { name: title, exact: true });
    await expect(action).toBeEnabled();
    await action.press('Enter');
  }
  return { calls, dialog: page.getByRole('dialog', { name: 'Retroalimentación del grupo', exact: true }) };
}

for (const width of [360, 390, 768, 1440]) for (const theme of ['light', 'dark']) test(`129 seleccionar y copiar sin volver al inicio ${width}px ${theme}`, async ({ page, browserName }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width, height: 850 });
  const { calls, dialog } = await install(page);
  await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
  await expect(dialog.getByRole('checkbox')).toHaveCount(40);
  const list = dialog.locator('[data-feedback-list-scroll]');
  await list.evaluate(element => { element.scrollTop = element.scrollHeight; });
  for (const index of [39, 40]) await dialog.getByRole('checkbox', { name: 'Seleccionar ' + name(index), exact: true }).check();
  const share = dialog.getByRole('button', { name: 'Compartir', exact: true });
  // IntersectionObserver can report 0.9999995 for a fully visible fractional pixel.
  await expect(share).toBeInViewport({ ratio: 0.999 });
  const last = dialog.getByRole('checkbox', { name: 'Seleccionar Estudiante Prueba', exact: true });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport({ ratio: 0.999 });
  expect(await dialog.locator('[data-feedback-actions]').evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThan((await last.boundingBox())!.y);
  await page.screenshot({ path: `../output/playwright/spec129-list-${width}-${theme}-${browserName}.png` });
  const position = await list.evaluate(element => element.scrollTop);
  await share.click();
  await expect(dialog.getByRole('button', { name: 'Copiar 1 disponible', exact: true })).toBeEnabled();
  expect(calls).toEqual([]);
  const create = dialog.getByRole('button', { name: 'Crear 1 enlace faltante', exact: true });
  await expect(create).toBeEnabled();
  await create.press('Enter');
  const copy = dialog.getByRole('button', { name: 'Copiar 2 enlaces', exact: true });
  await expect(copy).toBeInViewport({ ratio: 0.999 });
  expect(calls).toHaveLength(1); expect(calls[0].ids).toEqual(['c39']);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Synthetic denial'); } } }));
  await copy.click();
  const manual = dialog.getByRole('textbox', { name: 'Enlaces para copiar manualmente' });
  await expect(manual).toHaveValue(`${name(39)}\n${url('a39')}\n\n${name(40)}\n${url('a40')}`);
  await manual.focus();
  await page.setViewportSize({ width, height: 450 });
  await expect(copy).toBeInViewport({ ratio: 0.999 });
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: `../output/playwright/spec129-share-${width}-${theme}-${browserName}.png` });
  await page.setViewportSize({ width, height: 850 });
  const back = dialog.getByRole('button', { name: 'Volver a estudiantes', exact: true });
  await expect(back).toBeEnabled();
  await back.press('Enter');
  await expect(share).toBeFocused();
  await expect(dialog.getByRole('checkbox', { name: 'Seleccionar ' + name(39), exact: true })).toBeChecked();
  await expect(dialog.locator('input[aria-label^="Seleccionar "]:checked')).toHaveCount(2);
  // Keyboard/viewport changes and new link actions can reflow the list. Preserve
  // the same visible student, not a stale document offset from before sharing.
  await expect(last).toBeInViewport({ ratio: 0.999 });
  expect(await list.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  // WebKit rounds scroll metrics at the limit; tolerate one CSS pixel, not a row.
  await expect.poll(() => list.evaluate((element, saved) => element.scrollTop - Math.min(saved, Math.max(0, element.scrollHeight - element.clientHeight)), position)).toBeGreaterThanOrEqual(-1);
  await page.screenshot({ path: `../output/playwright/spec129-return-${width}-${theme}-${browserName}.png` });
  expect(calls).toHaveLength(1);
  await dialog.getByRole('searchbox').fill('039');
  await expect(dialog.getByText('2 seleccionados · 1 fuera del filtro', { exact: true })).toBeVisible();
  await dialog.getByRole('searchbox').fill('');
  await page.setViewportSize({ width, height: 850 });
});

test('129 paginación completa de 105 sin incluir activos en nuevas emisiones', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const { calls, dialog } = await install(page, 105);
  await expect(dialog.getByRole('checkbox')).toHaveCount(105);
  await dialog.getByRole('button', { name: 'Listos del filtro', exact: true }).click();
  await dialog.getByRole('button', { name: 'Compartir', exact: true }).click();
  await dialog.getByRole('button', { name: 'Crear 104 enlaces faltantes', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Copiar 105 enlaces', exact: true })).toBeEnabled();
  expect(calls.map(call => call.ids.length)).toEqual([100, 4]);
  expect(calls.flatMap(call => call.ids)).not.toContain('c105');
  expect(new Set(calls.flatMap(call => call.ids)).size).toBe(104);
});

for (const width of [390, 1440]) test(`129 texto ampliado y foco ${width}px`, async ({ page, browserName }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width, height: 950 });
  const { dialog } = await install(page);
  await page.addStyleTag({ content: `html { font-size: ${width === 390 ? '150%' : '200%'} !important; }` });
  const last = dialog.getByRole('checkbox', { name: 'Seleccionar Estudiante Prueba', exact: true });
  await last.scrollIntoViewIfNeeded(); await last.press('Space');
  await expect(last).toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Compartir', exact: true })).toBeInViewport({ ratio: 0.999 });
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await dialog.getByRole('button', { name: 'Ver devolución de Estudiante Prueba', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Devolución de Estudiante Prueba', exact: true })).toContainText('justifica con una frase');
  await dialog.getByRole('button', { name: 'Volver a la lista', exact: true }).click();
  await expect(last).toBeChecked();
  await page.screenshot({ path: `../output/playwright/spec129-text-${width}-${browserName}.png` });
});

test('129 seleccion inicio mitad y final sin buscar acciones', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 850 });
  const { dialog, calls } = await install(page);
  await expect(dialog.getByRole('checkbox')).toHaveCount(40);
  const indices = [2, 22, 1]; // Alphabetical beginning, middle and final row.
  const share = dialog.getByRole('button', { name: 'Compartir', exact: true });
  for (let offset = 0; offset < indices.length; offset++) {
    await dialog.getByRole('checkbox', { name: 'Seleccionar ' + name(indices[offset]), exact: true }).check();
    await expect(share).toBeInViewport({ ratio: 0.999 });
    await expect(dialog.getByText(`${offset + 1} ${offset ? 'seleccionados' : 'seleccionado'}`, { exact: true })).toBeVisible();
  }
  await share.click();
  const recipients = dialog.getByRole('list', { name: 'Destinatarios y enlaces' });
  await expect(recipients.getByRole('listitem')).toHaveCount(3);
  for (const index of indices) await expect(recipients.getByText(name(index), { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Crear 3 enlaces faltantes', exact: true })).toBeInViewport({ ratio: 0.999 });
  expect(calls).toEqual([]);
  await dialog.getByRole('button', { name: 'Volver a estudiantes', exact: true }).click();
  await expect(share).toBeFocused();
  await expect(dialog.locator('input[aria-label^="Seleccionar "]:checked')).toHaveCount(3);
});
