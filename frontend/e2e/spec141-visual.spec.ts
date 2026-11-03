import { expect, test } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

const review = '/app/calificaciones/workspace/e1?calificacion=c1';
const choices = [
  ['Respuestas y puntajes', 'grade-review-panel'],
  ['Evidencia', 'grade-evidence-panel'],
  ['Retroalimentación', 'grade-feedback-panel'],
  ['Historial', 'grade-history-panel'],
] as const;

for (const [width, dark] of [[360, false], [384, false], [384, true], [412, true], [1440, false], [1440, true]] as const) {
  test(`141 estados y mosaico a ${width}px ${dark ? 'oscuro' : 'claro'}`, async ({ page, browserName }) => {
    test.setTimeout(75_000);
    await page.setViewportSize({ width, height: 850 });
    await login(page, 'profesor', { rosterSize: 2 });
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let detailRead = false;
    await page.route('**/api/calificaciones/c1/detalle', async route => {
      if (!detailRead) { detailRead = true; await pending; }
      await route.fallback();
    });
    await page.goto(review);
    await page.evaluate(darkTheme => document.documentElement.classList.toggle('dark', darkTheme), dark);
    const reviewScroll = page.getByTestId('grade-review-scroll');
    const mosaic = reviewScroll.getByRole('navigation', { name: 'Secciones de la calificación' });
    try {
      await expect.poll(() => detailRead).toBe(true);
      await expect(reviewScroll).toBeVisible();
      await expect(mosaic).toBeHidden();
    } finally {
      release();
    }
    await expect(mosaic.getByRole('button')).toHaveCount(4);
    const capture = async (view: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      if (width === 384 || width === 1440) await page.screenshot({
        path: `output/playwright/spec141-visual/${browserName}-${width}-${dark ? 'oscuro' : 'claro'}-${view}.png`,
        animations: 'disabled', scale: 'css',
      });
    };
    await capture('mosaico');
    for (const [name, panel] of choices) {
      const card = mosaic.getByRole('button', { name, exact: true });
      await card.focus();
      const size = await card.boundingBox();
      expect(size!.height).toBeGreaterThanOrEqual(44);
      expect(size!.width).toBeGreaterThanOrEqual(44);
      await page.keyboard.press('Enter');
      const detail = page.locator('#' + panel);
      await expect(detail).toBeVisible();
      for (const [, other] of choices.filter(([, other]) => other !== panel)) await expect(page.locator('#' + other)).toBeHidden();
      if (name === 'Evidencia') await expect(detail.getByText('Esta entrega no tiene una foto o PDF asociado.')).toBeVisible();
      await capture(panel);
      await page.getByRole('button', { name: 'Volver a opciones' }).click();
      await expect(card).toBeFocused();
    }
    await page.route('**/api/calificaciones/c2/detalle', route => route.fulfill({ status: 500, json: { detail: 'Error simulado' } }));
    await page.getByRole('button', { name: 'Volver a lista', exact: true }).click();
    await page.getByRole('button', { name: /Alumno 002 María Fernanda López/ }).click();
    await expect(reviewScroll.getByText('Error al cargar detalle.')).toBeVisible();
    await expect(mosaic).toBeHidden();
    await capture('error');
  });
}
