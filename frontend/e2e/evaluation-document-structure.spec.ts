import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';
import { documentEvaluation, documentId } from '../src/test/fixtures/documentEvaluation';

async function setup(page: Page, recovery = false, nested = false) {
  await login(page, 'profesor', { permissions: ['subjects.read', 'evaluations.read', 'evaluations.create', 'evaluations.update', 'dba.read'] });
  const evaluation = { ...documentEvaluation(), id: 'e1', materia_id: 'm1', profesor_id: 'p1', tipo_origen: 'externa_digitalizada',
    ...(recovery ? { estructura_documento: null, contenido_version_id: null } : {}) };
  if (nested && evaluation.estructura_documento) {
    const nodes = evaluation.estructura_documento.nodos;
    Object.assign(nodes.find(node => node.id === documentId(12))!, { padre_id: documentId(30), orden: 0 });
    nodes.push({ id: documentId(30), tipo: 'seccion', padre_id: documentId(10), orden: 1, titulo: 'Detalles de la observación' });
  }
  let saved: Record<string, unknown> | null = null;
  await page.route('**/api/evaluaciones/contenido-visual/capacidades', route => route.fulfill({ json: { documento: true, editor: false, generacion: false, importacion: false, max_bytes: 20971520 } }));
  await page.route('**/api/materias/m1/evaluaciones', route => route.fulfill({ json: [evaluation] }));
  await page.route('**/api/materias/m1/dba*', route => route.fulfill({ json: [] }));
  await page.route('**/api/evaluaciones/e1', route => {
    if (route.request().method() === 'PATCH') { saved = route.request().postDataJSON(); return route.fulfill({ json: { ...evaluation, ...saved } }); }
    return route.fulfill({ json: evaluation });
  });
  const document = documentEvaluation().estructura_documento!;
  await page.route('**/api/evaluaciones/e1/recuperacion-documental', route => route.fulfill({ json: {
    disponible: true, fuentes: [], source_job_id: 'synthetic-source', source_fingerprint: 'a'.repeat(64),
    documento: { ...document, revision: { ...document.revision, confirmado: false, estado: 'requiere_revision' } }, preguntas: evaluation.preguntas,
    texto: 'Transcripción educativa conservada. Una semilla comienza a crecer.', original_disponible: false,
    mensaje: 'Solo se recupera el texto conservado.', expected_updated_at: evaluation.updated_at, expected_content_version_id: null,
  } }));
  await page.route('**/api/evaluaciones/e1/ultima-copia*', route => route.fulfill({ json: null }));
  await page.goto('/app/materias/m1/evaluaciones');
  await page.getByText('Más opciones', { exact: true }).click();
  return { saved: () => saved };
}

for (const width of [360, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`130 editor por secciones y puntajes ${width}px ${theme}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    const app = await setup(page);
    await page.getByRole('button', { name: 'Editar preguntas', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar contenido de la evaluación' });
    await expect(dialog.getByLabel('Título de la sección')).toHaveValue('Observamos');
    await dialog.getByLabel('Título de la sección').fill('Observamos juntos');
    await dialog.getByLabel('Sección actual').selectOption(documentId(20));
    await expect(dialog.getByLabel('Enunciado', { exact: false })).toHaveValue('Explica qué necesita.');
    await dialog.getByLabel('Sección actual').selectOption(documentId(10));
    await expect(dialog.getByLabel('Título de la sección')).toHaveValue('Observamos juntos');
    await dialog.getByLabel(/Asignar puntaje por sección/).check();
    await dialog.getByLabel('Puntos de Observamos juntos').fill('3,25');
    await dialog.getByLabel('Puntos de Reflexionamos').fill('1,75');
    await dialog.getByRole('button', { name: 'Confirmar reparto de puntos' }).click();
    await dialog.getByLabel(/Comparé las secciones/).check();
    // Enlarged text and a reduced viewport simulate the constrained editing area.
    await page.evaluate(() => { document.documentElement.style.fontSize = '18px'; });
    await page.setViewportSize({ width, height: 560 });
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const finishWriting = dialog.getByRole('button', { name: 'Listo', exact: true });
    if (await finishWriting.isVisible()) await finishWriting.click();
    await page.screenshot({ path: `../output/playwright/130-document/${info.project.name}-${width}-${theme}-editor.png` });
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect.poll(() => app.saved()).not.toBeNull();
    const saved = app.saved()!;
    expect(saved.confirmar_puntuacion_secciones).toBe(true);
    expect(saved).not.toHaveProperty('lectura');
    expect((saved.preguntas as { numero: number }[]).map(q => q.numero)).toEqual([7, 2]);
    expect((saved.estructura_documento as { nodos: { titulo?: string }[] }).nodos[0].titulo).toBe('Observamos juntos');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../output/playwright/130-document/${info.project.name}-${width}-${theme}.png` });
  });
}

for (const width of [390, 1440]) test(`130 capítulo con subsecciones conserva selección ${width}px`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 844 });
  await setup(page, false, true);
  await page.getByRole('button', { name: 'Editar preguntas', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar contenido de la evaluación' });
  await dialog.getByLabel('Sección actual').selectOption(documentId(20));
  await dialog.getByLabel('Sección actual').selectOption(documentId(10));
  await expect(dialog.getByLabel('Título de la sección')).toHaveValue('Observamos');
  await expect(dialog.getByLabel('Texto de lectura')).toHaveValue(/Una semilla comienza/);
  await dialog.getByLabel('Título de la sección').fill('Capítulo de observación');
  await expect(dialog.getByLabel('Sección actual')).toHaveValue(documentId(10));
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

for (const width of [390, 1440]) test(`130 recuperación sin alterar original ${width}px`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 844 });
  await setup(page, true);
  await page.getByRole('button', { name: 'Recuperar secciones' }).click();
  const dialog = page.getByRole('dialog', { name: 'Recuperar secciones y lectura' });
  await expect(dialog.getByText(/Transcripción educativa conservada/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Continuar con la copia revisada' })).toBeDisabled();
  await dialog.getByLabel(/Comparé las secciones/).check();
  await dialog.getByRole('button', { name: 'Continuar con la copia revisada' }).click();
  await expect(page.getByRole('dialog', { name: 'Recuperar documento en una copia' })).toBeVisible();
  await expect(page.getByText(/Se creará en la misma materia/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const width of [390, 1440]) test(`130 estudiante conserva lectura y preguntas por identidad ${width}px`, async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width, height: 844 });
  await login(page, 'estudiante');
  const fixture = documentEvaluation();
  const evaluation = { ...fixture, id: 'e1', materia_id: 'm1', profesor_id: 'p1', estado: 'publicada', recepcion_habilitada: true,
    modalidad: 'online', respuestas_esperadas: [], estructura_documento: { schema_version: 1, nodos: fixture.estructura_documento!.nodos } };
  await page.route('**/api/evaluaciones/e1', route => route.fulfill({ json: evaluation }));
  await page.route('**/api/evaluaciones/e1/mi-entrega', route => route.fulfill({ json: null }));
  await page.route('**/api/evaluaciones/e1/iniciar-entrega', route => route.fulfill({ json: { entrega_id: 'attempt', evaluacion: evaluation } }));
  await page.goto('/app/evaluaciones/e1/resolver');
  await expect(page.getByText(/Una semilla comienza/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Observamos' })).toBeVisible();
  const answer = page.locator('#respuesta-7').getByRole('textbox');
  await answer.fill('Necesita agua.');
  await expect(answer).toHaveValue('Necesita agua.');
  expect(await page.evaluate(() => sessionStorage.getItem('xcalificator:evaluacion:draft:s1:e1:attempt'))).toContain('"7":"Necesita agua."');
  await expect(page.getByText('Con agua y temperatura adecuada.')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
