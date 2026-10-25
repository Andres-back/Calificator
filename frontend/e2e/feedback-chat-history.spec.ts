import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });
const token = 'a'.repeat(43);
const scope = 'b'.repeat(64);
const answer = 'En la pregunta 11 debías marcar ** V (Verdadera) **.\n\n**Paso concreto:** Relee el párrafo de los glaciares.\n\n**Ejemplo nuevo:** El hielo también almacena agua dulce.\n\n| Reserva | Estado |\n|---|---|\n| Glaciar | Sólido |';

async function install(page: Page, state: Map<string, object[]>, calls: string[], legacy = false) {
  await page.route('**/api/public/devolucion**', route => {
    const request = route.request();
    const url = new URL(request.url());
    const visitor = request.headers()['x-feedback-conversation'] ?? 'legacy';
    const cupo = { restantes: Math.max(0, 5 - (state.get(visitor)?.length ?? 0)), retry_after_seconds: 0 };
    if (url.pathname.endsWith('/conversacion')) return route.fulfill({ json: { items: state.get(visitor) ?? [], next_cursor: null, cupo } });
    if (url.pathname.endsWith('/preguntas')) {
      calls.push('ask');
      const body = request.postDataJSON();
      const row = { request_id: body.request_id, pregunta: body.mensaje, respuesta: answer, mensaje: null, status: 'succeeded', accepted_at: new Date().toISOString() };
      state.set(visitor, [...state.get(visitor) ?? [], row]);
      return route.fulfill({ json: { ...row, cupo: { ...cupo, restantes: cupo.restantes - 1 } } });
    }
    return route.fulfill({ json: { ...legacy ? {} : { conversation_scope: scope }, cupo, evidencia_disponible: false, server_now: new Date().toISOString(), expires_at: new Date(Date.now() + 3600000).toISOString(),
      resultado: { estudiante: 'Estudiante de prueba', evaluacion: 'Hidrografía sintética', materia: 'Sociales', nota: '4.1', nota_maxima: '5', explicacion: 'Nota revisada.', retroalimentacion: 'Relee el texto y explica una razón.', respuestas: [], claves_liberadas: false } } });
  });
}

for (const width of [360, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`126 chat recuperable y decorado ${width}px ${theme}`, async ({ page, browser, browserName }) => {
    const state = new Map<string, object[]>(), calls: string[] = [];
    await page.setViewportSize({ width, height: 850 });
    await install(page, state, calls);
    await page.goto(`/devolucion#${token}`);
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    await page.getByText('Pregúntale a Xali', { exact: true }).click();
    if (width < 768) await page.setViewportSize({ width, height: 450 });
    await expect(page.getByRole('textbox', { name: 'Tu pregunta a Xali' })).toHaveCSS('font-size', '16px');
    await page.getByRole('textbox', { name: 'Tu pregunta a Xali' }).fill('¿En qué fallé en la 11?');
    await page.getByRole('button', { name: 'Enviar pregunta', exact: true }).click();
    if (width < 768) await page.setViewportSize({ width, height: 850 });
    await expect(page.getByText('V (Verdadera)', { exact: true })).toBeVisible();
    await expect(page.getByText('Paso concreto:', { exact: true })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    expect(await page.locator('main').innerText()).not.toContain('**');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `../output/playwright/spec126-chat-${width}-${theme}-${browserName}.png`, fullPage: true });
    await page.reload();
    await page.getByText('Pregúntale a Xali', { exact: true }).click();
    await expect(page.getByText('V (Verdadera)', { exact: true })).toBeVisible();
    expect(calls).toEqual(['ask']);
    const storage = await page.evaluate(() => ({ ...localStorage }));
    expect(Object.values(storage)).toHaveLength(1);
    expect(JSON.stringify(storage)).not.toContain(token);
    expect(JSON.stringify(storage)).not.toContain('fallé');
    const isolated = await browser.newContext();
    try {
      const other = await isolated.newPage();
      await install(other, state, calls);
      await other.goto(`/devolucion#${token}`);
      await other.getByText('Pregúntale a Xali', { exact: true }).click();
      await expect(other.getByText('Recuperando tu conversación…')).not.toBeVisible();
      await expect(other.getByText('V (Verdadera)', { exact: true })).toHaveCount(0);
    } finally { await isolated.close(); }
  });
}

for (const legacy of [true, false]) test(`126 conversación temporal ${legacy ? 'servidor anterior' : 'almacenamiento bloqueado'}`, async ({ page }) => {
  const state = new Map<string, object[]>(), calls: string[] = [];
  const histories: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/conversacion')) histories.push(request.url()); });
  if (!legacy) await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('xcalificator:feedback-conversation:')) throw new DOMException('Blocked for test', 'SecurityError');
      return original.call(this, key, value);
    };
  });
  await install(page, state, calls, legacy);
  await page.goto(`/devolucion#${token}`);
  await page.getByText('Pregúntale a Xali', { exact: true }).click();
  await expect(page.getByText(/Esta conversación es temporal/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Tu pregunta a Xali' }).fill('Pregunta temporal de prueba');
  await page.getByRole('button', { name: 'Enviar pregunta', exact: true }).click();
  await expect(page.getByText('V (Verdadera)', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText('Pregúntale a Xali', { exact: true }).click();
  await expect(page.getByText('Recuperando tu conversación…')).not.toBeVisible();
  await expect(page.getByText('Pregunta temporal de prueba', { exact: true })).toHaveCount(0);
  expect(calls).toEqual(['ask']);
  if (legacy) expect(histories).toEqual([]);
});
