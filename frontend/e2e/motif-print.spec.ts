import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { login } from './fixtures/explainableGrading';

const root = resolve(process.cwd(), '../backend/app/assets/motif_library');
const catalog = JSON.parse(readFileSync(resolve(root, 'catalog.json'), 'utf8')) as { version: string; motifs: { id: string; collection_id: string; label: string; description: string; full: { filename: string; sha256: string; width: number; height: number }; thumbnail: { filename: string; sha256: string } }[] };
const motifs = catalog.motifs.filter(item => item.collection_id === 'naturales');
const message = 'Aciertos: identificaste el personaje.\nQué mejorar: explica su decisión.\nSiguiente paso: relee el segundo párrafo y escribe una razón.';
const result = (index: number) => ({ estudiante: `Alumno sintético ${index}`, evaluacion: 'Lectura sintética', materia: 'Lenguaje', nota: index === 1 ? '0' : '3.5', nota_maxima: '5', retroalimentacion: index === 2 ? (message + '\n').repeat(20) : message, respuestas: [], claves_liberadas: false, alcance: 'summary' });

for (const format of ['A4', 'Letter'] as const) for (const mode of ['fixed', 'mixed', 'none', 'missing'] as const) {
  test(`123 impresión treinta fichas ${format} ${mode}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'PDF físico se valida con el motor de impresión Chromium; WebKit cubre los recorridos responsivos.');
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(() => { window.print = () => {}; });
    await login(page, 'profesor', { rosterSize: 30 });
    const writes: string[] = []; const fullRequests: string[] = [];
    await page.route('**/api/**', async route => {
      const request = route.request(); const url = new URL(request.url()); const path = url.pathname;
      if (path === '/api/analytics/evento') return route.fulfill({ json: { ok: true } });
      if (path === '/api/biblioteca-motivos/colecciones') return route.fulfill({ json: { catalog_version: catalog.version, collections: [{ id: 'general', label: 'Generales', total: 20 }, { id: 'naturales', label: 'Ciencias Naturales', total: 30 }] } });
      if (path === '/api/biblioteca-motivos') {
        const offset = Number(url.searchParams.get('offset') || 0);
        const collection = url.searchParams.get('coleccion') || 'general';
        const items = catalog.motifs.filter(item => item.collection_id === collection);
        return route.fulfill({ json: { catalog_version: catalog.version, collection, total: items.length, offset, limit: 12, items: items.slice(offset, offset + 12).map(item => ({ id: item.id, collection_id: item.collection_id, label: item.label, description: item.description, thumbnail_url: `/api/biblioteca-motivos/archivos/${item.id}/thumbnail/${item.thumbnail.sha256}`, full_url: `/api/biblioteca-motivos/archivos/${item.id}/full/${item.full.sha256}`, width: item.full.width, height: item.full.height })) } });
      }
      if (path.startsWith('/api/biblioteca-motivos/archivos/')) {
        if (path.includes('/full/')) fullRequests.push(path);
        if (mode === 'missing') return route.fulfill({ status: 404, json: { detail: 'Fallo sintético de imagen' } });
        const id = path.split('/')[4]; const item = catalog.motifs.find(value => value.id === id);
        if (!item || !path.endsWith(item.thumbnail.sha256)) return route.fulfill({ status: 404 });
        return route.fulfill({ body: readFileSync(resolve(root, item.thumbnail.filename)), contentType: 'image/webp' });
      }
      if (path === '/api/devoluciones/disponibilidad') return route.fulfill({ json: { enabled: true } });
      if (path.endsWith('/e1/devoluciones/previsualizar')) return route.fulfill({ json: { resultados: Array.from({ length: 30 }, (_, i) => ({ calificacion_id: `c${i + 1}`, elegible: true, seleccionable: true, fingerprint: 'f'.repeat(64), resultado: result(i + 1), borrador_docente: { estado: 'publicada', ...result(i + 1) } })) } });
      if (path.endsWith('/e1/devoluciones/fichas')) {
        writes.push('read-print');
        return route.fulfill({ json: { resultados: request.postDataJSON().selecciones.map((item: { calificacion_id: string }) => ({ calificacion_id: item.calificacion_id, resultado: result(Number(item.calificacion_id.slice(1))) })) } });
      }
      if (path.endsWith('/e1/devoluciones/accesos')) return route.fulfill({ json: { resultados: [], next_cursor: null } });
      if (request.method() !== 'GET') writes.push(path);
      return route.fallback();
    });
    await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
    await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
    await page.getByRole('button', { name: 'Retroalimentaciones', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Retroalimentaciones', exact: true });
    await dialog.getByRole('button', { name: 'Preparar impresión', exact: true }).click();
    if (mode !== 'none') {
      await dialog.getByText('Ver motivos por área', { exact: true }).click();
      const gallery = dialog.getByRole('region', { name: 'Biblioteca de motivos' });
      await gallery.getByRole('combobox', { name: 'Área de los motivos' }).selectOption('naturales');
      if (mode === 'mixed') await gallery.getByRole('button', { name: 'Variar diseños de esta área' }).click();
      else await gallery.getByRole('button', { name: motifs[0].label, exact: true }).click();
    }
    await dialog.getByRole('button', { name: 'Imprimir fichas', exact: true }).click();
    const print = page.locator('#feedback-private-print[data-ready="true"]');
    await expect(print).toHaveCount(1);
    for (const slip of await print.locator('.feedback-slip').all()) {
      const name = (await slip.locator('h2').innerText()).replace(/^Continuación de /, '');
      const index = Number(name.replace('Alumno sintético ', ''));
      await expect(slip.locator('header strong')).toHaveText(`Nota: ${result(index).nota} / 5`);
      await expect(slip.locator('.feedback-slip-context')).toHaveText('Lectura sintética · Lenguaje');
    }
    const fragments = await print.locator('.feedback-slip').evaluateAll(elements => elements.map(element => ({ name: element.querySelector('h2')!.textContent!.replace(/^Continuación de /, ''), text: element.querySelector('.feedback-slip-text')!.textContent! })));
    for (let i = 1; i <= 30; i++) expect(fragments.filter(item => item.name === result(i).estudiante).map(item => item.text).join('').replace(/\s+/g, ' ').trim()).toBe(result(i).retroalimentacion.replace(/\s+/g, ' ').trim());
    await page.emulateMedia({ media: 'print' });
    const measurements = await print.locator('.feedback-paper').evaluateAll(papers => papers.map(paper => ({ height: paper.getBoundingClientRect().height, font: getComputedStyle(paper).fontSize })));
    expect(measurements.every(paper => paper.height <= 965 && paper.font === '16px')).toBe(true);
    await page.pdf({ path: `../output/pdf/spec123-fichas-${format}-${mode}.pdf`, format, printBackground: false, displayHeaderFooter: false });
    expect(writes).toEqual(['read-print']);
    expect(fullRequests).toEqual([]);
  });
}
