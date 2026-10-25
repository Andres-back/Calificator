import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test.use({ reducedMotion: 'reduce', deviceScaleFactor: 1 });
test.setTimeout(60_000);
const root = resolve(process.cwd(), '../backend/app/assets/motif_library');
const catalog = JSON.parse(readFileSync(resolve(root, 'catalog.json'), 'utf8')) as {
  version: string; collections: { id: string; label: string }[];
  motifs: { id: string; collection_id: string; label: string; description: string; full: { filename: string; sha256: string; width: number; height: number }; thumbnail: { filename: string; sha256: string } }[];
};
const motif = catalog.motifs.find(item => item.id === 'naturales-001')!;
const thumbnailUrl = `/api/biblioteca-motivos/archivos/${motif.id}/thumbnail/${motif.thumbnail.sha256}`;
const teacher = { id: 'motif-teacher', nombre: 'Docente sintético', email: 'motif@example.test', rol: 'profesor', estado: 'activo', permissions: ['subjects.read', 'evaluations.read', 'evaluations.update', 'resources.read', 'resources.update'] };
const subject = { id: 'motif-subject', profesor_id: teacher.id, nombre: 'Ciencias', area: 'Ciencias Naturales', grado: '5', estado: 'activa', estudiantes: [], codigo_matricula: 'MOTIF' };
const originalContent = { titulo: 'Guía de los ríos', introduccion: 'Lectura conservada.', secciones: [{ titulo: 'Observa', contenido: 'El agua sostiene la vida.', actividades: ['Explica por qué debemos cuidar los ríos.'] }], criterios: [{ nombre: 'Comprende', descripcion: 'Explica con una razón.', peso_porcentaje: 100 }], _xcalificator: { keep: true } };
const initialEvaluation = { id: 'motif-evaluation', materia_id: subject.id, profesor_id: teacher.id, nombre: 'Agua y vida', descripcion: 'Lee y responde.', tipo_origen: 'externa_digitalizada', modalidad: 'fisica', nota_maxima: 5, estado: 'publicada', contenido_version_id: 'revision-a', contenido_visual: null,
  preguntas: [{ numero: 1, contenido_id: 'question-a', tipo: 'abierta', enunciado: 'Explica por qué debemos cuidar el agua.', puntaje: 5 }], respuestas_esperadas: [{ numero: 1, respuesta: 'Clave exclusiva docente' }], criterios: [{ nombre: 'Comprende', puntaje_maximo: 5 }], dba_ids: [], dba_personalizado_ids: [], metas_profesor: [], created_at: '2026-10-24', updated_at: '2026-10-24' };

async function activate(control: Locator, browserName: string) {
  await expect(control).toBeVisible(); await expect(control).toBeEnabled();
  if (browserName === 'webkit') await control.press('Enter'); else await control.click();
}

async function fixtures(page: Page) {
  const writes: { path: string; payload: Record<string, unknown> }[] = [];
  let evaluation = structuredClone(initialEvaluation) as typeof initialEvaluation & { contenido_visual: unknown };
  let content: Record<string, unknown> = structuredClone(originalContent);
  const material = () => ({ id: 'motif-resource', tipo: 'guia', titulo: 'Guía de los ríos', contenido_json: content, materia_id: subject.id, materia_nombre: subject.nombre, profesor_id: teacher.id, publicado_estudiantes: true, archivo_url: null, created_at: '2026-10-24' });
  await page.route('**/api/**', async route => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname.replace(/^\/api/, '');
    const json = (value: unknown, status = 200) => route.fulfill({ json: value, status });
    if (path === '/auth/me') return json({ user: teacher });
    if (path === '/users/me/authorization') return json({ profile: teacher.rol, permissions: teacher.permissions });
    if (path === '/materias') return json([subject]);
    if (path === `/materias/${subject.id}` || path === `/materias/${subject.id}/estudiantes`) return json(subject);
    if (path === `/materias/${subject.id}/evaluaciones`) return json([evaluation]);
    if (path === '/biblioteca-motivos/colecciones') return json({ catalog_version: catalog.version, collections: catalog.collections.map(item => ({ ...item, total: catalog.motifs.filter(m => m.collection_id === item.id).length })) });
    if (path === '/biblioteca-motivos') {
      const collection = url.searchParams.get('coleccion') || 'general'; const offset = Number(url.searchParams.get('offset') || 0);
      const items = catalog.motifs.filter(item => item.collection_id === collection);
      return json({ catalog_version: catalog.version, collection, total: items.length, offset, limit: 12, items: items.slice(offset, offset + 12).map(item => ({ id: item.id, collection_id: item.collection_id, label: item.label, description: item.description, thumbnail_url: `/api/biblioteca-motivos/archivos/${item.id}/thumbnail/${item.thumbnail.sha256}`, full_url: `/api/biblioteca-motivos/archivos/${item.id}/full/${item.full.sha256}`, width: item.full.width, height: item.full.height })) });
    }
    if (path.startsWith('/biblioteca-motivos/archivos/')) {
      const [, , , id, variant, digest] = path.split('/');
      const item = catalog.motifs.find(value => value.id === id);
      const asset = variant === 'thumbnail' ? item?.thumbnail : item?.full;
      if (!asset || asset.sha256 !== digest) return json({ detail: 'No disponible' }, 404);
      return route.fulfill({ contentType: asset.filename.endsWith('.png') ? 'image/png' : 'image/webp', body: readFileSync(resolve(root, asset.filename)) });
    }
    if (path === '/evaluaciones/contenido-visual/capacidades') return json({ editor: true, generacion: false, importacion: true, max_bytes: 20971520 });
    if (path === '/evaluaciones/recursos' && request.method() === 'POST') { writes.push({ path, payload: { upload: true } }); return json({ id: 'owned-motif' }, 201); }
    if (path.endsWith('/owned-motif/propuesta') || path.endsWith('/recursos/owned-motif')) return route.fulfill({ contentType: 'image/webp', body: readFileSync(resolve(root, motif.full.filename)) });
    if (path === '/evaluaciones/' + initialEvaluation.id) {
      if (request.method() === 'PATCH') {
        const payload = request.postDataJSON(); writes.push({ path, payload });
        evaluation = { ...evaluation, ...payload, contenido_version_id: 'revision-b' };
      }
      return json(evaluation);
    }
    if (path === '/herramientas/motif-resource') {
      if (request.method() === 'PATCH') {
        const payload = request.postDataJSON(); writes.push({ path, payload });
        content = { ...content, _presentacion: { version: 1, decoracion: payload.decoracion ? { ...payload.decoracion, asset_url: thumbnailUrl } : null } };
      }
      return json(material());
    }
    if (request.method() !== 'GET' && path !== '/analytics/evento') { writes.push({ path, payload: {} }); return json({ detail: 'Escritura inesperada' }, 403); }
    return json([]);
  });
  return { writes, content: () => content };
}

for (const width of [360, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`123 editor recurso conserva contenido ${width}px ${theme}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    const mock = await fixtures(page);
    await page.goto('/app/herramientas/motif-resource');
    await activate(page.getByRole('button', { name: 'Editar contenido' }), browserName);
    const editor = page.getByRole('dialog', { name: 'Editar recurso', exact: true });
    await activate(editor.getByRole('button', { name: 'Elegir decoración' }), browserName);
    await activate(editor.getByRole('button', { name: 'Cancelar selección' }), browserName);
    expect(mock.writes).toEqual([]);
    await activate(editor.getByRole('button', { name: 'Elegir decoración' }), browserName);
    const gallery = editor.getByRole('region', { name: 'Biblioteca de motivos' });
    await gallery.getByRole('combobox', { name: 'Área de los motivos' }).selectOption('naturales');
    await expect(gallery.locator('img')).toHaveCount(12);
    await activate(gallery.getByRole('button', { name: motif.label, exact: true }), browserName);
    const preview = editor.locator('img[src*="/naturales-001/full/"]');
    await expect.poll(() => preview.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: `../output/playwright/spec123-resource-${width}-${theme}-${browserName}.png` });
    await activate(editor.getByRole('button', { name: 'Guardar cambios', exact: true }), browserName);
    await expect(editor).not.toBeVisible();
    expect(mock.writes).toEqual([{ path: '/herramientas/motif-resource', payload: { decoracion: { motif_id: motif.id, placement: 'header' } } }]);
    const academic = structuredClone(mock.content()); delete academic._presentacion;
    expect(academic).toEqual(originalContent);
    await page.reload();
    const reopened = page.locator(`img[src="${thumbnailUrl}"]`);
    await expect(reopened).toBeVisible();
    await expect.poll(() => reopened.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`123 editor evaluación revisión y versión ${width}px ${theme}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    const mock = await fixtures(page);
    await page.goto(`/app/materias/${subject.id}/evaluaciones`);
    await activate(page.locator('summary').filter({ hasText: 'Más opciones' }), browserName);
    await activate(page.getByRole('button', { name: 'Editar preguntas' }), browserName);
    const wizard = page.getByRole('dialog', { name: 'Editar contenido de la evaluación' });
    await expect(wizard.getByLabel(/Enunciado/)).toBeVisible();
    await expect(wizard).toHaveCSS('opacity', '1');
    if (width < 640) {
      await expect(wizard).toHaveCSS('max-width', 'none');
      await expect.poll(async () => (await wizard.boundingBox())!.width).toBeGreaterThanOrEqual(width - 1);
    }
    if (theme === 'light' && (width === 360 || width === 1440)) await page.screenshot({ path: `../output/playwright/spec125-focused-editor-${width}-${browserName}.png` });
    await activate(wizard.getByRole('button', { name: 'Añadir contenido', exact: true }), browserName);
    const editor = page.getByRole('dialog', { name: 'Material de la pregunta' });
    await activate(editor.getByRole('button', { name: 'Elegir de la biblioteca' }), browserName);
    const gallery = editor.getByRole('region', { name: 'Biblioteca de motivos' });
    await expect(gallery.getByRole('combobox', { name: 'Área de los motivos' })).toHaveValue('naturales');
    await activate(gallery.getByRole('button', { name: motif.label, exact: true }), browserName);
    const accept = editor.getByRole('button', { name: 'Añadir a la pregunta', exact: true });
    await expect(accept).toBeDisabled();
    const confirmation = editor.getByRole('checkbox', { name: /no contiene respuestas/ });
    await expect(confirmation).toBeEnabled();
    await activate(editor.getByRole('button', { name: 'Ampliar material' }), browserName);
    await expect(editor.getByRole('button', { name: 'Ajustar material' })).toHaveAttribute('aria-expanded', 'true');
    expect(await editor.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await activate(editor.getByRole('button', { name: 'Ajustar material' }), browserName);
    if (browserName === 'webkit') await confirmation.press('Space'); else await confirmation.check();
    await page.screenshot({ path: `../output/playwright/spec123-evaluation-${width}-${theme}-${browserName}.png` });
    await activate(accept, browserName);
    const key = wizard.getByRole('checkbox', { name: 'He comprobado la respuesta correcta con este material.' });
    if (browserName === 'webkit') await key.press('Space'); else await key.check();
    await activate(wizard.getByRole('button', { name: 'Guardar cambios', exact: true }), browserName);
    await expect(wizard).not.toBeVisible();
    expect(mock.writes).toHaveLength(2);
    const saved = mock.writes[1].payload as { contenido_visual: { bloques: { recurso_id: string; descripcion: string }[] }; expected_content_version_id: string; claves_visuales_revisadas: string[] };
    expect(saved.expected_content_version_id).toBe('revision-a');
    expect(saved.claves_visuales_revisadas).toEqual(['question-a']);
    expect(saved.contenido_visual.bloques[0]).toMatchObject({ recurso_id: 'owned-motif', descripcion: 'Biblioteca temática: ' + motif.description });
    await page.reload();
    await activate(page.locator('summary').filter({ hasText: 'Más opciones' }), browserName);
    await activate(page.getByRole('button', { name: 'Editar preguntas' }), browserName);
    await expect(page.getByRole('dialog', { name: 'Editar contenido de la evaluación' }).getByRole('button', { name: 'Editar material', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
