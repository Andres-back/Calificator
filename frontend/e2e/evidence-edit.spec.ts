import { expect, test, type Route } from '@playwright/test';
import { login } from './fixtures/explainableGrading';
import { spec141EvidenceContext, spec141EvidenceGrade, spec141EvidenceHref } from './mock/spec141-fixtures';

const json = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', json: data });
const { fingerprint, paginas: [{ referencia: first }, { referencia: second }] } = spec141EvidenceContext;

for (const { width, theme } of [{ width: 384, theme: 'dark' }, { width: 1440, theme: 'light' }]) {
  test(`141 editar hojas conserva originales y confirma solo referencias ${width}px ${theme}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, 'profesor');
    const detail = spec141EvidenceGrade;
    const writes: { manifest: unknown; files: number; confirmed: string; version: string }[] = [];
    await page.route('**/api/calificaciones/c1/detalle', route => json(route, detail));
    await page.route('**/api/calificaciones/c1/recalificacion-contexto', route => json(route, {
      estado: 'sin_cambios', version_entrega_id: null, version_objetivo_id: null, fingerprint: null,
      requiere_confirmacion: false, cambios: [], mensaje: 'Se conservarán los puntajes de la entrega.',
    }));
    await page.route('**/api/calificaciones/c1/evidencia/edicion', route => json(route, spec141EvidenceContext));
    await page.route('**/api/calificaciones/c1/recalificar', async route => {
      const body = route.request().postDataBuffer();
      const form = await new Response(body ? new Uint8Array(body) : null, { headers: { 'content-type': route.request().headers()['content-type'] } }).formData();
      writes.push({ manifest: JSON.parse(String(form.get('edicion_evidencia'))), files: form.getAll('foto').length,
        confirmed: String(form.get('confirmar_reapertura')), version: String(form.get('version_esperada')) });
      return json(route, { ...detail, estado: 'procesando', nota_confirmada: null }, 202);
    });
    await page.goto(spec141EvidenceHref);
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
    await page.getByRole('button', { name: 'Evidencia', exact: true }).click();
    const edit = page.getByRole('button', { name: 'Editar hojas', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Editar hojas', exact: true });
    const save = dialog.getByRole('button', { name: 'Guardar y volver a calificar', exact: true });
    await edit.click();
    await expect(dialog.getByText('Hoja 2', { exact: true })).toBeVisible();
    await expect(save).toBeDisabled();
    await dialog.getByRole('button', { name: 'Quitar hoja 1', exact: true }).click();
    await expect(dialog.getByText('Hoja 2', { exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(writes).toEqual([]);

    await edit.click();
    await expect(dialog.getByText('Hoja 2', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Subir hoja 2', exact: true }).click();
    await expect(save).toBeDisabled();
    expect(writes).toEqual([]);
    await dialog.getByRole('checkbox', { name: /Confirmo guardar las hojas/ }).check();
    await expect(save).toBeEnabled();
    await save.scrollIntoViewIfNeeded();
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `output/playwright/spec141-evidence-edit-${width}-${theme}-${browserName}.png` });
    await save.click();
    await expect(dialog).toHaveCount(0);
    expect(writes).toEqual([{
      manifest: { fingerprint, paginas: [{ referencia: second }, { referencia: first }] },
      files: 0, confirmed: 'true', version: detail.updated_at,
    }]);
  });
}
