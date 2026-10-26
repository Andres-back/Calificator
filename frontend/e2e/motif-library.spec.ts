import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { login } from './fixtures/explainableGrading';

// Synthetic metadata exercises all 30 positions per area. It does not count as
// 300 finished illustrations; the independent catalogue audit gates delivery.
const collectionNames = [ ['naturales', 'Ciencias Naturales'], ['sociales', 'Ciencias Sociales'], ['matematicas', 'Matemáticas'], ['castellana', 'Lengua Castellana'], ['ingles', 'Inglés'], ['tecnologia', 'Tecnología'], ['artistica', 'Artística'], ['fisica', 'Educación Física'], ['etica', 'Ética y Valores'], ['religiosa', 'Educación Religiosa'] ];
const digest = 'a'.repeat(64);
const picture = readFileSync(resolve(process.cwd(), '../backend/app/assets/motif_library/naturales/naturales-001-thumbnail.webp'));
const message = 'Aciertos: identificaste el personaje.\nQué mejorar: explica su decisión.\nSiguiente paso: relee el segundo párrafo y escribe una razón.';

for (const width of [360, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`123 biblioteca por área y fichas ${width}px ${theme}`, async ({ page, browserName }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 850 });
    await login(page, 'profesor', { rosterSize: 30 });
    const calls: string[] = [];
    const result = (index: number) => ({ estudiante: `Alumno sintético ${index}`, evaluacion: 'Lectura sintética', materia: 'Lenguaje', nota: index === 1 ? '0' : '3.5', nota_maxima: '5', retroalimentacion: index === 2 ? (message + '\n').repeat(20) : message, respuestas: [], claves_liberadas: false, alcance: 'summary' });
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path === '/api/analytics/evento') return route.fulfill({ json: { ok: true } });
      if (path === '/api/biblioteca-motivos/colecciones') return route.fulfill({ json: { catalog_version: 'synthetic', collections: [{ id: 'general', label: 'Generales', total: 20 }, ...collectionNames.map(([id, label]) => ({ id, label, total: 30 }))] } });
      if (path === '/api/biblioteca-motivos') {
        const collection = url.searchParams.get('coleccion') || 'general';
        const offset = Number(url.searchParams.get('offset') || 0);
        const total = collection === 'general' ? 20 : 30;
        const label = collectionNames.find(([id]) => id === collection)?.[1] || 'General';
        const items = Array.from({ length: Math.min(12, total - offset) }, (_, i) => ({ id: `${collection}-${String(offset + i + 1).padStart(3, '0')}`, collection_id: collection, label: `${label} ${offset + i + 1}`, description: 'Motivo sintético de prueba', thumbnail_url: `/api/biblioteca-motivos/archivos/${collection}-${String(offset + i + 1).padStart(3, '0')}/thumbnail/${digest}`, full_url: `/api/biblioteca-motivos/archivos/${collection}-${String(offset + i + 1).padStart(3, '0')}/full/${digest}`, width: 1024, height: 1024 }));
        return route.fulfill({ json: { catalog_version: 'synthetic', collection, total, offset, limit: 12, items } });
      }
      if (path.startsWith('/api/biblioteca-motivos/archivos/')) return route.fulfill({ body: picture, contentType: 'image/webp' });
      if (path === '/api/devoluciones/disponibilidad') return route.fulfill({ json: { enabled: true } });
      if (path.endsWith('/e1/devoluciones/previsualizar')) return route.fulfill({ json: { resultados: Array.from({ length: 30 }, (_, i) => ({ calificacion_id: `c${i + 1}`, elegible: true, seleccionable: true, fingerprint: 'f'.repeat(64), resultado: result(i + 1), borrador_docente: { estado: 'publicada', ...result(i + 1) } })) } });
      if (path.endsWith('/e1/devoluciones/fichas')) {
        calls.push('read-print');
        return route.fulfill({ json: { resultados: route.request().postDataJSON().selecciones.map((item: { calificacion_id: string }) => ({ calificacion_id: item.calificacion_id, resultado: result(Number(item.calificacion_id.slice(1))) })) } });
      }
      if (path.endsWith('/e1/devoluciones/accesos')) return route.fulfill({ json: { resultados: [], next_cursor: null } });
      if (route.request().method() !== 'GET') calls.push(path);
      return route.fallback();
    });
    await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
    await page.getByRole('button', { name: 'Retroalimentación del grupo', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Retroalimentación del grupo', exact: true });
    await expect(dialog.getByRole('button', { name: 'Preparar impresión', exact: true })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Listos del filtro', exact: true }).click();
    await dialog.getByRole('button', { name: 'Preparar impresión', exact: true }).click();
    await dialog.getByText('Ver motivos por área', { exact: true }).click();
    const gallery = dialog.getByRole('region', { name: 'Biblioteca de motivos' });
    const area = gallery.getByRole('combobox', { name: 'Área de los motivos' });
    for (const [id, label] of collectionNames) {
      await area.selectOption(id);
      await expect(gallery.getByRole('button', { name: `${label} 1`, exact: true })).toBeVisible();
      await expect(gallery.locator('img')).toHaveCount(12);
    }
    await area.selectOption('matematicas');
    await gallery.getByRole('button', { name: 'Siguiente página de motivos' }).click();
    await expect(gallery.getByText('13–24 de 30')).toBeVisible();
    await gallery.getByRole('button', { name: 'Siguiente página de motivos' }).click();
    await expect(gallery.getByText('25–30 de 30')).toBeVisible();
    await expect(gallery.locator('img')).toHaveCount(6);
    await page.screenshot({ path: `../output/playwright/spec123-gallery-${width}-${theme}-${browserName}.png` });
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const targets = await gallery.locator('button,select').evaluateAll(elements => elements.map(element => element.getBoundingClientRect()).map(rect => ({ width: rect.width, height: rect.height })));
    expect(targets.every(rect => rect.width >= 44 && rect.height >= 44)).toBe(true);
    await gallery.getByRole('button', { name: 'Matemáticas 25', exact: true }).click();
    const fragments = await dialog.locator('.feedback-slip').evaluateAll(elements => elements.map(element => ({ name: element.querySelector('h2')!.textContent!.replace(/^Continuación de /, ''), text: element.querySelector('.feedback-slip-text')!.textContent!, src: element.querySelector('img')?.getAttribute('src') })));
    for (let i = 1; i <= 30; i++) {
      const parts = fragments.filter(fragment => fragment.name === result(i).estudiante);
      expect(parts.map(part => part.text).join('').replace(/\s+/g, ' ').trim()).toBe(result(i).retroalimentacion.replace(/\s+/g, ' ').trim());
      expect(parts.every(part => part.src?.includes('/matematicas-025/thumbnail/'))).toBe(true);
    }
    expect(calls).toEqual(['read-print']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
