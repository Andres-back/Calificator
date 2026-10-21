import { expect, test, type Locator } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

test.setTimeout(60_000);

async function touchTarget(control: Locator) {
  const box = await control.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(43.999);
  expect(box!.width).toBeGreaterThanOrEqual(43.999);
}

test('105 110 login espera el contenido del inicio antes de abrir materias', async ({ page }) => {
  let releaseDashboard!: () => void;
  let dashboardRequested!: () => void;
  const release = new Promise<void>(resolve => { releaseDashboard = resolve; });
  const requested = new Promise<void>(resolve => { dashboardRequested = resolve; });
  await page.route('**/src/modules/dashboard/DashboardPage.tsx', async route => {
    dashboardRequested();
    await release;
    await route.continue();
  });
  let loginFinished = false;
  const signingIn = login(page, 'profesor', { permissions: ['subjects.read', 'subjects.create'] }).then(() => { loginFinished = true; });
  try {
    await requested;
    await expect(page.getByRole('button', { name: /Abrir menú de cuenta/ })).toBeVisible();
    await expect(page.locator('main#main-content').getByRole('heading', { level: 1 })).toHaveCount(0);
    expect(loginFinished).toBe(false);
  } finally {
    releaseDashboard();
    await signingIn;
  }
  await expect(page.locator('main#main-content').getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto('/app/materias');
  await expect(page.getByRole('button', { name: 'Nueva materia', exact: true })).toBeVisible();
});

for (const width of [360, 390, 1440]) for (const theme of ['light', 'dark']) {
  test(`105 materia y cola discreta ${width}px ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    await login(page, 'profesor', { permissions: ['subjects.read', 'subjects.create', 'subjects.update', 'evaluations.read', 'grading.read', 'grading.grade'] });
    const createdAt = new Date().toISOString();
    await page.route('**/api/jobs/pendientes', route => route.fulfill({ json: { items: [{
      job_id: 'synthetic-job', evaluacion_id: 'e1', materia_id: 'm1', estudiante_id: 's1', estudiante_nombre: 'Alumno sintético',
      kind: 'individual', total: 1, estado: 'running', progreso: 30, created_at: createdAt,
    }] } }));
    let polls = 0;
    await page.route('**/api/jobs/synthetic-job', route => {
      polls++;
      return route.fulfill({ json: { id: 'synthetic-job', estado: 'running', progreso: 30, error: null } });
    });
    const writes: string[] = [];
    page.on('request', request => { if (request.method() !== 'GET' && /\/api\/(jobs|calificaciones)/.test(request.url())) writes.push(request.url()); });
    await page.goto('/app/materias');
    const monitor = page.getByRole('complementary', { name: 'Calificaciones en cola' });
    await expect(monitor.getByText('1 en proceso')).toBeVisible();
    await touchTarget(monitor.getByRole('button', { name: 'Ver progreso' }));
    expect((await monitor.boundingBox())!.height).toBeLessThan(90);
    await monitor.getByRole('button', { name: 'Ver progreso' }).click();
    await expect(monitor.getByText('Alumno sintético')).toBeVisible();
    await monitor.getByRole('button', { name: 'Minimizar progreso' }).click();
    await expect(monitor.getByRole('button', { name: 'Ver progreso' })).toBeFocused();
    const before = polls;
    await expect.poll(() => polls).toBeGreaterThan(before);
    await expect(monitor.getByRole('button', { name: 'Ver progreso' })).toHaveAttribute('aria-expanded', 'false');

    await page.getByRole('button', { name: 'Nueva materia', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear una materia' });
    const name = dialog.getByLabel(/Nombre de la materia/);
    await expect(name).not.toBeFocused();
    await expect(dialog.locator('details')).not.toHaveAttribute('open');
    await name.fill('Matemáticas 7A');
    if (width < 640) {
      expect(await name.evaluate(node => getComputedStyle(node).fontSize)).toBe('16px');
      await dialog.getByRole('button', { name: 'Listo', exact: true }).click();
    }
    await dialog.getByLabel(/^Área/).fill('Matemáticas');
    await dialog.getByLabel(/^Grado/).fill('7°');
    if (width < 640) await dialog.getByRole('button', { name: 'Listo', exact: true }).click();
    await dialog.getByText('Más opciones', { exact: true }).click();
    await dialog.getByLabel(/Descripción/).fill('Curso 7A, mañana');
    if (width < 640) {
      await page.setViewportSize({ width, height: 440 });
      await expect.poll(async () => dialog.getByLabel(/Descripción/).evaluate(node => {
        const field = node.closest('label')!.getBoundingClientRect();
        const area = node.closest('[data-mobile-scroll]')!.getBoundingClientRect();
        return field.top >= area.top && field.bottom <= area.bottom;
      })).toBe(true);
      await touchTarget(dialog.getByRole('button', { name: 'Listo', exact: true }));
      await dialog.getByRole('button', { name: 'Listo', exact: true }).click();
      await expect(dialog.getByLabel(/Descripción/)).toHaveValue('Curso 7A, mañana');
      await page.setViewportSize({ width, height: 844 });
    }
    await dialog.getByText('Más opciones', { exact: true }).click();
    await touchTarget(dialog.getByRole('button', { name: 'Crear y continuar' }));
    await touchTarget(dialog.getByRole('button', { name: 'Cancelar' }));
    await page.screenshot({ path: `../output/playwright/105-materia-cola/${info.project.name}-${width}-${theme}-materia.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    let payload: unknown;
    await page.route('**/api/materias', async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      payload = route.request().postDataJSON();
      return route.fulfill({ json: { id: 'm1', ...payload as object }, status: 201 });
    });
    await dialog.getByRole('button', { name: 'Crear y continuar' }).click();
    await expect(page).toHaveURL(/\/app\/materias\/m1/);
    expect(payload).toEqual({ nombre: 'Matemáticas 7A', area: 'Matemáticas', grado: '7°', descripcion: 'Curso 7A, mañana' });
    await page.goto('/app/calificaciones?evaluacion=e1&modo=carga');
    const embedded = page.getByRole('complementary', { name: 'Calificaciones en cola' });
    await expect(embedded.getByRole('button', { name: 'Ver progreso' })).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('combobox', { name: 'Buscar estudiante para esta entrega' })).toBeVisible();
    await page.screenshot({ path: `../output/playwright/105-materia-cola/${info.project.name}-${width}-${theme}-cola.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(writes).toEqual([]);
  });
}
