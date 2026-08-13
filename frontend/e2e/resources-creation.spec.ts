import { expect, test, type Page } from '@playwright/test';

const teacher = {
  id: 'profesor-recursos-e2e',
  nombre: 'Profesora Recursos',
  email: 'recursos@example.test',
  rol: 'profesor',
  estado: 'activo',
};

const materia = {
  id: 'materia-recursos-1',
  profesor_id: teacher.id,
  nombre: 'Ciencias 5°',
  area: 'Ciencias Naturales',
  grado: '5°',
  descripcion: 'Curso de prueba',
  codigo_matricula: 'CIEN05',
  codigo_activo: true,
  requiere_aprobacion: false,
  estado: 'activa',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const resourceTypes = [
  'crucigrama',
  'sopa_letras',
  'emparejar',
  'guia',
  'taller',
  'cuento',
  'para_colorear',
  'plan_refuerzo',
  'ficha',
  'lectura_comprensiva',
  'mapa_conceptual',
  'flashcards',
] as const;

async function mockApplication(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const json = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

    if (path === '/auth/refresh') return json({});
    if (path === '/auth/me') return json({ user: teacher });
    if (path === '/materias') return json([materia]);
    if (path === `/materias/${materia.id}/dba`) {
      return json([{
        id: 'dba-recursos-1',
        fuente: 'oficial',
        codigo: 'DBA-1',
        area: materia.area,
        grado: materia.grado,
        descripcion: 'Explica los cambios de estado del agua.',
      }]);
    }
    if (path === '/herramientas' && request.method() === 'GET') return json([]);
    return json({});
  });
}

async function fillBaseFields(page: Page, type: string) {
  await page.getByRole('textbox', { name: /^Título/ }).fill(`Material ${type}`);
  await page.getByRole('textbox', { name: /^Tema/ }).fill('El ciclo del agua');
  if (type === 'plan_refuerzo') {
    await page.getByRole('textbox', { name: /^Nombre del estudiante/ }).fill('Estudiante E2E');
  }
}

test.beforeEach(async ({ page }) => {
  await mockApplication(page);
});

test('el selector ofrece una sola herramienta para relacionar pares', async ({ page }) => {
  await page.goto('/app/herramientas/nuevo');

  await expect(page.getByRole('button', { name: /Elegir Relacionar pares/i })).toHaveCount(1);
  await expect(page.getByText('Unir columnas', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Emparejar', { exact: true })).toHaveCount(0);
});

test('un enlace anterior de unir columnas abre la herramienta consolidada', async ({ page }) => {
  await page.goto('/app/herramientas/nuevo?tipo=unir_columnas');

  await expect(page.getByRole('heading', { name: 'Crear recurso: Relacionar pares' })).toBeVisible();
  await expect(page.getByPlaceholder('Relacionar pares: estados del agua')).toBeVisible();
});

test('todos los recursos permiten llegar a revisión con generación libre', async ({ page }) => {
  test.setTimeout(60_000);
  for (const type of resourceTypes) {
    await page.goto(`/app/herramientas/nuevo?tipo=${type}`);
    await fillBaseFields(page, type);

    const review = page.getByRole('button', { name: 'Revisar antes de generar' });
    await expect(review, `${type} debe aceptar generación libre`).toBeEnabled();
    await review.click();
    await expect(page.getByText('Generación libre con IA')).toBeVisible();
    await page.getByRole('button', { name: 'Volver al formulario' }).click();
  }
});

test('un recurso puede usar rúbrica sin seleccionar DBA', async ({ page }) => {
  await page.goto('/app/herramientas/nuevo?tipo=guia');
  await fillBaseFields(page, 'guia');
  await page.getByRole('checkbox', { name: /Usar criterios de rúbrica/i }).check();
  await page.getByPlaceholder(/Claridad/i).fill('Explica con claridad');
  await page.getByPlaceholder(/Claridad/i).press('Enter');

  await page.getByRole('button', { name: 'Revisar antes de generar' }).click();

  await expect(
    page
      .getByLabel('¿Generar guía de aprendizaje?')
      .getByText('Criterios de rúbrica', { exact: true }),
  ).toBeVisible();
});

test('DBA solo se exige cuando el profesor activa esa opción', async ({ page }) => {
  await page.goto('/app/herramientas/nuevo?tipo=guia');
  await fillBaseFields(page, 'guia');
  await page.getByRole('combobox').selectOption(materia.id);
  await page.getByRole('checkbox', { name: /Alinear con DBA/i }).check();

  await expect(page.getByRole('button', { name: 'Revisar antes de generar' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /DBA-1/i }).check();
  await page.getByRole('button', { name: 'Revisar antes de generar' }).click();

  await expect(page.getByText('Alineación con DBA')).toBeVisible();
});
