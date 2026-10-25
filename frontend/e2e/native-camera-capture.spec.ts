import { expect, test, type Locator, type Page } from '@playwright/test';
import { prepareCameraTest } from './fixtures/camera';

test.use({ reducedMotion: 'reduce' });

async function openNative(page: Page, button: Locator) {
  const pending = page.waitForEvent('filechooser');
  await expect(button).toBeEnabled();
  await button.press('Enter');
  const chooser = await pending;
  const input = chooser.element();
  expect(await input.getAttribute('capture')).toBe('environment');
  expect(await input.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp');
  expect(chooser.isMultiple()).toBe(false);
  await expect(page.getByRole('dialog', { name: 'Tomar foto' })).toHaveCount(0);
  return chooser;
}

for (const width of [360, 390, 768, 1440]) {
  for (const theme of ['light', 'dark']) {
    for (const landscape of [false, true]) {
      test(`127 captura nativa ${width}px ${theme} ${landscape ? 'horizontal' : 'vertical'}`, async ({ page }, info) => {
        const height = width >= 768 ? 1024 : 844;
        await page.setViewportSize(landscape ? { width: height, height: width } : { width, height });
        await page.addInitScript(({ tablet, iphone, mode }) => {
          Object.defineProperty(navigator, 'userAgent', { configurable: true, value: tablet ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit Safari' : iphone ? 'Mozilla/5.0 (iPhone) AppleWebKit Safari' : 'Mozilla/5.0 (Linux; Android 15) Chrome Mobile' });
          Object.defineProperty(navigator, 'platform', { configurable: true, value: tablet ? 'MacIntel' : 'Linux arm' });
          Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });
          localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 }));
        }, { tablet: width === 768, iphone: width === 390, mode: theme });
        const writes = await prepareCameraTest(page);
        const encoded = await page.evaluate(() => {
          const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 400;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 300, 400);
          ctx.fillStyle = 'black'; ctx.font = '16px sans-serif';
          for (let row = 1; row < 18; row++) ctx.fillText(`Hoja de prueba. Respuesta ${row}.`, 8, row * 22);
          return canvas.toDataURL('image/png').split(',')[1];
        });
        const image = { name: 'primera.png', mimeType: 'image/png', buffer: Buffer.from(encoded, 'base64') };
        const first = await openNative(page, page.getByRole('button', { name: /^Tomar foto/ }));
        // A native camera may hide the browser; neither visibility nor focus is cancellation.
        await page.evaluate(() => {
          const state = (window as unknown as { __cameraTest: { visibility: DocumentVisibilityState } }).__cameraTest;
          state.visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
          state.visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
          window.dispatchEvent(new Event('focus'));
        });
        await first.setFiles(image);
        await expect(page.getByText('1 hoja seleccionada')).toBeVisible();
        const second = await openNative(page, page.getByRole('button', { name: /^Tomar otra foto/ }));
        await second.setFiles({ ...image, name: 'segunda.png' });
        await expect(page.getByText('2 hojas seleccionadas')).toBeVisible();
        const cards = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: /Ampliar hoja/ }) });
        await expect(cards).toHaveCount(2);
        const repeat = cards.first().getByRole('button', { name: 'Repetir foto', exact: true });
        await expect(repeat).toBeVisible();
        expect((await repeat.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        const cancelled = await openNative(page, repeat);
        await cancelled.setFiles([]);
        await expect(cards.first()).toContainText('primera.png');
        const replacement = await openNative(page, repeat);
        await replacement.setFiles({ ...image, name: 'repetida.png' });
        await expect(cards.first()).toContainText('repetida.png');
        await expect(cards.nth(1)).toContainText('segunda.png');
        await expect(cards).toHaveCount(2);
        await page.getByRole('button', { name: 'Ampliar hoja 1', exact: true }).press('Enter');
        const preview = page.getByRole('dialog', { name: 'Vista de la hoja 1' });
        await expect(preview.getByRole('img', { name: 'Hoja 1' })).toBeVisible();
        await expect(preview).toHaveCSS('opacity', '1');
        await expect(preview.locator('..')).toHaveCSS('opacity', '1');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath('native-return-preview.png') });
        expect(await page.evaluate(() => (window as unknown as { __cameraTest: { calls: number } }).__cameraTest.calls)).toBe(0);
        expect(writes).toEqual([]);
      });
    }
  }
}
