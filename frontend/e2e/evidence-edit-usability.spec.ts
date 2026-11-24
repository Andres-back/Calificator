import { expect, test, type Page } from '@playwright/test';
import { openEvidenceEditor as openEditor } from './fixtures/evidenceEdit';

// Spec 217: «Editar hojas» fácil para cualquier edad, en celular y en computador.

/** El botón se ve dentro de la pantalla y un toque en su centro le llega a él. */
async function reachable(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  const box = (await button.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  const hit = await page.evaluate(([x, y]) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest('button')?.textContent ?? '', [box.x + box.width / 2, box.y + box.height / 2]);
  expect(hit).toContain(name);
  return button;
}

for (const { width, height, theme } of [{ width: 1440, height: 900, theme: 'light' }, { width: 390, height: 844, theme: 'dark' }]) {
  test(`217 editar hojas se entiende y se termina sin buscar botones ${width}px ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript((mode) => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    const dialog = await openEditor(page);

    // Cada acción dice con palabras qué hace y es cómoda de tocar.
    const second = dialog.getByRole('listitem').nth(1);
    for (const label of ['Girar o recortar', 'Subir', 'Bajar', 'Quitar']) {
      const button = second.getByRole('button', { name: new RegExp(`^${label}`) });
      await expect(button).toHaveText(label);
      // El diálogo entra creciendo: se mide cuando terminó.
      await expect.poll(async () => (await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(dialog.getByTestId('evidence-edit-save-hint')).toContainText('Para guardar, primero cambia algo en las hojas');
    await page.screenshot({ path: testInfo.outputPath(`217-hojas-${width}-${theme}.png`) });

    // La hoja en grande.
    await dialog.getByRole('button', { name: 'Ver la hoja 2 en grande' }).click();
    const viewer = page.getByRole('dialog', { name: 'Hoja 2', exact: true });
    await expect(viewer.getByRole('img', { name: 'Hoja 2 de la entrega' })).toBeVisible();
    await (await reachable(page, 'Cerrar')).click();
    await expect(viewer).toHaveCount(0);

    // Quitar se puede deshacer.
    await dialog.getByRole('button', { name: 'Quitar hoja 2' }).click();
    await expect(dialog.getByText('Hoja 2', { exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Deshacer', exact: true }).click();
    await expect(dialog.getByText('Hoja 2', { exact: true })).toBeVisible();

    // «Preparar hoja» cubre la pantalla: su botón principal se ve sin desplazar.
    await dialog.getByRole('button', { name: 'Girar o recortar la hoja 1' }).click();
    const prepare = page.getByRole('dialog', { name: 'Preparar hoja 1' });
    await expect(prepare.getByText('Vista lista. Comprueba la hoja antes de aceptar.')).toBeVisible();
    const prepareBox = (await prepare.boundingBox())!;
    expect(prepareBox.width).toBeGreaterThanOrEqual(width - 2);
    await page.screenshot({ path: testInfo.outputPath(`217-preparar-${width}-${theme}.png`) });
    await (await reachable(page, 'Usar esta hoja')).click();
    await expect(prepare).toHaveCount(0);
    await expect(dialog.getByText('Girada o recortada')).toBeVisible();

    await expect(dialog.getByTestId('evidence-edit-save-hint')).toHaveText('Marca la casilla de confirmación para guardar.');
    await dialog.getByRole('checkbox', { name: /Confirmo guardar las hojas/ }).check();
    await expect(dialog.getByTestId('evidence-edit-save-hint')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Guardar y volver a calificar' })).toBeEnabled();
  });
}
