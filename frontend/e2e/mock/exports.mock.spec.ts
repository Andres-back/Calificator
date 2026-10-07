import { chromium, webkit, expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { login } from '../fixtures/explainableGrading';

for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]] as const) {
  test('090 exportaciones privadas móviles y escritorio — ' + name, async () => {
    test.setTimeout(120_000);
    const browser = await engine.launch();
    try {
      for (const [width, height, colorScheme] of [[360, 800, 'light'], [390, 844, 'dark'], [1280, 800, 'light']] as const) {
        const context = await browser.newContext({ viewport: { width, height }, colorScheme, acceptDownloads: true });
        const page = await context.newPage();
        await login(page, 'profesor', { rosterSize: 30, permissions: ['subjects.read', 'subjects.update', 'evaluations.read', 'grading.read', 'grading.grade', 'grading.publish', 'gradebook.read'] });
        const writes: string[] = [];
        const reads: string[] = [];
        page.on('request', request => {
          if (request.method() !== 'GET' && /\/api\/(materias|evaluaciones|calificaciones)\//.test(request.url())) writes.push(request.url());
          if (/calificaciones\?solo_lectura=true/.test(request.url())) reads.push(request.url());
        });
        await page.goto('/app/materias/m1');
        await page.getByRole('button', { name: 'Entregar accesos' }).click();
        const dialog = page.getByRole('dialog', { name: 'Entregar accesos' });
        await expect(dialog.getByRole('checkbox')).toHaveCount(30);
        await dialog.getByRole('button', { name: 'Ninguno', exact: true }).click();
        await expect(dialog.getByRole('button', { name: 'Descargar accesos CSV' })).toBeDisabled();
        await dialog.getByRole('button', { name: 'Todos', exact: true }).click();
        const accessDownload = page.waitForEvent('download');
        await dialog.getByRole('button', { name: 'Descargar accesos CSV' }).click();
        const accessFile = await accessDownload;
        expect(readFileSync((await accessFile.path())!, 'utf8').split('\r\n')).toHaveLength(31);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
        await dialog.getByRole('button', { name: 'Cerrar diálogo' }).click();

        await page.goto('/app/materias/m1/boletin?evaluacion=e1');
        await page.getByLabel('Buscar estudiante').fill('Estudiante Prueba');
        await page.getByRole('button', { name: 'Exportar notas', exact: true }).click();
        const notes = page.getByRole('dialog', { name: 'Exportar notas' });
        await expect(notes.getByRole('checkbox', { name: 'Multiplicación' })).toBeChecked();
        const notesDownload = page.waitForEvent('download');
        await notes.getByRole('button', { name: 'Descargar notas CSV' }).click();
        const notesFile = await notesDownload;
        const text = readFileSync((await notesFile.path())!, 'utf8');
        expect(text.split('\r\n')).toHaveLength(31);
        expect(text.replace(/^\uFEFF/, '').split('\r\n')[0]).toBe('Nombre del estudiante;Multiplicación');
        expect(text.split('\r\n').slice(1).every(row => row.split(';').length === 2 && row.endsWith(';5'))).toBe(true);
        expect(text).not.toContain('Publicada');
        expect(text).not.toContain('@example.test');
        expect(text).not.toContain('Clave temporal');
        expect(reads).toHaveLength(1);
        expect(writes).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
        await context.close();
      }
    } finally { await browser.close(); }
  });
  test('190 generación confirmada y entrega desde foto — ' + name, async () => {
    test.setTimeout(120_000);
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
      const page = await context.newPage();
      await login(page, 'profesor', { permissions: ['subjects.read', 'subjects.update', 'evaluations.read', 'grading.read', 'gradebook.read'] });
      const students = [{ id: 's1', nombre: 'Ana Sintética', email: 'ana@example.test', email_es_interno: true }, { id: 's2', nombre: 'Cuenta Personal', email: 'personal@example.test', email_es_interno: false }];
      const resets: string[] = [];
      let confirms = 0;
      await page.route('**/api/materias/m1/estudiantes', route => route.fulfill({ json: { id: 'm1', nombre: 'Matemáticas', estudiantes: students } }));
      await page.route('**/api/materias/m1/estudiantes/*/clave-temporal', route => {
        resets.push(route.request().url());
        return route.fulfill({ json: { estudiante_id: 's1', email: 'ana@example.test', password_temporal: 'Clave-Sintetica' } });
      });
      await page.goto('/app/materias/m1');
      await page.getByRole('button', { name: 'Entregar accesos' }).click();
      const delivery = page.getByRole('dialog', { name: 'Entregar accesos' });
      await delivery.getByRole('button', { name: 'Generar nuevas claves y entregar' }).click();
      expect(resets).toEqual([]);
      await delivery.getByRole('button', { name: 'Cancelar generación' }).click();
      expect(resets).toEqual([]);
      await delivery.getByRole('button', { name: 'Generar nuevas claves y entregar' }).click();
      await delivery.getByRole('button', { name: 'Confirmar generación' }).click();
      await expect(delivery.getByText('Clave temporal: Clave-Sintetica')).toBeVisible();
      const download = page.waitForEvent('download');
      await delivery.getByRole('button', { name: 'Descargar accesos CSV' }).click();
      const file = await download;
      const contents = readFileSync((await file.path())!, 'utf8');
      expect(contents).toContain('Ana Sintética;ana@example.test;Clave-Sintetica');
      expect(contents).toContain('Cuenta Personal;personal@example.test;');
      expect(resets).toHaveLength(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
      await delivery.getByRole('button', { name: 'Cerrar diálogo' }).click();

      const batch = { id: 'b1', materia_id: 'm1', estado: 'revision', filas: [{ id: 'r1', orden: 1, nombre_detectado: 'Nueva Alumna', nombre_revisado: 'Nueva Alumna', confianza: 1, requiere_revision: false, duplicado_confirmado: false, decision: 'crear', estudiante_existente_id: null, advertencias: [] }] };
      await page.route('**/api/materias/m1/importaciones-estudiantes', route => route.fulfill({ json: route.request().method() === 'POST' ? { id: 'b1', estado: 'revision' } : [] }));
      await page.route('**/api/materias/m1/estudiantes-existentes*', route => route.fulfill({ json: [] }));
      await page.route('**/api/materias/m1/importaciones-estudiantes/b1', route => route.fulfill({ json: batch }));
      await page.route('**/api/materias/m1/importaciones-estudiantes/b1/confirmar', route => {
        confirms++;
        return route.fulfill({ json: { creados: 1, matriculados_existentes: 0, ya_matriculados: 0, omitidos: 0, credenciales_mostradas_una_vez: true, credenciales: [{ estudiante_id: 's3', nombre: 'Nueva Alumna', email: 'nueva@example.test', password_temporal: 'Foto-Sintetica' }] } });
      });
      await page.getByRole('button', { name: /Importar.*foto/i }).click();
      const photo = page.getByRole('dialog', { name: 'Importar estudiantes desde una foto' });
      await photo.locator('input[type="file"]').setInputFiles({ name: 'lista.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPZwAAAAASUVORK5CYII=', 'base64') });
      await photo.getByRole('button', { name: 'Confirmar 1 estudiantes' }).click();
      const photoDownload = page.waitForEvent('download');
      await photo.getByRole('button', { name: 'Descargar accesos CSV' }).click();
      const photoFile = await photoDownload;
      expect(readFileSync((await photoFile.path())!, 'utf8')).toContain('Nueva Alumna;nueva@example.test;Foto-Sintetica');
      expect(confirms).toBe(1);
      expect(resets).toHaveLength(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
      await context.close();
    } finally { await browser.close(); }
  });
}
