import { expect, test, type Page } from '@playwright/test';
import { createEmptyWizardState, wizardStorageKey, WIZARD_VERSION } from '../src/modules/evaluaciones/components/generationWizardModel';

// Full journeys now include finishing each mobile edit, not just filling fields.
// This is a browser-flow deadline, never an LLM performance threshold.
test.setTimeout(60_000);

const teacher = {
  id: 'profesor-e2e',
  nombre: 'Profesora E2E',
  email: 'profesora@example.test',
  rol: 'profesor',
  estado: 'activo',
  permissions: [
    'subjects.read', 'dba.read', 'evaluations.read', 'evaluations.create',
    'evaluations.update', 'evaluations.publish', 'xali.use',
  ],
};

const student = {
  ...teacher,
  id: 'estudiante-e2e',
  nombre: 'Estudiante E2E',
  email: 'estudiante@example.test',
  rol: 'estudiante',
  permissions: ['subjects.read', 'evaluations.read', 'evaluations.submit'],
};

const materia = {
  id: 'materia-1',
  profesor_id: teacher.id,
  nombre: 'Matemáticas 7',
  area: 'Matemáticas',
  grado: '7',
  descripcion: 'Curso de prueba',
  codigo_matricula: 'MATE01',
  codigo_activo: true,
  requiere_aprobacion: false,
  estado: 'activa',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const dba = {
  id: 'dba-1',
  fuente: 'oficial',
  codigo: 'DBA-1',
  area: 'Matemáticas',
  grado: '7',
  descripcion: 'Resuelve problemas con números racionales.',
};

function generatedEvaluation(name = 'Evaluación IA E2E') {
  return {
    id: 'evaluacion-ia-1',
    materia_id: materia.id,
    profesor_id: teacher.id,
    nombre: name,
    descripcion: null,
    tipo_origen: 'nativa',
    modalidad: 'online',
    nota_maxima: 5,
    estado: 'borrador',
    politica_intento: null,
    intentos_permitidos: null,
    tiempo_limite_minutos: null,
    fecha_publicacion: null,
    dba_ids: [dba.id],
    dba_personalizado_ids: [],
    metas_profesor: [],
    criterios: [],
    preguntas: [
      { numero: 1, tipo: 'opcion_multiple', enunciado: 'Pregunta original uno', opciones: ['A', 'B', 'C'], puntaje: '2', dba_ids: [dba.id] },
      { numero: 2, tipo: 'abierta', enunciado: 'Pregunta original dos', opciones: [], puntaje: '2', dba_ids: [dba.id] },
      { numero: 3, tipo: 'completar', enunciado: 'Pregunta original tres', opciones: [], puntaje: '1', dba_ids: [dba.id] },
    ],
    respuestas_esperadas: [
      { numero: 1, respuesta: 'A', dba_ids: [dba.id] },
      { numero: 2, respuesta: 'Respuesta dos', dba_ids: [dba.id] },
      { numero: 3, respuesta: 'Respuesta tres', dba_ids: [dba.id] },
    ],
    blueprint: { reglas_feedback: { trazabilidad: { generada_por_ia: true, requiere_validacion_docente: true } } },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

async function mockApplication(page: Page, role: 'profesor' | 'estudiante' = 'profesor') {
  let authenticated = false;
  const evaluations: ReturnType<typeof generatedEvaluation>[] = [];
  const activeUser = role === 'profesor' ? teacher : student;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();
    const json = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

    if (path === '/auth/refresh') return json({ detail: 'No session' }, 401);
    if (path === '/auth/login' && method === 'POST') {
      authenticated = true;
      return json({});
    }
    if (path === '/auth/me') {
      return authenticated
        ? json({ user: activeUser })
        : json({ detail: 'No session' }, 401);
    }
    if (path === '/users/me/authorization') return json({
      profile: activeUser.rol, is_primary_admin: false, custom_role_id: null,
      custom_role_name: null, role_version: null, auth_version: 1,
      permissions: activeUser.permissions,
    });
    if (path === '/materias' && method === 'GET') return json([materia]);
    if (path === `/materias/${materia.id}/dba`) return json([dba]);
    if (path === `/materias/${materia.id}/evaluaciones` && method === 'GET') return json(evaluations);
    if (path === '/evaluaciones/generar-borrador' && method === 'POST') return json(generatedEvaluation(), 201);
    if (path === '/evaluaciones/evaluacion-ia-1' && method === 'PATCH') {
      const payload = request.postDataJSON();
      const created = { ...generatedEvaluation(), ...payload };
      evaluations.splice(0, evaluations.length, created);
      return json(created);
    }
    if (path === '/evaluaciones' && method === 'POST') {
      const payload = request.postDataJSON();
      const created = { ...generatedEvaluation('Evaluación manual E2E'), id: 'evaluacion-manual-1', ...payload };
      evaluations.push(created);
      return json(created, 201);
    }
    if (path === '/xali/chat' && method === 'POST') return json({ respuesta: 'Aclara el enunciado.', materia_id: materia.id });
    return json([]);
  });

  return { evaluations };
}

async function loginAndOpenEvaluations(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(teacher.email);
  await page.locator('input[type="password"]').fill('password-for-test');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await expect(page).toHaveURL(/\/app(?:\/materias)?$/);
  await page.goto('/app/evaluaciones');
  await expect(page).toHaveURL(/\/app\/evaluaciones/);
}

async function openAI(page: Page) {
  await page.getByRole('button', { name: 'Crear evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Crear con IA', exact: true }).click();
}

async function finishWritingIfVisible(page: Page) {
  const done = page.getByRole('button', { name: 'Listo', exact: true });
  if (await done.isVisible()) await done.click();
}

async function reachReviewStep(page: Page) {
  await openAI(page);
  await page.getByLabel(/Qué quieres evaluar/).fill('Fracciones');
  await finishWritingIfVisible(page);
  await page.locator('summary', { hasText: 'Personalizar' }).click();
  await page.getByLabel(/Nombre de la evaluación/i).fill('Evaluación IA E2E');
  await finishWritingIfVisible(page);
  await page.getByRole('checkbox', { name: /Usar criterios de aprendizaje/i }).check();
  await page.getByRole('button', { name: /DBA-1/i }).click();
  await page.getByLabel(/Texto de referencia/i).fill('Texto de referencia para las preguntas.');
  await finishWritingIfVisible(page);
  await page.getByRole('button', { name: 'Generar evaluación' }).click();
  await expect(page.getByText('Revisa y edita la evaluación')).toBeVisible();
}

test('profesor completes the two-screen AI flow and sees the normal evaluation in the desktop list', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockApplication(page);
  await loginAndOpenEvaluations(page);
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await reachReviewStep(page);

  await page.getByLabel(/Enunciado/i).fill('Pregunta editada por la profesora');
  await finishWritingIfVisible(page);
  await page.getByRole('button', { name: 'Guardar borrador' }).click();

  await expect(page.getByRole('dialog', { name: /Generar evaluación/i })).not.toBeVisible();
  await expect(page.getByText('Evaluación IA E2E').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Editar/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Publicar/i })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('recovers and discards a user-scoped draft after reload', async ({ page }) => {
  await mockApplication(page);
  await loginAndOpenEvaluations(page);
  await openAI(page);
  await page.getByLabel(/Qué quieres evaluar/).fill('Borrador recuperable');
  await finishWritingIfVisible(page);
  await page.getByRole('button', { name: 'Cerrar asistente' }).click();

  await page.reload();
  await openAI(page);
  await expect(page.getByText('Encontramos una evaluación sin terminar.')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByLabel(/Qué quieres evaluar/)).toHaveValue('Borrador recuperable');
  await page.getByRole('button', { name: 'Cerrar asistente' }).click();

  await openAI(page);
  await page.getByRole('button', { name: 'Descartar' }).click();
  await expect(page.getByRole('dialog', { name: /Generar evaluación/i })).not.toBeVisible();
});

test('student cannot access AI or manual creation controls', async ({ page }) => {
  await mockApplication(page, 'estudiante');
  await loginAndOpenEvaluations(page);
  await expect(page.getByRole('button', { name: 'Crear evaluación', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Crear manualmente' })).toHaveCount(0);
});

test('manual creation remains available and the wizard fits a 390x844 viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApplication(page);
  await loginAndOpenEvaluations(page);

  await page.getByRole('button', { name: 'Crear evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Crear manualmente' }).first().click();
  await page.getByLabel(/^Nombre/i).fill('Evaluación manual E2E');
  await finishWritingIfVisible(page);
  await page.getByRole('button', { name: 'Crear manualmente' }).last().click();
  await expect(page.getByText('Evaluación manual E2E')).toBeVisible();

  await openAI(page);
  await expect(page.getByRole('progressbar')).toBeVisible();
  const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noHorizontalOverflow).toBe(true);
});

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
  test(`criterios y creación completos sin superposición en ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockApplication(page);
    const ownCriterion = { ...dba, id: 'own-criterion', fuente: 'personalizado', codigo: null, descripcion: 'Explica fracciones equivalentes con un ejemplo.' };
    await page.route('**/api/materias/materia-1/dba', (route) => route.fulfill({
      json: [ownCriterion, ...Array.from({ length: 20 }, (_, index) => ({ ...dba, id: `official-${index}`, codigo: `Referencia ${index}`, descripcion: `Multiplicaciones del nivel ${index}.` }))],
    }));
    let generationPayload: Record<string, unknown> | undefined;
    await page.route('**/api/evaluaciones/generar-borrador', (route) => {
      generationPayload = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: generatedEvaluation() });
    });
    await loginAndOpenEvaluations(page);
    await openAI(page);
    await page.getByLabel(/Qué quieres evaluar/).fill('Fracciones');
    await finishWritingIfVisible(page);
    await page.locator('summary', { hasText: 'Personalizar' }).click();
    await page.getByLabel(/Nombre de la evaluación/).fill('Fracciones para revisar');
    await finishWritingIfVisible(page);
    await page.getByRole('checkbox', { name: /Usar criterios de aprendizaje/ }).check();
    const search = page.getByRole('searchbox', { name: 'Buscar criterios de aprendizaje' });
    await search.fill('fracciones');
    await finishWritingIfVisible(page);
    await page.getByRole('button', { name: /Explica fracciones equivalentes/ }).click();
    await search.fill('multiplicaciones');
    await finishWritingIfVisible(page);
    await expect(page.getByText('1 seleccionados · 20 disponibles en esta búsqueda')).toBeVisible();
    await search.fill('fracciones');
    await finishWritingIfVisible(page);
    await expect(page.getByRole('button', { name: /Explica fracciones equivalentes/ })).toHaveAttribute('aria-pressed', 'true');
    const content = page.getByTestId('evaluation-wizard-content');
    const dialog = page.getByRole('dialog', { name: /Generar evaluación/ });
    await expect(content).toBeVisible();
    const layout = await content.evaluate((element) => {
      const body = element.getBoundingClientRect();
      const footer = element.parentElement!.querySelector('footer')!.getBoundingClientRect();
      const header = element.parentElement!.querySelector('header')!.getBoundingClientRect();
      return { bodyHeight: body.height, overlaps: body.bottom > footer.top + 1 || body.top < header.bottom - 1 };
    });
    expect(layout.bodyHeight).toBeGreaterThan(400);
    expect(layout.overlaps).toBe(false);
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('criterios-mobile.png') });
    await content.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.getByRole('button', { name: 'Generar evaluación' }).click();
    await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(page.getByText('Revisa y edita la evaluación')).toBeVisible();
    expect(generationPayload).toMatchObject({ dba_ids: [], dba_personalizado_ids: ['own-criterion'] });
    await page.getByLabel(/Enunciado/).fill('Pregunta revisada desde celular');
    await finishWritingIfVisible(page);
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Fracciones para revisar').first()).toBeVisible();
  });
}
for (const width of [360, 390, 768, 1280, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`096 creación en dos pantallas ${width}px ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.addInitScript((value) => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: value }, version: 0 })), theme);
      await mockApplication(page);
      await loginAndOpenEvaluations(page);
      await page.evaluate((value) => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
      await openAI(page);
      const dialog = page.getByRole('dialog', { name: 'Generar evaluación con IA' });
      const content = page.getByTestId('evaluation-wizard-content');
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2');
      await expect(page.locator('details', { has: page.locator('summary', { hasText: 'Personalizar' }) })).not.toHaveAttribute('open');
      await expect(page.getByRole('complementary', { name: 'Asistencia opcional de Xali' })).toHaveCount(0);
      await page.getByLabel(/Qué quieres evaluar/).fill('Fracciones');
      await finishWritingIfVisible(page);
      const assertLayout = async () => {
        expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        const metrics = await content.evaluate(element => {
          const rect = element.getBoundingClientRect();
          const header = element.parentElement!.querySelector('header')!.getBoundingClientRect();
          const footer = element.parentElement!.querySelector('footer')!.getBoundingClientRect();
          return { height: rect.height, overlap: rect.top < header.bottom - 1 || rect.bottom > footer.top + 1 };
        });
        expect(metrics.height).toBeGreaterThan(400);
        expect(metrics.overlap).toBe(false);
        const action = dialog.getByRole('button', { name: /^(Generar evaluación|Guardar borrador)$/ });
        // Wait for the modal's scale animation before measuring touch targets.
        await expect.poll(async () => (await action.boundingBox())?.height ?? 0).toBeGreaterThan(47.99);
        const rect = await action.boundingBox();
        expect(rect).not.toBeNull();
        expect(rect!.height).toBeGreaterThanOrEqual(44);
        expect(rect!.x).toBeGreaterThanOrEqual(0);
        expect(rect!.x + rect!.width).toBeLessThanOrEqual(width + 1);
      };
      await assertLayout();
      await page.screenshot({ path: `../output/playwright/creation-096/${testInfo.project.name}-${width}-${theme}-preparar.png` });
      await page.getByRole('button', { name: 'Generar evaluación' }).click();
      await expect(page.getByRole('button', { name: 'Guardar borrador' })).toBeVisible();
      await page.getByLabel(/Enunciado/).fill('Pregunta revisada y conservada');
      await finishWritingIfVisible(page);
      await page.getByLabel('Puntaje de la pregunta 1').fill('0');
      await finishWritingIfVisible(page);
      await expect(page.getByRole('button', { name: 'Guardar borrador' })).toBeDisabled();
      await page.getByRole('button', { name: 'Revisar pendientes' }).click();
      await page.getByLabel('Puntaje de la pregunta 1').fill('2');
      await finishWritingIfVisible(page);
      await assertLayout();
      await page.screenshot({ path: `../output/playwright/creation-096/${testInfo.project.name}-${width}-${theme}-revisar.png` });
      const saved = page.waitForRequest(request => request.method() === 'PATCH' && request.url().includes('/evaluaciones/evaluacion-ia-1'));
      await page.getByRole('button', { name: 'Guardar borrador' }).click();
      const payload = (await saved).postDataJSON();
      expect(payload).not.toHaveProperty('estado');
      expect(payload.preguntas[0].enunciado).toBe('Pregunta revisada y conservada');
      expect(payload.expected_updated_at).toBe('2026-01-01T00:00:00Z');
      await expect(dialog).toBeHidden();
    });
  }
}

test('096 treinta preguntas y texto largo 390px dark mantienen edición y acciones', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: 'dark' }, version: 0 })));
  const state = { ...createEmptyWizardState(materia.id), counts: { opcion_multiple: 6, abierta: 24, verdadero_falso: 0, completar: 0 } };
  await page.addInitScript(({ key, draft }) => localStorage.setItem(key, JSON.stringify(draft)), { key: wizardStorageKey(teacher.id, materia.id), draft: { version: WIZARD_VERSION, userId: teacher.id, savedAt: Date.now(), state } });
  await mockApplication(page);
  const generated = generatedEvaluation();
  generated.preguntas = Array.from({ length: 30 }, (_, index) => ({ ...generated.preguntas[index < 6 ? 0 : 1], numero: index + 1, enunciado: `Pregunta ${index + 1}: explica y justifica el procedimiento. `.repeat(8) }));
  generated.respuestas_esperadas = Array.from({ length: 30 }, (_, index) => ({ numero: index + 1, respuesta: index < 6 ? 'A' : `Respuesta ${index + 1}`, dba_ids: [] }));
  let quantity: number | undefined;
  await page.route('**/api/evaluaciones/generar-borrador', route => {
    quantity = route.request().postDataJSON().cantidad_preguntas;
    return route.fulfill({ status: 201, json: generated });
  });
  await loginAndOpenEvaluations(page);
  await openAI(page);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel(/Qué quieres evaluar/).fill('Comprensión, argumentación y explicación de los procedimientos del grupo');
  await finishWritingIfVisible(page);
  await page.getByRole('button', { name: 'Personalizar cantidad' }).click();
  await expect(page.getByRole('heading', { name: 'Tipos de preguntas · 30 en total' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agregar una pregunta de Respuesta abierta', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Generar evaluación' }).click();
  await expect(page.getByRole('list', { name: 'Preguntas editables' }).locator('article')).toHaveCount(30);
  expect(quantity).toBe(30);
  const content = page.getByTestId('evaluation-wizard-content');
  await content.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(page.getByRole('button', { name: 'Guardar borrador' })).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: `../output/playwright/creation-096/${testInfo.project.name}-390-dark-30-preguntas.png` });
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

// Synthetic visual viewport geometry: these tests do not claim to open a real OS keyboard.
async function resizeVisibleArea(page: Page, height: number, top: number) {
  await page.evaluate(({ height, top }) => {
    const viewport = window.visualViewport!;
    Object.defineProperties(viewport, {
      height: { configurable: true, value: height },
      offsetTop: { configurable: true, value: top },
      scale: { configurable: true, value: 1 },
    });
    viewport.dispatchEvent(new Event('resize'));
  }, { height, top });
}

async function expectWritingLayout(page: Page, field: ReturnType<Page['getByLabel']>, height: number, top: number) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('data-writing', 'true');
  await expect(dialog).toHaveCSS('height', `${height}px`);
  // Spring transforms / device pixels can round the rendered box by one pixel.
  await expect.poll(async () => Math.abs(((await dialog.boundingBox())?.height ?? 0) - height)).toBeLessThanOrEqual(1);
  await expect.poll(async () => Math.abs(((await dialog.boundingBox())?.y ?? 0) - top)).toBeLessThanOrEqual(1);
  await expect.poll(async () => field.evaluate(element => {
    const input = element.getBoundingClientRect();
    const area = element.closest('[data-mobile-scroll]')!.getBoundingClientRect();
    const label = element.closest('label')?.getBoundingClientRect();
    return input.top >= area.top - 1 && input.bottom <= area.bottom + 1 && (!label || label.top >= area.top - 1);
  })).toBe(true);
  const done = page.getByRole('button', { name: 'Listo', exact: true });
  const rect = await done.boundingBox();
  expect(rect!.height).toBeGreaterThanOrEqual(44);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(top + height + 1);
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
}

for (const width of [360, 390]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`097 escribir y revisar ${width}px ${theme} con altura visible reducida`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await mockApplication(page);
      await loginAndOpenEvaluations(page);
      await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
      await openAI(page);
      const topic = page.getByLabel(/Qué quieres evaluar/);
      await expect(topic).not.toBeFocused();
      const mutations: string[] = [];
      page.on('request', request => {
        if (['POST', 'PATCH'].includes(request.method()) && request.url().includes('/api/')) mutations.push(request.url());
      });
      await topic.fill('Fracciones equivalentes');
      await topic.evaluate(element => (element as HTMLTextAreaElement).setSelectionRange(2, 8));
      await resizeVisibleArea(page, 340, 40);
      await expectWritingLayout(page, topic, 340, 40);
      expect(await topic.evaluate(element => (element as HTMLTextAreaElement).selectionStart)).toBe(2);
      await page.screenshot({ path: `../output/playwright/097-escritura/${testInfo.project.name}-${width}-${theme}-escribir.png` });
      await finishWritingIfVisible(page);
      await resizeVisibleArea(page, 844, 0);
      await expect(topic).toHaveValue('Fracciones equivalentes');
      expect(mutations).toEqual([]);
      await page.getByRole('button', { name: 'Generar evaluación', exact: true }).click();
      const statement = page.getByLabel(/Enunciado/);
      await statement.fill('Explica por qué dos fracciones son equivalentes.');
      await resizeVisibleArea(page, 380, 24);
      await expectWritingLayout(page, statement, 380, 24);
      await page.getByLabel('Puntaje de la pregunta 1').fill('0');
      await expect(page.getByRole('button', { name: 'Revisar pendientes' })).toBeVisible();
      await page.getByLabel('Puntaje de la pregunta 1').fill('2');
      await finishWritingIfVisible(page);
      await resizeVisibleArea(page, 844, 0);
      await expect(statement).toHaveValue('Explica por qué dos fracciones son equivalentes.');
      await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
      expect(mutations).toHaveLength(2);
    });
  }
}

test('097 manual 390px conserva preguntas y opciones al escribir', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApplication(page);
  await loginAndOpenEvaluations(page);
  await page.getByRole('button', { name: 'Crear evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Crear manualmente', exact: true }).click();
  await page.getByLabel(/^Nombre/).fill('Evaluación manual móvil');
  await finishWritingIfVisible(page);
  const question = page.getByPlaceholder('Escribe una pregunta para la evaluación');
  await question.fill('¿Cómo obtendrías una fracción equivalente a 2/3?');
  await resizeVisibleArea(page, 300, 50);
  await expectWritingLayout(page, question, 300, 50);
  await page.screenshot({ path: `../output/playwright/097-escritura/${testInfo.project.name}-manual-escribir.png` });
  await finishWritingIfVisible(page);
  await resizeVisibleArea(page, 844, 0);
  await page.locator('summary', { hasText: 'Personalizar' }).click();
  await page.getByLabel(/^Nota maxima/).focus();
  await expect(page.getByRole('dialog')).toHaveAttribute('data-writing', 'true');
  await page.getByLabel(/^Nota maxima/).fill('10');
  await expect(page.getByLabel(/^Nota maxima/)).toHaveValue('10');
  await finishWritingIfVisible(page);
  await expect(page.getByLabel(/^Nota maxima/)).toHaveValue('10');
  await page.locator('summary', { hasText: 'Personalizar' }).click();
  await expect(page.getByLabel(/^Nota maxima/)).toHaveValue('10');
  await expect(question).toHaveValue('¿Cómo obtendrías una fracción equivalente a 2/3?');
  await question.locator('..').getByRole('button', { name: 'Agregar', exact: true }).click();
  const submitted = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname === '/api/evaluaciones');
  await page.getByRole('button', { name: 'Crear manualmente', exact: true }).click();
  expect((await submitted).postDataJSON()).toMatchObject({
    nota_maxima: 10, preguntas: [{ enunciado: '¿Cómo obtendrías una fracción equivalente a 2/3?' }],
  });
  await expect(page.getByRole('dialog')).toBeHidden();
});
