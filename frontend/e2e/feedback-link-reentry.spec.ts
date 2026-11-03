import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const studentName = 'Estudiante Prueba';
const evaluationName = 'Lectura sintética';
const feedback = 'Aciertos: identificaste la idea principal.\nQué mejorar: justifica tu respuesta con una frase del texto.\nSiguiente paso: escribe una razón nueva.';
const fingerprint = 'f'.repeat(64);
const expiresAt = '2099-01-04T12:00:00Z';
const teacherPermissions = ['subjects.read', 'evaluations.read', 'grading.read', 'grading.grade', 'grading.publish'];
const readOnlyPermissions = ['subjects.read', 'evaluations.read', 'grading.read'];
const gradeHref = '/app/calificaciones?materia=m1&evaluacion=e1&calificacion=c1&estudiante=s1';

type Access = {
  id: string; calificacion_id: string; estudiante: string;
  estado: 'active' | 'expired' | 'disabled' | 'suspended';
  version: number; expires_at: string; fingerprint: string; copy_available: boolean;
  url: string;
};
type IssueInput = {
  request_id: string; solo_si_falta?: boolean; duracion_dias: number; evidencia: boolean;
  selecciones: { calificacion_id: string; fingerprint: string }[];
};
type BrowserState = Window & { __spec139Copied?: string[] };

function savedAccess(overrides: Partial<Access> = {}): Access {
  return {
    id: 'access-c1', calificacion_id: 'c1', estudiante: studentName,
    estado: 'active', version: 1, expires_at: expiresAt, fingerprint, copy_available: true,
    url: 'https://example.test/devolucion#' + 'a'.repeat(43), ...overrides,
  };
}

/** One synthetic server survives page unmounts, logout, and a fresh browser context. */
function backend(seed: Access[] = []) {
  const learnerName = seed[0]?.estudiante ?? studentName;
  const accesses = new Map(seed.map(access => [access.id, { ...access }]));
  const issueRequests: IssueInput[] = [];
  const copyRequests: string[][] = [];
  const forbiddenWrites: string[] = [];
  const listSnapshots: Omit<Access, 'url'>[][] = [];
  const operationResults = new Map<string, Access[]>();
  const state = {
    accesses, issueRequests, copyRequests, forbiddenWrites, listSnapshots,
    failList: false, failRecovery: false, loseNextIssueResponse: false,
  };

  async function install(page: Page, options: { permissions?: string[]; denyClipboard?: boolean } = {}) {
    const actor = {
      id: 'p1', nombre: 'Profesora Prueba', email: 'profesora@example.test',
      rol: 'profesor', estado: 'activo', permissions: options.permissions ?? [...teacherPermissions],
    };
    await page.addInitScript(({ denyClipboard }) => {
      (window as BrowserState).__spec139Copied = [];
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text: string) => {
          if (denyClipboard) throw new Error('Synthetic clipboard denial');
          (window as BrowserState).__spec139Copied!.push(text);
        } },
      });
    }, { denyClipboard: Boolean(options.denyClipboard) });
    await login(page, 'profesor', { permissions: actor.permissions });
    // All remote URLs are synthetic. No public page or sharing channel is opened.
    await page.route('https://**/*', route => route.abort());
    await page.route('**/api/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const json = (data: unknown, status = 200) => route.fulfill({ status, json: data });
      if (path === '/api/auth/me') return json({ user: actor });
      if (path === '/api/users/me/authorization') return json({
        profile: actor.rol, is_primary_admin: false, custom_role_id: null,
        custom_role_name: null, role_version: null, auth_version: 1, permissions: actor.permissions,
      });
      if (path === '/api/devoluciones/disponibilidad') return json({ enabled: true });
      const grade = {
        id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1',
        nota_sugerida: 3.5, nota_confirmada: 3.5, estado: 'publicada', revisado_por_docente: true,
        feedback, resultado_json: {}, created_at: '2026-10-29T12:00:00Z', updated_at: '2026-10-29T12:00:00Z',
      };
      if (path === '/api/calificaciones/c1/detalle') return json({
        ...grade, estudiante_nombre: learnerName, evaluacion_nombre: evaluationName,
        materia_nombre: 'Lenguaje', nota_maxima: 5, entrega_tipo: 'online',
        entrega_respuesta_texto: 'Respuesta sintética', timeline: [], guia_revision: [],
        entrega_evidencia_paginas: 0, desglose: null, respuestas_liberadas: false,
      });
      if (path === '/api/evaluaciones/e1/calificaciones') return json([grade]);
      if (path === '/api/evaluaciones/e1/revision') return json({
        evaluacion_id: 'e1', materia_id: 'm1', total_alumnos: 1, siguiente_cursor: null,
        contadores: { todas: 1, pendientes: 0, alertas: 0, procesando: 0, publicadas: 1 },
        alumnos: [{ estudiante_id: 's1', nombre: learnerName, calificacion_id: 'c1', estado: 'publicada', nota: 3.5,
          resumen_revision: { version: 1, cobertura: 'completa', bloqueos: [], componentes_pendientes: 0,
            componentes_ilegibles: 0, pqrs_abiertas: 0, tiene_alertas: false } }],
      });
      if (path === '/api/evaluaciones/e1/devoluciones/previsualizar') return json({
        resultados: request.postDataJSON().calificacion_ids.map((id: string) => ({
          calificacion_id: id, elegible: true, seleccionable: true, preparacion: 'ready', fingerprint,
          borrador_docente: { estado: 'publicada', nota: '3.5', nota_maxima: '5', retroalimentacion: feedback },
          resultado: { estudiante: learnerName, evaluacion: evaluationName, materia: 'Lenguaje',
            nota: '3.5', nota_maxima: '5', retroalimentacion: feedback,
            explicacion: 'Nota y mensaje ya revisados por el docente.', respuestas: [], claves_liberadas: false, alcance: 'summary' },
        })),
      });
      if (path === '/api/evaluaciones/e1/devoluciones/accesos/copiar') {
        const ids = request.postDataJSON().access_ids as string[];
        copyRequests.push([...ids]);
        expect(ids.length).toBeLessThanOrEqual(100);
        if (!actor.permissions.includes('grading.publish')) return json({ detail: 'Sin permiso para copiar.' }, 403);
        if (state.failRecovery) return json({ detail: 'Fallo de recuperación sintético.' }, 503);
        return json({ resultados: ids.map(id => {
          const access = accesses.get(id);
          if (!access) return { id, code: 'unavailable', error: 'Este enlace no está disponible.' };
          if (access.estado !== 'active') return { id, code: access.estado === 'suspended' ? 'unavailable' : access.estado,
            error: 'Su enlace requiere revisar la vigencia o autorización.' };
          if (!access.copy_available) return { id, code: 'legacy_unrecoverable',
            error: 'Este enlace antiguo no guardó una copia recuperable. Puedes reemplazarlo de forma explícita.' };
          return { id, calificacion_id: access.calificacion_id, estudiante: access.estudiante,
            expires_at: access.expires_at, url: access.url };
        }) });
      }
      if (path === '/api/evaluaciones/e1/devoluciones/accesos') {
        if (request.method() === 'GET') {
          if (state.failList) return json({ detail: 'Fallo de consulta sintético.' }, 503);
          const requestedGrade = url.searchParams.get('calificacion_id');
          const results = [...accesses.values()].filter(access => !requestedGrade || requestedGrade === access.calificacion_id)
            .map(({ url: _privateUrl, ...metadata }) => ({ ...metadata }));
          listSnapshots.push(results);
          return json({ resultados: results, next_cursor: null });
        }
        const body = request.postDataJSON() as IssueInput;
        issueRequests.push(body);
        if (!actor.permissions.includes('grading.publish')) return json({ detail: 'Sin permiso para generar.' }, 403);
        expect(body).toMatchObject({ duracion_dias: 3, evidencia: false, solo_si_falta: true,
          selecciones: [{ calificacion_id: 'c1', fingerprint }] });
        expect(body.request_id).toMatch(/^[a-f\d-]{36}$/i);
        let results = operationResults.get(body.request_id);
        if (!results) {
          // Model the server-side only-if-missing guard, not browser persistence.
          results = body.selecciones.map(selection => {
            const current = [...accesses.values()].filter(access => access.calificacion_id === selection.calificacion_id && access.estado === 'active');
            expect(current.length).toBeLessThanOrEqual(1);
            const access = current[0] ?? savedAccess();
            accesses.set(access.id, access);
            return access;
          });
          operationResults.set(body.request_id, results);
        }
        if (state.loseNextIssueResponse) {
          state.loseNextIssueResponse = false;
          return route.abort('failed');
        }
        return json({ resultados: results.map(access => ({ ...access, credential_available: true })) });
      }
      // These scenarios start with approved content. Opening, generating an
      // access, and copying may not silently approve, adjust, publish or renew it.
      if (request.method() !== 'GET' && (
        /^\/api\/calificaciones\/[^/]+\/(confirmar|publicar|ajustar)(\/|$)/.test(path)
        || /^\/api\/evaluaciones\/[^/]+\/devoluciones\/(aceptar-publicar|revisar|mensaje|fichas)$/.test(path)
        || /^\/api\/devoluciones\/accesos\/[^/]+\/(reactivar|renovar|desactivar)$/.test(path)
        || /\/(ia|ai|calificar)(\/|$)/.test(path)
      )) {
        forbiddenWrites.push(path);
        return json({ detail: 'La lectura/copia no autoriza esta escritura.' }, 409);
      }
      return route.fallback();
    });
    return actor;
  }
  return { ...state, state, install };
}

async function activate(control: Locator) {
  await expect(control).toBeEnabled();
  await control.press('Enter');
}

async function openFeedback(page: Page, theme = 'light') {
  await page.goto(gradeHref);
  await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
  await activate(page.getByRole('navigation', { name: 'Secciones de la calificación' })
    .getByRole('button', { name: 'Retroalimentación', exact: true }));
  await expect(page.getByRole('region', { name: 'Retroalimentación del estudiante', exact: true })).toBeVisible();
}

async function openStudent(page: Page, theme = 'light') {
  await openFeedback(page, theme);
  const block = page.getByRole('region', { name: 'Enlace para el estudiante', exact: true });
  await expect(block).toBeVisible();
  return block;
}

async function expectAvailable(block: Locator, access = savedAccess()) {
  await expect(block.getByText('Enlace disponible', { exact: true })).toBeVisible();
  await expect(block.getByRole('textbox', { name: 'Enlace del estudiante', exact: true })).toHaveValue(access.url);
  await expect(block.getByRole('textbox', { name: 'Enlace del estudiante', exact: true })).toHaveAttribute('readonly', '');
  await expect(block.locator('time')).toHaveAttribute('datetime', access.expires_at);
  await expect(block.getByRole('button', { name: 'Copiar enlace', exact: true })).toBeEnabled();
  await expect(block.getByRole('button', { name: 'Generar enlace', exact: true })).toHaveCount(0);
}

async function copied(page: Page) {
  return page.evaluate(() => (window as BrowserState).__spec139Copied ?? []);
}

async function expectNoStoredUrl(page: Page, url = savedAccess().url) {
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain(url);
  expect(stored).not.toContain(url.split('#')[1]);
}

function expectedMessage(access = savedAccess()) {
  return `Hola. Esta es la retroalimentación de ${studentName} en ${evaluationName}: ${access.url}`;
}

async function generate(page: Page, block: Locator, server: ReturnType<typeof backend>) {
  await activate(block.getByRole('button', { name: 'Generar enlace', exact: true }));
  const confirmation = page.getByRole('region', { name: 'Confirmar entrega', exact: true });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(studentName);
  await expect(confirmation).toContainText('3.5');
  await expect(confirmation).toContainText('justifica tu respuesta');
  expect(server.issueRequests).toEqual([]);
  expect(server.forbiddenWrites).toEqual([]);
  const uncertain = server.state.loseNextIssueResponse;
  await activate(page.getByRole('button', { name: 'Confirmar y generar 1 enlace', exact: true }));
  await expect.poll(() => server.accesses.size).toBe(1);
  if (uncertain) {
    await expect(page.getByRole('alert')).toContainText(/respuesta|confirm|recuper/i);
    return block;
  }
  await expect(page.getByRole('button', { name: /^Copiar (?:lista de 1|1 enlace|enlace(?: de Estudiante Prueba)?)$/ }).first()).toBeEnabled();
  const back = page.getByRole('button', { name: 'Volver a estudiantes', exact: true });
  if (await back.count()) await activate(back);
  const permanent = page.getByRole('region', { name: 'Enlace para el estudiante', exact: true });
  await expectAvailable(permanent);
  return permanent;
}

for (const width of [384, 1440]) for (const theme of ['light', 'dark']) {
  test(`139 generar una vez, salir, volver y recargar sin datos temporales ${width}px ${theme}`, async ({ page, browserName }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    const server = backend();
    await server.install(page);
    let block = await openStudent(page, theme);
    block = await generate(page, block, server);
    // Return inside the same workspace before navigating away: the permanent
    // block must expose the result without a selection or another confirmation.
    await expect(page).toHaveURL(/calificacion=c1/);
    const identity = { ...server.accesses.get('access-c1')! };
    await expectAvailable(block, identity);
    for (let repeat = 0; repeat < 2; repeat++) await activate(block.getByRole('button', { name: 'Copiar enlace', exact: true }));
    await expect.poll(() => copied(page)).toEqual([expectedMessage(identity), expectedMessage(identity)]);
    expect(server.issueRequests).toHaveLength(1);
    expect(server.forbiddenWrites).toEqual([]);
    await expectNoStoredUrl(page, identity.url);

    await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
    await expect(page).toHaveURL(/evaluacion=e1/);
    await page.goto('/app/materias');
    await expect(page.getByRole('region', { name: 'Enlace para el estudiante', exact: true })).toHaveCount(0);
    block = await openStudent(page, theme);
    await expectAvailable(block, identity);
    await activate(block.getByRole('button', { name: 'Copiar enlace', exact: true }));
    await expect.poll(() => copied(page)).toEqual([expectedMessage(identity)]);

    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await activate(page.getByRole('navigation', { name: 'Secciones de la calificación' })
      .getByRole('button', { name: 'Retroalimentación', exact: true }));
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
    block = page.getByRole('region', { name: 'Enlace para el estudiante', exact: true });
    await expectAvailable(block, identity);
    await activate(block.getByRole('button', { name: 'Copiar enlace', exact: true }));
    await expect.poll(() => copied(page)).toEqual([expectedMessage(identity)]);
    expect([...server.accesses.values()]).toEqual([identity]);
    expect(server.issueRequests).toHaveLength(1);
    expect(server.copyRequests.flat().every(id => id === identity.id)).toBe(true);
    expect(server.listSnapshots.flat().every(access => access.id === identity.id && access.version === identity.version && access.expires_at === identity.expires_at)).toBe(true);
    expect(server.forbiddenWrites).toEqual([]);
    await expectNoStoredUrl(page, identity.url);
    await page.screenshot({ path: `output/playwright/spec139-reentry-${width}-${theme}-${browserName}.png` });
  });
}

test('139 nueva sesión y segundo contexto recuperan la misma URL sin selección previa', async ({ page, browser, baseURL }) => {
  test.setTimeout(60_000);
  const server = backend();
  await server.install(page);
  await generate(page, await openStudent(page), server);
  const identity = { ...server.accesses.get('access-c1')! };
  await page.goto('/app/materias');
  await activate(page.getByRole('button', { name: 'Abrir menú de cuenta de Profesora Prueba', exact: true }));
  await activate(page.getByRole('menuitem', { name: 'Cerrar sesión', exact: true }));
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('textbox', { name: 'Enlace del estudiante', exact: true })).toHaveCount(0);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.getByLabel(/Correo/i).fill('profesora@example.test');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await expect(page.locator('main#main-content').getByRole('heading', { level: 1 })).toBeVisible();
  const block = await openStudent(page);
  await expectAvailable(block, identity);
  await activate(block.getByRole('button', { name: 'Copiar enlace', exact: true }));
  await expect.poll(() => copied(page)).toEqual([expectedMessage(identity)]);

  const freshContext = await browser.newContext({ baseURL, viewport: { width: 384, height: 900 }, reducedMotion: 'reduce' });
  try {
    const freshPage = await freshContext.newPage();
    await server.install(freshPage);
    const freshBlock = await openStudent(freshPage, 'dark');
    await expectAvailable(freshBlock, identity);
    await expect(freshBlock.getByRole('checkbox')).toHaveCount(0);
    await activate(freshBlock.getByRole('button', { name: 'Copiar enlace', exact: true }));
    await expect.poll(() => copied(freshPage)).toEqual([expectedMessage(identity)]);
    await expectNoStoredUrl(freshPage, identity.url);
    expect([...server.accesses.values()]).toEqual([identity]);
    expect(server.issueRequests).toHaveLength(1);
    expect(server.forbiddenWrites).toEqual([]);
  } finally { await freshContext.close(); }
});

test('139 respuesta de generación perdida se recupera con sessionStorage vacío sin emitir otra vez', async ({ page }) => {
  const server = backend();
  server.state.loseNextIssueResponse = true;
  await server.install(page);
  await generate(page, await openStudent(page), server);
  const identity = { ...server.accesses.get('access-c1')! };
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  const block = await openStudent(page);
  await expectAvailable(block, identity);
  await activate(block.getByRole('button', { name: 'Copiar enlace', exact: true }));
  await expect.poll(() => copied(page)).toEqual([expectedMessage(identity)]);
  expect(server.issueRequests).toHaveLength(1);
  expect([...server.accesses.values()]).toEqual([identity]);
  expect(server.forbiddenWrites).toEqual([]);
});

for (const failure of ['consulta', 'recuperación'] as const) {
  test(`139 fallo de ${failure} no significa ausencia ni permite generar`, async ({ page, browserName }) => {
    await page.setViewportSize({ width: 384, height: 900 });
    const identity = savedAccess();
    const server = backend([identity]);
    server.state.failList = failure === 'consulta';
    server.state.failRecovery = failure === 'recuperación';
    await server.install(page);
    const block = await openStudent(page);
    await expect(block).toContainText(failure === 'consulta' ? /No pudimos consultar|No pudimos actualizar/ : /No pudimos recuperar/);
    await expect(block.getByRole('button', { name: 'Generar enlace', exact: true })).toHaveCount(0);
    await expect(block.getByText(/Aún no has generado|Todavía no hay enlaces/)).toHaveCount(0);
    await expect(block.getByRole('textbox', { name: 'Enlace del estudiante', exact: true })).toHaveCount(0);
    expect(server.issueRequests).toEqual([]);
    expect(await copied(page)).toEqual([]);
    const retry = block.getByRole('button', { name: 'Reintentar', exact: true });
    await retry.scrollIntoViewIfNeeded();
    await expect(retry).toBeInViewport({ ratio: 0.99 });
    await page.screenshot({ path: `output/playwright/spec139-${failure === 'consulta' ? 'list' : 'recovery'}-error-384-${browserName}.png` });
    server.state.failList = false; server.state.failRecovery = false;
    await activate(block.getByRole('button', { name: 'Reintentar', exact: true }));
    await expectAvailable(block, identity);
    await activate(block.getByRole('button', { name: 'Copiar enlace', exact: true }));
    await expect.poll(() => copied(page)).toEqual([expectedMessage(identity)]);
    expect(server.issueRequests).toEqual([]);
    expect([...server.accesses.values()]).toEqual([identity]);
    expect(server.forbiddenWrites).toEqual([]);
  });
}

test('139 copia denegada conserva el enlace seleccionable sin anunciar copia o envío', async ({ page }) => {
  const identity = savedAccess();
  const server = backend([identity]);
  await server.install(page, { denyClipboard: true });
  const block = await openStudent(page);
  await expectAvailable(block, identity);
  await activate(block.getByRole('button', { name: 'Copiar enlace', exact: true }));
  await expect(block).toContainText(/no permitió copiar|no pudimos copiar/i);
  await expect(block.getByText('Enlace copiado', { exact: true })).toHaveCount(0);
  await expect(block.getByText(/^(Enviado|Visto|Recibido)$/)).toHaveCount(0);
  const manual = block.getByRole('textbox', { name: 'Enlace del estudiante', exact: true });
  await expect(manual).toHaveValue(identity.url);
  await manual.focus();
  await expect.poll(() => manual.evaluate(element => {
    const field = element as HTMLInputElement | HTMLTextAreaElement;
    return [field.selectionStart, field.selectionEnd];
  })).toEqual([0, identity.url.length]);
  expect(await copied(page)).toEqual([]);
  expect(server.issueRequests).toEqual([]);
  expect(server.forbiddenWrites).toEqual([]);
});

test('139 vuelve a comprobar autorización al copiar y no entrega una URL suspendida', async ({ page }) => {
  const server = backend([savedAccess()]);
  await server.install(page);
  const block = await openStudent(page);
  await expectAvailable(block);
  const reads = server.copyRequests.length + server.listSnapshots.length;
  server.accesses.get('access-c1')!.estado = 'suspended';
  await activate(block.getByRole('button', { name: 'Copiar enlace', exact: true }));
  await expect.poll(() => server.copyRequests.length + server.listSnapshots.length).toBeGreaterThan(reads);
  await expect(block).toContainText(/No pudimos recuperar|Necesita reenvío|Requiere atención/);
  await expect(block.getByText('Enlace copiado', { exact: true })).toHaveCount(0);
  expect(await copied(page)).toEqual([]);
  expect(server.issueRequests).toEqual([]);
  expect(server.forbiddenWrites).toEqual([]);
});

for (const revoked of [false, true]) {
  test(`139 ${revoked ? 'permiso revocado al volver' : 'solo lectura'} no expone ni copia credenciales`, async ({ page }) => {
    const server = backend([savedAccess()]);
    const actor = await server.install(page, { permissions: revoked ? [...teacherPermissions] : [...readOnlyPermissions] });
    if (revoked) {
      await expectAvailable(await openStudent(page));
      actor.permissions = [...readOnlyPermissions];
    }
    const before = server.copyRequests.length;
    await openFeedback(page);
    await expect(page.getByRole('textbox', { name: 'Enlace del estudiante', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Copiar enlace', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Generar enlace', exact: true })).toHaveCount(0);
    expect(server.copyRequests).toHaveLength(before);
    expect(await copied(page)).toEqual([]);
    expect(server.issueRequests).toEqual([]);
    expect(server.forbiddenWrites).toEqual([]);
  });
}

for (const [state, label] of [['expired', 'Vencido'], ['disabled', 'Desactivado'], ['suspended', 'Necesita reenvío']] as const) {
  test(`139 ${label} no se reabre al volver`, async ({ page }) => {
    const access = savedAccess({ estado: state, ...(state === 'expired' ? { expires_at: '2000-01-01T12:00:00Z' } : {}) });
    const server = backend([access]);
    await server.install(page);
    const block = await openStudent(page);
    await expect(block.getByText(label, { exact: true })).toBeVisible();
    await expect(block.getByRole('button', { name: 'Copiar enlace', exact: true })).toHaveCount(0);
    await expect(block.getByRole('button', { name: 'Generar enlace', exact: true })).toHaveCount(0);
    expect(await copied(page)).toEqual([]);
    expect(server.issueRequests).toEqual([]);
    expect([...server.accesses.values()]).toEqual([access]);
    expect(server.forbiddenWrites).toEqual([]);
  });
}

test('139 copia histórica no recuperable pide atención sin inventar o reemplazar la URL', async ({ page }) => {
  const access = savedAccess({ copy_available: false });
  const server = backend([access]);
  await server.install(page);
  const block = await openStudent(page);
  await expect(block.getByText('Requiere atención', { exact: true })).toBeVisible();
  await expect(block).toContainText(/antiguo|copia recuperable|reemplaz/i);
  await expect(block.getByRole('textbox', { name: 'Enlace del estudiante', exact: true })).toHaveCount(0);
  await expect(block.getByRole('button', { name: 'Generar enlace', exact: true })).toHaveCount(0);
  expect(server.issueRequests).toEqual([]);
  expect([...server.accesses.values()]).toEqual([access]);
  expect(server.forbiddenWrites).toEqual([]);
});

test('139 varios enlaces vigentes no eligen ni sustituyen uno silenciosamente', async ({ page }) => {
  const accesses = [savedAccess(), savedAccess({ id: 'access-c1-other', version: 2,
    expires_at: '2099-01-05T12:00:00Z', url: 'https://example.test/devolucion#' + 'b'.repeat(43) })];
  const server = backend(accesses);
  await server.install(page);
  const block = await openStudent(page);
  await expect(block).toContainText(/varios enlaces|más de un enlace/i);
  await expect(block.getByRole('button', { name: 'Generar enlace', exact: true })).toHaveCount(0);
  // A copied result must follow an explicit choice; opening is not that choice.
  expect(await copied(page)).toEqual([]);
  expect(server.issueRequests).toEqual([]);
  expect([...server.accesses.values()]).toEqual(accesses);
  expect(server.forbiddenWrites).toEqual([]);
});

for (const width of [360, 384, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`139 enlace existente accesible sin opciones ${width}px ${theme}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    const server = backend([savedAccess({ estudiante: 'Estudiante Prueba con nombre extenso María Fernanda de los Ángeles López' })]);
    await server.install(page);
    const block = await openStudent(page, theme);
    if ([384, 1440].includes(width)) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await expectAvailable(block);
    const copy = block.getByRole('button', { name: 'Copiar enlace', exact: true });
    await copy.scrollIntoViewIfNeeded();
    // Rounded borders/scroll offsets can clip a fraction of a CSS pixel.
    // Check every clipping ancestor within 1px, not only a rounded ratio.
    await expect(copy).toBeInViewport({ ratio: 0.99 });
    expect(await copy.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < -1 || bounds.left < -1 || bounds.bottom > innerHeight + 1 || bounds.right > innerWidth + 1) return false;
      let parent = element.parentElement;
      while (parent) {
        const style = getComputedStyle(parent), area = parent.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY) && (bounds.top < area.top - 1 || bounds.bottom > area.bottom + 1)) return false;
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX) && (bounds.left < area.left - 1 || bounds.right > area.right + 1)) return false;
        parent = parent.parentElement;
      }
      return true;
    })).toBe(true);
    const bounds = await copy.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    // The label may wrap into words at 200%, never a letter per line.
    expect(await copy.evaluate(element => element.clientHeight <= parseFloat(getComputedStyle(element).lineHeight) * 3 + 40)).toBe(true);
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(await block.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await activate(copy);
    await expect(copy).toBeFocused();
    await expect.poll(() => copied(page)).toHaveLength(1);
    expect(server.issueRequests).toEqual([]);
    expect(server.forbiddenWrites).toEqual([]);
    if ([384, 1440].includes(width)) await page.screenshot({ path: `output/playwright/spec139-accessible-${width}-${theme}-${browserName}.png` });
  });
}
