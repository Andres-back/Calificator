import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

const message = 'Aciertos: identificaste el personaje principal.\nQué mejorar: explica la emoción usando una razón del texto.\nSiguiente paso: relee el segundo párrafo y escribe tu explicación.';
const token = 'a'.repeat(43);
const result = (index: number) => ({ estudiante: index === 1 ? 'Estudiante Prueba' : `Alumno ${String(index).padStart(3, '0')} María Fernanda López`,
  evaluacion: 'Lectura sintética', materia: 'Lenguaje', nota: '3.00', nota_maxima: '5.00',
  retroalimentacion: index === 2 ? ('Aciertos: localizaste el tema. Qué mejorar: justifica con una frase del texto. Siguiente paso: escribe una razón nueva.\n').repeat(40) : message,
  explicacion: 'Nota revisada por tu docente. Esta devolución no incluye detalle por pregunta.',
  respuestas: [], claves_liberadas: false, alcance: 'summary',
});

async function installFeedback(page: Page, initiallyApproved = false, { deferApprovalRefresh = false } = {}) {
  let approved = initiallyApproved;
  let previewCalls = 0;
  let releaseApprovalRefresh = () => {};
  const approvalRefresh = new Promise<void>(resolve => { releaseApprovalRefresh = resolve; });
  const operations: string[] = [];
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = (value: unknown) => route.fulfill({ json: value });
    if (path === '/api/devoluciones/disponibilidad') return json({ enabled: true });
    if (path === '/api/public/devolucion') return json({ resultado: result(1), server_now: '2026-10-23T12:00:00Z', expires_at: '2026-10-26T12:00:00Z', cupo: { restantes: 5, retry_after_seconds: 0 }, evidencia_disponible: false });
    if (path === '/api/evaluaciones/e1/devoluciones/previsualizar') {
      previewCalls++;
      if (approved && deferApprovalRefresh) await approvalRefresh;
      const requested = route.request().postDataJSON().calificacion_ids as string[];
      return json({ resultados: Array.from({ length: 30 }, (_, offset) => {
        const index = offset + 1;
        const ready = index !== 1 || approved;
        return { calificacion_id: `c${index}`, elegible: ready, seleccionable: true,
          preparacion: ready ? 'ready' : 'needs_review', fingerprint: ready ? 'f'.repeat(64) : undefined,
          resultado: ready ? result(index) : undefined,
          borrador_docente: { estado: 'publicada', nota: '3.00', nota_maxima: '5.00', retroalimentacion: message },
          motivo: ready ? undefined : 'Revisa la devolución antes de entregarla.',
          revision_docente: { source_fingerprint: 'b'.repeat(64), feedback_text: message, detail_available: false } };
      }).filter(item => requested.includes(item.calificacion_id)) });
    }
    if (path === '/api/evaluaciones/e1/devoluciones/revisar') {
      operations.push('review'); approved = true;
      expect(route.request().postDataJSON()).toMatchObject({ calificacion_id: 'c1', scope: 'summary', feedback_text: message });
      return json({ calificacion_id: 'c1', elegible: true, seleccionable: true, preparacion: 'ready', fingerprint: 'f'.repeat(64), resultado: result(1) });
    }
    if (path === '/api/evaluaciones/e1/devoluciones/fichas') {
      operations.push('print');
      return json({ resultados: route.request().postDataJSON().selecciones.map((entry: { calificacion_id: string }) => ({ calificacion_id: entry.calificacion_id, resultado: result(Number(entry.calificacion_id.slice(1))) })) });
    }
    if (path === '/api/evaluaciones/e1/devoluciones/accesos') {
      if (route.request().method() === 'GET') return json({ resultados: [], next_cursor: null });
      operations.push('issue');
      return json({ resultados: [{ calificacion_id: 'c1', id: 'access1', estado: 'active', version: 1,
        credential_available: true, url: `http://127.0.0.1:4175/devolucion#${token}`, expires_at: '2026-10-26T12:00:00Z' }] });
    }
    return route.fallback();
  });
  return { operations, previewCalls: () => previewCalls, releaseApprovalRefresh };
}

test('126 conserva tres seleccionados al abrir el grupo sin publicar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await login(page, 'profesor', { rosterSize: 30 });
  const state = await installFeedback(page, true);
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
  const choices = page.getByRole('checkbox', { name: /^Seleccionar nota de / });
  for (let index = 0; index < 3; index++) await choices.nth(index).click();
  await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
  await page.getByRole('button', { name: 'Retroalimentación del grupo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Retroalimentación del grupo', exact: true });
  await expect(dialog.getByText('30 estudiantes · 30 listos para entregar')).toBeVisible();
  await expect(dialog.getByText('3 seleccionados', { exact: true })).toBeVisible();
  await expect(dialog.locator('input[aria-label^="Seleccionar "]:checked')).toHaveCount(3);
  expect(state.operations).toEqual([]);
});

for (const width of [390, 1440]) test(`126 misma gestión individual y grupo ${width}px`, async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width, height: 850 });
  await login(page, 'profesor', { rosterSize: 30 });
  await installFeedback(page, true);
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1&calificacion=c1&estudiante=s1');
  await page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Retroalimentación', exact: true }).click();
  const individual = page.getByRole('region', { name: 'Retroalimentación del estudiante', exact: true });
  await expect(individual.getByText('identificaste el personaje principal.', { exact: true })).toBeVisible();
  await expect(individual.getByRole('searchbox')).toHaveCount(0);
  await individual.getByRole('button', { name: 'Revisar devolución de Estudiante Prueba', exact: true }).click();
  await expect(individual.getByRole('textbox', { name: 'Mensaje para el estudiante' })).toHaveValue(message);
  await individual.getByRole('button', { name: 'Volver sin aprobar', exact: true }).click();
  if (width < 1280) await page.getByRole('button', { name: 'Volver a lista', exact: true }).click();
  await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
  await page.getByRole('button', { name: 'Retroalimentación del grupo', exact: true }).click();
  const group = page.getByRole('dialog', { name: 'Retroalimentación del grupo', exact: true });
  await group.getByRole('button', { name: 'Ver devolución de Estudiante Prueba', exact: true }).click();
  await group.getByRole('button', { name: 'Revisar devolución de Estudiante Prueba', exact: true }).click();
  await expect(group.getByRole('textbox', { name: 'Mensaje para el estudiante' })).toHaveValue(message);
  expect(await group.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

for (const width of [360, 390, 768, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`120 devolución seleccionable y legible ${width}px ${theme}`, async ({ page, browserName }) => {
    // This scenario covers login + review + 30 printed slips + a public link,
    // not just one interaction. Individual expectations keep their normal bound.
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 850 });
    await login(page, 'profesor', { rosterSize: 30 });
    const state = await installFeedback(page, false, { deferApprovalRefresh: true });
    await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
    await page.evaluate(theme => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, theme);
    await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
    await page.getByRole('button', { name: 'Retroalimentación del grupo', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Retroalimentación del grupo' });
    await expect(dialog.getByText('30 estudiantes · 29 listos para entregar')).toBeVisible();
    await dialog.getByRole('button', { name: 'Limpiar selección', exact: true }).click();
    const selected = dialog.getByRole('checkbox', { name: 'Seleccionar Estudiante Prueba', exact: true });
    await selected.press('Space');
    await expect(selected).toBeChecked();
    await dialog.getByRole('button', { name: 'Ver devolución de Estudiante Prueba', exact: true }).click();
    await dialog.getByRole('button', { name: 'Revisar devolución de Estudiante Prueba', exact: true }).click();
    await expect(dialog.getByRole('textbox', { name: 'Mensaje para el estudiante' })).toHaveValue(message);
    await expect(dialog.getByRole('textbox', { name: 'Mensaje para el estudiante' })).toHaveCSS('font-size', '16px');
    expect((await dialog.getByRole('textbox', { name: 'Mensaje para el estudiante' }).boundingBox())!.height).toBeGreaterThanOrEqual(224);
    await expect(dialog.getByRole('combobox')).toContainText('Solo nota y retroalimentación');
    await page.screenshot({ path: `../output/playwright/spec120-review-${width}-${theme}-${browserName}.png` });
    const callsBeforeApproval = state.previewCalls();
    const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/evaluaciones/e1/devoluciones/previsualizar' && response.ok());
    await dialog.getByRole('button', { name: 'Aprobar devolución', exact: true }).click();
    // Approval intentionally revalidates the list. Hold that response so the
    // test observes loading instead of racing the optimistic ready state.
    await expect(dialog.getByText('Cargando estudiantes y retroalimentaciones…', { exact: true })).toBeVisible();
    await expect.poll(state.previewCalls).toBe(callsBeforeApproval + 1);
    state.releaseApprovalRefresh();
    await (await refreshed).finished();
    await dialog.getByRole('button', { name: 'Volver a la lista', exact: true }).click();
    await expect(selected).toBeChecked();
    await expect(dialog.getByText('30 estudiantes · 30 listos para entregar')).toBeVisible();
    await expect(dialog.getByText('1 seleccionado', { exact: true })).toBeVisible();
    const calls = state.previewCalls();
    await dialog.getByRole('searchbox', { name: 'Buscar estudiante' }).fill('Prueba');
    await expect(dialog.getByRole('checkbox')).toHaveCount(1);
    expect(state.previewCalls()).toBe(calls);
    await dialog.getByRole('searchbox', { name: 'Buscar estudiante' }).fill('');
    await dialog.getByRole('button', { name: 'Compartir', exact: true }).click();
    await dialog.getByRole('button', { name: 'Crear 1 enlace faltante', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Copiar enlace de Estudiante Prueba' })).toBeVisible();
    expect(state.operations).toEqual(['review', 'issue']);
    await dialog.getByRole('button', { name: 'Volver a estudiantes', exact: true }).click();
    await dialog.getByRole('button', { name: 'Listos del filtro', exact: true }).click();
    await expect(dialog.getByText('30 seleccionados', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Preparar impresión', exact: true })).toBeEnabled();
  });

  test(`120 impresión completa y devolución privada ${width}px ${theme}`, async ({ page, browserName }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 850 });
    await login(page, 'profesor', { rosterSize: 30 });
    await installFeedback(page, true);
    await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
    await page.evaluate(theme => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, theme);
    await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
    await page.getByRole('button', { name: 'Retroalimentación del grupo', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Retroalimentación del grupo' });
    await dialog.getByRole('button', { name: 'Listos del filtro', exact: true }).click();
    await expect(dialog.getByText('30 seleccionados', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Preparar impresión', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: '30 fichas para entregar individualmente' })).toBeVisible();
    expect(await dialog.locator('.feedback-slip').count()).toBeGreaterThan(30);
    const normalized = (text: string) => text.replace(/\s+/g, ' ').trim();
    const printed = await dialog.locator('.feedback-slip').evaluateAll(elements => elements.map(element => ({
      name: element.querySelector('h2')!.textContent!.replace(/^Continuación de /, ''),
      text: element.querySelector('.feedback-slip-text')!.textContent!,
    })));
    for (let index = 1; index <= 30; index++) {
      const expected = result(index);
      expect(normalized(printed.filter(fragment => fragment.name === expected.estudiante).map(fragment => fragment.text).join('')))
        .toBe(normalized(expected.retroalimentacion));
    }
    if (process.env.SPEC120_CAPTURE_PDF === '1' && browserName === 'chromium' && width === 1440 && theme === 'light') {
      await page.evaluate(() => { window.print = () => {}; });
      for (const format of ['A4', 'Letter'] as const) {
        // Chromium dispatches afterprint after each PDF and clears the private
        // print portal, as it should for a real print dialog. Reopen each time.
        await dialog.getByRole('button', { name: 'Imprimir fichas', exact: true }).click();
        await expect(page.locator('#feedback-private-print')).toHaveAttribute('data-ready', 'true');
        await page.pdf({ path: `../output/pdf/spec120-${format}.pdf`, format, printBackground: false });
      }
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    }
    await page.screenshot({ path: `../output/playwright/spec120-print-${width}-${theme}-${browserName}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.goto(`/devolucion#${token}`);
    await expect(page.getByRole('heading', { name: 'Qué mejorar', exact: true })).toBeVisible();
    await page.evaluate(theme => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, theme);
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(theme === 'dark');
    await expect(page.getByText('explica la emoción usando una razón del texto.', { exact: true })).toBeVisible();
    await expect(page.getByText('Ver respuestas y puntajes', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `../output/playwright/spec120-public-${width}-${theme}-${browserName}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
