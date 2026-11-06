import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

const suggestedTie = { nota_sugerida: 2.95, nota_confirmada: null, estado: 'requiere_revision', redondeo_empate: null };
const pendingTie = { nota_sugerida: 2.95, nota_confirmada: 2.95, estado: 'confirmada', redondeo_empate: null };

async function openGrade(page: Page) {
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
  await page.getByTestId('grade-review-students').locator('[data-review-grade]').first().click();
  await expect(page.getByRole('heading', { name: '1. Nota y explicación' })).toBeAttached();
}

function captureBody(page: Page, pattern: string) {
  const bodies: Record<string, unknown>[] = [];
  void page.route(pattern, (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1', estado: 'confirmada', resultado_json: {} }) });
  });
  return bodies;
}

test('150 confirmar una nota en empate pide elegir y envía la decisión', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'profesor', { gradeOverride: suggestedTie });
  const bodies = captureBody(page, '**/calificaciones/c1/confirmar');
  await openGrade(page);
  await page.getByRole('button', { name: 'Confirmar nota' }).filter({ visible: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirmar nota' });
  await expect(dialog.getByRole('radio')).toHaveCount(2);
  await expect(dialog.getByRole('radio', { name: '2.9' })).not.toBeChecked();
  await expect(dialog.getByRole('radio', { name: '3.0' })).not.toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Confirmar', exact: true })).toBeDisabled();
  await dialog.getByRole('radio', { name: '3.0' }).check();
  await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toEqual({ nota_confirmada: 2.95, redondeo_empate: 'arriba' });
});

test('150 una nota sin empate se confirma sin pregunta y sin decisión', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'profesor', { gradeOverride: { ...suggestedTie, nota_sugerida: 3.5 } });
  const bodies = captureBody(page, '**/calificaciones/c1/confirmar');
  await openGrade(page);
  await page.getByRole('button', { name: 'Confirmar nota' }).filter({ visible: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirmar nota' });
  await expect(dialog.getByRole('radio')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toEqual({ nota_confirmada: 3.5 });
});

for (const [name, width, height] of [['escritorio', 1440, 900], ['móvil', 390, 844]] as const) {
  test(`150 una nota pendiente no se publica hasta decidir (${name})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await login(page, 'profesor', { gradeOverride: pendingTie });
    const bodies = captureBody(page, '**/calificaciones/c1/ajustar');
    await openGrade(page);
    await expect(page.getByRole('button', { name: 'Publicar al estudiante' }).filter({ visible: true })).toHaveCount(0);
    const notice = page.getByRole('group', { name: /¿Queda en 2\.9 o en 3\.0\?/ });
    await expect(notice).toBeVisible();
    const save = page.getByRole('button', { name: 'Guardar decisión' });
    await expect(save).toBeDisabled();
    await notice.getByRole('radio', { name: '2.9' }).check();
    await save.click();
    await expect.poll(() => bodies.length).toBe(1);
    expect(bodies[0]).toMatchObject({ nota_confirmada: 2.95, redondeo_empate: 'abajo' });
  });
}

test('150 una nota decidida muestra la cifra elegida y se puede publicar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'profesor', { gradeOverride: { ...pendingTie, redondeo_empate: 'arriba' } });
  await openGrade(page);
  await expect(page.getByText('3.0', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('group', { name: /¿Queda en 2\.9 o en 3\.0\?/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Publicar al estudiante' }).filter({ visible: true })).toBeVisible();
});

test('150 establecer nota en empate pide elegir', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'profesor');
  const bodies = captureBody(page, '**/evaluaciones/e1/calificaciones/manual');
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1');
  await page.getByRole('button', { name: /Establecer nota|Más acciones/ }).filter({ visible: true }).first().click();
  const setGrade = page.getByRole('button', { name: /Establecer nota/ }).filter({ visible: true }).first();
  if (await setGrade.isVisible()) await setGrade.click();
  const dialog = page.getByRole('dialog', { name: 'Establecer nota sin documento' });
  await dialog.getByLabel(/Nota \(máximo/).fill('2.95');
  const save = dialog.getByRole('button', { name: 'Guardar nota' });
  await expect(save).toBeDisabled();
  await dialog.getByRole('radio', { name: '3.0' }).check();
  await save.click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toMatchObject({ nota_confirmada: 2.95, redondeo_empate: 'arriba' });
});
