import { expect, test } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

for (const width of [360, 390, 1440]) for (const theme of ['light', 'dark']) {
  test(`128 reutilizar evaluación sin redigitalizar ${width}px ${theme}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    await login(page, 'profesor', { permissions: ['subjects.read', 'evaluations.read', 'evaluations.create'] });
    const subjects = [{ id: 'm1', profesor_id: 'p1', nombre: 'Origen', estado: 'activa' }, { id: 'm2', profesor_id: 'p1', nombre: 'Destino', estado: 'activa' }, { id: 'm3', profesor_id: 'p1', nombre: 'Archivada', estado: 'archivada' }];
    await page.route('**/api/materias', route => route.fulfill({ json: subjects }));
    let request: Record<string, string> | null = null;
    let submissions = 0;
    const status = () => request ? { job_id: request.request_key, estado: 'success', progreso: 100, materia_destino_id: 'm2', evaluacion_id: 'copy', error: null, solicitud: request } : null;
    await page.route('**/api/evaluaciones/e1/ultima-copia', route => route.fulfill({ json: status() }));
    await page.route('**/api/evaluaciones/copias/*', route => route.fulfill({ json: status() }));
    await page.route('**/api/evaluaciones/e1/copiar', route => {
      submissions++; request = route.request().postDataJSON();
      return route.fulfill({ status: 202, json: { ...status(), estado: 'queued', evaluacion_id: null, progreso: 0 } });
    });
    await page.goto('/app/materias/m1/evaluaciones');
    await page.getByText('Más opciones', { exact: true }).click();
    await page.getByRole('button', { name: 'Usar en otra materia' }).click();
    const dialog = page.getByRole('dialog', { name: 'Usar en otra materia' });
    await expect(dialog.getByRole('option', { name: 'Destino' })).toBeAttached();
    await expect(dialog.getByRole('option', { name: 'Archivada' })).toHaveCount(0);
    await dialog.getByLabel('Materia destino').selectOption('m2');
    await dialog.getByRole('button', { name: 'Crear copia como borrador' }).click();
    await expect(dialog.getByText('Solicitud guardada', { exact: false })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cerrar diálogo' }).click();
    await page.reload();
    await page.getByText('Más opciones', { exact: true }).click();
    await page.getByRole('button', { name: 'Usar en otra materia' }).click();
    await expect(dialog.getByText(/Copia lista como borrador/)).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Ver materia destino' })).toHaveAttribute('href', '/app/materias/m2/evaluaciones');
    expect(submissions).toBe(1);
    expect(Object.keys(request!).sort()).toEqual(['expected_content_version_id', 'expected_updated_at', 'materia_destino_id', 'nombre', 'request_key']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(dialog).toHaveCSS('opacity', '1');
    await expect(dialog.locator('..')).toHaveCSS('opacity', '1');
    expect(await dialog.evaluate(element => getComputedStyle(element).backgroundColor)).not.toMatch(/rgba\(.+,\s*0(?:\.|\))/);
    await page.screenshot({ path: `../output/playwright/128-copia/${info.project.name}-${width}-${theme}.png` });
  });
}
