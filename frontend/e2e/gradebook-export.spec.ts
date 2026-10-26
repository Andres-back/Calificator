import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { login } from './fixtures/explainableGrading';

for (const width of [360, 390, 1440]) for (const theme of ['light', 'dark']) {
  test(`128 CSV real final/provisional ${width}px ${theme}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    await login(page, 'profesor', { rosterSize: 40, permissions: ['subjects.read', 'evaluations.read', 'grading.read', 'gradebook.read'] });
    const writes: string[] = [];
    const reads: string[] = [];
    page.on('request', request => {
      if (/\/api\/(materias|evaluaciones|calificaciones)\//.test(request.url()) && request.method() !== 'GET') writes.push(request.url());
      if (/calificaciones\?solo_lectura=true/.test(request.url())) reads.push(request.url());
    });
    const evaluations = Array.from({ length: 10 }, (_, i) => ({ id: `e${i + 1}`, materia_id: 'm1', profesor_id: 'p1', nombre: `Evaluación ${i + 1}`, nota_maxima: 5, estado: 'publicada', preguntas: [], dba_ids: [], dba_personalizado_ids: [], modalidad: 'fisica' }));
    const students = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, nombre: i === 0 ? 'Ángela; "Prueba"' : `Alumno ${String(i).padStart(2, '0')}`, email: `s${i}@example.test` }));
    await page.route('**/api/materias/m1/estudiantes', route => route.fulfill({ json: { id: 'm1', nombre: 'Materia sintética', estudiantes: students } }));
    await page.route('**/api/materias/m1/evaluaciones', route => route.fulfill({ json: evaluations }));
    let onlySuggestions = false;
    await page.route(/\/api\/evaluaciones\/e\d+\/calificaciones(?:\?|$)/, route => route.fulfill({ json: students.filter((_, i) => i < 32).map((student, i) => ({
      id: `g${i}`, estudiante_id: student.id,
      estado: onlySuggestions ? 'sugerida' : i < 8 ? 'publicada' : i < 16 ? 'ajustada' : i < 24 ? 'requiere_revision' : 'procesando',
      nota_confirmada: !onlySuggestions && i < 16 ? i === 0 ? 0 : 4.25 : null,
      nota_sugerida: 3.5, resultado_json: {},
    })) }));
    await page.goto('/app/materias/m1/boletin?evaluacion=e1');
    await page.getByRole('button', { name: 'Exportar notas', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Exportar notas' });
    await dialog.getByRole('button', { name: 'Todas', exact: true }).click();
    await expect(dialog.getByText(/160 notas finales/)).toBeVisible();
    const getCsv = async () => {
      const downloaded = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Descargar notas CSV' }).click();
      const file = await downloaded;
      return { text: readFileSync((await file.path())!, 'utf8'), name: file.suggestedFilename() };
    };
    const final = await getCsv();
    expect(final.text.charCodeAt(0)).toBe(0xFEFF);
    const rows = final.text.replace(/^\uFEFF/, '').split('\r\n');
    expect(rows).toHaveLength(41);
    expect(rows[0]).toBe('Nombre del estudiante;' + evaluations.map(item => item.nombre).join(';'));
    expect(rows).toContain('"Ángela; ""Prueba""";' + Array(10).fill('0').join(';'));
    students.slice(1).forEach((student, i) => expect(rows).toContain(student.nombre + ';' + Array(10).fill(i + 1 < 16 ? '4,25' : '').join(';')));
    expect(final.text).not.toContain('@example.test');
    await dialog.getByLabel('Contenido del archivo').selectOption('provisional');
    const provisional = await getCsv();
    expect(provisional.name).toContain('Informe-provisional');
    const provisionalRows = provisional.text.replace(/^\uFEFF/, '').split('\r\n');
    expect(provisionalRows[0]).toContain('Evaluación 1 · Nota provisional;Evaluación 1 · Estado');
    expect(provisionalRows).toContain('Alumno 16;' + Array(10).fill('3,5;Sugerida · pendiente de revisión').join(';'));
    expect(provisionalRows).toContain('Alumno 24;' + Array(10).fill(';Calificando').join(';'));
    expect(provisionalRows).toContain('Alumno 32;' + Array(10).fill(';Sin nota').join(';'));
    onlySuggestions = true;
    await dialog.getByRole('button', { name: 'Actualizar vista previa' }).click();
    await expect(dialog.getByText(/0 notas finales/)).toBeVisible();
    await dialog.getByLabel('Contenido del archivo').selectOption('final');
    await expect(dialog.getByText(/Todavía no hay notas finales/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Descargar notas CSV' })).toBeDisabled();
    expect(writes).toEqual([]);
    expect(reads.length).toBeGreaterThanOrEqual(20);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../output/playwright/128-export/${info.project.name}-${width}-${theme}.png` });
  });
}
