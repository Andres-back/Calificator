import { expect, test, type Locator } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

async function columns(list: Locator) {
  const lefts = await list.locator('[data-review-student]').evaluateAll((rows) => rows.slice(0, 8).map((row) => Math.round(row.getBoundingClientRect().left)));
  return new Set(lefts).size;
}

test('149 sin estudiante seleccionado los estudiantes llenan la pantalla en mosaico', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'profesor', { rosterSize: 30 });
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
  const list = page.getByTestId('grade-review-students');
  await expect(list.locator('[data-review-student]').first()).toBeVisible();
  expect(await columns(list)).toBeGreaterThanOrEqual(3);
  await expect(page.getByText('Selecciona un estudiante para ver el detalle.')).toBeHidden();
  const roster = page.getByTestId('grade-review-roster');
  const main = await page.locator('main').boundingBox();
  expect((await roster.boundingBox())!.width).toBeGreaterThan(main!.width * 0.8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

  await list.locator('[data-review-student]').first().locator('[data-review-grade]').click();
  await expect(page.getByRole('heading', { name: '1. Nota y explicación' })).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar estudiantes', exact: true }).click();
  expect(await columns(list)).toBe(1);
});

test('149 en móvil el mosaico queda en una columna', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'profesor', { rosterSize: 30 });
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
  const list = page.getByTestId('grade-review-students');
  await expect(list.locator('[data-review-student]').first()).toBeVisible();
  expect(await columns(list)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
