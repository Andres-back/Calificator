import { expect, test, type Locator } from '@playwright/test';
import { prepareCameraTest } from './fixtures/camera';

test.use({ reducedMotion: 'reduce' });


for (const width of [360, 390, 1440]) {
  test(`102/103 cámaras seleccionables, revisión y confirmación en ${width}px`, async ({ page, browserName }, testInfo) => {
    // Exercise desktop keyboard accessibility; Windows WebKit throttles rAF
    // during pointer-stability checks at large retina viewports.
    const activate = async (button: Locator) => {
      await expect(button).toBeVisible(); await expect(button).toBeEnabled();
      if (browserName === 'webkit' && width >= 768) await button.press('Enter');
      else await button.click();
    };
    await page.setViewportSize({ width, height: 844 });
    if (width === 390) await page.addInitScript(() => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: 'dark' }, version: 0 })));
    const writes = await prepareCameraTest(page, false, browserName === 'webkit');
    expect(await page.evaluate(() => (window as unknown as { __cameraTest: { calls: number } }).__cameraTest.calls)).toBe(0);
    await activate(page.getByRole('button', { name: /^Tomar foto/ }));
    const dialog = page.getByRole('dialog', { name: 'Tomar foto' });
    await expect(dialog.getByRole('button', { name: 'Tomar foto', exact: true })).toBeEnabled();
    const cameras = dialog.getByRole('combobox', { name: 'Cámara', exact: true });
    await expect(cameras).toHaveValue('integrated');
    for (const device of ['usb', 'other']) {
      await cameras.selectOption(device);
      await expect(dialog.getByRole('button', { name: 'Tomar foto', exact: true })).toBeEnabled();
      await expect.poll(() => page.evaluate(() => (window as unknown as { __cameraTest: { selected: string } }).__cameraTest.selected)).toBe(device);
    }
    await expect(cameras.getByRole('option', { name: 'Cámara 3' })).toHaveCount(1);
    await expect(cameras.getByRole('option', { name: 'Micrófono' })).toHaveCount(0);
    await expect(dialog).toHaveCSS('opacity', '1');
    await expect(dialog.locator('..')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: testInfo.outputPath('camera.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await activate(dialog.getByRole('button', { name: 'Tomar foto', exact: true }));
    await expect(dialog.getByRole('img', { name: 'Foto para revisar' })).toBeVisible();
    await expect(cameras).toBeDisabled();
    await activate(dialog.getByRole('button', { name: 'Repetir foto' }));
    await expect(dialog.getByRole('button', { name: 'Tomar foto', exact: true })).toBeEnabled();
    await activate(dialog.getByRole('button', { name: 'Tomar foto', exact: true }));
    await expect(dialog.getByRole('img', { name: 'Foto para revisar' })).toBeVisible();
    await activate(dialog.getByRole('button', { name: 'Usar esta foto' }));
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('1 hoja seleccionada')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __cameraTest: { audio: boolean } }).__cameraTest.audio)).toBe(false);
    expect(writes).toEqual([]);
    const cameraState = await page.evaluate(() => (window as unknown as { __cameraTest: { stopped: number; calls: number } }).__cameraTest);
    expect(cameraState.stopped).toBe(cameraState.calls);
  });
}

test('102 permiso denegado y cancelación conservan la alternativa de archivos', async ({ page }) => {
  const writes = await prepareCameraTest(page, true);
  await page.getByRole('button', { name: /^Tomar foto/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Tomar foto' });
  await expect(dialog.getByRole('alert')).toContainText('permiso');
  await expect(dialog.getByRole('button', { name: 'Subir fotos o PDF' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Subir fotos o PDF/ })).toBeVisible();
  expect(writes).toEqual([]);
});

test('102/127 ocultar la página apaga webcam, sin enviar ni abrir otra captura', async ({ page, browserName }) => {
  const writes = await prepareCameraTest(page, false, browserName === 'webkit');
  await page.getByRole('button', { name: /^Tomar foto/ }).press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Tomar foto' });
  await expect(dialog.getByRole('button', { name: 'Tomar foto', exact: true })).toBeEnabled();
  // Development StrictMode can mount twice; hiding must stop every owned stream
  // without starting a new request, regardless of the initial mount count.
  const callsBeforeHiding = await page.evaluate(() => (window as unknown as { __cameraTest: { calls: number } }).__cameraTest.calls);
  await page.evaluate(() => {
    const state = (window as unknown as { __cameraTest: { visibility: DocumentVisibilityState } }).__cameraTest;
    state.visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(dialog).toHaveCount(0);
  await page.evaluate(() => {
    const state = (window as unknown as { __cameraTest: { visibility: DocumentVisibilityState } }).__cameraTest;
    state.visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
  });
  const state = await page.evaluate(() => (window as unknown as { __cameraTest: { calls: number; stopped: number } }).__cameraTest);
  expect(callsBeforeHiding).toBeGreaterThan(0);
  expect(state.calls).toBe(callsBeforeHiding); expect(state.stopped).toBe(state.calls);
  expect(writes).toEqual([]);
  await expect(dialog).toHaveCount(0);
});
