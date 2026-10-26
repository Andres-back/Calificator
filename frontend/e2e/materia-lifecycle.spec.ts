import { expect, test } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

for (const width of [360, 390, 1440]) for (const theme of ['light', 'dark']) {
  test(`128 editar archivar restaurar materia ${width}px ${theme}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    await login(page, 'profesor', { permissions: ['subjects.read', 'subjects.update'] });
    let subject = { id: 'm1', profesor_id: 'p1', nombre: 'Materia sintética', area: 'Ciencias', grado: '4', descripcion: '', estado: 'activa', codigo_matricula: 'ABC', updated_at: '2026-10-25T00:00:00' };
    const changes: Record<string, string>[] = [];
    await page.route('**/api/materias', route => route.fulfill({ json: [subject] }));
    await page.route('**/api/materias/m1', route => {
      if (route.request().method() !== 'PATCH') return route.fulfill({ json: subject });
      const payload = route.request().postDataJSON(); changes.push(payload);
      subject = { ...subject, ...payload };
      return route.fulfill({ json: subject });
    });
    await page.goto('/app/materias');
    await page.getByRole('button', { name: 'Editar materia' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Nombre de la materia/).fill('Ciencias editada');
    if (width < 640) await dialog.getByRole('button', { name: 'Listo', exact: true }).click();
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('link', { name: /Ciencias editada/ })).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar de mis materias' }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/No borra estudiantes/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    expect(changes).toHaveLength(1);
    await page.getByRole('button', { name: 'Eliminar de mis materias' }).click();
    await page.getByRole('button', { name: 'Archivar materia' }).click();
    await expect(page.getByRole('link', { name: /Ciencias editada/ })).toHaveCount(0);
    await page.getByRole('button', { name: /Archivadas/ }).click();
    await expect(page.getByRole('link', { name: /Ciencias editada/ })).toBeVisible();
    await page.getByRole('button', { name: 'Restaurar materia' }).click();
    await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await page.getByRole('button', { name: /Activas/ }).click();
    await expect(page.getByRole('link', { name: /Ciencias editada/ })).toBeVisible();
    expect(changes.map(change => change.estado)).toEqual([undefined, 'archivada', 'activa']);
    expect(changes.every(change => change.expected_updated_at === '2026-10-25T00:00:00')).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../output/playwright/128-materias/${info.project.name}-${width}-${theme}.png` });
  });
}
