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
        expect(text).toContain('Publicada');
        expect(text).not.toContain('Clave temporal');
        expect(reads).toHaveLength(1);
        expect(writes).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
        await context.close();
      }
    } finally { await browser.close(); }
  });
}
